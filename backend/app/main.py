import os
import re
import math
import logging
import time
import json
import uuid
from datetime import date, datetime, timezone

import numpy as np
import pandas as pd
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from google.cloud import bigquery, storage
from google.cloud.pubsublite.cloudpubsub import SubscriberClient
from google.cloud.pubsublite.types import SubscriptionPath, CloudRegion, CloudZone, FlowControlSettings
from openai import OpenAI
from pydantic import BaseModel
from dotenv import load_dotenv
import asyncio

# ===========================
# LOGGING & CONFIGURATION
# ===========================
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
# Load environment variables from project root
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.env')
load_dotenv(env_path)

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
    "cnbc.com", "finance.yahoo.com", "bloomberg.com", "reuters.com", "wsj.com", 
    "barrons.com", "marketwatch.com", "investors.com", "fool.com", "seekingalpha.com",
    "ft.com", "forbes.com", "businessinsider.com", "benzinga.com",
    "techcrunch.com", "theverge.com", "cointelegraph.com", "coindesk.com", "decrypt.co"
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

# Crypto keywords to filter out from stock news
CRYPTO_KEYWORDS = [
    "bitcoin", "btc", "ethereum", "eth", "crypto", "cryptocurrency",
    "blockchain", "mining", "wallet", "satoshi", "altcoin", "defi",
    "nft", "web3", "coinbase", "binance", "crypto market"
]

BUCKET_NAME = "faang-insights-logs"

# ===========================
# ENVIRONMENT VARIABLES
# ===========================
PROJECT_ID = os.getenv("GCP_PROJECT")
DATASET = os.getenv("GCP_DATASET", os.getenv("DATASET"))
GOLD_TABLE = os.getenv("GOLD_TABLE")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
NEWS_API_KEY = os.getenv("NEWS_API_KEY")

missing_vars = [var for var, val in {
    "PROJECT_ID": PROJECT_ID,
    "DATASET": DATASET,
    "GOLD_TABLE": GOLD_TABLE
}.items() if not val]

if missing_vars:
    logger.error(f"Missing critical environment variables: {', '.join(missing_vars)}. Please check .env file at {env_path}")

# ===========================
# CLIENT INITIALIZATION
# ===========================
try:
    storage_client = storage.Client(project=PROJECT_ID)
    bq_client = bigquery.Client(project=PROJECT_ID)
    # OpenAI Client Check
    OPENAI_API_KEY_VAL = os.getenv("OPENAI_API_KEY")
    openai_client = None

    if OPENAI_API_KEY_VAL:
        try:
            openai_client = OpenAI(api_key=OPENAI_API_KEY_VAL)
            logger.info("OpenAI client initialized successfully")
        except Exception as e:
            logger.warning(f"Failed to initialize OpenAI client: {e}")
    else:
        logger.warning("OPENAI_API_KEY not found. AI features will be disabled.")
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

from contextlib import asynccontextmanager
import subprocess

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start the real-time poller script in the background when the app starts
    poller_process = None
    try:
        # In Docker, we are in /app, so etl/realtime_poller.py exists
        if os.path.exists("etl/realtime_poller.py"):
            logger.info("Launching realtime_poller via subprocess...")
            poller_process = subprocess.Popen(["python", "-u", "etl/realtime_poller.py"])
            logger.info("Started real-time poller script in background")
        elif os.path.exists("../etl/realtime_poller.py"):
            # For local dev fallback depending on cwd
            poller_process = subprocess.Popen(["python", "-u", "../etl/realtime_poller.py"])
            logger.info("Started local real-time poller")
    except Exception as e:
        logger.error(f"Failed to start real-time poller: {e}")
        
    yield
    
    if poller_process:
        poller_process.terminate()
        logger.info("Terminated real-time poller script")

