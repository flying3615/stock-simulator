// 全局配置常量 v0.2（预设B）

import type { FeeModel, SlippageModel, SpeedPreset } from './types';

// 账户初始配置
export const INITIAL_CASH = 50000; // 初始资金

// 手续费模型（0.2% 最低 1）
export const FEE_MODEL: FeeModel = {
  type: 'percentage',
  value: 0.002, // 0.2%
  minFee: 1,
};

// 滑点模型（5 bps）
export const SLIPPAGE_MODEL: SlippageModel = {
  bps: 5, // 5 bps = 0.05%
};

// 回放速度档位
export const SPEED_PRESETS: SpeedPreset[] = [
  { label: '0.5x', value: 0.5 },
  { label: '1x', value: 1 },
  { label: '2x', value: 2 },
  { label: '4x', value: 4 },
];

// 默认速度
export const DEFAULT_SPEED = 1;

// 步进大小
export const STEP_SIZE = 1; // 单根步进
export const SEEK_SIZE = 10; // 快进/快退步长

// 数据限制
export const MAX_CANDLES = 10000; // 最大K线条数（防止内存溢出）

// API 速率限制（每分钟请求数）
export const API_RATE_LIMIT = 10;

// 支持的 interval 与 range 映射
export const SUPPORTED_INTERVALS = ['1d', '5m', '1h', '2h', '4h', '1wk'] as const;
export const RANGE_LIMITS = {
  '1d': '5y', // 日线最多 5y
  '5m': '30d', // 5分钟线最多 30d
  '1h': '2y', // 1小时最多 2y
  '2h': '2y', // 2小时最多 2y
  '4h': '2y', // 4小时最多 2y
  '1wk': '10y', // 周线最多 10y
} as const;

// 默认时区（美股）
export const DEFAULT_TIMEZONE = 'America/New_York';

// 缓存配置（基础缓存头，单位秒）
export const CACHE_MAX_AGE = 300; // 5分钟

// UI 常量
export const CHART_HEIGHT = 400; // 图表高度（px）
export const DEFAULT_QTY = 100; // 默认下单数量

// 持久化键
export const STORAGE_KEY_SESSION = 'stock-simulator-session';
export const STORAGE_KEY_SETTINGS = 'stock-simulator-settings';

// 版本号（用于迁移）
export const CONFIG_VERSION = '0.2';