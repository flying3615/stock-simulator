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

    const container = chartContainerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const chart = createChart(container, {
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
        // 让右侧默认留白，且不要在新增bar时自动把最后一根顶到最右
        rightOffset: 10,
        shiftVisibleRangeOnNewBar: false,
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
  }, []);

  // 条件监听：仅在 selectMode 为 true 时启用点击选择
  useEffect(() => {
    const chart = chartRef.current as any;
    if (!chart) return;

    if (!selectMode) {
      // 未处于选择模式，不监听
      return;
    }

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

      // 仅通过回调告知外部，外部可更新 index 并关闭选择模式
      try {
        onSelectCandle?.(closestIndex);
      } finally {
        // 内部开启裁剪以达到“从此开始逐根揭示”的视觉效果
        setClipActive(true);
      }
    };

    chart.subscribeClick(handler);
    return () => {
      chart.unsubscribeClick(handler);
    };
  }, [selectMode, state.candles, state.interval, onSelectCandle]);

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

    // 播放时将最后一根K线固定在可见区域的 3/4 处：
    // 使用 setVisibleLogicalRange 直接设定范围，避免被 scrollTo... 顶到最右
    if (chartRef.current && state.status === 'playing') {
      const ts = chartRef.current.timeScale();
      const lr = ts.getVisibleLogicalRange();
      const lastIndex = sliceLen - 1; // 当前已揭示的最后一根
      // 当前可见宽度（逻辑索引单位）
      const visibleWidth =
        lr && isFinite((lr as any).from) && isFinite((lr as any).to)
          ? Math.max(5, (lr as any).to - (lr as any).from)
          : 100;
      // 让 lastIndex 处在右侧的 85%（from 占 85%，to 占 15%）
      const from = lastIndex - visibleWidth * 0.85;
      const to = lastIndex + visibleWidth * 0.15;
      // 禁止“新bar时自动顶到最右”
      (ts as any).applyOptions?.({ shiftVisibleRangeOnNewBar: false });
      ts.setVisibleLogicalRange({ from, to });
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

  return <div ref={chartContainerRef} className="w-full h-full" />;
});

Chart.displayName = 'Chart';

export default Chart;