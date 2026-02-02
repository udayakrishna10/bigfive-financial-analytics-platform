export interface StockPoint {
  trade_date: string;
  close: number;
  ma_20: number;
  ma_50: number;
  rsi_14: number;
}

export interface DashboardTicker {
  ticker: string;
  close: number;
  daily_return: number;
  rsi_14: number;
}