// 交易撮合与账户纯函数 v0.2（支持做空）

import type { OrderRequest, Portfolio, Trade, FeeModel, SlippageModel } from '../types';
import { FEE_MODEL, SLIPPAGE_MODEL } from '../config';

// 估算手续费
export function estimateFees(amount: number, feeModel: FeeModel = FEE_MODEL): number {
  const fee = feeModel.type === 'percentage' ? amount * feeModel.value : feeModel.value;
  return Math.max(fee, feeModel.minFee);
}

// 估算滑点成本（基于成交金额）
export function estimateSlippage(amount: number, slippageModel: SlippageModel = SLIPPAGE_MODEL): number {
  return amount * (slippageModel.bps / 10000); // bps to percentage
}

// 计算浮动盈亏
export function computePnlUnrealized(positionQty: number, avgPrice: number, currentPrice: number): number {
  if (positionQty === 0) return 0;
  // 多头：(current - avg) * qty
  // 空头：(avg - current) * |qty| （因为 qty 为负，计算时取绝对值）
  const qtyAbs = Math.abs(positionQty);
  const direction = positionQty > 0 ? 1 : -1; // 多头正，空头负
  return (currentPrice - avgPrice) * qtyAbs * direction;
}

// 计算已实现盈亏（平仓时）
export function computePnlRealized(
  closingQty: number,
  closingPrice: number,
  avgPrice: number,
  positionQtyBefore: number
): number {
  if (closingQty === 0 || positionQtyBefore === 0) return 0;
  const direction = positionQtyBefore > 0 ? 1 : -1; // 多头正，空头负
  return (closingPrice - avgPrice) * closingQty * direction;
}

// 更新持仓与平均价（支持做空）
export function updatePortfolio(
  portfolio: Portfolio,
  order: OrderRequest,
  executionPrice: number,
  fee: number,
  slippage: number,
  time: number
): { newPortfolio: Portfolio; trade: Trade; pnlRealized: number } {
  const { side, qty } = order;
  const totalCost = executionPrice * qty + fee + slippage;

  let newPositionQty = portfolio.positionQty;
  let newAvgPrice = portfolio.avgPrice;
  let pnlRealized = 0;

  if (side === 'buy') {
    // 买入（增加多头）
    if (portfolio.positionQty >= 0) {
      // 原多头或空仓：加仓
      const totalQty = portfolio.positionQty + qty;
      const totalCostWeighted = portfolio.positionQty * portfolio.avgPrice + qty * executionPrice;
      newAvgPrice = totalCostWeighted / totalQty;
      newPositionQty = totalQty;
    } else {
      // 原空头：对冲
      const remainingShort = Math.abs(portfolio.positionQty) - qty;
      if (remainingShort > 0) {
        // 部分对冲，平均价不变
        newPositionQty = -remainingShort;
      } else {
        // 全对冲并转为多头
        pnlRealized = computePnlRealized(qty, executionPrice, portfolio.avgPrice, portfolio.positionQty);
        newPositionQty = remainingShort; // 正数
        newAvgPrice = executionPrice; // 新多头平均价
      }
    }
  } else if (side === 'sell') {
    // 卖出（增加空头或平多头）
    if (portfolio.positionQty <= 0) {
      // 原空头或空仓：加仓空头
      const totalQty = Math.abs(portfolio.positionQty) + qty;
      const totalCostWeighted = Math.abs(portfolio.positionQty) * portfolio.avgPrice + qty * executionPrice;
      newAvgPrice = totalCostWeighted / totalQty;
      newPositionQty = -totalQty;
    } else {
      // 原多头：平仓
      const remainingLong = portfolio.positionQty - qty;
      if (remainingLong > 0) {
        // 部分平仓，平均价不变
        newPositionQty = remainingLong;
      } else {
        // 全平仓并转为空头
        pnlRealized = computePnlRealized(qty, executionPrice, portfolio.avgPrice, portfolio.positionQty);
        newPositionQty = remainingLong; // 负数
        newAvgPrice = executionPrice; // 新空头平均价
      }
    }
  } else if (side === 'short') {
    // 做空（同 sell）
    return updatePortfolio(portfolio, { side: 'sell', qty }, executionPrice, fee, slippage, time);
  } else if (side === 'cover') {
    // 对冲（同 buy）
    return updatePortfolio(portfolio, { side: 'buy', qty }, executionPrice, fee, slippage, time);
  }

  // 更新现金（此处 side 仅可能为 'buy' 或 'sell'，'short'/'cover' 已在上方分支返回）
  const cashChange = side === 'buy' ? -totalCost : totalCost;
  const newCash = portfolio.cash + cashChange;

  // 计算新权益
  const pnlUnrealized = computePnlUnrealized(newPositionQty, newAvgPrice, executionPrice);
  const equity = newCash + pnlUnrealized;

  const newPortfolio: Portfolio = {
    cash: newCash,
    positionQty: newPositionQty,
    avgPrice: newAvgPrice,
    equity,
    pnlUnrealized,
    pnlRealized: portfolio.pnlRealized + pnlRealized,
  };

  const trade: Trade = {
    id: `trade-${time}-${Math.random().toString(36).substr(2, 9)}`,
    time,
    side,
    price: executionPrice,
    qty,
    fee,
    slippage,
    pnlRealizedAfter: newPortfolio.pnlRealized,
  };

  return { newPortfolio, trade, pnlRealized };
}

// 执行订单（主入口）
export function executeOrder(
  portfolio: Portfolio,
  order: OrderRequest,
  currentPrice: number,
  time: number,
  feeModel: FeeModel = FEE_MODEL,
  slippageModel: SlippageModel = SLIPPAGE_MODEL
): { newPortfolio: Portfolio; trade: Trade; pnlRealized: number } {
  const amount = order.qty * currentPrice;
  const fee = estimateFees(amount, feeModel);
  const slippage = estimateSlippage(amount, slippageModel);
  const executionPrice = currentPrice; // v0.1 简化：市价成交用当前价

  return updatePortfolio(portfolio, order, executionPrice, fee, slippage, time);
}

// 初始化账户
export function createInitialPortfolio(cash: number = 50000): Portfolio {
  return {
    cash,
    positionQty: 0,
    avgPrice: 0,
    equity: cash,
    pnlUnrealized: 0,
    pnlRealized: 0,
  };
}