import os
import sys
import logging
from datetime import datetime, timezone, timedelta
import pandas as pd
import requests
from google.cloud import bigquery
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# ===========================
# CONFIGURATION
# ===========================
PROJECT_ID = os.environ.get("GCP_PROJECT", "faang-stock-analytics")
DATASET_ID = os.environ.get("GCP_DATASET", "faang_dataset")
TABLE_ID = "fred_data"
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO").upper()

# FRED API Configuration
FRED_API_KEY = os.environ.get("FRED_API_KEY", "")
FRED_BASE_URL = "https://api.stlouisfed.org/fred/series/observations"


# Economic indicators to track
FRED_SERIES = {
    "GDPC1": {
        "name": "Real GDP",
        "units": "Billions of Chained 2012 Dollars",
        "frequency": "quarterly"
    },
    "CPIAUCSL": {
        "name": "Consumer Price Index",
        "units": "Index 1982-1984=100",
        "frequency": "monthly"
    },
    "UNRATE": {
        "name": "Unemployment Rate",
        "units": "Percent",
        "frequency": "monthly"
    },
    "DFF": {
        "name": "Federal Funds Rate",
        "units": "Percent",
        "frequency": "daily"
    },
    "DGS10": {
        "name": "10-Year Treasury Rate",
        "units": "Percent",
        "frequency": "daily"
    },
    "VIXCLS": {
        "name": "VIX Volatility Index",
        "units": "Index",
        "frequency": "daily"
    }
}

# ===========================
# LOGGER
# ===========================
logging.basicConfig(
    level=LOG_LEVEL,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)

# ===========================
# BIGQUERY CLIENT
# ===========================
client = bigquery.Client(project=PROJECT_ID)
table_ref = f"{PROJECT_ID}.{DATASET_ID}.{TABLE_ID}"

# ===========================
# FUNCTIONS
# ===========================
def ensure_fred_table():
    """Create FRED data table if it doesn't exist."""
    schema = [
        bigquery.SchemaField("series_id", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("series_name", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("observation_date", "DATE", mode="REQUIRED"),
        bigquery.SchemaField("value", "FLOAT64", mode="NULLABLE"),
        bigquery.SchemaField("frequency", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("units", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("ingested_at", "TIMESTAMP", mode="REQUIRED"),
    ]
    
    table = bigquery.Table(table_ref, schema=schema)
    table.time_partitioning = bigquery.TimePartitioning(
        type_=bigquery.TimePartitioningType.DAY,
        field="observation_date"
    )
    table.clustering_fields = ["series_id"]
    
    try:
        client.create_table(table, exists_ok=True)
        logger.info(f"FRED table ensured: {table_ref}")
    except Exception as e:
        logger.error(f"Failed to create FRED table: {e}")
        raise

def get_last_observation_date(series_id: str) -> str:
    """Get the last observation date for a series."""
    try:
        query = f"""
            SELECT MAX(observation_date) as last_date
            FROM `{table_ref}`
            WHERE series_id = @series_id
        """
        job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("series_id", "STRING", series_id)
            ]
        )
        result = client.query(query, job_config=job_config).to_dataframe()
        last_date = result["last_date"].iloc[0]
        
        if pd.isna(last_date):
            # First run - get last 5 years
            return (datetime.now() - timedelta(days=365*5)).strftime("%Y-%m-%d")
        else:
            return last_date.strftime("%Y-%m-%d")
    except Exception as e:
        logger.warning(f"Could not get last date for {series_id}: {e}")
        return (datetime.now() - timedelta(days=365*5)).strftime("%Y-%m-%d")

def fetch_fred_series(series_id: str, series_info: dict, start_date: str):
    """Fetch data for a FRED series."""
    if not FRED_API_KEY:
        logger.error("FRED_API_KEY not set in environment")
        return pd.DataFrame()
    
    logger.info(f"Fetching {series_id} ({series_info['name']}) from {start_date}")
    
    try:
        params = {
            "series_id": series_id,
            "api_key": FRED_API_KEY,
            "file_type": "json",
            "observation_start": start_date,
            "sort_order": "asc"
        }
        
        response = requests.get(FRED_BASE_URL, params=params, timeout=30)
        response.raise_for_status()
        data = response.json()
        
        observations = data.get("observations", [])
        if not observations:
            logger.warning(f"No observations returned for {series_id}")
            return pd.DataFrame()
        
        # Convert to DataFrame
        df = pd.DataFrame(observations)
        df = df[["date", "value"]]
        df.columns = ["observation_date", "value"]
        
        # Convert value to float (handle "." for missing values)
        df["value"] = pd.to_numeric(df["value"], errors="coerce")
        
        # Add metadata
        df["series_id"] = series_id
        df["series_name"] = series_info["name"]
        df["frequency"] = series_info["frequency"]
        df["units"] = series_info["units"]
        df["ingested_at"] = pd.Timestamp.now(timezone.utc)
        
        # Convert date
        df["observation_date"] = pd.to_datetime(df["observation_date"])
        
        # Remove rows with missing values
        df = df.dropna(subset=["value"])
        
        logger.info(f"Fetched {len(df)} observations for {series_id}")
        return df
        
    except Exception as e:
        logger.error(f"Failed to fetch {series_id}: {e}")
        return pd.DataFrame()

def deduplicate_against_bq(df: pd.DataFrame) -> pd.DataFrame:
    """Remove rows already in BigQuery."""
    if df.empty:
        return df
    
    series_ids = df["series_id"].unique().tolist()
    min_date = df["observation_date"].min()
    
    query = f"""
        SELECT series_id, observation_date
        FROM `{table_ref}`
        WHERE series_id IN UNNEST(@series_ids)
          AND observation_date >= @min_date
    """
    job_config = bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ArrayQueryParameter("series_ids", "STRING", series_ids),
            bigquery.ScalarQueryParameter("min_date", "DATE", min_date),
        ]
    )
    
    try:
        existing = client.query(query, job_config=job_config).to_dataframe()
        if not existing.empty:
            existing["observation_date"] = pd.to_datetime(existing["observation_date"])
            before = len(df)
            
            # Anti-join
            df = df.merge(
                existing,
                on=["series_id", "observation_date"],
                how="left",
                indicator=True
            )
            df = df[df["_merge"] == "left_only"].drop(columns=["_merge"])
            
            logger.info(f"Removed {before - len(df)} duplicates")
    except Exception as e:
        logger.warning(f"Could not deduplicate: {e}")
    
    return df

