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
  const { state, setStatus, setData, setInterval: setIntervalContext } = useReplay();
  const [symbol, setSymbol] = useState('AAPL');
  const [interval, setInterval] = useState<'1d' | '5m' | '1h' | '1wk'>('1d');
  const [range, setRange] = useState<string>(RANGE_LIMITS['1d']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logOpen, setLogOpen] = useState(false);

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
      const effectiveRange = RANGE_LIMITS[interval];
      const response = await fetch(
        `/api/ohlc?symbol=${encodeURIComponent(symbol)}&interval=${interval}&range=${effectiveRange}`
      );

      if (!response.ok) {
        const errorData = await response.json() as any;
        throw new Error(errorData.error?.message || 'Failed to load data');
      }

      const data = await response.json() as any;

      // 设置数据到上下文（使用与后端一致的有效 range）
      setData(data.candles, symbol, interval, effectiveRange);

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
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-end gap-4">
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
              <button
                onClick={handleLoad}
                disabled={loading}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Load Data'}
              </button>
            </div>
            <button
              onClick={() => setLogOpen(true)}
              className="px-3 py-2 bg-slate-700 text-white rounded hover:bg-slate-800"
              title="Open Trade Log"
            >
              Trade Log
            </button>
          </div>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>

        {/* 主内容区：扩大图表区域并去掉右侧面板 */}
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-lg shadow-sm h-[70vh]">
            <Chart />
          </div>
          <PlaybackControls onChangeInterval={handleChangeInterval} />
        </div>
 
        {/* 底部交易面板（原 Trade Log 位置） */}
        <div className="mt-4">
          <TradePanel />
        </div>
 
        {/* 右侧弹出 Trade Log 抽屉 */}
        {logOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/40"
              onClick={() => setLogOpen(false)}
            />
            <div className="fixed right-0 top-0 z-50 h-full w-[420px] bg-white shadow-xl border-l border-slate-200 flex flex-col">
              <div className="p-3 border-b flex items-center justify-between">
                <span className="font-medium">Trade Log</span>
                <button
                  onClick={() => setLogOpen(false)}
                  className="px-2 py-1 text-sm rounded bg-slate-700 text-white hover:bg-slate-800"
                >
                  Close
                </button>
              </div>
              <div className="flex-1 overflow-auto p-3">
                <TradeLog />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
