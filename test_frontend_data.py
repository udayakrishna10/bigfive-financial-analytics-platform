import requests
import json
resp = requests.get("http://localhost:8080/intraday-history?ticker=AAPL")
data = resp.json()
print("Points length:", len(data.get('points', [])))
if len(data.get('points', [])) > 0:
    print("First point:", data['points'][0])
    print("Last point:", data['points'][-1])