def load_to_bigquery(df: pd.DataFrame):
    """Load DataFrame to BigQuery."""
    if df.empty:
        logger.info("No new data to load")
        return
    
    # Ensure correct column order and types
    df = df[[
        "series_id", "series_name", "observation_date",
        "value", "frequency", "units", "ingested_at"
    ]]
    
    job_config = bigquery.LoadJobConfig(
        write_disposition="WRITE_APPEND",
        schema=[
            bigquery.SchemaField("series_id", "STRING", mode="REQUIRED"),
            bigquery.SchemaField("series_name", "STRING", mode="REQUIRED"),
            bigquery.SchemaField("observation_date", "DATE", mode="REQUIRED"),
            bigquery.SchemaField("value", "FLOAT64", mode="NULLABLE"),
            bigquery.SchemaField("frequency", "STRING", mode="REQUIRED"),
            bigquery.SchemaField("units", "STRING", mode="REQUIRED"),
            bigquery.SchemaField("ingested_at", "TIMESTAMP", mode="REQUIRED"),
        ]
    )
    
    job = client.load_table_from_dataframe(df, table_ref, job_config=job_config)
    job.result()
    logger.info(f"Loaded {len(df)} rows to {table_ref}")

# ===========================
# MAIN
# ===========================
def main():
    logger.info("FRED ETL started")
    start_time = datetime.now(timezone.utc)
    
    # Ensure table exists
    ensure_fred_table()
    
    all_data = []
    
    # Fetch each series
    for series_id, series_info in FRED_SERIES.items():
        start_date = get_last_observation_date(series_id)
        df = fetch_fred_series(series_id, series_info, start_date)
        if not df.empty:
            all_data.append(df)
    
    # Combine and load
    if all_data:
        combined_df = pd.concat(all_data, ignore_index=True)
        combined_df = deduplicate_against_bq(combined_df)
        load_to_bigquery(combined_df)
    else:
        logger.info("No FRED data to load")
    
    duration = (datetime.now(timezone.utc) - start_time).total_seconds()
    logger.info(f"FRED ETL completed in {duration:.2f}s")

if __name__ == "__main__":
    main()
