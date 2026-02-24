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
        bb_lower FLOAT64,
        bb_width FLOAT64,
        vma_20 FLOAT64,
        volume_ratio FLOAT64,
        ema_12 FLOAT64,
        ema_26 FLOAT64
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

      -- Arrays of recent closes (most recent first) for true EMA
      with_arrays AS (
        SELECT
          *,
          ARRAY_AGG(close) OVER (PARTITION BY ticker ORDER BY trade_date DESC ROWS BETWEEN 25 PRECEDING AND CURRENT ROW) AS arr26,
          ARRAY_AGG(close) OVER (PARTITION BY ticker ORDER BY trade_date DESC ROWS BETWEEN 11 PRECEDING AND CURRENT ROW) AS arr12
        FROM daily
      ),

      macd_base AS (
        SELECT
          * EXCEPT (arr26, arr12),
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

          -- RSI-14
          CASE
            WHEN COUNT(*) OVER (PARTITION BY ticker ORDER BY trade_date ROWS BETWEEN 13 PRECEDING AND CURRENT ROW) = 14
            THEN 100 - (
              100 / (1 + SAFE_DIVIDE(
                AVG(IF(daily_return > 0, daily_return, 0)) OVER (PARTITION BY ticker ORDER BY trade_date ROWS BETWEEN 13 PRECEDING AND CURRENT ROW),
                AVG(IF(daily_return < 0, ABS(daily_return), 0)) OVER (PARTITION BY ticker ORDER BY trade_date ROWS BETWEEN 13 PRECEDING AND CURRENT ROW)
              ))
            )
            ELSE NULL
          END AS rsi_14,

          -- True EMA-12 (alpha = 2/13), weight = (11/13)^offset
          CASE
            WHEN ARRAY_LENGTH(arr12) = 12
            THEN (SELECT SUM(v * POW(11/13, off)) / SUM(POW(11/13, off)) FROM UNNEST(arr12) AS v WITH OFFSET off)
            ELSE NULL
          END AS ema_12,

          -- True EMA-26 (alpha = 2/27), weight = (25/27)^offset
          CASE
            WHEN ARRAY_LENGTH(arr26) = 26
            THEN (SELECT SUM(v * POW(25/27, off)) / SUM(POW(25/27, off)) FROM UNNEST(arr26) AS v WITH OFFSET off)
            ELSE NULL
          END AS ema_26,

          -- MACD Line = EMA12 - EMA26 (true EMA)
          CASE
            WHEN ARRAY_LENGTH(arr12) = 12 AND ARRAY_LENGTH(arr26) = 26
            THEN
              (SELECT SUM(v * POW(11/13, off)) / SUM(POW(11/13, off)) FROM UNNEST(arr12) AS v WITH OFFSET off)
              - (SELECT SUM(v * POW(25/27, off)) / SUM(POW(25/27, off)) FROM UNNEST(arr26) AS v WITH OFFSET off)
            ELSE NULL
          END AS macd_line,

          -- Bollinger Bands
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
          END AS bb_lower,

          -- Volume Moving Average (20-day)
          CASE
            WHEN COUNT(*) OVER (PARTITION BY ticker ORDER BY trade_date ROWS BETWEEN 19 PRECEDING AND CURRENT ROW) = 20
            THEN AVG(total_volume) OVER (PARTITION BY ticker ORDER BY trade_date ROWS BETWEEN 19 PRECEDING AND CURRENT ROW)
            ELSE NULL
          END AS vma_20,

          -- Bollinger Band Width
          CASE
            WHEN COUNT(*) OVER (PARTITION BY ticker ORDER BY trade_date ROWS BETWEEN 19 PRECEDING AND CURRENT ROW) = 20
            THEN SAFE_DIVIDE(
              (AVG(close) OVER (PARTITION BY ticker ORDER BY trade_date ROWS BETWEEN 19 PRECEDING AND CURRENT ROW) +
               (2 * STDDEV(close) OVER (PARTITION BY ticker ORDER BY trade_date ROWS BETWEEN 19 PRECEDING AND CURRENT ROW))) -
              (AVG(close) OVER (PARTITION BY ticker ORDER BY trade_date ROWS BETWEEN 19 PRECEDING AND CURRENT ROW) -
               (2 * STDDEV(close) OVER (PARTITION BY ticker ORDER BY trade_date ROWS BETWEEN 19 PRECEDING AND CURRENT ROW))),
              AVG(close) OVER (PARTITION BY ticker ORDER BY trade_date ROWS BETWEEN 19 PRECEDING AND CURRENT ROW)
            )
            ELSE NULL
          END AS bb_width,

          -- Volume Ratio
          CASE
            WHEN COUNT(*) OVER (PARTITION BY ticker ORDER BY trade_date ROWS BETWEEN 19 PRECEDING AND CURRENT ROW) = 20
            THEN SAFE_DIVIDE(
              total_volume,
              AVG(total_volume) OVER (PARTITION BY ticker ORDER BY trade_date ROWS BETWEEN 19 PRECEDING AND CURRENT ROW)
            )
            ELSE NULL
          END AS volume_ratio
        FROM daily
      ),

      -- Array of last 9 MACD line values for Signal EMA
      with_signal_array AS (
        SELECT
          *,
          ARRAY_AGG(macd_line) OVER (PARTITION BY ticker ORDER BY trade_date DESC ROWS BETWEEN 8 PRECEDING AND CURRENT ROW) AS arr_signal
        FROM macd_base
      ),
      metrics AS (
        SELECT
          * EXCEPT (arr_signal),
          -- MACD Signal = 9-period EMA of MACD line (alpha = 2/10)
          CASE
            WHEN macd_line IS NOT NULL AND ARRAY_LENGTH(arr_signal) = 9
            THEN (SELECT SUM(v * POW(0.8, off)) / SUM(POW(0.8, off)) FROM UNNEST(arr_signal) AS v WITH OFFSET off)
            ELSE NULL
          END AS macd_signal
        FROM with_signal_array
      ),

      final AS (
        SELECT
          *,
          -- MACD Histogram
          CASE
            WHEN macd_line IS NOT NULL AND macd_signal IS NOT NULL
            THEN macd_line - macd_signal
            ELSE NULL
          END AS macd_histogram
        FROM metrics
      )

      SELECT *
      FROM final
      WHERE trade_date > DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
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
        bb_lower,
        bb_width,
        vma_20,
        volume_ratio,
        ema_12,
        ema_26
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
        src.bb_lower,
        src.bb_width,
        src.vma_20,
        src.volume_ratio,
        src.ema_12,
        src.ema_26
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