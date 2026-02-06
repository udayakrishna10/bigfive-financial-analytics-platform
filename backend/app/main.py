import os
import re
import math
import logging
import time
import uuid
from datetime import date, datetime, timezone

import numpy as np
import pandas as pd
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google.cloud import bigquery, storage
from openai import OpenAI
from pydantic import BaseModel
from dotenv import load_dotenv

# ===========================
# LOGGING & CONFIGURATION
# ===========================
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

BIG_FIVE_TICKERS = ["AAPL", "AMZN", "META", "NFLX", "GOOGL"]
CRYPTO_TICKERS = ["BTC", "ETH"]
ALL_TICKERS = BIG_FIVE_TICKERS + CRYPTO_TICKERS

TICKER_TO_COMPANY = {
    "AAPL": "Apple",
    "AMZN": "Amazon",
    "META": "Meta",
    "NFLX": "Netflix",
    "GOOGL": "Google",
    "BTC": "Bitcoin",
    "ETH": "Ethereum",
}
FINANCE_DOMAINS = ",".join([
    "cnbc.com", "finance.yahoo.com", "bloomberg.com", "reuters.com", "wsj.com", "barrons.com"
])
REPUTED_SOURCES = {
    "Bloomberg", "Reuters", "The Wall Street Journal", "CNBC", "Financial Times",
    "MarketWatch", "Yahoo Finance", "Barron’s", "Barron's",
    "The Motley Fool", "Seeking Alpha", "Investor's Business Daily",
}
STOCK_KEYWORDS = [
    "stock", "shares", "earnings", "quarter", "q1", "q2", "q3", "q4",
    "guidance", "outlook", "revenue", "profit", "loss", "valuation",
    "price target", "analyst", "dividend",
]

BUCKET_NAME = "faang-insights-logs"

# ===========================
# ENVIRONMENT VARIABLES
# ===========================
PROJECT_ID = os.getenv("GCP_PROJECT")
DATASET = os.getenv("DATASET")
GOLD_TABLE = os.getenv("GOLD_TABLE")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
NEWS_API_KEY = os.getenv("NEWS_API_KEY")

if not all([PROJECT_ID, DATASET, GOLD_TABLE, OPENAI_API_KEY]):
    logger.error("Missing critical environment variables. Please check .env file.")

# ===========================
# CLIENT INITIALIZATION
# ===========================
try:
    storage_client = storage.Client(project=PROJECT_ID)
    bq_client = bigquery.Client(project=PROJECT_ID)
    openai_client = OpenAI(api_key=OPENAI_API_KEY)
except Exception as e:
    logger.error(f"Failed to initialize clients: {e}")
    # We do not fallback to mock mode anymore
    raise

# Configure retry strategy for external API calls
retry_strategy = Retry(
    total=3,
    backoff_factor=1,
    status_forcelist=[429, 500, 502, 503, 504],
)
adapter = HTTPAdapter(max_retries=retry_strategy)
http_session = requests.Session()
http_session.mount("https://", adapter)
http_session.mount("http://", adapter)

# ===========================
# FASTAPI APP SETUP
# ===========================
app = FastAPI(
    title="BigFive API",
    description="LLM-powered insights + time-series analytics for BigFive stocks",
    version="1.0.0",
)

