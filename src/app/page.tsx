// 主页面 v0.2

'use client';

import { useState, useEffect, useRef } from 'react';
import { ReplayProvider, useReplay } from '@/lib/context/ReplayContext';
import { PortfolioProvider } from '@/lib/context/PortfolioContext';
import Chart, { ChartRef } from '../components/Chart';
import PlaybackControls from '../components/PlaybackControls';
import TradePanel from '../components/TradePanel';
import TradeLog from '../components/TradeLog';
import { SUPPORTED_INTERVALS, RANGE_LIMITS, SEEK_SIZE } from '@/lib/config';


export default function Home() {
  return (
    <ReplayProvider>
      <PortfolioProvider>
        <StockSimulator />
      </PortfolioProvider>
    </ReplayProvider>
  );
}

const toUnixSeconds = (input: number | string): number => {
  if (typeof input === 'number') return input > 1e12 ? Math.floor(input / 1000) : input;
  return Math.floor(Date.parse(input) / 1000);
};

const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Space: toggle play/pause
      if (event.key === ' ') {
        event.preventDefault(); // Prevent page scroll
        if (state.status === 'playing') {
          setStatus('paused');
        } else {
          setStatus('playing');
        }
        return;
      }

      // Arrow keys for navigation
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        if (state.status === 'playing') setStatus('paused');
        setIndex(Math.max(0, state.index - 1));
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        if (state.status === 'playing') setStatus('paused');
        setIndex(Math.min(state.candles.length - 1, state.index + 1));
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (state.status === 'playing') setStatus('paused');
        setIndex(Math.max(0, state.index - SEEK_SIZE));
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (state.status === 'playing') setStatus('paused');
        setIndex(Math.min(state.candles.length - 1, state.index + SEEK_SIZE));
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [state.status, state.index, state.candles.length, setStatus, setIndex]);


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

  const handleSelectStart = async (selectedIndex: number) => {
    setStatus('paused');
    const MIN_HISTORY = 100;
    const currentCandles = state.candles;

    if (selectedIndex < MIN_HISTORY && currentCandles.length > 0) {
        const candlesToFetch = MIN_HISTORY - selectedIndex;
        const firstCandleTime = toUnixSeconds(currentCandles[0].time) * 1000;
        const endDate = new Date(firstCandleTime);
        const dayInMillis = 24 * 60 * 60 * 1000;
        
        // Estimate start date by fetching more days to account for non-trading days (e.g., 1.5x)
        const estimatedDaysToFetch = Math.ceil(candlesToFetch * 1.5); // Fetch 50% more
        const startDate = new Date(endDate.getTime() - estimatedDaysToFetch * dayInMillis);

        setLoading(true);
        setError(null);
        try {
            const response = await fetch(
                `/api/ohlc?symbol=${encodeURIComponent(symbol)}&interval=${interval}&startDate=${formatDate(startDate)}&endDate=${formatDate(endDate)}`
            );
            if (!response.ok) {
                const errorData = await response.json() as any;
                throw new Error(errorData.error?.message || 'Failed to load historical data');
            }
            const data = await response.json() as any;
            let newCandles = data.candles;

            if (newCandles.length > 0) {
                // De-duplicate and get the exact number of candles needed
                const firstCurrentCandleTime = toUnixSeconds(currentCandles[0].time);
                newCandles = newCandles.filter((c: any) => toUnixSeconds(c.time) < firstCurrentCandleTime);
                
                // Take the last `candlesToFetch` candles from the new data
                const prependedCandles = newCandles.slice(-candlesToFetch);

                const combinedCandles = [...prependedCandles, ...currentCandles];
                const newIndex = selectedIndex + prependedCandles.length;
                setData(combinedCandles, symbol, interval, range);
                setIndex(newIndex);
                chartRef.current?.startCrop();
                chartRef.current?.updateToIndex(newIndex);
            } else {
                // No more historical data, just use the selected index
                setIndex(selectedIndex);
                chartRef.current?.startCrop();
                chartRef.current?.updateToIndex(selectedIndex);
            }
        } catch (err: any) {
            setError(err.message);
            // Fallback to original behavior on error
            setIndex(selectedIndex);
            chartRef.current?.startCrop();
            chartRef.current?.updateToIndex(selectedIndex);
        } finally {
            setLoading(false);
        }
    } else {
        setIndex(selectedIndex);
        chartRef.current?.startCrop();
        chartRef.current?.updateToIndex(selectedIndex);
    }
    setSelectMode(false);
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
              onSelectCandle={handleSelectStart}
            />
          </div>
          <PlaybackControls
            onChangeInterval={handleChangeInterval}
            onChangeRange={handleChangeRange}
            currentRange={range}
            onStartSelect={() => setSelectMode((v) => !v)}
            onSelectStart={handleSelectStart}
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
