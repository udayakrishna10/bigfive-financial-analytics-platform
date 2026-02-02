from google.cloud import bigquery
import os
from dotenv import load_dotenv

load_dotenv()

PROJECT_ID = os.getenv("GCP_PROJECT")
DATASET = os.getenv("DATASET")
GOLD_TABLE = os.getenv("GOLD_TABLE")

client = bigquery.Client(project=PROJECT_ID)

query = f"""
    SELECT ticker, MAX(trade_date) as latest_date
    FROM `{PROJECT_ID}.{DATASET}.{GOLD_TABLE}`
    WHERE ticker = 'AAPL'
    GROUP BY ticker
"""

print(f"Running query on {PROJECT_ID}.{DATASET}.{GOLD_TABLE}...")
df = client.query(query).to_dataframe()
print(df)
