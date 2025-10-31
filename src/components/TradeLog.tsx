// 成交明细表组件 v0.2

'use client';

import { usePortfolio } from '@/lib/context/PortfolioContext';
import { calculateTradingStats } from '@/lib/trade/stats';

const TradeLog = () => {
  const { trades } = usePortfolio();
  const stats = calculateTradingStats(trades);

  return (
    <div className="p-4 bg-white border rounded-lg shadow-sm">
      {trades.length === 0 ? (
        <p className="text-slate-600">No trades yet.</p>
      ) : (
        <>
          {/* Trading Statistics */}
          <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <h3 className="text-lg font-semibold text-slate-800 mb-3">Trading Statistics</h3>
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Trades:</span>
                  <span className="font-medium text-slate-900">{stats.totalTrades}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Win Rate:</span>
                  <span className="font-medium text-slate-900">{stats.winRate.toFixed(1)}%</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex justify-between">
                  <span className="text-slate-500">P/L Ratio:</span>
                  <span className="font-medium text-slate-900">{stats.profitLossRatio.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total P&L:</span>
                  <span
                    className={`font-medium ${
                      stats.totalRealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    ${stats.totalRealizedPnL.toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex justify-between">
                  <span className="text-slate-500">Winning Trades:</span>
                  <span className="font-medium text-green-600">{stats.winningTrades}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Losing Trades:</span>
                  <span className="font-medium text-red-600">{stats.losingTrades}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex justify-between">
                  <span className="text-slate-500">Max Win:</span>
                  <span className="font-medium text-green-600">${stats.maxWin.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Max Loss:</span>
                  <span className="font-medium text-red-600">${stats.maxLoss.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Trade Log */}
          <div className="space-y-3">
            {trades.map((trade) => (
              <div key={trade.id} className="border border-slate-200 rounded p-3 bg-slate-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600">
                    {new Date(trade.time * 1000).toLocaleString()}
                  </span>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      trade.side === 'buy'
                        ? 'bg-green-500 text-white'
                        : trade.side === 'sell'
                        ? 'bg-red-500 text-white'
                        : trade.side === 'short'
                        ? 'bg-orange-500 text-white'
                        : 'bg-blue-500 text-white'
                    }`}
                  >
                    {trade.side.toUpperCase()}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-slate-500">Price:</span>
                    <span className="ml-1 font-medium text-slate-900">${trade.price.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Qty:</span>
                    <span className="ml-1 font-medium text-slate-900">{trade.qty}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Fee:</span>
                    <span className="ml-1 font-medium text-slate-900">${trade.fee.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Slippage:</span>
                    <span className="ml-1 font-medium text-slate-900">${trade.slippage.toFixed(2)}</span>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-200">
                  <span className="text-slate-500">Realized P&L:</span>
                  <span
                    className={`ml-1 font-medium ${
                      trade.pnlRealizedAfter >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    ${trade.pnlRealizedAfter.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default TradeLog;