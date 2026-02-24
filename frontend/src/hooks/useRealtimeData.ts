import { useRealtime } from './RealtimeContext';

export interface RealtimeMessage {
    ticker: string;
    price: number;
    prev_close?: number;
    timestamp: string;
    type: 'stock' | 'crypto';
    change_24h?: number;
    daily_return?: number;
    volume?: number;
    volume_24h?: number;
    market_cap?: number;
}

export const useRealtimeData = () => {
    return useRealtime();
};
