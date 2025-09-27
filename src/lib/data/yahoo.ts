// Yahoo Finance2 数据封装 v0.2（服务端专用）

import yahooFinance from 'yahoo-finance2';
import type { Candle, OHLCRequest, ErrorShape } from '../types';
import { SUPPORTED_INTERVALS, RANGE_LIMITS, SUPPORTED_RANGES, MAX_CANDLES, DEFAULT_TIMEZONE } from '../config';

// 输入校验
function validateRequest(req: OHLCRequest): ErrorShape | null {
  const { symbol, interval, range } = req;

  if (!symbol || typeof symbol !== 'string' || symbol.trim() === '') {
    return { code: 'INVALID_SYMBOL', message: 'Symbol is required and must be a non-empty string' };
  }

  if (!SUPPORTED_INTERVALS.includes(interval)) {
    return { code: 'INVALID_INTERVAL', message: `Interval must be one of: ${SUPPORTED_INTERVALS.join(', ')}` };
  }

  const allowedRanges = SUPPORTED_RANGES[interval];
  if (!(allowedRanges as readonly string[]).includes(range)) {
    return { code: 'INVALID_RANGE', message: `Range for ${interval} must be one of: ${allowedRanges.join(', ')}` };
  }

  return null;
}

/**
 * 映射 Yahoo 数据为标准 Candle[]
 * 注意：lightweight-charts v4 允许的 time 类型为：
 * - UTCTimestamp（秒，number），或
 * - 'yyyy-mm-dd' 字符串（仅日线）
 * 这里统一标准化为 Unix 秒级时间戳，避免传入 ISO 字符串导致的错误。
 */
function mapToCandles(data: any[]): Candle[] {
  const toUnixSeconds = (input: any): number => {
    if (typeof input === 'number') {
      // 若为毫秒时间戳（> 1e12），转换为秒
      return input > 1e12 ? Math.floor(input / 1000) : input;
    }
    // 其余情况（如 ISO 字符串或 Date），统一 parse 再转秒
    const ms = Date.parse(input);
    return Math.floor(ms / 1000);
  };

  return data
    .filter(item =>
      item &&
      item.date &&
      typeof item.open === 'number' &&
      typeof item.high === 'number' &&
      typeof item.low === 'number' &&
      typeof item.close === 'number'
    ) // 过滤无效数据，确保 OHLC 为数字
    .map(item => ({
      time: toUnixSeconds(item.date), // 统一为秒级时间戳，兼容 v4
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close, // chart API 的 close 已是复权价
      volume: typeof item.volume === 'number' ? item.volume : 0,
    }))
    .slice(0, MAX_CANDLES); // 限制条数
}

// 获取 OHLC 数据
export async function getOHLC(
  symbol: string,
  interval: '1d' | '5m' | '1h' | '1wk',
  range: string,
  tz: string = DEFAULT_TIMEZONE
): Promise<{ candles: Candle[]; error?: ErrorShape }> {
  const req: OHLCRequest = { symbol, interval, range, tz };
  const validationError = validateRequest(req);
  if (validationError) {
    return { candles: [], error: validationError };
  }

  try {
    // 计算 period1 和 period2 基于 range
    const now = new Date();
    let period1: Date;
    switch (range) {
      case '1d':
        period1 = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
        break;
      case '5d':
        period1 = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        period1 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '60d':
        period1 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        break;
      case '120d':
        period1 = new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000);
        break;
      case '3mo':
        period1 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '6mo':
        period1 = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        period1 = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case '2y':
        period1 = new Date(now.getTime() - 2 * 365 * 24 * 60 * 60 * 1000);
        break;
      case '3y':
        period1 = new Date(now.getTime() - 3 * 365 * 24 * 60 * 60 * 1000);
        break;
      case '5y':
        period1 = new Date(now.getTime() - 5 * 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        // 未知范围时，退化为 1y，避免后端报错
        period1 = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
    }

    const result = await yahooFinance.chart(symbol, {
      period1,
      period2: now,
      interval: interval as any, // yahoo-finance2 支持 '5m' 但类型定义不完整
    });

    if (!result || !result.quotes || !Array.isArray(result.quotes)) {
      return {
        candles: [],
        error: { code: 'NO_DATA', message: 'No data returned from Yahoo Finance' },
      };
    }

    const candles = mapToCandles(result.quotes);

    if (candles.length === 0) {
      return {
        candles: [],
        error: { code: 'NO_VALID_DATA', message: 'No valid candle data after filtering' },
      };
    }

    return { candles };
  } catch (error: any) {
    console.error('Yahoo Finance API error:', error);
    return {
      candles: [],
      error: {
        code: 'API_ERROR',
        message: error.message || 'Failed to fetch data from Yahoo Finance',
        details: error,
      },
    };
  }
}

// 辅助：检查符号是否有效（可选，用于预校验）
export async function validateSymbol(symbol: string): Promise<boolean> {
  try {
    const result = await yahooFinance.quote(symbol);
    return !!result && !!result.symbol;
  } catch {
    return false;
  }
}