# ===========================
# FASTAPI APP SETUP
# ===========================
app = FastAPI(
    title="BigFive API",
    description="LLM-powered insights + time-series analytics for BigFive stocks",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration - restrict to specific origins
ALLOWED_ORIGINS = [
    # Custom domains
    "https://www.bigfivebyuk.com",
    "https://bigfivebyuk.com",
    # Legacy Netlify subdomain (keep during DNS propagation)
    "https://bigfivebyuk.netlify.app",
    # Local development
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://localhost:3003",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:3002",
    "http://127.0.0.1:3003",
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
    # Filter out crypto-related articles
    if any(crypto_word in text for crypto_word in CRYPTO_KEYWORDS):
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
        filters_applied = []
        
        # Get data from last 7 days (to ensure we get latest)
        conditions.append("trade_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)")
        
        # Exclude crypto if requested
        if not include_crypto:
            conditions.append("ticker NOT IN ('BTC', 'ETH')")
        
        # Price filters
        if price_min is not None:
            conditions.append(f"close >= {price_min}")
            filters_applied.append(f"Price >= ${price_min}")
        if price_max is not None:
            conditions.append(f"close <= {price_max}")
            filters_applied.append(f"Price <= ${price_max}")
        
        # RSI filters
        if rsi_min is not None:
            conditions.append(f"rsi_14 >= {rsi_min}")
            filters_applied.append(f"RSI >= {rsi_min}")
        if rsi_max is not None:
            conditions.append(f"rsi_14 <= {rsi_max}")
            filters_applied.append(f"RSI <= {rsi_max}")
        if rsi_oversold:
            conditions.append("rsi_14 < 30")
            filters_applied.append("RSI Oversold (< 30)")
        if rsi_overbought:
            conditions.append("rsi_14 > 70")
            filters_applied.append("RSI Overbought (> 70)")
        
        # MACD filters
        if macd_positive is not None:
            if macd_positive:
                conditions.append("macd_histogram > 0")
                filters_applied.append("MACD Positive")
            else:
                conditions.append("macd_histogram < 0")
                filters_applied.append("MACD Negative")
        if macd_bullish:
            conditions.append("macd_histogram > 0")
            filters_applied.append("MACD Bullish")
        
        # MA filters
        if above_ma20:
            conditions.append("close > ma_20")
            filters_applied.append("Above MA20")
        if above_ma50:
            conditions.append("close > ma_50")
            filters_applied.append("Above MA50")
        if golden_cross:
            conditions.append("ma_20 > ma_50")
            filters_applied.append("Golden Cross")
        if death_cross:
            conditions.append("ma_20 < ma_50")
            filters_applied.append("Death Cross")
        
        # Bollinger Bands filters
        if bb_squeeze:
            conditions.append("bb_width < 0.1")
            filters_applied.append("BB Squeeze")
        if price_at_lower_bb:
            conditions.append("close <= bb_lower * 1.02")
            filters_applied.append("At Lower BB")
        if price_at_upper_bb:
            conditions.append("close >= bb_upper * 0.98")
            filters_applied.append("At Upper BB")
        
        # Volume filters
        if high_volume:
            conditions.append("volume_ratio > 1.5")
            filters_applied.append("High Volume")
        if low_volume:
            conditions.append("volume_ratio < 0.5")
            filters_applied.append("Low Volume")
        
        # Build WHERE clause
        where_clause = " AND ".join(conditions)
        
        # Simple, fast query - get latest data for each ticker
        sql = f"""
            SELECT 
                ticker,
                close,
                daily_return * 100 AS daily_return,
                rsi_14,
                macd_histogram
            FROM (
                SELECT *,
                    ROW_NUMBER() OVER (PARTITION BY ticker ORDER BY trade_date DESC) as rn
                FROM `{PROJECT_ID}.{DATASET}.{GOLD_TABLE}`
                WHERE {where_clause}
            )
            WHERE rn = 1
            ORDER BY ticker
        """
        
        logger.info(f"Screener query executing...")
        df = bq_client.query(sql).to_dataframe()
        
        # Convert NaN to None for JSON serialization
        df = df.replace({pd.NA: None, float('nan'): None})
        
        # Simplified response
        results = df.to_dict(orient="records")
        
        logger.info(f"Screener returned {len(results)} results")
        
        return {
            "results": results,
            "count": len(results),
            "filters_applied": filters_applied
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
    
    logger.info(f"Processing question: {question[:100]}...")

    if not openai_client:
        logger.error("OpenAI client not initialized (missing API Key)")
        raise HTTPException(
            status_code=503, 
            detail="AI Analysis is temporarily disabled. Please ensure the OPENAI_API_KEY is set in the production environment."
        )

    # Detect ticker early to fetch NEWS sentiment
    detected_ticker = "GENERAL"
    q_upper = question.upper()
    for t in BIG_FIVE_TICKERS:
        if t in q_upper:
            detected_ticker = t
            break
    
    # Fetch recent market data with FULL Technical Indicators
    stock_query = f"""
        SELECT 
            ticker, trade_date, close, daily_return * 100 AS daily_return,
            rsi_14, macd_line, macd_signal, macd_histogram,
            bb_upper, bb_middle, bb_lower, volume_ratio
        FROM `{PROJECT_ID}.{DATASET}.{GOLD_TABLE}`
        WHERE trade_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 60 DAY)
        ORDER BY ticker, trade_date DESC
        LIMIT 1000
    """
    
    # Fetch recent global macro data
    macro_query = f"""
        SELECT series_id, series_name, observation_date, value
        FROM `{PROJECT_ID}.{DATASET}.fred_data`
        WHERE observation_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 35 DAY)
        ORDER BY series_id, observation_date DESC
        LIMIT 100
    """

    try:
        stock_df = bq_client.query(stock_query).to_dataframe()
        macro_df = bq_client.query(macro_query).to_dataframe()
    except Exception as e:
        logger.error(f"BQ query failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch market data from BigQuery.")

    if stock_df.empty:
        raise HTTPException(status_code=500, detail="No market data available yet.")

    # Fetch News Sentiment for context if a ticker is detected
    news_context = "No recent news context available."
    if detected_ticker != "GENERAL":
        try:
            news_res = news_sentiment(ticker=detected_ticker, limit=5)
            if news_res.get("articles"):
                headlines = [f"- {a['title']} ({a['source']})" for a in news_res["articles"]]
                news_context = "\n".join(headlines)
        except Exception as e:
            logger.error(f"Failed to fetch news context for AI: {e}")

    stock_df = stock_df.replace([np.inf, -np.inf], np.nan).where(pd.notnull(stock_df), None)
    stock_str = stock_df.to_string(index=False, max_rows=None)
    
    macro_str = ""
    if not macro_df.empty:
        macro_df = macro_df.replace([np.inf, -np.inf], np.nan).where(pd.notnull(macro_df), None)
        macro_str = macro_df.to_string(index=False, max_rows=None)

    # OpenAI analysis - Triple-Layer Synthesis (Technical + Macro + Sentiment)
    prompt = f"""
User Question: {question}

LAYER 1: Technical & Momentum Data (Last 60 Days):
{stock_str}

LAYER 2: Global Macro Indicators (VIX, 10Y Yield, etc.):
{macro_str}

LAYER 3: Recent News Headlines for {detected_ticker}:
{news_context}

ANALYSIS INSTRUCTIONS:
1. Synthesize all 3 layers. 
2. Match Technicals (RSI/MACD) against Macro (VIX/Yields). 
3. Incorporate News Sentiment if relevant.
4. IMPORTANT: Cite specific Dates (YYYY-MM-DD) and specific values (e.g. "RSI was 72.5") for every data point.
5. Provide a clear "Risk Assessment" based on the convergence of these signals.
"""
    try:
        completion = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": f"You are a professional financial analyst. Today is {date.today()}. Use a neutral, institutional tone. Do NOT use markdown bolding (e.g., **text**)."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.5,
        )
        answer = completion.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"OpenAI error: {e}")
        raise HTTPException(status_code=500, detail="AI Analysis failed (GPT Synthesis Error).")

    archive_to_gcs(detected_ticker, question, answer)
    return {"answer": answer}

# ===========================
# AI COUNCIL — GROUNDED (anti-hallucination)
# ===========================

import json as _json

class CouncilRequest(BaseModel):
    ticker: str

# 10-minute per-ticker cache (debate is more expensive)
_council_cache: dict = {}
COUNCIL_CACHE_TTL = 600  # seconds

COUNCIL_AGENTS = [
    {
        "id": "bull",
        "name": "Bull Analyst",
        "icon": "bull",
        "specialty": "Growth & Upside Momentum",
        "color": "emerald",
        "data": "technical",
        "bias": "bullish",
    },
    {
        "id": "bear",
        "name": "Bear Analyst",
        "icon": "bear",
        "specialty": "Risk & Downside Exposure",
        "color": "rose",
        "data": "technical_and_macro",
        "bias": "bearish",
    },
    {
        "id": "technical",
        "name": "Technical Oracle",
        "icon": "chart",
        "specialty": "Pure Chart Technicals",
        "color": "blue",
        "data": "technical",
        "bias": "neutral",
    },
    {
        "id": "macro",
        "name": "Macro Strategist",
        "icon": "globe",
        "specialty": "Economic Big Picture",
        "color": "violet",
        "data": "macro",
        "bias": "neutral",
    },
    {
        "id": "sentiment",
        "name": "News Sentinel",
        "icon": "news",
        "specialty": "News & Market Sentiment",
        "color": "amber",
        "data": "news",
        "bias": "neutral",
    },
]

# ── Pre-computation: build grounded fact sheets from real data ───────────
def _build_tech_fact_sheet(df: "pd.DataFrame", ticker: str) -> str:
    """Convert raw BigQuery technical data into a precise labeled fact sheet.
    GPT reads facts, not raw tables — eliminates misread hallucinations."""
    if df.empty:
        return "No technical data available."

    latest = df.iloc[0]   # most recent row (sorted DESC)
    oldest = df.iloc[-1]  # oldest row in window

    def fmt(v, decimals=2):
        if v is None or (isinstance(v, float) and (v != v)):  # NaN check
            return "N/A"
        return f"{float(v):.{decimals}f}"

    # RSI analysis
    rsi_now = latest.get("rsi_14")
    rsi_old = oldest.get("rsi_14")
    if rsi_now is not None and rsi_old is not None:
        rsi_dir = "rising" if float(rsi_now) > float(rsi_old) else "falling"
        if float(rsi_now) > 70:
            rsi_signal = "OVERBOUGHT (>70)"
        elif float(rsi_now) < 30:
            rsi_signal = "OVERSOLD (<30)"
        else:
            rsi_signal = "NEUTRAL (30-70)"
    else:
        rsi_dir, rsi_signal = "unknown", "N/A"

    # MACD state
    macd_hist = latest.get("macd_histogram")
    macd_hist_old = df.iloc[min(5, len(df)-1)].get("macd_histogram")
    if macd_hist is not None and macd_hist_old is not None:
        macd_state = "BULLISH" if float(macd_hist) > 0 else "BEARISH"
        macd_momentum = "strengthening" if abs(float(macd_hist)) > abs(float(macd_hist_old)) else "weakening"
    else:
        macd_state, macd_momentum = "N/A", "N/A"

    # Determine most recent MACD crossover within the window
    crossover_date = "N/A"
    for i in range(1, len(df)):
        prev_hist = df.iloc[i].get("macd_histogram", 0) or 0
        curr_hist = df.iloc[i-1].get("macd_histogram", 0) or 0
        if (prev_hist < 0 and curr_hist > 0) or (prev_hist > 0 and curr_hist < 0):
            crossover_date = str(df.iloc[i-1].get("trade_date", "N/A"))
            break

    # Price vs MAs
    price = latest.get("close")
    ma20 = latest.get("ma_20")
    ma50 = latest.get("ma_50")
    price_vs_ma20 = f"+{((float(price)-float(ma20))/float(ma20)*100):.2f}% ABOVE MA20" \
        if price and ma20 and float(price) >= float(ma20) \
        else f"{((float(price)-float(ma20))/float(ma20)*100):.2f}% BELOW MA20" \
        if price and ma20 else "N/A"
    price_vs_ma50 = f"+{((float(price)-float(ma50))/float(ma50)*100):.2f}% ABOVE MA50" \
        if price and ma50 and float(price) >= float(ma50) \
        else f"{((float(price)-float(ma50))/float(ma50)*100):.2f}% BELOW MA50" \
        if price and ma50 else "N/A"

    # Bollinger Band position
    bb_upper = latest.get("bb_upper")
    bb_lower = latest.get("bb_lower")
    bb_pct = None
    if price and bb_upper and bb_lower and (float(bb_upper) - float(bb_lower)) > 0:
        bb_pct = (float(price) - float(bb_lower)) / (float(bb_upper) - float(bb_lower)) * 100

    bb_pos = f"{bb_pct:.0f}% of band" if bb_pct is not None else "N/A"
    if bb_pct is not None:
        if bb_pct > 80:
            bb_pos += " (near UPPER band — overbought zone)"
        elif bb_pct < 20:
            bb_pos += " (near LOWER band — oversold zone)"
        else:
            bb_pos += " (mid-band — neutral)"

    # Volume
    vol_ratio = latest.get("volume_ratio")
    vol_str = f"{float(vol_ratio):.2f}x 20-day average" if vol_ratio else "N/A"

    # Recent trend (last 5 days of returns)
    recent_returns = [df.iloc[i].get("daily_return") for i in range(min(5, len(df)))]
    recent_returns = [float(r) for r in recent_returns if r is not None]
    pos_days = sum(1 for r in recent_returns if r > 0)
    neg_days = len(recent_returns) - pos_days
    trend_str = f"{pos_days} up days / {neg_days} down days in last {len(recent_returns)} sessions"

    return f"""=== TECHNICAL FACT SHEET: {ticker} as of {latest.get('trade_date', 'N/A')} ===

PRICE DATA:
  Current Close:  ${fmt(price)}
  vs MA20:        {price_vs_ma20}
  vs MA50:        {price_vs_ma50}
  5-day trend:    {trend_str}

RSI (14-period):
  Current value:  {fmt(rsi_now)} — {rsi_signal}
  Direction:      {rsi_dir} (was {fmt(rsi_old)} on {oldest.get('trade_date', 'N/A')})

MACD:
  Line:           {fmt(latest.get('macd_line'))}
  Signal:         {fmt(latest.get('macd_signal'))}
  Histogram:      {fmt(latest.get('macd_histogram'))} — {macd_state}, {macd_momentum}
  Last crossover: {crossover_date}

BOLLINGER BANDS:
  Upper:          ${fmt(bb_upper)}
  Middle:         ${fmt(latest.get('bb_middle'))}
  Lower:          ${fmt(bb_lower)}
  Price position: {bb_pos}

VOLUME:
  Volume ratio:   {vol_str}

RULE: You MUST cite values from this fact sheet. Do NOT invent or estimate any number not listed above."""


def _build_macro_fact_sheet(df: "pd.DataFrame") -> str:
    """Build a labeled macro fact sheet from FRED data."""
    if df.empty:
        return "No macro data available."

    lines = ["=== MACRO FACT SHEET (FRED data) ===\n"]
    for series_id, group in df.groupby("series_id"):
        latest_row = group.iloc[0]
        val = latest_row.get("value")
        obs_date = latest_row.get("observation_date", "N/A")
        name = latest_row.get("series_name", series_id)
        if val is not None:
            lines.append(f"  {name} ({series_id}): {float(val):.4g}  [as of {obs_date}]")

    lines.append("\nRULE: You MUST cite values from this fact sheet. Do NOT invent or estimate any number not listed above.")
    return "\n".join(lines)


# ── Structured JSON agent system prompt ─────────────────────────────────
def _agent_system_prompt(agent: dict) -> str:
    bias_note = {
        "bullish": "Your role is to identify every bullish signal. Be optimistic but stay grounded.",
        "bearish": "Your role is to identify every risk and warning sign. Be skeptical but stay grounded.",
        "neutral": "Your role is to be objective and data-driven only.",
    }[agent["bias"]]

    return f"""You are the {agent['name']} on an elite financial analysis council. {bias_note}

CRITICAL RULES — STRICTLY ENFORCED:
1. Every number you cite MUST come from the provided fact sheet. No exceptions.
2. Do NOT invent, estimate, or extrapolate any value not explicitly listed.
3. If a data point is "N/A", say so — do not guess.

Output ONLY valid JSON in this exact format (no markdown, no code fences):
{{
  "verdict": "BULLISH" | "BEARISH" | "NEUTRAL",
  "confidence": <integer 0-100>,
  "key_signals": [
    "<signal 1: quote exact value from fact sheet>",
    "<signal 2: quote exact value from fact sheet>",
    "<signal 3: quote exact value from fact sheet>"
  ],
  "reasoning": "<2-3 sentences. Every claim must directly reference a specific value from the fact sheet above.>"
}}"""


def _call_agent_grounded(system_prompt: str, user_prompt: str, model: str = "gpt-4o-mini") -> str:
    """Synchronous OpenAI call — low temperature for factual grounding."""
    completion = openai_client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.1,   # low temp = precise, minimal hallucination
        max_tokens=400,
        response_format={"type": "json_object"},  # force JSON mode
    )
    return completion.choices[0].message.content.strip()


