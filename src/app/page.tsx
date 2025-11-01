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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const chartRef = useRef<ChartRef>(null);
  const chartWrapperRef = useRef<HTMLDivElement>(null);

  const handleReset = () => {
    reset();
    if (chartRef.current) {
      chartRef.current.resetCrop();
    }
  };

  const toggleFullscreen = () => {
    if (!chartWrapperRef.current) return;
    if (!document.fullscreenElement) {
      chartWrapperRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = !!document.fullscreenElement;
      setIsFullscreen(isFs);
      requestAnimationFrame(() => {
        if (chartRef.current && chartWrapperRef.current) {
          chartRef.current.resize(
            chartWrapperRef.current.clientWidth,
            chartWrapperRef.current.clientHeight
          );
          if (!isFs) {
            // After exiting fullscreen, fit the content to reset the view
            chartRef.current.fitContent();
          }
        }
      });
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Allow ESC to exit fullscreen, but don't interfere with other keys if not in fullscreen
      if (event.key === 'Escape' && isFullscreen) {
        // Fullscreen exit is handled by the browser
        return;
      }
      if (event.key === ' ') {
        event.preventDefault();
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
  }, [state.status, state.index, state.candles.length, setStatus, setIndex, isFullscreen]);


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
        
        const estimatedDaysToFetch = Math.ceil(candlesToFetch * 1.5);
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
                const firstCurrentCandleTime = toUnixSeconds(currentCandles[0].time);
                newCandles = newCandles.filter((c: any) => toUnixSeconds(c.time) < firstCurrentCandleTime);
                
                const prependedCandles = newCandles.slice(-candlesToFetch);

                const combinedCandles = [...prependedCandles, ...currentCandles];
                const newIndex = selectedIndex + prependedCandles.length;
                setData(combinedCandles, symbol, interval, range);
                setIndex(newIndex);
                chartRef.current?.startCrop();
                chartRef.current?.updateToIndex(newIndex);
            } else {
                setIndex(selectedIndex);
                chartRef.current?.startCrop();
                chartRef.current?.updateToIndex(selectedIndex);
            }
        } catch (err: any) {
            setError(err.message);
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
    <div className="min-h-screen bg-gray-50 p-2">
      <div className="max-w-full mx-auto">

        <div className="mb-2">
          <TradePanel
            symbol={symbol}
            setSymbol={setSymbol}
            handleLoad={handleLoad}
            loading={loading}
            error={error}
            onOpenLog={() => setLogOpen(true)}
          />
        </div>

        <div className="space-y-2">
          <div ref={chartWrapperRef} className={`relative bg-gray-800 p-2 rounded-lg shadow-sm h-[80vh]`}>
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
            isFullscreen={isFullscreen}
            onToggleFullscreen={toggleFullscreen}
          />
        </div>
 
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
