import os
import requests
import re
from dotenv import load_dotenv

load_dotenv()

NEWS_API_KEY = os.getenv("NEWS_API_KEY")
DOMAINS = "reuters.com,wsj.com,bloomberg.com"

print(f"Testing NewsAPI for Scarce Domains: {DOMAINS}")

# Simulating the backend query
params = {
    "q": "(Apple) OR (Amazon) OR (Google) OR (Meta) OR (Netflix)",
    "apiKey": NEWS_API_KEY,
    "domains": DOMAINS,
    "pageSize": 20,
    "sortBy": "publishedAt"
}

try:
    resp = requests.get("https://newsapi.org/v2/everything", params=params)
    data = resp.json()
    articles = data.get("articles", [])
    print(f"Total Results: {data.get('totalResults')}")
    
    for a in articles:
        print(f"[{a['source']['name']}] {a['title']}")

except Exception as e:
    print(e)