def _parse_agent_json(raw: str, agent: dict) -> dict:
    """Parse the structured JSON response from an agent."""
    try:
        data = _json.loads(raw)
        verdict = data.get("verdict", "NEUTRAL").upper()
        if verdict not in ("BULLISH", "BEARISH", "NEUTRAL"):
            verdict = "NEUTRAL"
        confidence = int(data.get("confidence", 60))
        confidence = max(0, min(100, confidence))
        key_signals = data.get("key_signals", [])
        reasoning = data.get("reasoning", "")
    except Exception as e:
        logger.error(f"Agent JSON parse error for {agent['name']}: {e} | raw: {raw[:200]}")
        verdict, confidence = "NEUTRAL", 50
        key_signals = ["Parse error — agent response malformed"]
        reasoning = raw[:300]

    return {
        "agent": agent["name"],
        "icon": agent["icon"],
        "specialty": agent["specialty"],
        "color": agent["color"],
        "verdict": verdict,
        "confidence": confidence,
        "reasoning": reasoning,
        "key_signals": key_signals,
    }


CHAIRMAN_SYSTEM = """You are the Chairman of an elite financial AI council.
You have received verdicts from 5 specialist agents AND the raw data fact sheet they analyzed.

Your job: cross-check agent claims against the fact sheet, then deliver a final ruling.

CRITICAL RULES:
1. If an agent cited a value that contradicts the fact sheet, disregard that claim.
2. Your synthesis must reference only verified data points from the fact sheet.
3. Output ONLY valid JSON (no markdown, no code fences):
{
  "verdict": "BULLISH" | "BEARISH" | "NEUTRAL",
  "confidence": <integer 0-100>,
  "action": "ACCUMULATE" | "HOLD" | "REDUCE" | "AVOID",
  "timeframe": "<e.g. 2-4 weeks>",
  "synthesis": "<3-4 sentences grounded in specific verified data points>",
  "decisive_signal": "<the single most important data point that drove your ruling>"
}"""


