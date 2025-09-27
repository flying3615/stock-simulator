// 领域类型定义 v0.2（预设B：支持做空，interval=1d/5m，range=1d:5y,5m:30d）

// K线数据结构（标准化）
export interface Candle {
  time: number | string; // 时间戳（秒）或 ISO 字符串
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// 交易记录
export interface Trade {
  id: string; // 唯一ID
  time: number; // 时间戳（秒）
  side: 'buy' | 'sell' | 'short' | 'cover'; // 方向：买入、卖出、做空、对冲
  price: number; // 成交价
  qty: number; // 数量（正数）
  fee: number; // 手续费
  slippage: number; // 滑点成本
  pnlRealizedAfter: number; // 该笔交易后的已实现盈亏（累计）
}

// 账户与持仓状态
export interface Portfolio {
  cash: number; // 现金余额
  positionQty: number; // 持仓数量（正：多头，负：空头）
  avgPrice: number; // 平均持仓价
  equity: number; // 权益 = 现金 + 持仓市值 + 浮动盈亏
  pnlUnrealized: number; // 浮动盈亏
  pnlRealized: number; // 已实现盈亏
}

// 回放状态
export interface ReplayState {
  index: number; // 当前K线索引（0-based）
  speed: number; // 播放速度倍数（0.5x,1x,2x,4x）
  status: 'idle' | 'playing' | 'paused' | 'completed'; // 状态机
  symbol: string; // 股票代码
  interval: '1d' | '5m' | '1h' | '2h' | '4h' | '1wk'; // 粒度
  range: string; // 范围（如 '5y', '30d'）
  candles: Candle[]; // K线数据数组
}

// 下单请求
export interface OrderRequest {
  side: 'buy' | 'sell' | 'short' | 'cover'; // 方向
  qty: number; // 数量（正数）
  price?: number; // 限价（v0.1 仅市价，预留）
}

// 手续费模型
export interface FeeModel {
  type: 'percentage' | 'fixed'; // 百分比或固定
  value: number; // 百分比（如0.002）或固定金额（如1）
  minFee: number; // 最低手续费
}

// 滑点模型
export interface SlippageModel {
  bps: number; // 基点（bps，如5）
}

// 速度档位
export interface SpeedPreset {
  label: string; // 显示标签（如 '0.5x'）
  value: number; // 倍数
}

// 错误形状
export interface ErrorShape {
  code: string; // 错误码（如 'INVALID_SYMBOL'）
  message: string; // 错误信息
  details?: any; // 额外详情
}

// API 请求参数（GET /api/ohlc）
export interface OHLCRequest {
  symbol: string;
  interval: '1d' | '5m' | '1h' | '2h' | '4h' | '1wk';
  range: string; // 如 '5y', '30d'
  tz?: string; // 时区（如 'America/New_York'）
}

// API 响应
export interface OHLCResponse {
  candles: Candle[];
  symbol: string;
  interval: string;
  range: string;
}

// 回放引擎回调
export type ReplayCallback = (state: ReplayState) => void;

// 交易引擎回调
export type TradeCallback = (portfolio: Portfolio, trade?: Trade) => void;