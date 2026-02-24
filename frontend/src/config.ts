export const API_CONFIG = {
  // Use Cloud Run URL directly in prod to bypass Netlify proxy which breaks SSE streams
  BASE_URL: import.meta.env.PROD
    ? 'https://faang-api-1007680875469.us-central1.run.app'
    : (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'),
  TICKERS: ["AAPL", "AMZN", "META", "NFLX", "GOOGL"]
};