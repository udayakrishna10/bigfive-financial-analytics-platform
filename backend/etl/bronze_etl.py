import os
import sys
import logging
from datetime import datetime, timezone
import pandas as pd
import pytz
import yfinance as yf
from google.cloud import bigquery

# ===========================
# CONFIGURATION
# ===========================
PROJECT_ID = os.environ.get("GCP_PROJECT", "faang-stock-analytics")
DATASET_ID = os.environ.get("GCP_DATASET", "faang_dataset")
TABLE_ID = os.environ.get("BRONZE_TABLE", "bronze")
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO").upper()

BIG_FIVE_SYMBOLS = ["AAPL", "AMZN", "META", "NFLX", "GOOGL"]
EASTERN_TZ = pytz.timezone("US/Eastern")

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
# ===========================
# UPDATED FUNCTIONS
# ===========================

def get_start_date() -> pd.Timestamp:
    """Return last timestamp; else 6 months back."""
    try:
        tickers_str = "', '".join(BIG_FIVE_SYMBOLS)
        query = f"SELECT MAX(timestamp) as last_ts FROM `{table_ref}` WHERE ticker IN ('{tickers_str}')"
        result = client.query(query).to_dataframe()
        last_ts = result["last_ts"].iloc[0]
        
        if pd.isna(last_ts):
            raise ValueError("No data yet")
            
        # Convert BQ timestamp to pandas
        last_ts = pd.to_datetime(last_ts, utc=True)
        
        # PRO-TIP: Instead of +1 second, fetch from the last_ts date itself.
        # Your deduplication function will handle the overlap perfectly.
        # This ensures that if the market was still open when you last fetched,
        # you get the final official closing price.
        start_date = last_ts.tz_convert(EASTERN_TZ)
        logger.info("Incremental run, checking from %s (Inclusive)", start_date.date())
    except Exception:
        start_date = pd.Timestamp.now(EASTERN_TZ) - pd.DateOffset(months=6)
        logger.info("First run, fetching last 6 months (%s)", start_date.date())
    return start_date

def fetch_stock_data(symbols, start_date, interval="1d"):
    """Fetch historical stock data using yfinance."""
    all_data = []

    for sym in symbols:
        try:
            logger.info(f"Fetching {sym} from {start_date.date()} via yfinance")
            # We don't need an 'end' date, it will default to 'today'
            df = yf.download(sym, start=start_date.date(), progress=False, interval=interval)
            
            if df.empty:
                continue

            # Handle the multi-index columns yfinance sometimes returns
            df = df.reset_index()
            if isinstance(df.columns, pd.MultiIndex):
                df.columns = df.columns.get_level_values(0)
            
            df.rename(columns={
                "Date": "timestamp", "Datetime": "timestamp",
                "Open": "open", "High": "high", "Low": "low",
                "Close": "close", "Volume": "volume"
            }, inplace=True, errors='ignore')

            # Ensure column names are lowercase for BigQuery
            df.columns = [c.lower() for c in df.columns]
            
            df["ticker"] = sym
            df["ingested_at"] = pd.Timestamp.now(timezone.utc)
            
            # Select and order columns
            df = df[["timestamp", "ticker", "open", "high", "low", "close", "volume", "ingested_at"]]
            
            # CRITICAL: yfinance 'Date' is usually just a date. 
            # Force it to a UTC Timestamp so BigQuery doesn't complain.
            df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)
            
            all_data.append(df)

        except Exception as e:
            logger.error(f"Failed fetching {sym}: {e}")

    return pd.concat(all_data, ignore_index=True) if all_data else pd.DataFrame()

def deduplicate_against_bq(df: pd.DataFrame) -> pd.DataFrame:
    """Remove rows already present in BigQuery."""
    if df.empty:
        return df

    # Tickers for the query
    tickers = df["ticker"].unique().tolist()
    min_ts = df["timestamp"].min()

    query = f"""
        SELECT timestamp, ticker
        FROM `{table_ref}`
        WHERE ticker IN UNNEST(@tickers)
          AND timestamp >= @min_ts
    """
    job_config = bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ArrayQueryParameter("tickers", "STRING", tickers),
            bigquery.ScalarQueryParameter("min_ts", "TIMESTAMP", min_ts),
        ]
    )
    
    try:
        existing = client.query(query, job_config=job_config).to_dataframe()
        if not existing.empty:
            existing["timestamp"] = pd.to_datetime(existing["timestamp"], utc=True)
            before = len(df)
            
            # Anti-join: Keep only rows in DF that are NOT in BQ
            # This logic protects against duplicates but prevents updates to existing rows.
            # To allow updates, one would typically DELETE matching rows from BQ first.
            # For this 'Bronze' append-only pattern, ignoring duplicates is standard.
            df = df.merge(existing, on=["timestamp", "ticker"], how="left", indicator=True)
            df = df[df["_merge"] == "left_only"].drop(columns=["_merge"])
            
            logger.info("Removed %d duplicates already in BQ", before - len(df))
    except Exception as e:
        logger.warning(f"Could not deduplicate against BQ (table might not exist yet): {e}")
        
    return df

def load_to_bigquery(df: pd.DataFrame) -> None:
    """Load DataFrame into BigQuery."""
    if df.empty:
        logger.info("No new rows to load")
        return
        
    job_config = bigquery.LoadJobConfig(
        write_disposition="WRITE_APPEND", 
        autodetect=True,
        # Ensure timestamp is partitioned if you decide to optimize later
    )
    job = client.load_table_from_dataframe(df, table_ref, job_config=job_config)
    job.result()
    logger.info("Successfully loaded %d rows into %s", len(df), table_ref)

# ===========================
# MAIN
# ===========================
def main():
    logger.info("BigFive Bronze ETL (yfinance) started")
    start_run = datetime.now(timezone.utc)
    
    start_date = get_start_date()
    df = fetch_stock_data(BIG_FIVE_SYMBOLS, start_date, interval="1d")
    df = deduplicate_against_bq(df)
    load_to_bigquery(df)
    
    duration = (datetime.now(timezone.utc) - start_run).total_seconds()
    logger.info("ETL completed in %.2fs", duration)

if __name__ == "__main__":
    main()