# CORS configuration - restrict to specific origins
ALLOWED_ORIGINS = [
    "https://bigfivebyuk.netlify.app",
    "http://localhost:5173",  # Local development
    "http://localhost:3000",  # Alternative local port
    "http://localhost:3001",  # Current dev server port
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===========================
# UTILITY FUNCTIONS
# ===========================
def archive_to_gcs(ticker: str, question: str, answer: str):
    """Save the AI response as a .txt file in GCS."""
    logger.info(f"Archiving log for: {ticker}")
    try:
        bucket = storage_client.bucket(BUCKET_NAME)
        timestamp = datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')
        blob_name = f"logs/{ticker.upper()}/{timestamp}_{uuid.uuid4().hex[:6]}.txt"
        blob = bucket.blob(blob_name)
        log_content = (
            f"TICKER: {ticker.upper()}\n"
            f"TIMESTAMP: {timestamp} UTC\n"
            f"QUESTION: {question}\n\n"
            f"ANSWER:\n{answer}"
        )
        blob.upload_from_string(log_content, content_type='text/plain')
        logger.info(f"Archived to {blob_name}")
    except Exception as e:
        logger.error(f"Archive failed: {e}")

def is_stock_related(title: str, description: str, company: str) -> bool:
    text = f"{title or ''} {description or ''}".lower()
    if company.lower() not in text:
        return False
    return any(k in text for k in STOCK_KEYWORDS)

# Simple in-memory cache for news
_news_cache = {}
CACHE_TTL = 300  # seconds

def cached_news(ticker):
    now = time.time()
    cached = _news_cache.get(ticker)
    if cached and now - cached['time'] < CACHE_TTL:
        return cached['data']
    return None

def set_news_cache(ticker, data):
    _news_cache[ticker] = {"time": time.time(), "data": data}

# ===========================
# RATE LIMITING
# ===========================
DAILY_LIMIT = 50
_usage_tracker = {"date": date.today(), "count": 0}

def check_daily_limit():
    global _usage_tracker
    today = date.today()
    
    if _usage_tracker["date"] != today:
        _usage_tracker = {"date": today, "count": 0}
    
    if _usage_tracker["count"] >= DAILY_LIMIT:
        raise HTTPException(
            status_code=429, 
            detail="To save costs, OpenAI usage is limited to 50 requests per day globally for all users. Please come back tomorrow."
        )
    
    _usage_tracker["count"] += 1

# ===========================
# Pydantic Models
# ===========================
class AskRequest(BaseModel):
    question: str

# ===========================
# ROUTES
# ===========================
@app.get("/health")
def health():
    return {"status": "ok", "service": "bigfive-backend"}

@app.get("/crypto")
def get_crypto_prices():
    """Get Bitcoin and Ethereum prices from CoinGecko (free API)"""
    try:
        url = "https://api.coingecko.com/api/v3/simple/price"
        params = {
            'ids': 'bitcoin,ethereum',
            'vs_currencies': 'usd',
            'include_24hr_change': 'true',
            'include_market_cap': 'true',
            'include_24hr_vol': 'true'
        }
        response = http_session.get(url, params=params, timeout=5)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        logger.error(f"Failed to fetch crypto prices: {e}")
        raise HTTPException(status_code=503, detail="Crypto price service unavailable")

@app.get("/screener")
def stock_screener(
    # Price filters
    price_min: float = None,
    price_max: float = None,
    
    # RSI filters
    rsi_min: float = None,
    rsi_max: float = None,
    rsi_oversold: bool = None,  # RSI < 30
    rsi_overbought: bool = None, # RSI > 70
    
    # MACD filters
    macd_positive: bool = None,  # MACD histogram > 0
    macd_bullish: bool = None,   # MACD line > signal (histogram > 0)
    
    # Moving Average filters
    above_ma20: bool = None,
    above_ma50: bool = None,
    golden_cross: bool = None,   # MA20 > MA50
    death_cross: bool = None,    # MA20 < MA50
    
    # Bollinger Bands filters
    bb_squeeze: bool = None,     # BB width < 0.1
    price_at_lower_bb: bool = None,  # Price near lower band (potential buy)
    price_at_upper_bb: bool = None,  # Price near upper band (potential sell)
    
    # Volume filters
    high_volume: bool = None,    # Volume ratio > 1.5
    low_volume: bool = None,     # Volume ratio < 0.5
    
    # Include crypto
    include_crypto: bool = True
):
    """Advanced stock screener with multiple technical indicator filters"""
    try:
        conditions = []
        
        # Always get latest data
        conditions.append(f"trade_date = (SELECT MAX(trade_date) FROM `{PROJECT_ID}.{DATASET}.{GOLD_TABLE}`)")
        
        # Exclude crypto if requested
        if not include_crypto:
            conditions.append("ticker NOT IN ('BTC', 'ETH')")
        
        # Price filters
        if price_min is not None:
            conditions.append(f"close >= {price_min}")
        if price_max is not None:
            conditions.append(f"close <= {price_max}")
        
        # RSI filters
        if rsi_min is not None:
            conditions.append(f"rsi_14 >= {rsi_min}")
        if rsi_max is not None:
            conditions.append(f"rsi_14 <= {rsi_max}")
        if rsi_oversold:
            conditions.append("rsi_14 < 30")
        if rsi_overbought:
            conditions.append("rsi_14 > 70")
        
        # MACD filters
        if macd_positive is not None:
            if macd_positive:
                conditions.append("macd_histogram > 0")
            else:
                conditions.append("macd_histogram < 0")
        if macd_bullish:
            conditions.append("macd_histogram > 0")
        
        # MA filters
        if above_ma20:
            conditions.append("close > ma_20")
        if above_ma50:
            conditions.append("close > ma_50")
        if golden_cross:
            conditions.append("ma_20 > ma_50")
        if death_cross:
            conditions.append("ma_20 < ma_50")
        
        # Bollinger Bands filters
        if bb_squeeze:
            conditions.append("bb_width < 0.1")
        if price_at_lower_bb:
            conditions.append("close <= bb_lower * 1.02")  # Within 2% of lower band
        if price_at_upper_bb:
            conditions.append("close >= bb_upper * 0.98")  # Within 2% of upper band
        
        # Volume filters
        if high_volume:
            conditions.append("volume_ratio > 1.5")
        if low_volume:
            conditions.append("volume_ratio < 0.5")
        
        # Build WHERE clause
        where_clause = " AND ".join(conditions)
        
        # Build SQL query
        sql = f"""
            SELECT 
                ticker,
                trade_date,
                close,
                daily_return,
                rsi_14,
                ma_20,
                ma_50,
                macd_line,
                macd_signal,
                macd_histogram,
                bb_upper,
                bb_middle,
                bb_lower,
                bb_width,
                vma_20,
                volume_ratio,
                total_volume
            FROM `{PROJECT_ID}.{DATASET}.{GOLD_TABLE}`
            WHERE {where_clause}
            ORDER BY ticker
        """
        
        df = bq_client.query(sql).to_dataframe()
        
        # Convert NaN to None for JSON serialization
        df = df.replace({pd.NA: None, float('nan'): None})
        
        # Build response with filter summary
        return {
            "filters_applied": {
                "price_range": [price_min, price_max] if price_min or price_max else None,
                "rsi_range": [rsi_min, rsi_max] if rsi_min or rsi_max else None,
                "rsi_oversold": rsi_oversold,
                "rsi_overbought": rsi_overbought,
                "macd_positive": macd_positive,
                "macd_bullish": macd_bullish,
                "above_ma20": above_ma20,
                "above_ma50": above_ma50,
                "golden_cross": golden_cross,
                "death_cross": death_cross,
                "bb_squeeze": bb_squeeze,
                "price_at_lower_bb": price_at_lower_bb,
                "price_at_upper_bb": price_at_upper_bb,
                "high_volume": high_volume,
                "low_volume": low_volume,
                "include_crypto": include_crypto
            },
            "results": df.to_dict(orient="records"),
            "count": len(df)
        }
    except Exception as e:
        logger.error(f"Screener failed: {e}")
        raise HTTPException(status_code=500, detail=f"Screener error: {str(e)}")


@app.post("/ask")
def ask(request: AskRequest):
    check_daily_limit()
    question = (request.question or "").strip()
    
    # Input validation
    if not question:
        raise HTTPException(status_code=400, detail="Question must not be empty.")
    
    if len(question) > 500:
        raise HTTPException(status_code=400, detail="Question too long (max 500 characters).")
    
    # Basic prompt injection prevention
    forbidden_words = ["ignore", "disregard", "system prompt", "instructions"]
    if any(word in question.lower() for word in forbidden_words):
        raise HTTPException(status_code=400, detail="Invalid question content.")
    
    logger.info(f"Processing question: {question[:100]}...")  # Log first 100 chars

    # Fetch recent market data (Last 1 Year to allow robust analysis)
    query = f"""
        SELECT ticker, trade_date, close, rsi_14, ma_20, ma_50
        FROM `{PROJECT_ID}.{DATASET}.{GOLD_TABLE}`
        WHERE trade_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 365 DAY)
        ORDER BY ticker, trade_date DESC
        LIMIT 2000
    """
    try:
        df = bq_client.query(query).to_dataframe()
    except Exception as e:
        logger.error(f"BQ query failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch market data.")

    if df.empty:
        raise HTTPException(status_code=500, detail="No market data available.")

    df = df.replace([np.inf, -np.inf], np.nan).where(pd.notnull(df), None)
    # Pass ALL fetched data (up to 2000 rows) to the AI, not just head(50)
    df_str = df.to_string(index=False, max_rows=None)

    # OpenAI analysis
    prompt = f"User question: {question}\n\nRecent Market Data:\n{df_str}\n\nAnalyze trends, momentum, and risks. IMPORTANT: Always mention the specific Date (YYYY-MM-DD) for every price or event you cite."
    try:
        completion = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": f"You are a neutral stock analyst focusing on BigFive. Today is {date.today()}. Do NOT use markdown bolding (e.g., **text**) in your response."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.7,
        )
        answer = completion.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"OpenAI error: {e}")
        raise HTTPException(status_code=500, detail="AI Analysis failed.")

    # Detect ticker and archive
    detected_ticker = "GENERAL"
    q_upper = question.upper()
    for t in BIG_FIVE_TICKERS:
        if t in q_upper:
            detected_ticker = t
            break
    archive_to_gcs(detected_ticker, question, answer)

    return {"answer": answer}

