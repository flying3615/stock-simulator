// 交易面板组件 v0.2

'use client';

import { useState, useEffect } from 'react';
import { useReplay } from '@/lib/context/ReplayContext';
import { usePortfolio } from '@/lib/context/PortfolioContext';
import { DEFAULT_QTY } from '@/lib/config';
import PortfolioInfo from './PortfolioInfo';

interface TradePanelProps {
  symbol: string;
  setSymbol: (symbol: string) => void;
  handleLoad: () => void;
  loading: boolean;
  error: string | null;
  onOpenLog: () => void;
}

const TradePanel = ({ symbol, setSymbol, handleLoad, loading, error, onOpenLog }: TradePanelProps) => {
  const { state: replayState } = useReplay();
  const { portfolio, executeOrder, resetPortfolio } = usePortfolio();
  const [qty, setQty] = useState(DEFAULT_QTY);

  const currentCandle = replayState.candles[replayState.index];
  const currentPrice = currentCandle?.close || 0;

  // Debug: Log current candle info
  console.log('Current candle:', currentCandle, 'Price:', currentPrice, 'Index:', replayState.index, 'Total candles:', replayState.candles.length);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'f' || event.key === 'F') {
        event.preventDefault();
        handleBuy();
      } else if (event.key === 'd' || event.key === 'D') {
        event.preventDefault();
        handleSell();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [qty, currentCandle, executeOrder, currentPrice]);

  const handleBuy = () => {
    if (qty <= 0 || !currentCandle) return;
    executeOrder(
      { side: 'buy', qty },
      currentPrice,
      Number(currentCandle.time)
    );
  };

  const handleSell = () => {
    if (qty <= 0 || !currentCandle) return;
    executeOrder(
      { side: 'sell', qty },
      currentPrice,
      Number(currentCandle.time)
    );
  };


  return (
    <div className="bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200 rounded-xl shadow-lg p-4">
      {/* Mobile-first responsive layout */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Main Controls Section */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1 min-w-0">
          {/* Symbol Input */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <label className="text-sm font-semibold text-slate-700">Symbol:</label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              className="px-3 py-2 border border-slate-300 rounded-md text-sm font-mono bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-20 sm:w-24"
              placeholder="AAPL"
            />
          </div>

          {/* Load Button */}
          <button
            onClick={handleLoad}
            disabled={loading}
            className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 shadow-sm flex-shrink-0"
          >
            {loading ? 'Loading...' : 'Load'}
          </button>

          <div className="h-8 w-px bg-slate-300" />

          {/* Quantity Input with Position Sizing */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-shrink-0">
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-slate-700">Qty:</label>
              <input
                type="number"
                value={qty}
                onChange={(e) => setQty(parseInt(e.target.value, 10) || 0)}
                min="1"
                className="px-3 py-2 border border-slate-300 rounded-md w-20 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex gap-1 flex-wrap">
              <button
                onClick={() => setQty(Math.floor(portfolio.cash / currentPrice))}
                className="px-2 py-1 bg-slate-500 text-white rounded text-xs hover:bg-slate-600 transition-colors duration-200"
                title="Full Position"
              >
                100%
              </button>
              <button
                onClick={() => setQty(Math.floor((portfolio.cash / 2) / currentPrice))}
                className="px-2 py-1 bg-slate-500 text-white rounded text-xs hover:bg-slate-600 transition-colors duration-200"
                title="Half Position"
              >
                50%
              </button>
              <button
                onClick={() => setQty(Math.floor((portfolio.cash / 3) / currentPrice))}
                className="px-2 py-1 bg-slate-500 text-white rounded text-xs hover:bg-slate-600 transition-colors duration-200"
                title="1/3 Position"
              >
                33%
              </button>
              <button
                onClick={() => setQty(Math.floor((portfolio.cash / 4) / currentPrice))}
                className="px-2 py-1 bg-slate-500 text-white rounded text-xs hover:bg-slate-600 transition-colors duration-200"
                title="1/4 Position"
              >
                25%
              </button>
            </div>
          </div>

          <div className="h-8 w-px bg-slate-300" />

          {/* Trading Buttons */}
          <div className="flex flex-wrap gap-2 flex-shrink-0">
            <button
              onClick={handleBuy}
              className="px-3 py-2 bg-emerald-600 text-white rounded-md text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 shadow-sm"
              disabled={!currentCandle || qty <= 0}
              title="Buy Long Position"
            >
              Buy
            </button>
            <button
              onClick={handleSell}
              className="px-3 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 shadow-sm"
              disabled={!currentCandle || qty <= 0}
              title="Sell Position"
            >
              Sell
            </button>
          </div>

          <div className="h-8 w-px bg-slate-300" />

          {/* Reset Button */}
          <button
            onClick={resetPortfolio}
            className="px-3 py-2 bg-slate-600 text-white rounded-md text-sm font-medium hover:bg-slate-700 transition-colors duration-200 shadow-sm flex-shrink-0"
            title="Reset Portfolio"
          >
            Reset
          </button>
        </div>

        {/* Portfolio Info */}
        <PortfolioInfo />

        {/* Log Button */}
        <div className="flex justify-end lg:justify-start flex-shrink-0">
          <button
            onClick={onOpenLog}
            className="px-4 py-2 bg-slate-800 text-white rounded-md text-sm font-medium hover:bg-slate-900 transition-colors duration-200 shadow-sm"
            title="View Trade Log"
          >
            Trade Log
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700 text-sm font-medium">{error}</p>
        </div>
      )}
    </div>
  );
};

export default TradePanel;