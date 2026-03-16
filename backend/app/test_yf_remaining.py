import yfinance as yf
apple = yf.Ticker("AAPL")
data = apple.info

useful_keys = [
    'fullTimeEmployees', 
    'trailingAnnualDividendYield',
    'trailingAnnualDividendRate',
    'netIncomeToCommon',
    'earningsGrowth',
    'earningsQuarterlyGrowth',
    'revenueGrowth', 
    'freeCashflow', 
    'operatingCashflow',
    'grossMargins',
    'ebitdaMargins', 
    'operatingMargins', 
    'profitMargins', 
    'debtToEquity'
]

print("REMAINING INTERESTING/USEFUL METRICS:")
for key in sorted(data.keys()):
    if isinstance(data[key], (int, float)):
        # Skip stuff we definitely already have
        if key not in ['marketCap', 'trailingPE', 'forwardPE', 'fiftyTwoWeekLow', 'fiftyTwoWeekHigh', '52WeekChange', 'overallRisk', 'auditRisk', 'boardRisk', 'compensationRisk', 'shareHolderRightsRisk']:
           print(f"{key}: {data[key]}")