@app.post("/ai-council")
async def ai_council(request: CouncilRequest):
    """Run 5 grounded AI agents in parallel, Chairman synthesizes with full fact verification."""
    check_daily_limit()

    ticker = request.ticker.upper()
    if ticker not in ALL_TICKERS:
        raise HTTPException(status_code=400, detail=f"Unsupported ticker: {ticker}")
    if not openai_client:
        raise HTTPException(status_code=503, detail="AI Council requires OPENAI_API_KEY.")

    # Check cache
    cached = _council_cache.get(ticker)
    if cached and time.time() - cached["ts"] < COUNCIL_CACHE_TTL:
        logger.info(f"Council cache hit for {ticker}")
        return cached["data"]

    # ── 1. Fetch raw data from BigQuery ────────────────────────────────
    tech_query = f"""
        SELECT trade_date, close, daily_return * 100 AS daily_return,
               rsi_14, macd_line, macd_signal, macd_histogram,
               ma_20, ma_50, bb_upper, bb_middle, bb_lower, bb_width, volume_ratio
        FROM `{PROJECT_ID}.{DATASET}.{GOLD_TABLE}`
        WHERE ticker = @ticker
          AND trade_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
        ORDER BY trade_date DESC LIMIT 30
    """
    macro_query = f"""
        SELECT series_id, series_name, observation_date, value
        FROM `{PROJECT_ID}.{DATASET}.fred_data`
        WHERE observation_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 60 DAY)
        ORDER BY series_id, observation_date DESC LIMIT 60
    """
    job_cfg = bigquery.QueryJobConfig(
        query_parameters=[bigquery.ScalarQueryParameter("ticker", "STRING", ticker)]
    )
    try:
        tech_df = bq_client.query(tech_query, job_config=job_cfg).to_dataframe()
        macro_df = bq_client.query(macro_query).to_dataframe()
    except Exception as e:
        logger.error(f"Council BQ fetch failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch market data.")

    # ── 2. Pre-compute grounded fact sheets (Python, not GPT) ───────────
    tech_facts = _build_tech_fact_sheet(tech_df, ticker)
    macro_facts = _build_macro_fact_sheet(macro_df)

    # News headlines (real titles, not summarized)
    news_str = "No recent headlines available."
    try:
        news_res = news_sentiment(ticker=ticker, limit=5)
        headlines = [f"- \"{a['title']}\" ({a['source']}, {a.get('publishedAt','')[:10]})"
                     for a in (news_res.get("articles") or [])]
        if headlines:
            news_str = "=== NEWS HEADLINES ===\n" + "\n".join(headlines) + \
                       "\n\nRULE: Cite specific headline titles. Do not invent any headlines."
    except Exception:
        pass

    company = TICKER_TO_COMPANY.get(ticker, ticker)

    # ── 3. Build per-agent prompts using fact sheets, not raw tables ─────
    def make_prompt(agent: dict) -> str:
        base = f"Ticker: {ticker} ({company}). Analysis date: {date.today()}.\n\n"
        data_type = agent["data"]
        if data_type == "technical":
            return base + tech_facts
        elif data_type == "macro":
            return base + macro_facts
        elif data_type == "news":
            return base + news_str + f"\n\nFor context, technical summary:\n{tech_facts[:500]}"
        else:  # technical_and_macro (bear)
            return base + tech_facts + "\n\n" + macro_facts

    # ── 4. Run all 5 agents in parallel, temperature=0.1, JSON output ───
    loop = asyncio.get_event_loop()
    agent_tasks = [
        loop.run_in_executor(
            None,
            _call_agent_grounded,
            _agent_system_prompt(agent),
            make_prompt(agent),
            "gpt-4o-mini"
        )
        for agent in COUNCIL_AGENTS
    ]
    raw_responses = await asyncio.gather(*agent_tasks, return_exceptions=True)

    council_results = []
    agent_summaries = []
    for agent, raw in zip(COUNCIL_AGENTS, raw_responses):
        if isinstance(raw, Exception):
            logger.error(f"Agent {agent['name']} failed: {raw}")
            result = {
                "agent": agent["name"], "icon": agent["icon"],
                "specialty": agent["specialty"], "color": agent["color"],
                "verdict": "NEUTRAL", "confidence": 50,
                "reasoning": "Agent unavailable.", "key_signals": [],
            }
        else:
            result = _parse_agent_json(raw, agent)

        council_results.append(result)
        agent_summaries.append(
            f"{agent['name']} ({agent['specialty']}): {result['verdict']} "
            f"[{result['confidence']}% confidence]\n"
            f"Key signals: {'; '.join(result['key_signals'][:2])}\n"
            f"Reasoning: {result['reasoning']}"
        )

    # ── 5. Chairman: gpt-4o, sees BOTH fact sheet AND agent summaries ───
    chairman_prompt = (
        f"Council analyzing: {ticker} ({company}) on {date.today()}\n\n"
        f"RAW FACT SHEET (authoritative — use this to verify agent claims):\n{tech_facts}\n\n"
        f"MACRO FACTS:\n{macro_facts}\n\n"
        "AGENT VERDICTS:\n" + "\n\n".join(agent_summaries) +
        "\n\nCross-check agent claims against the fact sheet. Output your ruling as valid JSON only."
    )
    try:
        chairman_raw = await loop.run_in_executor(
            None,
            _call_agent_grounded,
            CHAIRMAN_SYSTEM,
            chairman_prompt,
            "gpt-4o"   # Chairman uses the stronger model
        )
        clean = chairman_raw.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
        chairman_data = _json.loads(clean)
        for k in ["verdict", "confidence", "action", "timeframe", "synthesis", "decisive_signal"]:
            if k not in chairman_data:
                chairman_data[k] = "N/A" if k in ("timeframe", "decisive_signal") else \
                                   50 if k == "confidence" else "NEUTRAL" if k == "verdict" else \
                                   "HOLD" if k == "action" else ""
        # Clamp confidence
        chairman_data["confidence"] = max(0, min(100, int(chairman_data.get("confidence", 50))))
    except Exception as e:
        logger.error(f"Chairman failed: {e}")
        chairman_data = {
            "verdict": "NEUTRAL", "confidence": 50, "action": "HOLD",
            "timeframe": "N/A", "synthesis": "Chairman analysis unavailable. Please retry.",
            "decisive_signal": "N/A"
        }

    response = {
        "ticker": ticker,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "council": council_results,
        "chairman": chairman_data,
    }
    _council_cache[ticker] = {"ts": time.time(), "data": response}
    return response




