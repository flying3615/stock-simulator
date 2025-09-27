// 交易面板组件 v0.2

'use client';

import { useState } from 'react';
import { useReplay } from '../lib/context/ReplayContext';
import { usePortfolio } from '../lib/context/PortfolioContext';
import { DEFAULT_QTY } from '../lib/config';

const TradePanel = () => {
  const { state: replayState } = useReplay();
  const { portfolio, executeOrder } = usePortfolio();
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
    <div className="flex flex-col gap-4 p-4 bg-white border rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold text-slate-800">Trade Panel</h3>

      {/* 当前价格 */}
      <div className="text-sm text-slate-700">
        <span className="font-medium">Current Price:</span> ${currentPrice.toFixed(2)}
      </div>

      {/* 持仓信息 */}
      <div className="grid grid-cols-2 gap-2 text-sm text-slate-700">
        <div>
          <span className="font-medium">Position Qty:</span> {portfolio.positionQty}
        </div>
        <div>
          <span className="font-medium">Avg Price:</span> ${portfolio.avgPrice.toFixed(2)}
        </div>
        <div>
          <span className="font-medium">Cash:</span> ${portfolio.cash.toFixed(2)}
        </div>
        <div>
          <span className="font-medium">Equity:</span> ${portfolio.equity.toFixed(2)}
        </div>
        <div>
          <span className="font-medium">Unrealized P&L:</span> ${portfolio.pnlUnrealized.toFixed(2)}
        </div>
        <div>
          <span className="font-medium">Realized P&L:</span> ${portfolio.pnlRealized.toFixed(2)}
        </div>
      </div>

      {/* 数量输入 */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-slate-800">Quantity:</label>
        <input
          type="number"
          value={qty}
          onChange={(e) => setQty(parseInt(e.target.value, 10) || 0)}
          min="1"
          className="px-2 py-1 border rounded w-20 text-slate-400"
        />
      </div>

      {/* 交易按钮 */}
      <div className="flex gap-2">
        <button
          onClick={handleBuy}
          className="flex-1 px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          disabled={!currentCandle || qty <= 0}
        >
          Buy
        </button>
        <button
          onClick={handleSell}
          className="flex-1 px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
          disabled={!currentCandle || qty <= 0 || portfolio.positionQty <= 0}
        >
          Sell
        </button>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleShort}
          className="flex-1 px-3 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
          disabled={!currentCandle || qty <= 0}
        >
          Short
        </button>
        <button
          onClick={handleCover}
          className="flex-1 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          disabled={!currentCandle || qty <= 0 || portfolio.positionQty >= 0}
        >
          Cover
        </button>
      </div>

      {/* 提示 */}
      <div className="text-xs text-slate-700">
        Buy: 开多仓 | Sell: 平多仓 | Short: 开空仓 | Cover: 平空仓
      </div>
    </div>
  );
};

export default TradePanel;