import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { RealtimeMessage } from './useRealtimeData';

export interface RealtimeContextType {
    realtimeData: Record<string, RealtimeMessage>;
    isLive: boolean;
    latency: number;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [realtimeData, setRealtimeData] = useState<Record<string, RealtimeMessage>>({});
    const [isLive, setIsLive] = useState(false);
    const [latency, setLatency] = useState(0);

    useEffect(() => {
        const streamUrl = api.getRealtimeStreamURL();
        const eventSource = new EventSource(streamUrl);

        eventSource.onopen = () => {
            setIsLive(true);
            console.log("SSE Connection Open (Shared)");
        };

        eventSource.onmessage = (event) => {
            if (event.data === 'heartbeat') return;

            try {
                const message: RealtimeMessage = JSON.parse(event.data);
                console.log(`[Realtime] Tick for ${message.ticker}: $${message.price} (${message.daily_return}%)`);

                setRealtimeData(prev => ({
                    ...prev,
                    [message.ticker]: message
                }));

                const msgTime = new Date(message.timestamp).getTime();
                setLatency(Date.now() - msgTime);
            } catch (err) { }
        };

        eventSource.onerror = () => {
            setIsLive(false);
        };

        return () => {
            eventSource.close();
        };
    }, []);

    return (
        <RealtimeContext.Provider value={{ realtimeData, isLive, latency }}>
            {children}
        </RealtimeContext.Provider>
    );
};

export const useRealtime = () => {
    const context = useContext(RealtimeContext);
    if (context === undefined) {
        throw new Error('useRealtime must be used within a RealtimeProvider');
    }
    return context;
};