@app.get("/chart-data")
def chart_data(ticker: str = "AAPL"):
    query = f"""
        SELECT 
            trade_date, open, high, low, close, 
            ma_20, ma_50, rsi_14, 
            total_volume, vma_20,
            macd_line, macd_signal, macd_histogram,
            bb_upper, bb_middle, bb_lower, bb_width
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
    
    # For ALL, fetch news for each BigFive company individually to ensure balanced coverage
    if symbol == "ALL":
        filtered = []
        articles_per_company = 2  # Get 2 articles per company for balance
        
        for t_code in BIG_FIVE_TICKERS:
            company = TICKER_TO_COMPANY[t_code]
            q_param = f'"{company}" AND (stock OR earnings OR analyst OR revenue OR profit)'
            
            three_days_ago = (datetime.now() - pd.Timedelta(days=7)).strftime('%Y-%m-%d')
            params = {
                "q": q_param,
                "apiKey": NEWS_API_KEY,
                "domains": FINANCE_DOMAINS,
                "pageSize": articles_per_company * 3,  # Fetch extra to filter
                "sortBy": "publishedAt",
                "from": three_days_ago
            }
            
            try:
                resp = requests.get("https://newsapi.org/v2/everything", params=params)
                resp.raise_for_status()
                articles = resp.json().get("articles", [])
            except Exception as e:
                logger.error(f"NewsAPI error for {company}: {e}")
                continue
            
            # Filter articles for this company
            company_articles = []
            for a in articles:
                url = a.get("url")
                if not url or "removed.com" in url:
                    continue
                
                text = f"{a.get('title') or ''} {a.get('description') or ''}".lower()
                
                # Filter out crypto
                if any(crypto_word in text for crypto_word in CRYPTO_KEYWORDS):
                    continue
                
                # Ensure it's stock-related
                if any(k in text for k in STOCK_KEYWORDS):
                    company_articles.append({
                        "title": a["title"],
                        "source": a["source"]["name"],
                        "url": a["url"],
                        "publishedAt": a.get("publishedAt"),
                        "ticker": company.upper()
                    })
                
                if len(company_articles) >= articles_per_company:
                    break
            
            filtered.extend(company_articles)
        
        # Sort all articles by date
        filtered.sort(key=lambda x: x.get("publishedAt", ""), reverse=True)
        
    else:
        # Single company query (existing logic)
        company = TICKER_TO_COMPANY.get(symbol, symbol)
        q_param = f'"{company}" AND (stock OR earnings OR analyst)'

        three_days_ago = (datetime.now() - pd.Timedelta(days=7)).strftime('%Y-%m-%d')
        params = {
            "q": q_param,
            "apiKey": NEWS_API_KEY,
            "domains": FINANCE_DOMAINS,
            "pageSize": limit * 5,
            "sortBy": "publishedAt",
            "from": three_days_ago
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
                    "ticker": TICKER_TO_COMPANY.get(symbol, symbol).upper()
                })
            if len(filtered) >= limit:
                break
                
        # Sort by date
        filtered.sort(key=lambda x: x.get("publishedAt", ""), reverse=True)

    headlines = "\n".join([f"- {title}" for title in [a['title'] for a in filtered]])
    
    if not headlines.strip():
        summary = "No significant news found in the last 7 days to generate a sentiment summary."
    elif not openai_client:
        summary = "Sentiment analysis currently unavailable (Missing AI API Key)."
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
            summary = "Sentiment analysis currently unavailable (API Error)."

    response = {"ticker": symbol, "articles": filtered, "sentiment_summary": summary}
    set_news_cache(f"{symbol}-sentiment", response)
    return response

@app.get("/crypto-news")
def crypto_news(limit: int = 10):
    """Get cryptocurrency news with AI sentiment for Bitcoin and Ethereum"""
    check_daily_limit()
    
    # Check cache
    cached = cached_news("CRYPTO-news")
    if cached:
        return cached
    
    # Fetch crypto news from NewsAPI
    params = {
        "q": "(Bitcoin OR Ethereum OR BTC OR ETH) AND (price OR market OR trading)",
        "apiKey": NEWS_API_KEY,
        "domains": "cointelegraph.com,coindesk.com,decrypt.co,cnbc.com,bloomberg.com",
        "pageSize": limit * 2,
        "sortBy": "publishedAt",
        "from": (datetime.now() - pd.Timedelta(days=3)).strftime('%Y-%m-%d')
    }
    
    try:
        resp = requests.get("https://newsapi.org/v2/everything", params=params)
        resp.raise_for_status()
        articles = resp.json().get("articles", [])
    except Exception as e:
        logger.error(f"NewsAPI crypto error: {e}")
        articles = []
    
    # Filter and format
    filtered = []
    for a in articles:
        url = a.get("url")
        if not url or "removed.com" in url:
            continue
        
        filtered.append({
            "title": a["title"],
            "source": a["source"]["name"],
            "url": a["url"],
            "publishedAt": a.get("publishedAt")
        })
        
        if len(filtered) >= limit:
            break
    
    # Generate AI sentiment
    headlines = "\n".join([f"- {a['title']}" for a in filtered])
    
    if openai_client and headlines:
        try:
            completion = openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{
                    "role": "user",
                    "content": f"Summarize cryptocurrency market sentiment from these headlines:\n{headlines}\n\nProvide a single paragraph."
                }],
                temperature=0.4
            )
            sentiment = completion.choices[0].message.content.strip().replace("*", "")
        except Exception as e:
            logger.error(f"OpenAI crypto sentiment error: {e}")
            sentiment = "Sentiment analysis unavailable"
    else:
        sentiment = "No recent crypto news available"
    
    response = {"articles": filtered, "sentiment_summary": sentiment}
    set_news_cache("CRYPTO-news", response)
    return response

@app.get("/big-five-dashboard")
def big_five_dashboard(days: int = 30, include_crypto: bool = True):
    """Get dashboard data for FAANG stocks and optionally crypto with sparkline history"""
    tickers = ALL_TICKERS if include_crypto else BIG_FIVE_TICKERS
    
    try:
        query = f"""
            WITH ranked_data AS (
                SELECT 
                    ticker, 
                    trade_date, 
                    close, 
                    daily_return * 100 AS daily_return, 
                    rsi_14,
                    ROW_NUMBER() OVER (PARTITION BY ticker ORDER BY trade_date DESC) as rn
                FROM `{PROJECT_ID}.{DATASET}.{GOLD_TABLE}`
                WHERE trade_date >= DATE_SUB(CURRENT_DATE(), INTERVAL @days DAY)
                AND ticker IN UNNEST(@tickers)
            ),
            history_agg AS (
                SELECT
                    ticker,
                    ARRAY_AGG(STRUCT(CAST(trade_date AS STRING) as date, close) ORDER BY trade_date ASC) as history
                FROM ranked_data
                WHERE rn <= 30
                GROUP BY ticker
            )
            SELECT 
                l.ticker, l.trade_date, l.close, l.daily_return, l.rsi_14,
                h.history
            FROM ranked_data l
            LEFT JOIN history_agg h ON l.ticker = h.ticker
            WHERE l.rn = 1
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

        # Clean history struct
        if 'history' in df.columns:
            def clean_history(h):
                if h is None: return []
                return [{"date": x['date'], "close": x['close']} for x in h]
            df['history'] = df['history'].apply(clean_history)

        # Sort by defined order
        # Robust NaN handling: force object type so None persists
        records = df.astype(object).where(pd.notnull(df), None).to_dict(orient="records")
        
        # Patch with real-time yfinance data so production dashboard shows live 1-day numbers
        try:
            import yfinance as yf
            crypto_map = {"BTC": "BTC-USD", "ETH": "ETH-USD"}
            yf_tickers = [crypto_map.get(t, t) for t in tickers]
            yf_to_req = {crypto_map.get(t, t): t for t in tickers}
            
            y_data = yf.Tickers(" ".join(yf_tickers))
            for y_t, t_obj in y_data.tickers.items():
                req_t = yf_to_req.get(y_t, y_t)
                fast = getattr(t_obj, 'fast_info', None)
                if fast:
                    live_price = getattr(fast, 'last_price', None)
                    prev_close = getattr(fast, 'previous_close', None)
                    if live_price and prev_close and live_price > 0 and prev_close > 0:
                        live_ret = ((live_price - prev_close) / prev_close) * 100
                        for r in records:
                            if r.get('ticker') == req_t:
                                r['close'] = round(live_price, 2)
                                r['daily_return'] = round(live_ret, 2)
                                break
        except Exception as e:
            logger.warning(f"Could not fetch live overlay for dashboard: {e}")

        try:
            ticker_order = {t: i for i, t in enumerate(tickers)}
            records.sort(key=lambda x: ticker_order.get(x['ticker'], 999))
        except Exception:
            pass
        
        return {"tickers": records}
    except Exception as e:
        logger.error(f"Dashboard error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

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
            WITH unique_data AS (
                SELECT DISTINCT
                    series_id,
                    series_name,
                    observation_date,
                    value,
                    frequency,
                    units
                FROM `{PROJECT_ID}.{DATASET}.fred_data`
                WHERE observation_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 730 DAY) -- 2 years
            ),
            ranked_data AS (
                SELECT 
                    *,
                    ROW_NUMBER() OVER (PARTITION BY series_id ORDER BY observation_date DESC) as rn
                FROM unique_data
            ),
            history_agg AS (
                SELECT
                    series_id,
                    ARRAY_AGG(STRUCT(CAST(observation_date AS STRING) as date, value) ORDER BY observation_date ASC) as history
                FROM ranked_data
                WHERE rn <= 24 -- Last 24 points for sparkline
                GROUP BY series_id
            )
            SELECT 
                l.series_id,
                l.series_name,
                l.observation_date as latest_date,
                l.value as latest_value,
                l.frequency,
                l.units,
                p.value as prev_value,
                p.observation_date as prev_date,
                SAFE_DIVIDE((l.value - p.value), p.value) * 100 as change_pct,
                h.history
            FROM ranked_data l
            LEFT JOIN ranked_data p 
                ON l.series_id = p.series_id AND p.rn = 2
            LEFT JOIN history_agg h
                ON l.series_id = h.series_id
            WHERE l.rn = 1
            ORDER BY l.series_id
        """
        
        df = bq_client.query(query).to_dataframe()
        
        # Convert history array of Structs/Rows to list of dicts
        if 'history' in df.columns and not df.empty:
            def clean_history(h):
                if h is None: return []
                # h is array of Row/dict, convert to simple dict
                return [{"date": x['date'], "value": x['value']} for x in h]
            
            try:
                df['history'] = df['history'].apply(clean_history)
            except Exception as e:
                logger.error(f"Error parsing history: {e}")
                df['history'] = []

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
        
        # Convert NaN to None robustly (force object type)
        df = df.astype(object).where(pd.notnull(df), None)
        
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
                daily_return * 100 AS daily_return
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

# ===========================
# REAL-TIME SSE BROADCASTER (Direct Bridge)
# ===========================
class Broadcaster:
    def __init__(self):
        self.clients = set()
        self.loop = None

    def broadcast(self, data):
        """Push data to all connected client queues."""
        if not self.loop:
            self.loop = asyncio.get_event_loop()
            
        for client_queue in list(self.clients):
            try:
                self.loop.call_soon_threadsafe(client_queue.put_nowait, data)
            except Exception as e:
                logger.error(f"Error pushing to client queue: {e}")

broadcaster = Broadcaster()

@app.post("/ingest")
async def ingest_tick(tick: dict):
    """Endpoint for the poller to send real-time ticks directly."""
    broadcaster.broadcast(json.dumps(tick))
    return {"status": "broadcasted"}

@app.get("/realtime-stream")
async def realtime_stream():
    """Server-Sent Events endpoint for real-time market data."""
    if not PROJECT_ID:
        raise HTTPException(status_code=500, detail="GCP_PROJECT not configured")

    queue = asyncio.Queue()
    broadcaster.clients.add(queue)
    
    async def event_generator():
        try:
            while True:
                try:
                    data = await asyncio.wait_for(queue.get(), timeout=5.0)
                    yield f"data: {data}\n\n"
                except asyncio.TimeoutError:
                    yield "data: heartbeat\n\n"
        finally:
            broadcaster.clients.remove(queue)
            logger.info("SSE client disconnected from shared stream")

    headers = {
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no", # Prevents Nginx/Cloudflare buffering
        "Content-Type": "text/event-stream"
    }

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers=headers
    )

@app.get("/intraday-history")
def get_intraday_history(ticker: str = Query(..., description="Ticker to fetch history for")):
    """Fetches today's intraday history using YFinance. Handles stocks (market hours) and crypto (24/7)."""
    try:
        import yfinance as yf

        CRYPTO_MAP = {"BTC": "BTC-USD", "ETH": "ETH-USD"}
        yf_ticker = CRYPTO_MAP.get(ticker.upper(), ticker.upper())
        is_crypto = ticker.upper() in CRYPTO_MAP

        stock = yf.Ticker(yf_ticker)

        # Fetch 2-day daily history to get a clean previous-day close
        hist_2d = stock.history(period="2d")
        prev_close = None
        if len(hist_2d) > 1:
            prev_close = float(hist_2d['Close'].iloc[-2])
        elif len(hist_2d) == 1:
            # For crypto, prev day open can serve as reference
            prev_close = float(hist_2d['Open'].iloc[0])
        else:
            info = stock.info
            prev_close = info.get('previousClose') or info.get('regularMarketPreviousClose')

        # Fetch today's 1-minute interval (yfinance gives full 24h for crypto, market hours for stocks)
        df = stock.history(period="1d", interval="1m")

        points = []
        if not df.empty:
            for idx, row in df.iterrows():
                points.append({
                    "ticker": ticker.upper(),
                    "price": float(row['Close']),
                    "volume": int(row['Volume']),
                    "timestamp": idx.isoformat(),
                    "prev_close": prev_close,
                    "is_crypto": is_crypto,
                })

        return {"ticker": ticker.upper(), "points": points, "prev_close": prev_close}
    except Exception as e:
        logger.error(f"Failed to fetch intraday history for {ticker}: {e}")
        return {"ticker": ticker, "points": [], "error": str(e)}
