#!/usr/bin/env python3
"""
Verify crypto data in Gold table
"""
import os
from google.cloud import bigquery

PROJECT_ID = os.getenv("GCP_PROJECT", "faang-stock-analytics")
DATASET = os.getenv("DATASET", "faang_dataset")
GOLD_TABLE = os.getenv("GOLD_TABLE", "gold")

client = bigquery.Client(project=PROJECT_ID)

# Query to check crypto data
query = f"""
SELECT 
    ticker,
    trade_date,
    close,
    rsi_14,
    macd_histogram,
    bb_width,
    volume_ratio
FROM `{PROJECT_ID}.{DATASET}.{GOLD_TABLE}`
WHERE ticker IN ('BTC', 'ETH')
AND trade_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
ORDER BY ticker, trade_date DESC
LIMIT 14
"""

print("Recent crypto data with indicators:\n")
df = client.query(query).to_dataframe()
print(df.to_string())

# Count total crypto rows
count_query = f"""
SELECT ticker, COUNT(*) as row_count
FROM `{PROJECT_ID}.{DATASET}.{GOLD_TABLE}`
WHERE ticker IN ('BTC', 'ETH')
GROUP BY ticker
"""
print("\n\nTotal crypto rows:")
print(client.query(count_query).to_dataframe().to_string())
