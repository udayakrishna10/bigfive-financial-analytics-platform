import os
import sys
from dotenv import load_dotenv
from fastapi.testclient import TestClient

# Add backend/app to sys.path
sys.path.append(os.path.abspath('backend/app'))

# Load environment
env_path = os.path.abspath('.env')
load_dotenv(env_path)

from main import app

def test_stream():
    client = TestClient(app)
    ticker = "AAPL"
    print(f"Testing /ai-council-stream for {ticker}...")
    try:
        # Use a context manager for the request to handle the stream
        with client.stream("POST", "/ai-council-stream", json={"ticker": ticker}) as response:
            print(f"Status: {response.status_code}")
            if response.status_code != 200:
                print(f"Error: {response.text}")
                return
            
            count = 0
            for line in response.iter_lines():
                if line:
                    print(f"Chunk {count}: {line[:100]}...")
                    count += 1
                if count > 5: break
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    test_stream()
