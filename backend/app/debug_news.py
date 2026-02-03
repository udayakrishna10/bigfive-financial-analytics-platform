import os
import requests
from dotenv import load_dotenv

load_dotenv()

NEWS_API_KEY = os.getenv("NEWS_API_KEY")
DOMAINS = "cnbc.com,finance.yahoo.com,bloomberg.com,barrons.com"
# Try a broader yahoo domain if finance.yahoo.com fails
DOMAINS_TEST = "cnbc.com,yahoo.com,bloomberg.com,barrons.com"

print(f"Testing NewsAPI with Domains: {DOMAINS}")

params = {
    "q": "(Apple) AND (stock OR earnings)",
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
    
    sources = {}
    for a in articles:
        name = a['source']['name']
        sources[name] = sources.get(name, 0) + 1
        print(f"[{a['publishedAt']}] {name}: {a['title']}")
        
    print("\nSource Distribution:")
    for s, c in sources.items():
        print(f"{s}: {c}")

except Exception as e:
    print(e)
