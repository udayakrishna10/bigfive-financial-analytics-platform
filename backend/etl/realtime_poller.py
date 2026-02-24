import os
import json
import time
import asyncio
import logging
from datetime import datetime, timezone
import yfinance as yf
import requests
from google.cloud import storage
from dotenv import load_dotenv

# ===========================
# CONFIGURATION & LOGGING
# ===========================
load_dotenv()
logging.basicConfig(level=logging.INFO, format='%(levelname)s:%(name)s:%(message)s')
logger = logging.getLogger(__name__)

PROJECT_ID = os.getenv("GCP_PROJECT", "faang-stock-analytics")
LOCATION = os.getenv("GCP_LOCATION", "us-central1")
BUCKET_NAME = os.getenv("GCS_BUCKET_NAME", "faang-intraday-ticks")

# Poller Configuration
BIG_FIVE_TICKERS = ["AAPL", "AMZN", "META", "NFLX", "GOOGL"]

# ===========================
# RESILIENCE & BACKOFF
# ===========================
class CircuitBreaker:
    def __init__(self, failure_threshold=3, recovery_timeout=60):
        self.failures = {}
        self.last_failure_time = {}
        self.threshold = failure_threshold
        self.timeout = recovery_timeout

    def is_open(self, ticker):
        if self.failures.get(ticker, 0) >= self.threshold:
            elapsed = time.time() - self.last_failure_time.get(ticker, 0)
            if elapsed < self.timeout:
                return True
            self.failures[ticker] = 0
        return False

    def record_failure(self, ticker):
        self.failures[ticker] = self.failures.get(ticker, 0) + 1
        self.last_failure_time[ticker] = time.time()
        logger.warning(f"Circuit Breaker: Recorded failure for {ticker}. Total: {self.failures[ticker]}")

class ExponentialBackoff:
    def __init__(self, base_delay=5, max_delay=300):
        self.delay = base_delay
        self.max_delay = max_delay

    def increase(self):
        self.delay = min(self.delay * 2, self.max_delay)
        logger.info(f"Backoff: Increasing polling delay to {self.delay}s")

    def reset(self):
        self.delay = 5

    def get_delay(self):
        return self.delay

circuit_breaker = CircuitBreaker()
backoff_manager = ExponentialBackoff()
storage_client = storage.Client(project=PROJECT_ID)

# ===========================
# POLLING LOGIC
# ===========================
async def poll_yfinance(ticker):
    """Fetch latest price for a stock ticker."""
    if circuit_breaker.is_open(ticker):
        return None

    try:
        stock = yf.Ticker(ticker)
        data = stock.fast_info
        price = data.last_price
        
        # Prefer regular_market_previous_close (matches Apple Stock app) over previous_close
        # regular_market_previous_close is the official 4:00 PM ET close, excluding after-hours
        prev_close = getattr(data, 'regular_market_previous_close', None)
        
        # Fallback: try full info dict if fast_info doesn't have it
        if prev_close is None:
            try:
                full_info = stock.info
                prev_close = full_info.get('regularMarketPreviousClose') or full_info.get('previousClose')
            except:
                prev_close = data.previous_close
        
        if price is None or prev_close is None:
            raise ValueError("Price or PrevClose is None")

        daily_return = ((price - prev_close) / prev_close) * 100
        logger.info(f"DEBUG: {ticker} Price: {price}, PrevClose (regular market): {prev_close}, Change: {daily_return:.2f}%")
        
        return {
            "ticker": ticker,
            "price": float(price),
            "prev_close": float(prev_close),
            "daily_return": float(daily_return),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "source": "yfinance_realtime"
        }
    except Exception as e:
        logger.error(f"Error polling {ticker}: {e}")
        circuit_breaker.record_failure(ticker)
        return None

async def poll_crypto():
    """Fetch crypto prices via CoinGecko."""
    try:
        url = "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true"
        headers = {'User-Agent': 'Mozilla/5.0'}
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code == 429:
            logger.warning("CoinGecko Rate Limit (429).")
            backoff_manager.increase()
            return [], True
            
        response.raise_for_status()
        data = response.json()
        
        results = []
        mapping = {"bitcoin": "BTC", "ethereum": "ETH"}
        
        for cg_id, ticker in mapping.items():
            if cg_id in data:
                current_price = float(data[cg_id]["usd"])
                change_24h = float(data[cg_id]["usd_24h_change"])
                # Calculate an approximate prev_close from 24h change: price = prev_close * (1 + change/100)
                # => prev_close = price / (1 + change/100)
                approx_prev_close = current_price / (1 + change_24h / 100)
                
                results.append({
                    "ticker": ticker,
                    "price": current_price,
                    "prev_close": approx_prev_close,
                    "daily_return": change_24h,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "source": "coingecko_realtime"
                })
        
        backoff_manager.reset()
        return results, False
    except Exception as e:
        logger.error(f"Error polling crypto: {e}")
        return [], True

# ===========================
# MAIN POLLER LOOP
# ===========================
async def main():
    logger.info("Starting Robust Real-time Poller with Direct Bridge to Backend")
    
    try:
        bucket = storage_client.bucket(BUCKET_NAME)
        if not bucket.exists():
            logger.info(f"Creating missing bucket: {BUCKET_NAME}")
            storage_client.create_bucket(bucket, location=LOCATION)
    except Exception as e:
        logger.error(f"Failed to ensure bucket {BUCKET_NAME}: {e}")

    while True:
        start_time = time.time()
        
        # 1. Poll Stocks & Crypto
        stock_tasks = [poll_yfinance(t) for t in BIG_FIVE_TICKERS]
        stock_results = await asyncio.gather(*stock_tasks)
        crypto_results, had_crypto_error = await poll_crypto()
        
        all_updates = [r for r in stock_results if r] + crypto_results
        
        if all_updates:
            logger.info(f"Polled {len(all_updates)} assets. Bridging to backend...")
            for update in all_updates:
                try:
                    resp = requests.post("http://127.0.0.1:8080/ingest", json=update, timeout=1)
                    if resp.status_code == 200:
                        logger.info(f"Successfully bridged tick for {update['ticker']}")
                    else:
                        logger.error(f"Bridging failed for {update['ticker']}: {resp.status_code}")
                except Exception as e:
                    logger.error(f"Bridge connection error: {e}")

            # GCS Archive
            now = datetime.now(timezone.utc)
            date_prefix = now.strftime('%Y-%m-%d')
            hour_prefix = now.strftime('%H')
            blob_name = f"ticks/{date_prefix}/{hour_prefix}.json"
            
            try:
                bucket = storage_client.bucket(BUCKET_NAME)
                blob = bucket.blob(blob_name)
                ndjson_data = "\n".join([json.dumps(u) for u in all_updates]) + "\n"
                
                if blob.exists():
                    existing_content = blob.download_as_text()
                    blob.upload_from_string(existing_content + ndjson_data)
                else:
                    blob.upload_from_string(ndjson_data)
            except Exception as e:
                logger.error(f"Failed to archive to GCS: {e}")

        # Maintain frequency
        elapsed = time.time() - start_time
        sleep_time = max(0, backoff_manager.get_delay() - elapsed)
        await asyncio.sleep(sleep_time)

if __name__ == "__main__":
    asyncio.run(main())
