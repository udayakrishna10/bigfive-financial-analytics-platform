import yfinance as yf
apple = yf.Ticker("AAPL")
data = apple.info
print("ESG RAW INFO KEYS:")
for key in data.keys():
    if 'esg' in key.lower() or 'carbon' in key.lower() or 'environment' in key.lower() or 'social' in key.lower() or 'sustain' in key.lower():
        print(f"{key}: {data[key]}")

print("\nOTHER INTERESTING KEYS LEFT BEHIND:")
skipped = []
for k in data.keys():
    if k not in ['longBusinessSummary', 'companyOfficers', 'address1', 'city', 'state', 'zip', 'country', 'phone', 'website', 'industry', 'sector', 'executiveTeam', 'compensationAsOfEpochDate', 'governanceEpochDate']:
        if not any(word in k.lower() for word in ['price', 'volume', 'margin', 'ratio', 'eps', 'dividend', 'share', 'cap', 'week', 'risk', 'esg', 'average', 'yield']):
            if isinstance(data[k], (int, float, str)) and len(str(data[k])) < 50:
                skipped.append((k, data[k]))

for k, v in skipped[:20]:
     print(f" - {k}: {v}")
