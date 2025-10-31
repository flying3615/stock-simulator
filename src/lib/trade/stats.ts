// Trading statistics utilities

import type { Trade } from '../types';

export interface TradingStats {
  totalTrades: number;
  winRate: number; // percentage
  profitLossRatio: number; // avg win / avg loss
  totalRealizedPnL: number;
  averagePnLPerTrade: number;
  maxWin: number;
  maxLoss: number;
  winningTrades: number;
  losingTrades: number;
}

export function calculateTradingStats(trades: Trade[]): TradingStats {
  if (trades.length === 0) {
    return {
      totalTrades: 0,
      winRate: 0,
      profitLossRatio: 0,
      totalRealizedPnL: 0,
      averagePnLPerTrade: 0,
      maxWin: 0,
      maxLoss: 0,
      winningTrades: 0,
      losingTrades: 0,
    };
  }

  // Calculate per-trade P&L
  const tradePnLs: number[] = [];
  let previousPnL = 0;
  for (const trade of trades) {
    const currentPnL = trade.pnlRealizedAfter;
    const tradePnL = currentPnL - previousPnL;
    tradePnLs.push(tradePnL);
    previousPnL = currentPnL;
  }

  const totalTrades = tradePnLs.length;
  const winningTrades = tradePnLs.filter(pnl => pnl > 0).length;
  const losingTrades = tradePnLs.filter(pnl => pnl < 0).length;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

  const winningPnLs = tradePnLs.filter(pnl => pnl > 0);
  const losingPnLs = tradePnLs.filter(pnl => pnl < 0);

  const avgWin = winningPnLs.length > 0 ? winningPnLs.reduce((sum, pnl) => sum + pnl, 0) / winningPnLs.length : 0;
  const avgLoss = losingPnLs.length > 0 ? Math.abs(losingPnLs.reduce((sum, pnl) => sum + pnl, 0) / losingPnLs.length) : 0;
  const profitLossRatio = avgLoss > 0 ? avgWin / avgLoss : 0;

  const totalRealizedPnL = trades[trades.length - 1]?.pnlRealizedAfter || 0;
  const averagePnLPerTrade = totalTrades > 0 ? totalRealizedPnL / totalTrades : 0;

  const maxWin = winningPnLs.length > 0 ? Math.max(...winningPnLs) : 0;
  const maxLoss = losingPnLs.length > 0 ? Math.min(...losingPnLs) : 0;

  return {
    totalTrades,
    winRate,
    profitLossRatio,
    totalRealizedPnL,
    averagePnLPerTrade,
    maxWin,
    maxLoss,
    winningTrades,
    losingTrades,
  };
}