@app.get("/chart-data")
def chart_data(ticker: str = "AAPL"):
    query = f"""
        SELECT trade_date, open, high, low, close, ma_20, ma_50, rsi_14, total_volume
        FROM `{PROJECT_ID}.{DATASET}.{GOLD_TABLE}`
        WHERE ticker = @ticker
        ORDER BY trade_date DESC LIMIT 2000
    """
    job_config = bigquery.QueryJobConfig(
        query_parameters=[bigquery.ScalarQueryParameter("ticker", "STRING", ticker.upper())]
    )
    df = bq_client.query(query, job_config=job_config).to_dataframe()
    if df.empty:
        raise HTTPException(status_code=404, detail=f"No data for {ticker}")

    # Sort chronological for frontend
    df = df.sort_values(by="trade_date", ascending=True)

    points = []
    for _, row in df.iterrows():
        record = {}
        for col, val in row.items():
            if isinstance(val, (pd.Timestamp, datetime, date)):
                record[col] = val.isoformat()
            elif isinstance(val, (float, np.floating)):
                record[col] = float(val) if math.isfinite(val) else None
            else:
                record[col] = val
        points.append(record)

    return {"ticker": ticker.upper(), "points": points}

@app.get("/news-sentiment")
def news_sentiment(ticker: str = "AAPL", limit: int = 10):
    check_daily_limit()
    symbol = ticker.upper()
    if symbol == "ALL":
        # Group query for all FAANG companies
        companies = list(TICKER_TO_COMPANY.values())
        joined_companies = " OR ".join([f'"{c}"' for c in companies])
        q_param = f'({joined_companies}) AND (stock OR earnings OR analyst)'
    else:
        company = TICKER_TO_COMPANY.get(symbol, symbol)
        q_param = f'"{company}" AND (stock OR earnings OR analyst)'

    params = {
        "q": q_param,
        "apiKey": NEWS_API_KEY,
        "domains": FINANCE_DOMAINS,
        "pageSize": limit * 5,
        "sortBy": "publishedAt"
    }

    try:
        resp = requests.get("https://newsapi.org/v2/everything", params=params)
        resp.raise_for_status()
        articles = resp.json().get("articles", [])
    except Exception as e:
        logger.error(f"NewsAPI error: {e}")
        articles = []

    filtered = []
    for a in articles:
        # For ALL, we trust the query more; for specific ticker, ensure company name is in text
        # STRICT MODE: Search TITLE ONLY to ensure relevance.
        text = f"{a.get('title') or ''}".lower()
        
        detected_company = symbol if symbol != "ALL" else "Market"
        if symbol == "ALL":
            # Infer which company is talked about
            for t_code, t_name in TICKER_TO_COMPANY.items():
                 # Use regex for whole word matching (avoids 'Meta' matching 'metal')
                 pattern = rf"\b({re.escape(t_name.lower())}|{re.escape(t_code.lower())})\b"
                 if re.search(pattern, text):
                     detected_company = t_name.upper()
                     break
        else:
             detected_company = TICKER_TO_COMPANY.get(symbol, symbol).upper()

        if symbol == "ALL":
            # STRICT FILTER: If we didn't match a specific FAANG ticker, SKIP IT.
            if detected_company == "Market":
                continue

            # Skip broken links
            url = a.get("url")
            if not url or "removed.com" in url:
                continue

            if any(k in text for k in STOCK_KEYWORDS):
                 filtered.append({
                    "title": a["title"],
                    "source": a["source"]["name"],
                    "url": a["url"],
                    "publishedAt": a.get("publishedAt"),
                    "ticker": detected_company
                })
        else:
            # Skip broken links
            url = a.get("url")
            if not url or "removed.com" in url:
                continue

            if is_stock_related(a.get("title"), a.get("description"), TICKER_TO_COMPANY.get(symbol, symbol)):
                filtered.append({
                    "title": a["title"],
                    "source": a["source"]["name"],
                    "url": a["url"],
                    "publishedAt": a.get("publishedAt"),
                    "ticker": detected_company
                })
        if len(filtered) >= limit:
            break
            
    # Explicitly sort by date descending to be safe
    filtered.sort(key=lambda x: x.get("publishedAt", ""), reverse=True)

    headlines = "\n".join([f"- {title}" for title in [a['title'] for a in filtered]])
    
    if not headlines.strip():
        summary = "No significant news found in the last 24 hours to generate a sentiment summary."
    else:
        try:
            completion = openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": f"Summarize sentiment for {symbol} based on these headlines:\n{headlines}\n\nProvide the answer as a single, simple English paragraph."}],
                temperature=0.4,
            )
            summary = completion.choices[0].message.content.strip().replace("*", "")
        except Exception as e:
            logger.error(f"OpenAI sentiment error: {e}")
            summary = "Sentiment analysis currently unavailable."

    response = {"ticker": symbol, "articles": filtered, "sentiment_summary": summary}
    set_news_cache(f"{symbol}-sentiment", response)
    return response

