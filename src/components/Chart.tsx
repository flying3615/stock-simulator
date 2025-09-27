// K线图表组件 v0.2（lightweight-charts）

'use client';

import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, HistogramData } from 'lightweight-charts';
import { useReplay } from '../lib/context/ReplayContext';
import type { Candle } from '../lib/types';
import { CHART_HEIGHT } from '../lib/config';

export interface ChartRef {
  setData: (candles: Candle[]) => void;
  updateToIndex: (index: number) => void;
}

interface ChartProps {
  width?: number;
  height?: number;
}

const Chart = forwardRef<ChartRef, ChartProps>(({ width = 800, height = CHART_HEIGHT }, ref) => {
  const { state } = useReplay();
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  // 时间转换工具：统一为 v4 可接受的 time 类型
  const toUnixSeconds = (input: any): number => {
    if (typeof input === 'number') {
      return input > 1e12 ? Math.floor(input / 1000) : input; // 毫秒->秒
    }
    const ms = Date.parse(input);
    return Math.floor(ms / 1000);
  };

  const toBusinessDay = (input: any): string => {
    const ms =
      typeof input === 'number'
        ? (input > 1e12 ? input : input * 1000)
        : Date.parse(input);
    // yyyy-mm-dd（UTC）
    return new Date(ms).toISOString().slice(0, 10);
  };

  // 初始化图表
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width,
      height,
      layout: {
        background: { color: '#ffffff' },
        textColor: '#333',
      },
      grid: {
        vertLines: { color: '#e1e1e1' },
        horzLines: { color: '#e1e1e1' },
      },
      crosshair: {
        mode: 1, // Normal
      },
      rightPriceScale: {
        borderColor: '#cccccc',
      },
      timeScale: {
        borderColor: '#cccccc',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    // 仅使用 v4 API（已将 lightweight-charts 固定到 v4）
    const candlestickSeries = (chart as any).addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    const volumeSeries = (chart as any).addHistogramSeries({
      color: '#26a69a',
      priceFormat: { type: 'volume' },
      priceScaleId: '', // 独立价格轴
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.7,
        bottom: 0,
      },
    });

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries as any;
    volumeSeriesRef.current = volumeSeries as any;

    // 清理
    return () => {
      chart.remove();
    };
  }, [width, height]);

  // 更新数据
  useEffect(() => {
    if (!candlestickSeriesRef.current || !volumeSeriesRef.current || state.candles.length === 0) return;

    const candlestickData: CandlestickData[] = state.candles.map(candle => {
      const timeValue =
        state.interval === '1d'
          ? (toBusinessDay(candle.time) as any) // 日线用 yyyy-mm-dd
          : (toUnixSeconds(candle.time) as any); // 分钟线用秒
      return {
        time: timeValue,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      };
    });

    const volumeData: HistogramData[] = state.candles.map(candle => {
      const timeValue =
        state.interval === '1d'
          ? (toBusinessDay(candle.time) as any)
          : (toUnixSeconds(candle.time) as any);
      return {
        time: timeValue,
        value: candle.volume,
        color: candle.close >= candle.open ? '#26a69a' : '#ef5350',
      };
    });

    candlestickSeriesRef.current.setData(candlestickData);
    volumeSeriesRef.current.setData(volumeData);

    // 适应视图
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  }, [state.candles]);

  // 暴露方法
  useImperativeHandle(ref, () => ({
    setData: (candles: Candle[]) => {
      // 数据通过上下文更新
    },
    updateToIndex: (index: number) => {
      // 可选：滚动到索引
    },
  }));

  return <div ref={chartContainerRef} />;
});

Chart.displayName = 'Chart';

export default Chart;