// K线图表组件 v0.2（lightweight-charts）

'use client';

import { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';
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

const Chart = forwardRef<ChartRef, ChartProps>(({ width = 1000, height = CHART_HEIGHT }, ref) => {
  const { state, setIndex } = useReplay();
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const [clipActive, setClipActive] = useState(false);
  // 视图状态：记录是否已自动适配、用户是否主动缩放/平移
  const hasAutoFittedRef = useRef(false);
  const userAdjustedRef = useRef(false);

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

    // 监听可见范围变化，用于检测用户缩放/平移
    const ts = chart.timeScale();
    const onRangeChange = () => {
      if (!hasAutoFittedRef.current) return; // 初始化阶段的变更不计入用户操作
      userAdjustedRef.current = true;
    };
    ts.subscribeVisibleTimeRangeChange(onRangeChange);

    // 清理
    return () => {
      ts.unsubscribeVisibleTimeRangeChange(onRangeChange);
      chart.remove();
    };
  }, [width, height]);

  // 点击图表以进入“从此之后隐藏并逐根揭示”模式
  useEffect(() => {
    const chart = chartRef.current as any;
    if (!chart) return;
    const handler = (param: any) => {
      if (!param || param.time == null) return;
      const clickedSec =
        typeof param.time === 'string'
          ? Math.floor(Date.parse(param.time) / 1000)
          : Number(param.time);

      // 找到最接近的索引
      let closestIndex = 0;
      let minDiff = Infinity;
      for (let i = 0; i < state.candles.length; i++) {
        const sec = toUnixSeconds(state.candles[i].time as any);
        const diff = Math.abs(sec - clickedSec);
        if (diff < minDiff) {
          minDiff = diff;
          closestIndex = i;
        }
      }
      setIndex(closestIndex);
      setClipActive(true);
    };
    chart.subscribeClick(handler);
    return () => {
      chart.unsubscribeClick(handler);
    };
  }, [state.candles, state.interval, setIndex]);

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

    // 当处于裁剪模式或正在播放时，按 index 逐根揭示；否则显示全部
    const incremental = clipActive || state.status === 'playing';
    const sliceLen = incremental
      ? Math.min(state.index + 1, candlestickData.length)
      : candlestickData.length;

    candlestickSeriesRef.current.setData(candlestickData.slice(0, sliceLen));
    volumeSeriesRef.current.setData(volumeData.slice(0, sliceLen));

    // 播放时自动跟随最后一根K线，保持最新K线在视窗右侧
    if (chartRef.current && state.status === 'playing') {
      chartRef.current.timeScale().scrollToPosition(0, true);
    }

    // 首次或加载新数据时自动适配；用户已缩放/平移、播放中或裁剪中不打断
    if (
      chartRef.current &&
      !hasAutoFittedRef.current &&
      !clipActive &&
      state.status !== 'playing'
    ) {
      chartRef.current.timeScale().fitContent();
      hasAutoFittedRef.current = true;
    }
  }, [state.candles, state.index, clipActive, state.interval]);

  // 数据切换时退出裁剪模式，并重置视图自动适配状态
  useEffect(() => {
    setClipActive(false);
    hasAutoFittedRef.current = false;
    userAdjustedRef.current = false;
  }, [state.symbol, state.interval, state.range]);

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