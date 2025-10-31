// K线图表组件 v0.2（lightweight-charts）

'use client';

import { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, HistogramData, UTCTimestamp } from 'lightweight-charts';
import { useReplay } from '@/lib/context/ReplayContext';
import type { Candle } from '@/lib/types';


export interface ChartRef {
  setData: (candles: Candle[]) => void;
  updateToIndex: (index: number) => void;
  resetCrop: () => void;
  startCrop: () => void;
  fitContent: () => void;
}

interface ChartProps {
  width?: number;
  height?: number;
  // 是否进入“选择K线”模式（仅在 true 时监听点击）
  selectMode?: boolean;
  // 选择某根K线后的回调（返回所选索引）
  onSelectCandle?: (index: number) => void;
}

const Chart = forwardRef<ChartRef, ChartProps>(({ selectMode = false, onSelectCandle }, ref) => {
  const { state, setIndex } = useReplay();
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const [clipActive, setClipActive] = useState(false);
  const hasAutoFittedRef = useRef(false);
  const userAdjustedRef = useRef(false);

  // State for custom legend
  const [legendData, setLegendData] = useState<any>(null);

  const toUnixSeconds = (input: any): number => {
    if (typeof input === 'number') {
      return input > 1e12 ? Math.floor(input / 1000) : input;
    }
    const ms = Date.parse(input);
    return Math.floor(ms / 1000);
  };

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const container = chartContainerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const chart = createChart(container, {
      width,
      height,
      layout: {
        background: { color: '#1F2937' }, // gray-800
        textColor: '#D1D5DB', // gray-300
      },
      grid: {
        vertLines: { color: '#374151' }, // gray-700
        horzLines: { color: '#374151' }, // gray-700
      },
      crosshair: {
        mode: 1, // Normal
      },
      rightPriceScale: {
        borderColor: '#374151', // gray-700
      },
      timeScale: {
        borderColor: '#374151', // gray-700
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 10,
        shiftVisibleRangeOnNewBar: false,
      },
    });

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    const volumeSeries = chart.addHistogramSeries({
      color: '#26a69a',
      priceFormat: { type: 'volume' },
      priceScaleId: '',
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.7,
        bottom: 0,
      },
    });

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;
    volumeSeriesRef.current = volumeSeries;

    chart.subscribeCrosshairMove(param => {
      if (param.time && candlestickSeriesRef.current && volumeSeriesRef.current && param.seriesData.size > 0) {
        const candlestickData = param.seriesData.get(candlestickSeriesRef.current);
        const volumeData = param.seriesData.get(volumeSeriesRef.current);
        setLegendData({ ohlc: candlestickData, volume: volumeData });
      } else {
        setLegendData(null);
      }
    });

    const ts = chart.timeScale();
    const onRangeChange = () => {
      if (!hasAutoFittedRef.current) return;
      userAdjustedRef.current = true;
    };
    ts.subscribeVisibleTimeRangeChange(onRangeChange);

    return () => {
      ts.unsubscribeVisibleTimeRangeChange(onRangeChange);
      chart.remove();
    };
  }, []);

  // Conditional listener for selectMode
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !selectMode) return;

    const handler = (param: any) => {
      if (!param || param.time == null) return;
      const clickedSec = typeof param.time === 'string' ? Math.floor(Date.parse(param.time) / 1000) : Number(param.time);

      let closestIndex = 0;
      let minDiff = Infinity;
      for (let i = 0; i < state.candles.length; i++) {
        const sec = toUnixSeconds(state.candles[i].time);
        const diff = Math.abs(sec - clickedSec);
        if (diff < minDiff) {
          minDiff = diff;
          closestIndex = i;
        }
      }

      try {
        onSelectCandle?.(closestIndex);
      } finally {
        setClipActive(true);
      }
    };

    chart.subscribeClick(handler);
    return () => chart.unsubscribeClick(handler);
  }, [selectMode, state.candles, onSelectCandle]);

  // Update data
  useEffect(() => {
    if (!candlestickSeriesRef.current || !volumeSeriesRef.current || state.candles.length === 0) {
        // Clear series data if no candles
        candlestickSeriesRef.current?.setData([]);
        volumeSeriesRef.current?.setData([]);
        return;
    }

    const candlestickData: CandlestickData<UTCTimestamp>[] = state.candles.map(candle => ({
      time: toUnixSeconds(candle.time) as UTCTimestamp,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    }));

    const volumeData: HistogramData<UTCTimestamp>[] = state.candles.map(candle => ({
      time: toUnixSeconds(candle.time) as UTCTimestamp,
      value: candle.volume,
      color: candle.close >= candle.open ? '#26a69a' : '#ef5350',
    }));

    const incremental = clipActive || state.status === 'playing';
    const sliceLen = incremental ? Math.min(state.index + 1, candlestickData.length) : candlestickData.length;

    candlestickSeriesRef.current.setData(candlestickData.slice(0, sliceLen));
    volumeSeriesRef.current.setData(volumeData.slice(0, sliceLen));

    if (chartRef.current && state.status === 'playing' && !userAdjustedRef.current) {
      const ts = chartRef.current.timeScale();
      const lr = ts.getVisibleLogicalRange();
      const lastIndex = sliceLen - 1;
      const visibleWidth = lr ? Math.max(5, lr.to - lr.from) : 100;
      const from = lastIndex - visibleWidth * 0.85;
      const to = lastIndex + visibleWidth * 0.15;
      ts.setVisibleLogicalRange({ from, to });
    }

    if (chartRef.current && !hasAutoFittedRef.current && !clipActive && state.status !== 'playing') {
      chartRef.current.timeScale().fitContent();
      hasAutoFittedRef.current = true;
    }
  }, [state.candles, state.index, state.status, clipActive]);

  // Reset clip and fit status on data change
  useEffect(() => {
    setClipActive(false);
    hasAutoFittedRef.current = false;
    userAdjustedRef.current = false;
  }, [state.symbol, state.interval, state.range]);

  // Auto-pan to selected index
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || state.status === 'playing' || clipActive) return;

    const ts = chart.timeScale();
    const lr = ts.getVisibleLogicalRange();
    if (!lr) return;

    const lastIndex = Math.min(state.index, Math.max(0, state.candles.length - 1));
    const margin = 2;

    if (lastIndex >= lr.from + margin && lastIndex <= lr.to - margin) {
      return;
    }

    const visibleWidth = Math.max(5, lr.to - lr.from);
    const from = lastIndex - visibleWidth * 0.5;
    const to = lastIndex + visibleWidth * 0.5;
    ts.setVisibleLogicalRange({ from, to });
  }, [state.index, state.status, clipActive, state.candles.length]);

  // Handle playback start
  useEffect(() => {
    if (state.status === 'playing') {
      userAdjustedRef.current = false;
      if (chartRef.current) {
        const ts = chartRef.current.timeScale();
        const logicalRange = ts.getVisibleLogicalRange();
        if (logicalRange) {
          const lastIndex = Math.min(state.index, state.candles.length - 1);
          const visibleWidth = logicalRange.to - logicalRange.from;
          const targetFrom = lastIndex - visibleWidth * 0.85;
          ts.setVisibleLogicalRange({ from: targetFrom, to: lastIndex + visibleWidth * 0.15 });
        }
      }
    }
  }, [state.candles.length, state.index, state.status]);

  useImperativeHandle(ref, () => ({
    setData: () => console.warn('setData is deprecated'),
    updateToIndex: (i: number) => {
      if (!chartRef.current) return;
      const ts = chartRef.current.timeScale();
      const lr = ts.getVisibleLogicalRange();
      const target = Math.max(0, i);
      const visibleWidth = lr ? Math.max(5, lr.to - lr.from) : 100;
      const from = target - visibleWidth * 0.5;
      const to = target + visibleWidth * 0.5;
      ts.setVisibleLogicalRange({ from, to });
    },
    resetCrop: () => {
      setClipActive(false);
      hasAutoFittedRef.current = false;
      userAdjustedRef.current = false;
      chartRef.current?.timeScale().fitContent();
    },
    startCrop: () => {
      setClipActive(true);
    },
    fitContent: () => {
      chartRef.current?.timeScale().fitContent();
    },
    resize: (width: number, height: number) => {
      chartRef.current?.applyOptions({ width, height });
    },
  }));

  return (
    <div className="relative w-full h-full">
      {legendData && (
        <div className="absolute top-3 left-3 z-10 p-2 bg-gray-800/80 backdrop-blur-sm rounded border border-gray-700 text-xs text-gray-300 pointer-events-none">
          <div className="font-bold text-sm mb-1 text-white">{state.symbol}</div>
          {legendData.ohlc && (
            <div>
              <span className="text-gray-400">O:</span> {legendData.ohlc.open.toFixed(2)}
              <span className="text-gray-400 ml-2">H:</span> {legendData.ohlc.high.toFixed(2)}
              <span className="text-gray-400 ml-2">L:</span> {legendData.ohlc.low.toFixed(2)}
              <span className="text-gray-400 ml-2">C:</span> {legendData.ohlc.close.toFixed(2)}
            </div>
          )}
          {legendData.volume && (
            <div>
              <span className="text-gray-400">Vol:</span> {legendData.volume.value.toLocaleString()}
            </div>
          )}
        </div>
      )}
      <div ref={chartContainerRef} className="w-full h-full" />
    </div>
  );
});

Chart.displayName = 'Chart';

export default Chart;
