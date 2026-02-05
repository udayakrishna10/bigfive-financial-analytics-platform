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
# HELPERS
# ===========================
def get_gold_row_count() -> int:
    try:
        df = client.query(f"SELECT COUNT(*) cnt FROM `{GOLD_REF}`").to_dataframe()
        return int(df["cnt"].iloc[0])
    except Exception:
        return 0

# ===========================
# GOLD ETL
# ===========================
def run_gold_etl():
    logger.info("Starting Gold ETL...")
    start_time = datetime.now(timezone.utc)

    before_rows = get_gold_row_count()

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
        cumulative_return FLOAT64,
        ma_20 FLOAT64,
        ma_50 FLOAT64,
        rsi_14 FLOAT64,
        macd_line FLOAT64,
        macd_signal FLOAT64,
        macd_histogram FLOAT64,
        bb_upper FLOAT64,
        bb_middle FLOAT64,
        bb_lower FLOAT64
    )
    PARTITION BY trade_date
    CLUSTER BY ticker;

    MERGE `{GOLD_REF}` AS gold
    USING (
      WITH base AS (
        SELECT
          trade_date,
          ticker,
          open,
          high,
          low,
          close,
          total_volume,
          ingested_at
        FROM `{SILVER_REF}`
      ),

      daily AS (
        SELECT
          *,
          COALESCE(
            SAFE_DIVIDE(
              close - LAG(close) OVER (PARTITION BY ticker ORDER BY trade_date),
              LAG(close) OVER (PARTITION BY ticker ORDER BY trade_date)
            ),
            0
          ) AS daily_return
        FROM base
      ),

      metrics AS (
        SELECT
          *,
          SUM(daily_return) OVER (PARTITION BY ticker ORDER BY trade_date) AS cumulative_return,

          -- MA-20
          CASE
            WHEN COUNT(*) OVER (PARTITION BY ticker ORDER BY trade_date ROWS BETWEEN 19 PRECEDING AND CURRENT ROW)=20
            THEN AVG(close) OVER (PARTITION BY ticker ORDER BY trade_date ROWS BETWEEN 19 PRECEDING AND CURRENT ROW)
            ELSE NULL
          END AS ma_20,

          -- MA-50
          CASE
            WHEN COUNT(*) OVER (PARTITION BY ticker ORDER BY trade_date ROWS BETWEEN 49 PRECEDING AND CURRENT ROW)=50
            THEN AVG(close) OVER (PARTITION BY ticker ORDER BY trade_date ROWS BETWEEN 49 PRECEDING AND CURRENT ROW)
            ELSE NULL
          END AS ma_50,

          -- RSI-14 (avoid NULL in warm-up using at least 1 row)
          CASE
            WHEN COUNT(*) OVER (PARTITION BY ticker ORDER BY trade_date ROWS BETWEEN 13 PRECEDING AND CURRENT ROW) >= 1
            THEN 100 - (
              100 / (1 + SAFE_DIVIDE(
                AVG(IF(daily_return > 0, daily_return, 0)) OVER (PARTITION BY ticker ORDER BY trade_date ROWS BETWEEN 13 PRECEDING AND CURRENT ROW),
                AVG(IF(daily_return < 0, ABS(daily_return), 0)) OVER (PARTITION BY ticker ORDER BY trade_date ROWS BETWEEN 13 PRECEDING AND CURRENT ROW)
              ))
            )
            ELSE NULL
          END AS rsi_14,

          -- MACD (12-day EMA - 26-day EMA)
          CASE
            WHEN COUNT(*) OVER (PARTITION BY ticker ORDER BY trade_date ROWS BETWEEN 25 PRECEDING AND CURRENT ROW) = 26
            THEN (
              AVG(close) OVER (PARTITION BY ticker ORDER BY trade_date ROWS BETWEEN 11 PRECEDING AND CURRENT ROW) -
              AVG(close) OVER (PARTITION BY ticker ORDER BY trade_date ROWS BETWEEN 25 PRECEDING AND CURRENT ROW)
            )
            ELSE NULL
          END AS macd_line,

          -- MACD Signal (9-day SMA of MACD)
          CASE
            WHEN COUNT(*) OVER (PARTITION BY ticker ORDER BY trade_date ROWS BETWEEN 33 PRECEDING AND CURRENT ROW) = 34
            THEN AVG(
              AVG(close) OVER (PARTITION BY ticker ORDER BY trade_date ROWS BETWEEN 11 PRECEDING AND CURRENT ROW) -
              AVG(close) OVER (PARTITION BY ticker ORDER BY trade_date ROWS BETWEEN 25 PRECEDING AND CURRENT ROW)
            ) OVER (PARTITION BY ticker ORDER BY trade_date ROWS BETWEEN 8 PRECEDING AND CURRENT ROW)
            ELSE NULL
          END AS macd_signal,

          -- MACD Histogram (MACD - Signal)
          CASE
            WHEN COUNT(*) OVER (PARTITION BY ticker ORDER BY trade_date ROWS BETWEEN 33 PRECEDING AND CURRENT ROW) = 34
            THEN macd_line - macd_signal
            ELSE NULL
          END AS macd_histogram,

          -- Bollinger Bands (20-day SMA ± 2 standard deviations)
          CASE
            WHEN COUNT(*) OVER (PARTITION BY ticker ORDER BY trade_date ROWS BETWEEN 19 PRECEDING AND CURRENT ROW) = 20
            THEN AVG(close) OVER (PARTITION BY ticker ORDER BY trade_date ROWS BETWEEN 19 PRECEDING AND CURRENT ROW) +
                 (2 * STDDEV(close) OVER (PARTITION BY ticker ORDER BY trade_date ROWS BETWEEN 19 PRECEDING AND CURRENT ROW))
            ELSE NULL
          END AS bb_upper,

          CASE
            WHEN COUNT(*) OVER (PARTITION BY ticker ORDER BY trade_date ROWS BETWEEN 19 PRECEDING AND CURRENT ROW) = 20
            THEN AVG(close) OVER (PARTITION BY ticker ORDER BY trade_date ROWS BETWEEN 19 PRECEDING AND CURRENT ROW)
            ELSE NULL
          END AS bb_middle,

          CASE
            WHEN COUNT(*) OVER (PARTITION BY ticker ORDER BY trade_date ROWS BETWEEN 19 PRECEDING AND CURRENT ROW) = 20
            THEN AVG(close) OVER (PARTITION BY ticker ORDER BY trade_date ROWS BETWEEN 19 PRECEDING AND CURRENT ROW) -
                 (2 * STDDEV(close) OVER (PARTITION BY ticker ORDER BY trade_date ROWS BETWEEN 19 PRECEDING AND CURRENT ROW))
            ELSE NULL
          END AS bb_lower
        FROM daily
      )

      SELECT *
      FROM metrics
      WHERE trade_date > (SELECT IFNULL(MAX(trade_date), DATE '1900-01-01') FROM `{GOLD_REF}`)
    ) AS src
    ON gold.trade_date = src.trade_date AND gold.ticker = src.ticker

    WHEN NOT MATCHED THEN
      INSERT (
        trade_date,
        ticker,
        open,
        high,
        low,
        close,
        total_volume,
        ingested_at,
        daily_return,
        cumulative_return,
        ma_20,
        ma_50,
        rsi_14,
        macd_line,
        macd_signal,
        macd_histogram,
        bb_upper,
        bb_middle,
        bb_lower
      )
      VALUES (
        src.trade_date,
        src.ticker,
        src.open,
        src.high,
        src.low,
        src.close,
        src.total_volume,
        src.ingested_at,
        src.daily_return,
        src.cumulative_return,
        src.ma_20,
        src.ma_50,
        src.rsi_14,
        src.macd_line,
        src.macd_signal,
        src.macd_histogram,
        src.bb_upper,
        src.bb_middle,
        src.bb_lower
      );
    """

    try:
        client.query(sql).result()
        logger.info("Gold ETL completed successfully.")
    except Exception as e:
        logger.error(f"Gold ETL failed: {e}")
        sys.exit(1)

    after_rows = get_gold_row_count()
    logger.info(f"New rows added: {after_rows - before_rows}")

    duration = (datetime.now(timezone.utc) - start_time).total_seconds()
    logger.info(f"Gold ETL finished in {duration:.2f}s")

# ===========================
# ENTRYPOINT
# ===========================
if __name__ == "__main__":
    run_gold_etl()