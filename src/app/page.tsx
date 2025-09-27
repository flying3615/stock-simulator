// 主页面 v0.2

'use client';

import { useState } from 'react';
import { ReplayProvider, useReplay } from '../lib/context/ReplayContext';
import { PortfolioProvider } from '../lib/context/PortfolioContext';
import Chart from '../components/Chart';
import PlaybackControls from '../components/PlaybackControls';
import TradePanel from '../components/TradePanel';
import TradeLog from '../components/TradeLog';
import { SUPPORTED_INTERVALS, RANGE_LIMITS } from '../lib/config';

export default function Home() {
  return (
    <ReplayProvider>
      <PortfolioProvider>
        <StockSimulator />
      </PortfolioProvider>
    </ReplayProvider>
  );
}

function StockSimulator() {
  const { setData } = useReplay();
  const [symbol, setSymbol] = useState('AAPL');
  const [interval, setInterval] = useState<'1d' | '5m'>('1d');
  const [range, setRange] = useState('5y');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLoad = async () => {
    if (!symbol.trim()) {
      setError('Symbol is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/ohlc?symbol=${encodeURIComponent(symbol)}&interval=${interval}&range=${range}`
      );

      if (!response.ok) {
        const errorData = await response.json() as any;
        throw new Error(errorData.error?.message || 'Failed to load data');
      }

      const data = await response.json() as any;

      // 设置数据到上下文
      setData(data.candles, symbol, interval, range);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* 顶部输入区 */}
        <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm font-medium mb-1">Symbol</label>
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                className="px-3 py-2 border rounded"
                placeholder="e.g. AAPL"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Interval</label>
              <select
                value={interval}
                onChange={(e) => {
                  const newInterval = e.target.value as '1d' | '5m';
                  setInterval(newInterval);
                  setRange(RANGE_LIMITS[newInterval]); // 自动调整 range
                }}
                className="px-3 py-2 border rounded"
              >
                {SUPPORTED_INTERVALS.map((int) => (
                  <option key={int} value={int}>
                    {int}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Range</label>
              <select
                value={range}
                onChange={(e) => setRange(e.target.value)}
                className="px-3 py-2 border rounded"
              >
                <option value="5y">5 Years</option>
                <option value="30d">30 Days</option>
              </select>
            </div>
            <button
              onClick={handleLoad}
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Load Data'}
            </button>
          </div>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>

        {/* 主内容区 */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* 图表区（左侧大区） */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <Chart width={800} height={400} />
            </div>
            <PlaybackControls />
          </div>

          {/* 右侧面板 */}
          <div className="space-y-4">
            <TradePanel />
            <TradeLog />
          </div>
        </div>
      </div>
    </div>
  );
}
