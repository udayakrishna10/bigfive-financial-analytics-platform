import os
import sys
import logging
from datetime import datetime, timezone
import pandas as pd
from google.cloud import bigquery
import pandas_gbq

# ===========================
# CONFIG
# ===========================
PROJECT_ID = os.getenv("GCP_PROJECT", "faang-stock-analytics")
DATASET = os.getenv("GCP_DATASET", "faang_dataset")
BRONZE_TABLE = os.getenv("BRONZE_TABLE", "bronze")
SILVER_TABLE = os.getenv("SILVER_TABLE", "silver")
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()

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

# ===========================
# BIGQUERY CLIENT
# ===========================
client = bigquery.Client(project=PROJECT_ID)

# ===========================
# FUNCTIONS
# ===========================
def ensure_silver_table():
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
        ma_20 FLOAT64,
        ma_50 FLOAT64,
        rsi_14 FLOAT64,
        ema_12 FLOAT64,
        ema_26 FLOAT64,
        macd_line FLOAT64,
        macd_signal FLOAT64,
        macd_histogram FLOAT64,
        bb_middle FLOAT64,
        bb_upper FLOAT64,
        bb_lower FLOAT64,
        bb_width FLOAT64,
        vma_20 FLOAT64,
        volume_ratio FLOAT64
    )
    PARTITION BY trade_date
    CLUSTER BY ticker
    """
    client.query(create_sql).result()
    logger.info(f"Silver table ensured: {silver_ref}")

def calculate_indicators(df: pd.DataFrame) -> pd.DataFrame:
    # Sort chronologically
    df = df.sort_values(["ticker", "trade_date"]).reset_index(drop=True)
    
    # 1. Daily Return
    df["daily_return"] = df.groupby("ticker")["close"].pct_change().fillna(0)
    
    # 2. Moving Averages
    df["ma_20"] = df.groupby("ticker")["close"].transform(lambda x: x.rolling(20, min_periods=20).mean())
    df["ma_50"] = df.groupby("ticker")["close"].transform(lambda x: x.rolling(50, min_periods=50).mean())
    
    # 3. Wilder's RSI (14)
    delta = df.groupby("ticker")["close"].diff()
    gain = delta.where(delta > 0, 0)
    loss = -delta.where(delta < 0, 0)
    
    # We must calculate EWM per ticker
    def calc_rma(series, period):
        return series.ewm(alpha=1/period, min_periods=period, adjust=False).mean()
        
    avg_gain = gain.groupby(df["ticker"]).transform(lambda x: calc_rma(x, 14))
    avg_loss = loss.groupby(df["ticker"]).transform(lambda x: calc_rma(x, 14))
    
    rs = avg_gain / avg_loss
    df["rsi_14"] = 100 - (100 / (1 + rs))
    
    # 4. MACD
    def calc_ema(series, span):
        return series.ewm(span=span, adjust=False).mean()
        
    df["ema_12"] = df.groupby("ticker")["close"].transform(lambda x: calc_ema(x, 12))
    df["ema_26"] = df.groupby("ticker")["close"].transform(lambda x: calc_ema(x, 26))
    df["macd_line"] = df["ema_12"] - df["ema_26"]
    df["macd_signal"] = df.groupby("ticker")["macd_line"].transform(lambda x: calc_ema(x, 9))
    df["macd_histogram"] = df["macd_line"] - df["macd_signal"]
    
    # 5. Bollinger Bands
    df["bb_middle"] = df["ma_20"] # Middle band is 20 SMA
    bb_std = df.groupby("ticker")["close"].transform(lambda x: x.rolling(20, min_periods=20).std())
    df["bb_upper"] = df["bb_middle"] + (2 * bb_std)
    df["bb_lower"] = df["bb_middle"] - (2 * bb_std)
    df["bb_width"] = (df["bb_upper"] - df["bb_lower"]) / df["bb_middle"]
    
    # 6. Volume
    df["vma_20"] = df.groupby("ticker")["total_volume"].transform(lambda x: x.rolling(20, min_periods=20).mean())
    df["volume_ratio"] = df["total_volume"] / df["vma_20"]
    
    # Clean up NaNs from rolling/ewm to match DB schema (pandas uses NaN, DB uses NULL)
    # We leave them as NaN so pandas_gbq correctly inserts them as NULLs
    return df

def process_silver():
    logger.info("Starting Pandas-based Silver ETL...")
    ensure_silver_table()
    
    # Since we need rolling indicators (RSI takes 14 days, MA takes 50 days),
    # we must pull at least 50 days of history from Bronze to calculate today accurately.
    # To keep this incredibly simple and purely idempotent, we will completely recalculate
    # the trailing 6 months and overwrite Silver entirely.
    
    query = f"""
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
            WHERE DATE(timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL 200 DAY)
            GROUP BY trade_date, ticker
        )
        SELECT * FROM daily ORDER BY ticker, trade_date
    """
    
    logger.info("Fetching raw daily frames from Bronze...")
    df = client.query(query).to_dataframe()
    if df.empty:
        logger.info("No data found in Bronze.")
        return
        
    logger.info(f"Loaded {len(df)} daily rows. Calculating True Indicators via Pandas...")
    df = calculate_indicators(df)
    
    # Write to temp table for merge
    temp_table = f"{silver_ref}_temp"
    logger.info(f"Uploading calculated features to {temp_table}...")
    pandas_gbq.to_gbq(
        df, 
        temp_table, 
        project_id=PROJECT_ID, 
        if_exists='replace',
    )
    
    # True UPSERT Merge into Silver
    merge_sql = f"""
    MERGE `{silver_ref}` AS target
    USING `{temp_table}` AS source
    ON target.trade_date = source.trade_date AND target.ticker = source.ticker
    WHEN MATCHED THEN
      UPDATE SET
        open = source.open, high = source.high, low = source.low, close = source.close,
        total_volume = source.total_volume, ingested_at = source.ingested_at,
        daily_return = source.daily_return, ma_20 = source.ma_20, ma_50 = source.ma_50,
        rsi_14 = source.rsi_14, ema_12 = source.ema_12, ema_26 = source.ema_26,
        macd_line = source.macd_line, macd_signal = source.macd_signal, macd_histogram = source.macd_histogram,
        bb_middle = source.bb_middle, bb_upper = source.bb_upper, bb_lower = source.bb_lower,
        bb_width = source.bb_width, vma_20 = source.vma_20, volume_ratio = source.volume_ratio
    WHEN NOT MATCHED THEN
      INSERT (trade_date, ticker, open, high, low, close, total_volume, ingested_at, daily_return,
              ma_20, ma_50, rsi_14, ema_12, ema_26, macd_line, macd_signal, macd_histogram,
              bb_middle, bb_upper, bb_lower, bb_width, vma_20, volume_ratio)
      VALUES (source.trade_date, source.ticker, source.open, source.high, source.low, source.close, 
              source.total_volume, source.ingested_at, source.daily_return, source.ma_20, source.ma_50,
              source.rsi_14, source.ema_12, source.ema_26, source.macd_line, source.macd_signal, source.macd_histogram,
              source.bb_middle, source.bb_upper, source.bb_lower, source.bb_width, source.vma_20, source.volume_ratio)
    """
    
    logger.info("Merging True Indicators into Silver table...")
    client.query(merge_sql).result()
    
    logger.info("Cleaning up temp table...")
    client.query(f"DROP TABLE IF EXISTS `{temp_table}`")
    
    logger.info("Silver ETL with Pandas Indicators completed successfully.")

if __name__ == "__main__":
    start_time = datetime.now(timezone.utc)
    process_silver()
    duration = (datetime.now(timezone.utc) - start_time).total_seconds()
    logger.info(f"Finished in {duration:.2f}s")
