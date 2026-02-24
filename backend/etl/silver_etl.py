import os
import sys
import logging
from datetime import datetime, timezone
import pandas as pd
# import pandas_market_calendars as mcal  <-- Removed to reduce dependencies
from google.cloud import bigquery

# ===========================
# CONFIG
# ===========================
PROJECT_ID = os.getenv("GCP_PROJECT", "faang-stock-analytics")
DATASET = os.getenv("GCP_DATASET", "faang_dataset")
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
        daily_return FLOAT64,
        -- MACD Components
        ema_12 FLOAT64,
        ema_26 FLOAT64,
        macd_line FLOAT64,
        macd_signal FLOAT64,
        macd_histogram FLOAT64,
        -- Bollinger Bands
        bb_middle FLOAT64,
        bb_upper FLOAT64,
        bb_lower FLOAT64,
        bb_width FLOAT64,
        -- Volume Analysis
        vma_20 FLOAT64,
        volume_ratio FLOAT64
    )
    PARTITION BY trade_date
    CLUSTER BY ticker
    """
    client.query(create_sql).result()
    logger.info(f"Silver table ensured: {silver_ref}")

def get_last_trade_date():
    """Return last trade_date from Silver table; None if empty or missing."""
    today = datetime.now(timezone.utc).date()
    lookback = today - pd.Timedelta(days=30)
    logger.info(f"Using safe lookback date: {lookback}")
    return str(lookback)

def get_dates_to_process(last_trade_date):
    """
    Return distinct dates from Bronze that are later than the last Silver date.
    This ensures we process whatever data is available (Data-Driven), 
    rather than relying on an external calendar library.
    """
    try:
        if last_trade_date:
            query = f"""
                SELECT DISTINCT DATE(timestamp) as trade_date 
                FROM `{bronze_ref}` 
                WHERE DATE(timestamp) > '{last_trade_date}'
                ORDER BY trade_date ASC
            """
        else:
            query = f"""
                SELECT DISTINCT DATE(timestamp) as trade_date 
                FROM `{bronze_ref}` 
                ORDER BY trade_date ASC
            """
            
        df = client.query(query).to_dataframe()
        if df.empty:
            logger.info("No new dates found in Bronze table.")
            return []
            
        dates = df["trade_date"].tolist()
        logger.info(f"Found {len(dates)} new days to process: {[str(d) for d in dates]}")
        return dates
        
    except Exception as e:
        logger.error(f"Failed to fetch dates from Bronze: {e}")
        return []

def build_incremental_sql(last_trade_date) -> str:
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
    with_arrays AS (
        SELECT
            *,
            ARRAY_AGG(close) OVER (PARTITION BY ticker ORDER BY trade_date DESC ROWS BETWEEN 25 PRECEDING AND CURRENT ROW) AS arr26,
            ARRAY_AGG(close) OVER (PARTITION BY ticker ORDER BY trade_date DESC ROWS BETWEEN 11 PRECEDING AND CURRENT ROW) AS arr12
        FROM returns
    ),
    indicators AS (
        SELECT
            * EXCEPT (arr26, arr12),
            -- True EMA-12 (alpha = 2/13)
            CASE WHEN ARRAY_LENGTH(arr12) = 12
                THEN (SELECT SUM(v * POW(11/13, off)) / SUM(POW(11/13, off)) FROM UNNEST(arr12) AS v WITH OFFSET off)
                ELSE NULL END AS ema_12,
            -- True EMA-26 (alpha = 2/27)
            CASE WHEN ARRAY_LENGTH(arr26) = 26
                THEN (SELECT SUM(v * POW(25/27, off)) / SUM(POW(25/27, off)) FROM UNNEST(arr26) AS v WITH OFFSET off)
                ELSE NULL END AS ema_26,
            -- Bollinger Bands components
            AVG(close) OVER (
                PARTITION BY ticker 
                ORDER BY trade_date 
                ROWS BETWEEN 19 PRECEDING AND CURRENT ROW
            ) AS bb_middle,
            STDDEV(close) OVER (
                PARTITION BY ticker 
                ORDER BY trade_date 
                ROWS BETWEEN 19 PRECEDING AND CURRENT ROW
            ) AS bb_std,
            -- Volume Moving Average
            AVG(total_volume) OVER (
                PARTITION BY ticker 
                ORDER BY trade_date 
                ROWS BETWEEN 19 PRECEDING AND CURRENT ROW
            ) AS vma_20
        FROM with_arrays
    ),
    macd_calc AS (
        SELECT
            *,
            (ema_12 - ema_26) AS macd_line
        FROM indicators
    ),
    with_signal_array AS (
        SELECT
            *,
            ARRAY_AGG(macd_line) OVER (PARTITION BY ticker ORDER BY trade_date DESC ROWS BETWEEN 8 PRECEDING AND CURRENT ROW) AS arr_signal
        FROM macd_calc
    ),
    macd_signal_calc AS (
        SELECT
            * EXCEPT (arr_signal),
            CASE WHEN macd_line IS NOT NULL AND ARRAY_LENGTH(arr_signal) = 9
                THEN (SELECT SUM(v * POW(0.8, off)) / SUM(POW(0.8, off)) FROM UNNEST(arr_signal) AS v WITH OFFSET off)
                ELSE NULL END AS macd_signal
        FROM with_signal_array
    ),
    final_indicators AS (
        SELECT
            * EXCEPT (bb_std),
            -- MACD Histogram = MACD Line - Signal
            (macd_line - macd_signal) AS macd_histogram,
            -- Bollinger Bands
            (bb_middle + (2 * bb_std)) AS bb_upper,
            (bb_middle - (2 * bb_std)) AS bb_lower,
            -- BB Width = (Upper - Lower) / Middle
            SAFE_DIVIDE((bb_middle + (2 * bb_std)) - (bb_middle - (2 * bb_std)), bb_middle) AS bb_width,
            -- Volume Ratio = Current Volume / VMA
            SAFE_DIVIDE(total_volume, vma_20) AS volume_ratio
        FROM macd_signal_calc
    ),
    incremental AS (
        SELECT * 
        FROM final_indicators
        WHERE {f"trade_date > '{last_trade_date}'" if last_trade_date else "TRUE"}
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
        daily_return = source.daily_return,
        ema_12 = source.ema_12,
        ema_26 = source.ema_26,
        macd_line = source.macd_line,
        macd_signal = source.macd_signal,
        macd_histogram = source.macd_histogram,
        bb_middle = source.bb_middle,
        bb_upper = source.bb_upper,
        bb_lower = source.bb_lower,
        bb_width = source.bb_width,
        vma_20 = source.vma_20,
        volume_ratio = source.volume_ratio
    WHEN NOT MATCHED THEN
      INSERT (trade_date, ticker, open, high, low, close, total_volume, ingested_at, daily_return,
              ema_12, ema_26, macd_line, macd_signal, macd_histogram,
              bb_middle, bb_upper, bb_lower, bb_width, vma_20, volume_ratio)
      VALUES (source.trade_date, source.ticker, source.open, source.high, source.low, source.close, 
              source.total_volume, source.ingested_at, source.daily_return,
              source.ema_12, source.ema_26, source.macd_line, source.macd_signal, source.macd_histogram,
              source.bb_middle, source.bb_upper, source.bb_lower, source.bb_width, source.vma_20, source.volume_ratio)
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

    # Get days to process directly from Bronze Data
    new_dates = get_dates_to_process(last_trade_date)

    if not new_dates:
        logger.info("Silver ETL is up to date.")
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