import { API_CONFIG } from '../config';

export interface TickerData {
  ticker: string;
  close: number;
  daily_return: number;
  rsi_14: number;
  history?: { date: string; close: number }[];
}

export const api = {
  getDashboard: (): Promise<{ tickers: TickerData[] }> =>
    fetch(`${API_CONFIG.BASE_URL}/big-five-dashboard`, { cache: 'no-store' }).then(res => res.json()),

  getChart: (ticker: string) =>
    fetch(`${API_CONFIG.BASE_URL}/chart-data?ticker=${ticker}`, { cache: 'no-store' }).then(res => res.json()),

  getSentiment: (ticker: string) =>
    fetch(`${API_CONFIG.BASE_URL}/news-sentiment?ticker=${ticker}`, { cache: 'no-store' }).then(async res => {
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to fetch sentiment");
      }
      return res.json();
    }),

  askAI: (question: string) =>
    fetch(`${API_CONFIG.BASE_URL}/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question })
    }).then(async res => {
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to get AI response");
      }
      return res.json();
    }),

  getCryptoNews: () =>
    fetch(`${API_CONFIG.BASE_URL}/crypto-news`, { cache: 'no-store' }).then(async res => {
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to fetch crypto news");
      }
      return res.json();
    }),

  checkHealth: () =>
    fetch(`${API_CONFIG.BASE_URL}/health`, { cache: 'no-store' }).then(res => res.json()),

  getRealtimeStreamURL: () => `${API_CONFIG.BASE_URL}/realtime-stream`,

  getIntradayHistory: (ticker: string) =>
    fetch(`${API_CONFIG.BASE_URL}/intraday-history?ticker=${ticker}&cb=${Date.now()}`, { cache: 'no-store' }).then(res => res.json()),
};
