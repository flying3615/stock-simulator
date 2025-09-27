// 主页面 v0.2

'use client';

import { useState, useEffect } from 'react';
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
  const { state, setStatus, setData, setIndex, setInterval: setIntervalContext } = useReplay();
  const [symbol, setSymbol] = useState('AAPL');
  const [interval, setInterval] = useState<'1d' | '5m' | '1h' | '1wk'>('1d');
  const [range, setRange] = useState('5y');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jumpDate, setJumpDate] = useState('');

  // Keyboard listener for space to toggle play/pause
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === ' ') {
        event.preventDefault(); // Prevent page scroll
        if (state.status === 'playing') {
          setStatus('paused');
        } else {
          setStatus('playing');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [state.status, setStatus]);

  const handleJumpToDate = () => {
    if (!jumpDate) return;
    const targetTime = new Date(jumpDate).getTime() / 1000; // 转为秒
    // 找到最接近的索引（简化：线性查找）
    let closestIndex = 0;
    let minDiff = Infinity;
    state.candles.forEach((candle, index) => {
      const sec = typeof state.candles[index].time === 'number'
        ? (state.candles[index].time > 1e12 ? Math.floor((state.candles[index].time as number) / 1000) : (state.candles[index].time as number))
        : Math.floor(Date.parse(state.candles[index].time as any) / 1000);
      const diff = Math.abs(sec - targetTime);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = index;
      }
    });
    setIndex(closestIndex);
  };

  const handleChangeInterval = async (newInterval: typeof SUPPORTED_INTERVALS[number]) => {
    setInterval(newInterval);
    setRange(RANGE_LIMITS[newInterval]);
    // Reload data
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/ohlc?symbol=${encodeURIComponent(symbol)}&interval=${newInterval}&range=${RANGE_LIMITS[newInterval]}`
      );
      if (!response.ok) {
        const errorData = await response.json() as any;
        throw new Error(errorData.error?.message || 'Failed to load data');
      }
      const data = await response.json() as any;
      setData(data.candles, symbol, newInterval, RANGE_LIMITS[newInterval]);
      setIntervalContext(newInterval);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
              <label className="block text-sm font-medium mb-1 text-slate-800">Symbol</label>
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                className="px-3 py-2 border rounded text-slate-400"
                placeholder="e.g. AAPL"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-800">Interval</label>
              <select
                value={interval}
                onChange={(e) => {
                  const newInterval = e.target.value as '1d' | '5m' | '1h' | '1wk';
                  setInterval(newInterval);
                  setRange(RANGE_LIMITS[newInterval]); // 自动调整 range
                }}
                className="px-3 py-2 border rounded text-slate-400"
              >
                {SUPPORTED_INTERVALS.map((int) => (
                  <option key={int} value={int}>
                    {int}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-800">Range</label>
              <select
                value={range}
                onChange={(e) => setRange(e.target.value)}
                className="px-3 py-2 border rounded text-slate-400"
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
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={jumpDate}
                onChange={(e) => setJumpDate(e.target.value)}
                className="px-2 py-2 border rounded"
              />
              <button
                onClick={handleJumpToDate}
                className="px-3 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
              >
                Jump to Date
              </button>
            </div>
          </div>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>

        {/* 主内容区 */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* 图表区（左侧大区） */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-white p-4 rounded-lg shadow-sm h-[400px]">
              <Chart />
            </div>
            <PlaybackControls onChangeInterval={handleChangeInterval} />
          </div>

          {/* 右侧面板 */}
          <div>
            <TradePanel />
          </div>
        </div>

        {/* 成交明细（底部全宽） */}
        <div className="mt-4">
          <TradeLog />
        </div>
      </div>
    </div>
  );
}
