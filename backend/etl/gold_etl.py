import os
import sys
import logging
from datetime import datetime, timezone
from google.cloud import bigquery

# ===========================
# CONFIGURATION
# ===========================
PROJECT_ID = os.getenv("GCP_PROJECT", "faang-stock-analytics")
DATASET_ID = os.getenv("DATASET", "faang_dataset")
SILVER_TABLE = os.getenv("SILVER_TABLE", "silver")
GOLD_TABLE = os.getenv("GOLD_TABLE", "gold")
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()

SILVER_REF = f"{PROJECT_ID}.{DATASET_ID}.{SILVER_TABLE}"
GOLD_REF = f"{PROJECT_ID}.{DATASET_ID}.{GOLD_TABLE}"

# ===========================
# LOGGING
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

# ===========================
# GOLD ETL
# ===========================
def run_gold_etl():
    logger.info("Starting Gold ETL...")
    start_time = datetime.now(timezone.utc)

    # 1. Ensure Table Schema Exists
    sql = f"""
    CREATE TABLE IF NOT EXISTS `{GOLD_REF}` (
        trade_date DATE,
        ticker STRING,
        open FLOAT64,
        high FLOAT64,
        low FLOAT64,
        close FLOAT64,
        total_volume INT64,
        ingested_at TIMESTAMP,
        daily_return FLOAT64,
        ma_20 FLOAT64,
        ma_50 FLOAT64,
        rsi_14 FLOAT64,
        macd_line FLOAT64,
        macd_signal FLOAT64,
        macd_histogram FLOAT64,
        bb_upper FLOAT64,
        bb_middle FLOAT64,
        bb_lower FLOAT64,
        bb_width FLOAT64,
        vma_20 FLOAT64,
        volume_ratio FLOAT64,
        ema_12 FLOAT64,
        ema_26 FLOAT64
    )
    PARTITION BY trade_date
    CLUSTER BY ticker;

    -- 2. Clean Upsert Pipeline (No Math, just movement)
    MERGE `{GOLD_REF}` AS gold
    USING `{SILVER_REF}` AS silver
    ON gold.trade_date = silver.trade_date AND gold.ticker = silver.ticker
    WHEN MATCHED THEN
        UPDATE SET
            open = silver.open,
            high = silver.high,
            low = silver.low,
            close = silver.close,
            total_volume = silver.total_volume,
            ingested_at = silver.ingested_at,
            daily_return = silver.daily_return,
            ma_20 = silver.ma_20,
            ma_50 = silver.ma_50,
            rsi_14 = silver.rsi_14,
            macd_line = silver.macd_line,
            macd_signal = silver.macd_signal,
            macd_histogram = silver.macd_histogram,
            bb_upper = silver.bb_upper,
            bb_middle = silver.bb_middle,
            bb_lower = silver.bb_lower,
            bb_width = silver.bb_width,
            vma_20 = silver.vma_20,
            volume_ratio = silver.volume_ratio,
            ema_12 = silver.ema_12,
            ema_26 = silver.ema_26
    WHEN NOT MATCHED THEN
        INSERT (
            trade_date, ticker, open, high, low, close, total_volume, ingested_at,
            daily_return, ma_20, ma_50, rsi_14, macd_line, macd_signal, macd_histogram,
            bb_upper, bb_middle, bb_lower, bb_width, vma_20, volume_ratio, ema_12, ema_26
        )
        VALUES (
            silver.trade_date, silver.ticker, silver.open, silver.high, silver.low, silver.close, silver.total_volume, silver.ingested_at,
            silver.daily_return, silver.ma_20, silver.ma_50, silver.rsi_14, silver.macd_line, silver.macd_signal, silver.macd_histogram,
            silver.bb_upper, silver.bb_middle, silver.bb_lower, silver.bb_width, silver.vma_20, silver.volume_ratio, silver.ema_12, silver.ema_26
        )
    """

    logger.info("Running pure schema alignment MERGE from Silver directly to Gold...")
    client.query(sql).result()

    duration = (datetime.now(timezone.utc) - start_time).total_seconds()
    logger.info(f"Gold ETL (Aggregation) finished successfully in {duration:.2f} seconds.")

if __name__ == "__main__":
    run_gold_etl()
