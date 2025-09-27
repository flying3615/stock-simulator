// 主页面 v0.2

'use client';

import { useState, useEffect, useRef } from 'react';
import { ReplayProvider, useReplay } from '../lib/context/ReplayContext';
import { PortfolioProvider } from '../lib/context/PortfolioContext';
import Chart, { ChartRef } from '../components/Chart';
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
  const { state, setStatus, setData, setIndex, setInterval: setIntervalContext, reset } = useReplay();
  const [symbol, setSymbol] = useState('AAPL');
  const [interval, setInterval] = useState<'1d' | '5m' | '1h' | '1wk'>('1d');
  const [range, setRange] = useState<string>(RANGE_LIMITS['1d']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const chartRef = useRef<ChartRef>(null);

  const handleReset = () => {
    reset();
    if (chartRef.current) {
      chartRef.current.resetCrop();
    }
  };

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

  const handleChangeRange = async (newRange: string) => {
    setRange(newRange);
    // Reload data
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/ohlc?symbol=${encodeURIComponent(symbol)}&interval=${interval}&range=${newRange}`
      );
      if (!response.ok) {
        const errorData = await response.json() as any;
        throw new Error(errorData.error?.message || 'Failed to load data');
      }
      const data = await response.json() as any;
      setData(data.candles, symbol, interval, newRange);
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

        {/* 底部交易面板（原 Trade Log 位置） */}
        <div className="mb-4">
          <TradePanel
            symbol={symbol}
            setSymbol={setSymbol}
            handleLoad={handleLoad}
            loading={loading}
            error={error}
            onOpenLog={() => setLogOpen(true)}
          />
        </div>

        {/* 主内容区：扩大图表区域并去掉右侧面板 */}
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-lg shadow-sm h-[70vh]">
            <Chart
              ref={chartRef}
              selectMode={selectMode}
              onSelectCandle={(idx) => {
                setIndex(idx);
                setSelectMode(false); // 选择完成后自动关闭监听
              }}
            />
          </div>
          <PlaybackControls
            onChangeInterval={handleChangeInterval}
            onChangeRange={handleChangeRange}
            currentRange={range}
            onStartSelect={() => setSelectMode((v) => !v)}
            selecting={selectMode}
            onReset={handleReset}
            onFocusIndex={(i) => chartRef.current?.updateToIndex(i)}
            onEnableCrop={() => chartRef.current?.startCrop()}
            onFitContent={() => chartRef.current?.fitContent()}
          />
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
                <span className="font-medium text-slate-800">Trade Log</span>
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
