// 交易面板组件 v0.2

'use client';

import { useState } from 'react';
import { useReplay } from '../lib/context/ReplayContext';
import { usePortfolio } from '../lib/context/PortfolioContext';
import { DEFAULT_QTY } from '../lib/config';

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

  const handleShort = () => {
    if (qty <= 0 || !currentCandle) return;
    executeOrder(
      { side: 'short', qty },
      currentPrice,
      Number(currentCandle.time)
    );
  };

  const handleCover = () => {
    if (qty <= 0 || !currentCandle) return;
    executeOrder(
      { side: 'cover', qty },
      currentPrice,
      Number(currentCandle.time)
    );
  };

  return (
    <div className="flex flex-col gap-2 p-3 bg-white border rounded-lg shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            className="px-2 py-1 border rounded text-sm text-slate-400 w-20"
            placeholder="AAPL"
          />
          <button
            onClick={handleLoad}
            disabled={loading}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? '...' : 'Load'}
          </button>
          <div className="mx-2 h-6 w-px bg-slate-300" />
          <input
            type="number"
            value={qty}
            onChange={(e) => setQty(parseInt(e.target.value, 10) || 0)}
            min="1"
            className="px-2 py-1 border rounded w-16 text-xs text-slate-400"
          />
          <div className="flex gap-1 ml-2">
            <button
              onClick={handleBuy}
              className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 disabled:opacity-50"
              disabled={!currentCandle || qty <= 0}
              title="Buy"
            >
              Buy
            </button>
            <button
              onClick={handleSell}
              className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 disabled:opacity-50"
              disabled={!currentCandle || qty <= 0 || portfolio.positionQty <= 0}
              title="Sell"
            >
              Sell
            </button>
            <div className="mx-1 h-6 w-px bg-slate-400" />
            <button
              onClick={handleShort}
              className="px-2 py-1 bg-orange-500 text-white rounded text-xs hover:bg-orange-600 disabled:opacity-50"
              disabled={!currentCandle || qty <= 0}
              title="Short"
            >
              Short
            </button>
            <button
              onClick={handleCover}
              className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 disabled:opacity-50"
              disabled={!currentCandle || qty <= 0 || portfolio.positionQty >= 0}
              title="Cover"
            >
              Cover
            </button>
          </div>
          <button
            onClick={resetPortfolio}
            className="ml-2 px-2 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600"
            title="Reset Portfolio"
          >
            Reset
          </button>
        </div>
        <button
          onClick={onOpenLog}
          className="px-2 py-1 bg-slate-700 text-white rounded text-sm hover:bg-slate-800"
          title="Trade Log"
        >
          Log
        </button>
      </div>
      {error && <p className="text-red-500 text-xs">{error}</p>}

      {/* Compact info */}
      <div className="flex items-center gap-4 text-sm font-medium text-slate-900">
        <span>Price: <span className="text-blue-600">${currentPrice.toFixed(2)}</span></span>
        <span>Cash: <span className="text-green-600">${portfolio.cash.toFixed(0)}</span></span>
        <span>Pos: <span className="text-purple-600">{portfolio.positionQty} @ ${portfolio.avgPrice.toFixed(2)}</span></span>
        <span>Equity: <span className="text-indigo-600">${portfolio.equity.toFixed(0)}</span></span>
        <span>P&L: <span className={portfolio.pnlUnrealized >= 0 ? 'text-green-600' : 'text-red-600'}>${portfolio.pnlUnrealized.toFixed(0)}</span> / <span className={portfolio.pnlRealized >= 0 ? 'text-green-600' : 'text-red-600'}>${portfolio.pnlRealized.toFixed(0)}</span></span>
      </div>
    </div>
  );
};

export default TradePanel;