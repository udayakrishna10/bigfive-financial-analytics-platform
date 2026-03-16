import os
import sys
from dotenv import load_dotenv

# Add backend/app to sys.path
sys.path.append(os.path.abspath('backend/app'))

# Load environment
env_path = os.path.abspath('.env')
load_dotenv(env_path)

from main import _fetch_fundamentals

def test():
    ticker = "AAPL"
    print(f"Testing fundamentals for {ticker}...")
    try:
        facts = _fetch_fundamentals(ticker)
        print("Facts fetched successfully:")
        print(facts[:500] + "...")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test()
