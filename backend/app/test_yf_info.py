import yfinance as yf
ticker = yf.Ticker("AAPL")
info = ticker.info
print("INFO KEYS AVAILABLE:")
for k, v in info.items():
    if k not in ['longBusinessSummary', 'companyOfficers']:
        print(f" - {k}: {v}")

print("\nFAST_INFO KEYS AVAILABLE:")
fast = ticker.fast_info
for k in fast.keys():
    print(f" - {k}: {fast[k]}")
