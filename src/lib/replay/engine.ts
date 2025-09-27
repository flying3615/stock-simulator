// 回放引擎 v0.2（状态机驱动K线推进）

import type { ReplayState, ReplayCallback, Candle } from '../types';
import { DEFAULT_SPEED, STEP_SIZE, SEEK_SIZE } from '../config';

// 回放引擎类
export class ReplayEngine {
  private state: ReplayState;
  private callback: ReplayCallback;
  private intervalId: NodeJS.Timeout | null = null;
  private lastUpdateTime = 0;

  constructor(initialState: ReplayState, callback: ReplayCallback) {
    this.state = { ...initialState };
    this.callback = callback;
  }

  // 获取当前状态
  getState(): ReplayState {
    return { ...this.state };
  }

  // 设置新数据（重置状态）
  setData(candles: Candle[], symbol: string, interval: '1d' | '5m', range: string): void {
    this.stop();
    this.state = {
      ...this.state,
      index: 0,
      status: 'idle',
      symbol,
      interval,
      range,
      candles,
    };
    this.callback(this.getState());
  }

  // 播放
  play(): void {
    if (this.state.status === 'completed' || this.state.candles.length === 0) return;

    this.state.status = 'playing';
    this.lastUpdateTime = Date.now();
    this.startInterval();
    this.callback(this.getState());
  }

  // 暂停
  pause(): void {
    if (this.state.status !== 'playing') return;

    this.state.status = 'paused';
    this.stopInterval();
    this.callback(this.getState());
  }

  // 停止（重置到开头）
  stop(): void {
    this.state.status = 'idle';
    this.state.index = 0;
    this.stopInterval();
    this.callback(this.getState());
  }

  // 单根前进
  stepForward(): void {
    this.pause();
    if (this.state.index < this.state.candles.length - 1) {
      this.state.index += STEP_SIZE;
      if (this.state.index >= this.state.candles.length - 1) {
        this.state.status = 'completed';
      }
      this.callback(this.getState());
    }
  }

  // 单根后退
  stepBack(): void {
    this.pause();
    if (this.state.index > 0) {
      this.state.index -= STEP_SIZE;
      this.callback(this.getState());
    }
  }

  // 快进/快退（指定步长）
  seekBy(delta: number): void {
    this.pause();
    const newIndex = Math.max(0, Math.min(this.state.candles.length - 1, this.state.index + delta));
    this.state.index = newIndex;
    if (newIndex >= this.state.candles.length - 1) {
      this.state.status = 'completed';
    } else if (this.state.status === 'completed') {
      this.state.status = 'idle';
    }
    this.callback(this.getState());
  }

  // 跳转到指定时间（二分查找最近索引）
  seekToTime(targetTime: number): void {
    this.pause();
    const candles = this.state.candles;
    if (candles.length === 0) return;

    // 二分查找最接近的时间
    let left = 0;
    let right = candles.length - 1;
    let closestIndex = 0;
    let minDiff = Infinity;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const time = Number(candles[mid].time);
      const diff = Math.abs(time - targetTime);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = mid;
      }
      if (time < targetTime) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    this.state.index = closestIndex;
    if (closestIndex >= candles.length - 1) {
      this.state.status = 'completed';
    } else if (this.state.status === 'completed') {
      this.state.status = 'idle';
    }
    this.callback(this.getState());
  }

  // 设置速度
  setSpeed(speed: number): void {
    this.state.speed = speed;
    if (this.state.status === 'playing') {
      this.stopInterval();
      this.startInterval();
    }
    this.callback(this.getState());
  }

  // 私有方法：启动间隔推进
  private startInterval(): void {
    this.stopInterval();
    const intervalMs = 1000 / this.state.speed; // 每秒推进1根，速度倍数调整

    this.intervalId = setInterval(() => {
      if (this.state.status !== 'playing') return;

      this.state.index += 1;
      if (this.state.index >= this.state.candles.length - 1) {
        this.state.index = this.state.candles.length - 1;
        this.state.status = 'completed';
        this.stopInterval();
      }
      this.callback(this.getState());
    }, intervalMs);
  }

  // 私有方法：停止间隔
  private stopInterval(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  // 销毁引擎
  destroy(): void {
    this.stopInterval();
  }
}

// 创建引擎实例
export function createReplayEngine(
  initialCandles: Candle[] = [],
  symbol = '',
  interval: '1d' | '5m' = '1d',
  range = '',
  callback: ReplayCallback
): ReplayEngine {
  const initialState: ReplayState = {
    index: 0,
    speed: DEFAULT_SPEED,
    status: 'idle',
    symbol,
    interval,
    range,
    candles: initialCandles,
  };
  return new ReplayEngine(initialState, callback);
}