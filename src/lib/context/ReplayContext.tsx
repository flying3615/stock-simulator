// Replay 状态上下文 v0.2

'use client';

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import type { ReplayState, Candle } from '../types';

// 动作类型
type ReplayAction =
  | { type: 'SET_DATA'; payload: { candles: Candle[]; symbol: string; interval: '1d' | '5m'; range: string } }
  | { type: 'SET_INDEX'; payload: number }
  | { type: 'SET_SPEED'; payload: number }
  | { type: 'SET_STATUS'; payload: ReplayState['status'] }
  | { type: 'RESET' };

// Reducer
function replayReducer(state: ReplayState, action: ReplayAction): ReplayState {
  switch (action.type) {
    case 'SET_DATA':
      return {
        ...state,
        candles: action.payload.candles,
        symbol: action.payload.symbol,
        interval: action.payload.interval,
        range: action.payload.range,
        index: 0,
        status: 'idle',
      };
    case 'SET_INDEX':
      return {
        ...state,
        index: Math.max(0, Math.min(action.payload, state.candles.length - 1)),
        status: action.payload >= state.candles.length - 1 ? 'completed' : state.status,
      };
    case 'SET_SPEED':
      return { ...state, speed: action.payload };
    case 'SET_STATUS':
      return { ...state, status: action.payload };
    case 'RESET':
      return {
        ...state,
        index: 0,
        status: 'idle',
      };
    default:
      return state;
  }
}

// 初始状态
const initialReplayState: ReplayState = {
  index: 0,
  speed: 1,
  status: 'idle',
  symbol: '',
  interval: '1d',
  range: '',
  candles: [],
};

// 上下文类型
interface ReplayContextType {
  state: ReplayState;
  dispatch: React.Dispatch<ReplayAction>;
  // 便捷方法
  setData: (candles: Candle[], symbol: string, interval: '1d' | '5m', range: string) => void;
  setIndex: (index: number) => void;
  setSpeed: (speed: number) => void;
  setStatus: (status: ReplayState['status']) => void;
  reset: () => void;
}

// 创建上下文
const ReplayContext = createContext<ReplayContextType | undefined>(undefined);

// Provider 组件
export function ReplayProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(replayReducer, initialReplayState);

  const contextValue: ReplayContextType = {
    state,
    dispatch,
    setData: (candles, symbol, interval, range) =>
      dispatch({ type: 'SET_DATA', payload: { candles, symbol, interval, range } }),
    setIndex: (index) => dispatch({ type: 'SET_INDEX', payload: index }),
    setSpeed: (speed) => dispatch({ type: 'SET_SPEED', payload: speed }),
    setStatus: (status) => dispatch({ type: 'SET_STATUS', payload: status }),
    reset: () => dispatch({ type: 'RESET' }),
  };

  return <ReplayContext.Provider value={contextValue}>{children}</ReplayContext.Provider>;
}

// Hook
export function useReplay() {
  const context = useContext(ReplayContext);
  if (!context) {
    throw new Error('useReplay must be used within a ReplayProvider');
  }
  return context;
}