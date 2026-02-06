# FRED API Key Setup Instructions

## Getting Your FRED API Key

1. Visit https://fred.stlouisfed.org/
2. Click "My Account" in the top right
3. Create a free account (or login if you have one)
4. Go to "API Keys" section
5. Click "Request API Key"
6. Fill out the form (instant approval)
7. Copy your API key

## Adding to Environment

Add this line to your `.env` file:

```bash
FRED_API_KEY=your_api_key_here
```

## Testing

Once you have the key, run:

```bash
cd backend/etl
python3 bronze_fred_etl.py
```

This will fetch 5 years of historical data for:
- GDP (GDPC1)
- Inflation/CPI (CPIAUCSL)
- Unemployment Rate (UNRATE)
- Federal Funds Rate (DFF)
- 10-Year Treasury (DGS10)
- VIX Volatility (VIXCLS)

## API Limits

- Free tier: 120 requests/minute
- More than enough for our use case
- No cost for any usage level
