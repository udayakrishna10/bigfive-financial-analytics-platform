import { API_CONFIG } from '../config';

export interface TickerData {
  ticker: string;
  close: number;
  daily_return: number;
  rsi_14: number;
}

export const api = {
  getDashboard: (): Promise<{ tickers: TickerData[] }> =>
    fetch(`${API_CONFIG.BASE_URL}/big-five-dashboard`).then(res => res.json()),

  getChart: (ticker: string) =>
    fetch(`${API_CONFIG.BASE_URL}/chart-data?ticker=${ticker}`).then(res => res.json()),

  // ADD THIS FUNCTION TO FIX THE ERROR
  getSentiment: (ticker: string) =>
    fetch(`${API_CONFIG.BASE_URL}/news-sentiment?ticker=${ticker}`).then(async res => {
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

  checkHealth: () =>
    fetch(`${API_CONFIG.BASE_URL}/health`).then(res => res.json()),
};