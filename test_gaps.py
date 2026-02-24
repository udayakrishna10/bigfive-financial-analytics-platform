import requests

data = requests.get("http://localhost:8080/intraday-history?ticker=AAPL").json()['points']
times = [d['timestamp'] for d in data]

from datetime import datetime
import dateutil.parser

parsed_times = [dateutil.parser.isoparse(t).timestamp() for t in times]
gaps = []
for i in range(1, len(parsed_times)):
    diff = parsed_times[i] - parsed_times[i-1]
    if diff > 60:
        print(f"Gap found: {diff} seconds at {times[i]}")
