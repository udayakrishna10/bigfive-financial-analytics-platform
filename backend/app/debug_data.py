import os
import requests
from google.cloud import bigquery
from dotenv import load_dotenv

load_dotenv()

PROJECT_ID = os.getenv("GCP_PROJECT")
DATASET = os.getenv("DATASET")
GOLD_TABLE = os.getenv("GOLD_TABLE")
NEWS_API_KEY = os.getenv("NEWS_API_KEY")

print(f"--- DEBUGGING PROJECT: {PROJECT_ID} ---")

# 1. Check BigQuery Data Freshness
try:
    client = bigquery.Client(project=PROJECT_ID)
    query = f"""
        SELECT MAX(trade_date) as latest_date, MIN(trade_date) as oldest_date, COUNT(*) as row_count
        FROM `{PROJECT_ID}.{DATASET}.{GOLD_TABLE}`
    """
    df = client.query(query).to_dataframe()
    print("\n[BigQuery Data]")
    print(df.to_string(index=False))
    
    # Check Volume
    query_vol = f"""
        SELECT ticker, trade_date, total_volume
        FROM `{PROJECT_ID}.{DATASET}.{GOLD_TABLE}`
        WHERE ticker = 'AAPL'
        ORDER BY trade_date DESC LIMIT 5
    """
    df_vol = client.query(query_vol).to_dataframe()
    print("\n[Recent AAPL Volume]")
    print(df_vol.to_string(index=False))

except Exception as e:
    print(f"\n[BigQuery Error]: {e}")

# 2. Check NewsAPI
try:
    print(f"\n[NewsAPI Check] Key: {NEWS_API_KEY[:5]}...")
    url = f"https://newsapi.org/v2/everything?q=Apple&apiKey={NEWS_API_KEY}&pageSize=5"
    res = requests.get(url)
    data = res.json()
    if res.status_code == 200:
        print(f"Status: OK. Articles found: {len(data.get('articles', []))}")
        if len(data.get('articles', [])) > 0:
             print(f"Top Headline: {data['articles'][0]['title']}")
    else:
        print(f"Status: {res.status_code}. Error: {data}")
except Exception as e:
    print(f"\n[NewsAPI Error]: {e}")