@app.get("/big-five-dashboard")
def big_five_dashboard(days: int = 365, include_crypto: bool = True):
    """Get dashboard data for FAANG stocks and optionally crypto"""
    tickers = ALL_TICKERS if include_crypto else BIG_FIVE_TICKERS
    
    query = f"""
        SELECT ticker, trade_date, close, daily_return, rsi_14
        FROM `{PROJECT_ID}.{DATASET}.{GOLD_TABLE}`
        WHERE trade_date >= DATE_SUB(CURRENT_DATE(), INTERVAL @days DAY)
        AND ticker IN UNNEST(@tickers)
        ORDER BY trade_date DESC
    """
    job_config = bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ScalarQueryParameter("days", "INT64", days),
            bigquery.ArrayQueryParameter("tickers", "STRING", tickers),
        ]
    )
    df = bq_client.query(query, job_config=job_config).to_dataframe()
    
    if df.empty:
         return {"tickers": []}

    latest = df.sort_values("trade_date", ascending=False).groupby("ticker").head(1)
    
    # Enforce fixed order
    records = latest.to_dict(orient="records")
    try:
        records.sort(key=lambda x: tickers.index(x['ticker']))
    except ValueError:
        pass # Handle case if unknown ticker slips in
    
    return {"tickers": records}

