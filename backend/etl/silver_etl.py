import os
import sys
import logging
from datetime import datetime, timezone
import pandas as pd
import pandas_market_calendars as mcal
from google.cloud import bigquery

# ===========================
# CONFIG
# ===========================
PROJECT_ID = os.getenv("GCP_PROJECT", "big-five-analytics")
DATASET = os.getenv("GCP_DATASET", "big_five_dataset")
BRONZE_TABLE = os.getenv("BRONZE_TABLE", "bronze")
SILVER_TABLE = os.getenv("SILVER_TABLE", "silver")
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()

# Fully qualified table references
bronze_ref = f"{PROJECT_ID}.{DATASET}.{BRONZE_TABLE}"
silver_ref = f"{PROJECT_ID}.{DATASET}.{SILVER_TABLE}"

# ===========================
# LOGGING
# ===========================
logging.basicConfig(
    level=LOG_LEVEL,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)

logger.info(f"Bronze table: {bronze_ref}")
logger.info(f"Silver table: {silver_ref}")

# ===========================
# BIGQUERY CLIENT
# ===========================
client = bigquery.Client(project=PROJECT_ID)

# ===========================
# FUNCTIONS
# ===========================
def ensure_silver_table():
    """Create Silver table if it does not exist (DDL must be separate)."""
    create_sql = f"""
    CREATE TABLE IF NOT EXISTS `{silver_ref}` (
        trade_date DATE,
        ticker STRING,
        open FLOAT64,
        high FLOAT64,
        low FLOAT64,
        close FLOAT64,
        total_volume INT64,
        ingested_at TIMESTAMP,
        daily_return FLOAT64
    )
    PARTITION BY trade_date
    CLUSTER BY ticker
    """
    client.query(create_sql).result()
    logger.info(f"Silver table ensured: {silver_ref}")

def get_last_trade_date() -> str | None:
    """Return last trade_date from Silver table; None if empty or missing."""
    try:
        query = f"SELECT MAX(trade_date) AS last_trade_date FROM `{silver_ref}`"
        result = client.query(query).to_dataframe()
        if result.empty or pd.isna(result["last_trade_date"].iloc[0]):
            logger.info("Silver table empty; running full ETL.")
            return None
        last_date = result["last_trade_date"].iloc[0]
        logger.info(f"Last silver trade_date: {last_date}")
        return str(last_date)
    except Exception as e:
        logger.info(f"Silver table missing or error: {e}. Running full ETL.")
        return None

def get_nyse_trading_days(last_trade_date: str | None) -> pd.DatetimeIndex:
    """Return NYSE trading days after last_trade_date."""
    nyse = mcal.get_calendar("NYSE")
    start = pd.to_datetime(last_trade_date) + pd.Timedelta(days=1) if last_trade_date else pd.Timestamp.now() - pd.DateOffset(months=6)
    end = pd.Timestamp.now()
    schedule = nyse.schedule(start_date=start, end_date=end)
    trading_days = schedule.index
    logger.info(f"NYSE trading days to process: {len(trading_days)}")
    return trading_days

def build_incremental_sql(last_trade_date: str | None) -> str:
    """Incremental SQL to build Silver table from Bronze."""
    bronze_filter = f"WHERE DATE(timestamp) >= DATE_SUB('{last_trade_date}', INTERVAL 1 DAY)" if last_trade_date else ""

    sql = f"""
    WITH daily AS (
        SELECT
            DATE(timestamp) AS trade_date,
            ticker,
            ARRAY_AGG(open ORDER BY timestamp ASC LIMIT 1)[OFFSET(0)] AS open,
            MAX(high) AS high,
            MIN(low) AS low,
            ARRAY_AGG(close ORDER BY timestamp DESC LIMIT 1)[OFFSET(0)] AS close,
            SUM(volume) AS total_volume,
            CURRENT_TIMESTAMP() AS ingested_at
        FROM `{bronze_ref}`
        {bronze_filter}
        GROUP BY trade_date, ticker
    ),
    returns AS (
        SELECT
            *,
            SAFE_DIVIDE(
                close - COALESCE(LAG(close) OVER (PARTITION BY ticker ORDER BY trade_date), close),
                COALESCE(LAG(close) OVER (PARTITION BY ticker ORDER BY trade_date), close)
            ) AS daily_return
        FROM daily
    ),
    incremental AS (
        SELECT * 
        FROM returns
        WHERE trade_date > '{last_trade_date}' OR '{last_trade_date}' IS NULL
    )
    SELECT * FROM incremental
    """
    return sql

def merge_into_silver(query: str):
    """MERGE incremental data into Silver table."""
    merge_sql = f"""
    MERGE `{silver_ref}` AS target
    USING ({query}) AS source
    ON target.trade_date = source.trade_date AND target.ticker = source.ticker
    WHEN MATCHED THEN
      UPDATE SET
        open = source.open,
        high = source.high,
        low = source.low,
        close = source.close,
        total_volume = source.total_volume,
        ingested_at = source.ingested_at,
        daily_return = source.daily_return
    WHEN NOT MATCHED THEN
      INSERT (trade_date, ticker, open, high, low, close, total_volume, ingested_at, daily_return)
      VALUES (source.trade_date, source.ticker, source.open, source.high, source.low, source.close, source.total_volume, source.ingested_at, source.daily_return)
    """
    logger.info("Running MERGE query for Silver table...")
    client.query(merge_sql).result()
    logger.info("Silver table updated successfully.")

# ===========================
# MAIN
# ===========================
def main():
    logger.info("Starting NYSE-aware Silver ETL...")
    start_time = datetime.now(timezone.utc)

    # Ensure Silver table exists
    ensure_silver_table()

    # Get the last trade date from Silver
    last_trade_date = get_last_trade_date()

    # Get NYSE trading days after last_trade_date
    trading_days = get_nyse_trading_days(last_trade_date)

    if len(trading_days) == 0:
        logger.info("No new trading days found in NYSE calendar.")
        if last_trade_date is not None:
            return

    # Build incremental SQL
    sql = build_incremental_sql(last_trade_date)

    try:
        # Merge incremental data into Silver
        merge_into_silver(sql)

        # Optional: fetch new rows for verification
        df = client.query(sql).to_dataframe()
        logger.info(f"Processed {len(df)} rows in this ETL run.")
    except Exception as e:
        logger.error(f"Silver ETL failed: {e}")
        sys.exit(1)

    duration = (datetime.now(timezone.utc) - start_time).total_seconds()
    logger.info(f"NYSE-aware Silver ETL finished in {duration:.2f}s")


if __name__ == "__main__":
    main()