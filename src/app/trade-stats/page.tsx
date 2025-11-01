// Trade Statistics Chart Page

'use client';

import { useEffect, useState } from 'react';
import TradeStatsChart from '@/components/TradeStatsChart';
import type { Trade } from '@/lib/types';

const TradeStatsPage = () => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [symbol, setSymbol] = useState<string>('');

  useEffect(() => {
    // Get data from localStorage or parent window
    const storedTrades = localStorage.getItem('tradeStats_trades');
    const storedSymbol = localStorage.getItem('tradeStats_symbol');

    if (storedTrades) {
      setTrades(JSON.parse(storedTrades));
    }
    if (storedSymbol) {
      setSymbol(storedSymbol);
    }

    // Listen for messages from parent window
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'TRADE_STATS_DATA') {
        setTrades(event.data.trades);
        setSymbol(event.data.symbol);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold text-slate-800 mb-6">Trade Statistics</h1>
          <TradeStatsChart trades={trades} symbol={symbol} />
        </div>
      </div>
    </div>
  );
};

export default TradeStatsPage;