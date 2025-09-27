// Replay 状态上下文 v0.2

'use client';

import React, { createContext, useContext, useReducer, ReactNode, useEffect, useRef } from 'react';
import type { ReplayState, Candle } from '../types';
import { SUPPORTED_INTERVALS } from '../config';

// 动作类型
type ReplayAction =
  | { type: 'SET_DATA'; payload: { candles: Candle[]; symbol: string; interval: typeof SUPPORTED_INTERVALS[number]; range: string } }
  | { type: 'SET_INDEX'; payload: number }
  | { type: 'SET_SPEED'; payload: number }
  | { type: 'SET_STATUS'; payload: ReplayState['status'] }
  | { type: 'SET_INTERVAL'; payload: typeof SUPPORTED_INTERVALS[number] }
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
    case 'SET_INTERVAL':
      return { ...state, interval: action.payload };
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
  setData: (candles: Candle[], symbol: string, interval: typeof SUPPORTED_INTERVALS[number], range: string) => void;
  setIndex: (index: number) => void;
  setSpeed: (speed: number) => void;
  setStatus: (status: ReplayState['status']) => void;
  setInterval: (interval: typeof SUPPORTED_INTERVALS[number]) => void;
  reset: () => void;
}

// 创建上下文
const ReplayContext = createContext<ReplayContextType | undefined>(undefined);

// Provider 组件
export function ReplayProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(replayReducer, initialReplayState);

  // 播放循环：根据 speed 推进 index
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const indexRef = useRef(0);

  // 同步最新 index 到 ref，避免闭包读到旧值
  useEffect(() => {
    indexRef.current = state.index;
  }, [state.index]);

  // 根据状态与速度驱动播放
  useEffect(() => {
    // 清理旧的 interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (state.status !== 'playing' || state.candles.length === 0) {
      return;
    }

    const intervalMs = Math.max(50, Math.floor(1000 / Math.max(0.25, state.speed))); // 最小50ms保护
    intervalRef.current = setInterval(() => {
      const len = state.candles.length;
      const next = indexRef.current + 1;

      if (next >= len) {
        // 到末尾：定位最后一根并置为 completed
        dispatch({ type: 'SET_INDEX', payload: len - 1 });
        dispatch({ type: 'SET_STATUS', payload: 'completed' });
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } else {
        dispatch({ type: 'SET_INDEX', payload: next });
      }
    }, intervalMs);

    // 清理
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [state.status, state.speed, state.candles.length]);

  const contextValue: ReplayContextType = {
    state,
    dispatch,
    setData: (candles, symbol, interval, range) =>
      dispatch({ type: 'SET_DATA', payload: { candles, symbol, interval, range } }),
    setIndex: (index) => dispatch({ type: 'SET_INDEX', payload: index }),
    setSpeed: (speed) => dispatch({ type: 'SET_SPEED', payload: speed }),
    setStatus: (status) => dispatch({ type: 'SET_STATUS', payload: status }),
    setInterval: (interval) => dispatch({ type: 'SET_INTERVAL', payload: interval }),
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