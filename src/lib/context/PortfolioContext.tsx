// Portfolio 状态上下文 v0.2

'use client';

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import type { Portfolio, Trade, OrderRequest } from '../types';
import { executeOrder, createInitialPortfolio } from '../trade/sim';
import { INITIAL_CASH } from '../config';

// 动作类型
type PortfolioAction =
  | { type: 'EXECUTE_ORDER'; payload: { order: OrderRequest; currentPrice: number; time: number } }
  | { type: 'RESET_PORTFOLIO' }
  | { type: 'SET_PORTFOLIO'; payload: Portfolio };

// Reducer
function portfolioReducer(state: { portfolio: Portfolio; trades: Trade[] }, action: PortfolioAction): { portfolio: Portfolio; trades: Trade[] } {
  switch (action.type) {
    case 'EXECUTE_ORDER': {
      const { order, currentPrice, time } = action.payload;
      const result = executeOrder(state.portfolio, order, currentPrice, time);
      return {
        portfolio: result.newPortfolio,
        trades: [...state.trades, result.trade],
      };
    }
    case 'RESET_PORTFOLIO':
      return {
        portfolio: createInitialPortfolio(INITIAL_CASH),
        trades: [],
      };
    case 'SET_PORTFOLIO':
      return {
        portfolio: action.payload,
        trades: state.trades,
      };
    default:
      return state;
  }
}

// 初始状态
const initialPortfolioState = {
  portfolio: createInitialPortfolio(INITIAL_CASH),
  trades: [] as Trade[],
};

// 上下文类型
interface PortfolioContextType {
  portfolio: Portfolio;
  trades: Trade[];
  executeOrder: (order: OrderRequest, currentPrice: number, time: number) => void;
  resetPortfolio: () => void;
  setPortfolio: (portfolio: Portfolio) => void;
}

// 创建上下文
const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

// Provider 组件
export function PortfolioProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(portfolioReducer, initialPortfolioState);

  const contextValue: PortfolioContextType = {
    portfolio: state.portfolio,
    trades: state.trades,
    executeOrder: (order, currentPrice, time) =>
      dispatch({ type: 'EXECUTE_ORDER', payload: { order, currentPrice, time } }),
    resetPortfolio: () => dispatch({ type: 'RESET_PORTFOLIO' }),
    setPortfolio: (portfolio) => dispatch({ type: 'SET_PORTFOLIO', payload: portfolio }),
  };

  return <PortfolioContext.Provider value={contextValue}>{children}</PortfolioContext.Provider>;
}

// Hook
export function usePortfolio() {
  const context = useContext(PortfolioContext);
  if (!context) {
    throw new Error('usePortfolio must be used within a PortfolioProvider');
  }
  return context;
}