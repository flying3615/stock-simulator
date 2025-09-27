// 成交明细表组件 v0.2

'use client';

import { usePortfolio } from '../lib/context/PortfolioContext';

const TradeLog = () => {
  const { trades } = usePortfolio();

  return (
    <div className="p-4 bg-white border rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold mb-4">Trade Log</h3>

      {trades.length === 0 ? (
        <p className="text-gray-500">No trades yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Time</th>
                <th className="text-left py-2">Side</th>
                <th className="text-right py-2">Price</th>
                <th className="text-right py-2">Qty</th>
                <th className="text-right py-2">Fee</th>
                <th className="text-right py-2">Slippage</th>
                <th className="text-right py-2">Realized P&L</th>
                <th className="text-right py-2">Position After</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => (
                <tr key={trade.id} className="border-b hover:bg-gray-50">
                  <td className="py-2">
                    {new Date(trade.time * 1000).toLocaleString()}
                  </td>
                  <td className="py-2 capitalize">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        trade.side === 'buy'
                          ? 'bg-green-100 text-green-800'
                          : trade.side === 'sell'
                          ? 'bg-red-100 text-red-800'
                          : trade.side === 'short'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {trade.side}
                    </span>
                  </td>
                  <td className="py-2 text-right">${trade.price.toFixed(2)}</td>
                  <td className="py-2 text-right">{trade.qty}</td>
                  <td className="py-2 text-right">${trade.fee.toFixed(2)}</td>
                  <td className="py-2 text-right">${trade.slippage.toFixed(2)}</td>
                  <td className="py-2 text-right">
                    <span
                      className={
                        trade.pnlRealizedAfter >= 0 ? 'text-green-600' : 'text-red-600'
                      }
                    >
                      ${trade.pnlRealizedAfter.toFixed(2)}
                    </span>
                  </td>
                  <td className="py-2 text-right">
                    {/* 这里需要持仓后状态，但 Trade 接口没有。需要扩展或从 portfolio 计算 */}
                    {/* 暂时显示 pnlRealizedAfter 作为代理 */}
                    N/A
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TradeLog;