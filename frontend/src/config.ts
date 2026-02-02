export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? "/api" : "http://127.0.0.1:8000"),
  TICKERS: ["AAPL", "AMZN", "META", "NFLX", "GOOGL"]
};