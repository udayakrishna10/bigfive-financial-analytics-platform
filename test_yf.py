import yfinance as yf
stock = yf.Ticker('AAPL')
df = stock.history(period="1d", interval="1m")
print(df)
