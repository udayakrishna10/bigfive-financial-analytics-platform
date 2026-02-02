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
    fetch(`${API_CONFIG.BASE_URL}/news-sentiment?ticker=${ticker}`).then(res => res.json()),

  askAI: (question: string) =>
    fetch(`${API_CONFIG.BASE_URL}/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question })
    }).then(res => res.json()),

  checkHealth: () =>
    fetch(`${API_CONFIG.BASE_URL}/health`).then(res => res.json()),
};