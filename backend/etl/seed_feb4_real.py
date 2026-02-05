
import os
import logging
import pandas as pd
import yfinance as yf
from google.cloud import bigquery
from datetime import timedelta

# Configuration
PROJECT_ID = os.environ.get("GCP_PROJECT", "faang-stock-analytics")
DATASET_ID = os.environ.get("GCP_DATASET", "faang_dataset")
TABLE_ID = os.environ.get("BRONZE_TABLE", "bronze")
BIG_FIVE_SYMBOLS = ["AAPL", "AMZN", "META", "NFLX", "GOOGL"]

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

client = bigquery.Client(project=PROJECT_ID)
table_ref = f"{PROJECT_ID}.{DATASET_ID}.{TABLE_ID}"

def fetch_historical_and_shift(ticker):
    """
    Fetches market data from ONE YEAR AGO (Feb 4, 2025) via yfinance.
    Shifts the date to 'Today' (Feb 4, 2026) to maintain the timeline.
    """
    try:
        # Fetch data for Feb 4, 2025 (The 'real' observed data)
        # Note: If Feb 4 2025 was a weekend, fetch a range and pick the latest.
        start_date = "2025-02-04" 
        end_date = "2025-02-05"
        
        df = yf.download(ticker, start=start_date, end=end_date, progress=False, interval="1d")
        
        if df.empty:
            logger.warning(f"No data found for {ticker} on {start_date} (Weekend?). Using previous close.")
            return None

        # Clean yfinance format
        df = df.reset_index()
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)

        # Shift the timestamp to 2026 (Application Time)
        row = df.iloc[0].to_dict()
        
        return {
            "timestamp": pd.Timestamp("2026-02-04 21:00:00", tz="UTC"), # PROJECTED DATE
            "ticker": ticker,
            "open": float(row.get("Open", 0)),
            "high": float(row.get("High", 0)),
            "low": float(row.get("Low", 0)),
            "close": float(row.get("Close", 0)),
            "volume": int(row.get("Volume", 0)),
            "ingested_at": pd.Timestamp.now(tz="UTC")
        }

    except Exception as e:
        logger.error(f"Failed to fetch real yfinance data for {ticker}: {e}")
        return None

def main():
    logger.info("Starting Feb 4th Real-Data Projection...")
    rows = []
    
    for ticker in BIG_FIVE_SYMBOLS:
        data = fetch_historical_and_shift(ticker)
        if data:
            rows.append(data)
            logger.info(f"Fetched REAL data for {ticker}: Open ${data['open']} -> Close ${data['close']}")
        else:
            logger.warning(f"Skipping {ticker}")
            
    if rows:
        df = pd.DataFrame(rows)
        # Load to BigQuery
        job_config = bigquery.LoadJobConfig(write_disposition="WRITE_APPEND", autodetect=True)
        job = client.load_table_from_dataframe(df, table_ref, job_config=job_config)
        job.result()
        logger.info(f"Successfully injected {len(df)} rows for Feb 4, 2026 using REAL historical patterns.")
    else:
        logger.error("No valid rows generated.")

if __name__ == "__main__":
    main()
