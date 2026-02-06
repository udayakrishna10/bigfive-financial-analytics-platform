#!/usr/bin/env python3
"""
Verify the new indicators in the Gold table
"""
import os
from google.cloud import bigquery

PROJECT_ID = os.getenv("GCP_PROJECT", "faang-stock-analytics")
DATASET = os.getenv("DATASET", "faang_dataset")
GOLD_TABLE = os.getenv("GOLD_TABLE", "gold")

client = bigquery.Client(project=PROJECT_ID)

# Query to check the latest data with new indicators
query = f"""
SELECT 
    ticker,
    trade_date,
    close,
    rsi_14,
    macd_line,
    macd_histogram,
    bb_upper,
    bb_middle,
    bb_lower,
    bb_width,
    vma_20,
    volume_ratio
FROM `{PROJECT_ID}.{DATASET}.{GOLD_TABLE}`
WHERE trade_date = (SELECT MAX(trade_date) FROM `{PROJECT_ID}.{DATASET}.{GOLD_TABLE}`)
ORDER BY ticker
"""

print("Latest data with new indicators:\n")
df = client.query(query).to_dataframe()
print(df.to_string())

print(f"\n\nTotal rows in Gold table: {len(client.query(f'SELECT COUNT(*) as cnt FROM `{PROJECT_ID}.{DATASET}.{GOLD_TABLE}`').to_dataframe())}")