@app.get("/")
def root():
    return {"message": "API is running"}
# ===========================
# FRED ECONOMIC INDICATORS
# ===========================
@app.get("/economic-indicators")
def get_economic_indicators(days: int = 365):
    """Get latest economic indicators from FRED"""
    try:
        query = f"""
            WITH latest_values AS (
                SELECT 
                    series_id,
                    series_name,
                    observation_date,
                    value,
                    frequency,
                    units,
                    ROW_NUMBER() OVER (PARTITION BY series_id ORDER BY observation_date DESC) as rn
                FROM `{PROJECT_ID}.{DATASET}.fred_data`
                WHERE observation_date >= DATE_SUB(CURRENT_DATE(), INTERVAL @days DAY)
            ),
            previous_values AS (
                SELECT 
                    series_id,
                    value as prev_value,
                    observation_date as prev_date,
                    ROW_NUMBER() OVER (PARTITION BY series_id ORDER BY observation_date DESC) as rn
                FROM `{PROJECT_ID}.{DATASET}.fred_data`
                WHERE observation_date >= DATE_SUB(CURRENT_DATE(), INTERVAL @days DAY)
            )
            SELECT 
                l.series_id,
                l.series_name,
                l.observation_date as latest_date,
                l.value as latest_value,
                l.frequency,
                l.units,
                p.prev_value,
                p.prev_date,
                SAFE_DIVIDE((l.value - p.prev_value), p.prev_value) * 100 as change_pct
            FROM latest_values l
            LEFT JOIN previous_values p 
                ON l.series_id = p.series_id AND p.rn = 2
            WHERE l.rn = 1
            ORDER BY l.series_id
        """
        
        job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("days", "INT64", days)
            ]
        )
        
        df = bq_client.query(query, job_config=job_config).to_dataframe()
        
        if df.empty:
            return {"indicators": [], "count": 0}
        
        # Determine trend
        def get_trend(change_pct):
            if pd.isna(change_pct):
                return "stable"
            elif change_pct > 0.5:
                return "up"
            elif change_pct < -0.5:
                return "down"
            else:
                return "stable"
        
        df["trend"] = df["change_pct"].apply(get_trend)
        
        # Convert NaN to None
        df = df.replace({pd.NA: None, float('nan'): None})
        
        return {
            "indicators": df.to_dict(orient="records"),
            "count": len(df)
        }
    except Exception as e:
        logger.error(f"Failed to fetch economic indicators: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching indicators: {str(e)}")

