// Portfolio Info 组件 v0.1

'use client';

import { usePortfolio } from '@/lib/context/PortfolioContext';
import { useReplay } from '@/lib/context/ReplayContext';

const PortfolioInfo = () => {
  const { portfolio } = usePortfolio();
  const { state: replayState } = useReplay();

  const currentCandle = replayState.candles[replayState.index];
  const currentPrice = currentCandle?.close || 0;

  return (
    <div className="flex flex-col gap-1 text-xs border-t lg:border-t-0 lg:border-l lg:pl-4 pt-4 lg:pt-0 min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <span className="font-medium text-slate-600">Price:</span>
          <span className="text-blue-600 font-semibold">${currentPrice.toFixed(2)}</span>
        </div>
        <div className="h-3 w-px bg-slate-300" />
        <div className="flex items-center gap-1">
          <span className="font-medium text-slate-600">Cash:</span>
          <span className="text-emerald-600 font-semibold">${portfolio.cash.toFixed(0)}</span>
        </div>
        <div className="h-3 w-px bg-slate-300" />
        <div className="flex items-center gap-1">
          <span className="font-medium text-slate-600">Pos:</span>
          <span className="text-purple-600 font-semibold">{portfolio.positionQty} @ ${portfolio.avgPrice.toFixed(2)}</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <span className="font-medium text-slate-600">Equity:</span>
          <span className="text-indigo-600 font-semibold">${portfolio.equity.toFixed(0)}</span>
        </div>
        <div className="h-3 w-px bg-slate-300" />
        <div className="flex items-center gap-1">
          <span className="font-medium text-slate-600">P&L:</span>
          <span className={portfolio.pnlUnrealized >= 0 ? 'text-emerald-600' : 'text-red-600'}>
            ${portfolio.pnlUnrealized.toFixed(0)}
          </span>
          <span className="text-slate-400 mx-1">/</span>
          <span className={portfolio.pnlRealized >= 0 ? 'text-emerald-600' : 'text-red-600'}>
            ${portfolio.pnlRealized.toFixed(0)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PortfolioInfo;