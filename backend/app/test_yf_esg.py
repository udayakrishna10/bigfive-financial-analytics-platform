import yfinance as yf
ticker = yf.Ticker("AAPL")
try:
    print("ESG SCORES:")
    print(ticker.sustainability)
except Exception as e:
    print("No sustainability/ESG data found via standard property:", e)
