import os
import sys
import logging
from datetime import datetime, timezone
import pandas as pd
import requests
from google.cloud import bigquery

# ===========================
# CONFIGURATION
# ===========================
PROJECT_ID = os.environ.get("GCP_PROJECT", "faang-stock-analytics")
DATASET_ID = os.environ.get("GCP_DATASET", "faang_dataset")
TABLE_ID = os.environ.get("BRONZE_TABLE", "bronze")
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO").upper()

CRYPTO_SYMBOLS = {
    "bitcoin": "BTC",
    "ethereum": "ETH"
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
def get_start_date_for_crypto(ticker: str) -> pd.Timestamp:
    """Return last timestamp for crypto ticker; else 6 months back."""
    try:
        query = f"""
            SELECT MAX(timestamp) as last_ts 
            FROM `{table_ref}` 
            WHERE ticker = @ticker
        """
        job_config = bigquery.QueryJobConfig(
            query_parameters=[bigquery.ScalarQueryParameter("ticker", "STRING", ticker)]
        )
        result = client.query(query, job_config=job_config).to_dataframe()
        last_ts = result["last_ts"].iloc[0]
        
        if pd.isna(last_ts):
            raise ValueError("No data yet")
            
        # Convert BQ timestamp to pandas
        last_ts = pd.to_datetime(last_ts, utc=True)
        start_date = last_ts
        logger.info(f"Incremental run for {ticker}, checking from %s (Inclusive)", start_date.date())
    except Exception:
        start_date = pd.Timestamp.now(timezone.utc) - pd.DateOffset(months=6)
        logger.info(f"First run for {ticker}, fetching last 6 months (%s)", start_date.date())
    return start_date

def fetch_crypto_data(crypto_id: str, ticker: str, start_date: pd.Timestamp):
    """Fetch historical crypto data from CoinGecko API."""
    logger.info(f"Fetching {ticker} ({crypto_id}) from {start_date.date()} via CoinGecko")
    
    # Calculate days since start_date
    days = (pd.Timestamp.now(timezone.utc) - start_date).days + 1
    days = max(1, min(days, 365))  # CoinGecko free tier limit
    
    try:
        url = f"https://api.coingecko.com/api/v3/coins/{crypto_id}/market_chart"
        params = {
            'vs_currency': 'usd',
            'days': days,
            'interval': 'daily'
        }
        
        response = requests.get(url, params=params, timeout=30)
        response.raise_for_status()
        data = response.json()
        
        # Extract prices and volumes
        prices = data.get('prices', [])
        volumes = data.get('total_volumes', [])
        
        if not prices:
            logger.warning(f"No price data returned for {ticker}")
            return pd.DataFrame()
        
        # Convert to DataFrame
        df = pd.DataFrame(prices, columns=['timestamp_ms', 'close'])
        df['timestamp'] = pd.to_datetime(df['timestamp_ms'], unit='ms', utc=True)
        
        # Add volume data
        volume_dict = {v[0]: v[1] for v in volumes}
        df['volume'] = df['timestamp_ms'].map(volume_dict).fillna(0)
        
        # Crypto doesn't have OHLC in free API, use close for all
        df['open'] = df['close']
        df['high'] = df['close']
        df['low'] = df['close']
        df['ticker'] = ticker
        df['ingested_at'] = pd.Timestamp.now(timezone.utc)
        
        # Select and order columns to match stock data schema
        df = df[['timestamp', 'ticker', 'open', 'high', 'low', 'close', 'volume', 'ingested_at']]
        
        # Convert volume to int64 to match schema
        df['volume'] = df['volume'].astype('int64')
        
        logger.info(f"Fetched {len(df)} records for {ticker}")
        return df
        
    except Exception as e:
        logger.error(f"Failed fetching {ticker}: {e}")
        return pd.DataFrame()

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
            df = df.merge(existing, on=["timestamp", "ticker"], how="left", indicator=True)
            df = df[df["_merge"] == "left_only"].drop(columns=["_merge"])
            
            logger.info("Removed %d duplicates already in BQ", before - len(df))
    except Exception as e:
        logger.warning(f"Could not deduplicate against BQ: {e}")
        
    return df

def load_to_bigquery(df: pd.DataFrame) -> None:
    """Load DataFrame into BigQuery."""
    if df.empty:
        logger.info("No new rows to load")
        return
        
    job_config = bigquery.LoadJobConfig(
        write_disposition="WRITE_APPEND", 
        autodetect=True,
    )
    job = client.load_table_from_dataframe(df, table_ref, job_config=job_config)
    job.result()
    logger.info("Successfully loaded %d rows into %s", len(df), table_ref)

# ===========================
# MAIN
# ===========================
def main():
    logger.info("Crypto Bronze ETL (CoinGecko) started")
    start_run = datetime.now(timezone.utc)
    
    all_data = []
    
    for crypto_id, ticker in CRYPTO_SYMBOLS.items():
        start_date = get_start_date_for_crypto(ticker)
        df = fetch_crypto_data(crypto_id, ticker, start_date)
        if not df.empty:
            all_data.append(df)
    
    if all_data:
        combined_df = pd.concat(all_data, ignore_index=True)
        combined_df = deduplicate_against_bq(combined_df)
        load_to_bigquery(combined_df)
    else:
        logger.info("No crypto data to load")
    
    duration = (datetime.now(timezone.utc) - start_run).total_seconds()
    logger.info("Crypto ETL completed in %.2fs", duration)

if __name__ == "__main__":
    main()
