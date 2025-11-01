// Trade Statistics Chart Component

'use client';

import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { Trade } from '@/lib/types';

interface TradeStatsChartProps {
  trades: Trade[];
  symbol: string;
}

const TradeStatsChart = ({ trades, symbol }: TradeStatsChartProps) => {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || trades.length === 0) return;

    const chart = echarts.init(chartRef.current);

    // Calculate cumulative P&L over time
    const data: { time: string; pnl: number }[] = [];
    let cumulativePnL = 0;

    trades.forEach((trade) => {
      cumulativePnL = trade.pnlRealizedAfter;
      data.push({
        time: new Date(trade.time * 1000).toLocaleString(),
        pnl: cumulativePnL,
      });
    });

    const option = {
      title: {
        text: `Trading Performance - ${symbol}`,
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const param = params[0];
          return `${param.name}<br/>P&L: $${param.value.toFixed(2)}`;
        },
      },
      xAxis: {
        type: 'category',
        data: data.map(item => item.time),
        name: 'Time',
      },
      yAxis: {
        type: 'value',
        name: 'Cumulative P&L ($)',
      },
      series: [
        {
          name: 'Cumulative P&L',
          type: 'line',
          data: data.map(item => item.pnl),
          smooth: true,
          lineStyle: {
            color: '#5470c6',
            width: 2,
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(84, 112, 198, 0.3)' },
                { offset: 1, color: 'rgba(84, 112, 198, 0.1)' },
              ],
            },
          },
        },
      ],
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true,
      },
    };

    chart.setOption(option);

    const handleResize = () => {
      chart.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      chart.dispose();
      window.removeEventListener('resize', handleResize);
    };
  }, [trades, symbol]);

  if (trades.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        No trading data available
      </div>
    );
  }

  return (
    <div className="w-full h-96">
      <div ref={chartRef} className="w-full h-full" />
    </div>
  );
};

export default TradeStatsChart;