// Trade Statistics Chart Page

'use client';

import { useEffect, useState } from 'react';
import TradeStatsChart from '@/components/TradeStatsChart';
import {calculateTradingStats, TradingStats} from '@/lib/trade/stats';
import type { Trade } from '@/lib/types';

const TradeStatsPage = () => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [symbol, setSymbol] = useState<string>('');
  const [stats, setStats] = useState<TradingStats | null>(null);

  useEffect(() => {
    // Get data from localStorage or parent window
    const storedTrades = localStorage.getItem('tradeStats_trades');
    const storedSymbol = localStorage.getItem('tradeStats_symbol');

    if (storedTrades) {
      const parsedTrades = JSON.parse(storedTrades);
      setTrades(parsedTrades);
      setStats(calculateTradingStats(parsedTrades));
    }
    if (storedSymbol) {
      setSymbol(storedSymbol);
    }

    // Listen for messages from parent window
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'TRADE_STATS_DATA') {
        setTrades(event.data.trades);
        setSymbol(event.data.symbol);
        setStats(calculateTradingStats(event.data.trades));
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Trading Statistics */}
        {stats && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">Trading Statistics - {symbol}</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Trades:</span>
                  <span className="font-medium text-slate-900">{stats.totalTrades}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Win Rate:</span>
                  <span className="font-medium text-slate-900">{stats.winRate.toFixed(1)}%</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex justify-between">
                  <span className="text-slate-500">P/L Ratio:</span>
                  <span className="font-medium text-slate-900">{stats.profitLossRatio.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total P&L:</span>
                  <span
                    className={`font-medium ${
                      stats.totalRealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    ${stats.totalRealizedPnL.toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex justify-between">
                  <span className="text-slate-500">Winning Trades:</span>
                  <span className="font-medium text-green-600">{stats.winningTrades}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Losing Trades:</span>
                  <span className="font-medium text-red-600">{stats.losingTrades}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex justify-between">
                  <span className="text-slate-500">Max Win:</span>
                  <span className="font-medium text-green-600">${stats.maxWin.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Max Loss:</span>
                  <span className="font-medium text-red-600">${stats.maxLoss.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Chart */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-slate-800 mb-6">Performance Chart</h2>
          <TradeStatsChart trades={trades} symbol={symbol} />
        </div>
      </div>
    </div>
  );
};

export default TradeStatsPage;