@app.get("/economic-indicators/{series_id}")
def get_economic_indicator_history(series_id: str, days: int = 365):
    """Get historical data for a specific economic indicator"""
    try:
        query = f"""
            SELECT 
                series_id,
                series_name,
                observation_date,
                value,
                frequency,
                units
            FROM `{PROJECT_ID}.{DATASET}.fred_data`
            WHERE series_id = @series_id
              AND observation_date >= DATE_SUB(CURRENT_DATE(), INTERVAL @days DAY)
            ORDER BY observation_date ASC
        """
        
        job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("series_id", "STRING", series_id),
                bigquery.ScalarQueryParameter("days", "INT64", days)
            ]
        )
        
        df = bq_client.query(query, job_config=job_config).to_dataframe()
        
        if df.empty:
            raise HTTPException(status_code=404, detail=f"Series {series_id} not found")
        
        # Convert NaN to None
        df = df.replace({pd.NA: None, float('nan'): None})
        
        return {
            "series_id": series_id,
            "series_name": df["series_name"].iloc[0] if not df.empty else None,
            "frequency": df["frequency"].iloc[0] if not df.empty else None,
            "units": df["units"].iloc[0] if not df.empty else None,
            "data": df[["observation_date", "value"]].to_dict(orient="records"),
            "count": len(df)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch indicator {series_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching indicator: {str(e)}")

@app.get("/market-correlation")
def get_market_correlation(series_id: str = "UNRATE", days: int = 365):
    """Correlate stock performance with economic indicators"""
    try:
        # Get economic indicator data
        econ_query = f"""
            SELECT 
                observation_date,
                value as indicator_value
            FROM `{PROJECT_ID}.{DATASET}.fred_data`
            WHERE series_id = @series_id
              AND observation_date >= DATE_SUB(CURRENT_DATE(), INTERVAL @days DAY)
            ORDER BY observation_date
        """
        
        # Get stock data
        stock_query = f"""
            SELECT 
                trade_date,
                ticker,
                close,
                daily_return
            FROM `{PROJECT_ID}.{DATASET}.{GOLD_TABLE}`
            WHERE trade_date >= DATE_SUB(CURRENT_DATE(), INTERVAL @days DAY)
              AND ticker IN UNNEST(@tickers)
            ORDER BY trade_date
        """
        
        job_config_econ = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("series_id", "STRING", series_id),
                bigquery.ScalarQueryParameter("days", "INT64", days)
            ]
        )
        
        job_config_stock = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("days", "INT64", days),
                bigquery.ArrayQueryParameter("tickers", "STRING", BIG_FIVE_TICKERS)
            ]
        )
        
        econ_df = bq_client.query(econ_query, job_config=job_config_econ).to_dataframe()
        stock_df = bq_client.query(stock_query, job_config=job_config_stock).to_dataframe()
        
        if econ_df.empty or stock_df.empty:
            return {"correlations": [], "message": "Insufficient data for correlation"}
        
        # Calculate correlations for each ticker
        correlations = []
        for ticker in BIG_FIVE_TICKERS:
            ticker_data = stock_df[stock_df["ticker"] == ticker].copy()
            
            # Merge with economic data
            merged = pd.merge(
                ticker_data,
                econ_df,
                left_on="trade_date",
                right_on="observation_date",
                how="inner"
            )
            
            if len(merged) > 10:  # Need enough data points
                corr = merged["close"].corr(merged["indicator_value"])
                correlations.append({
                    "ticker": ticker,
                    "correlation": float(corr) if not pd.isna(corr) else None,
                    "data_points": len(merged)
                })
        
        return {
            "series_id": series_id,
            "correlations": correlations,
            "period_days": days
        }
    except Exception as e:
        logger.error(f"Failed to calculate correlation: {e}")
        raise HTTPException(status_code=500, detail=f"Error calculating correlation: {str(e)}")
