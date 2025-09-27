// API 路由：获取 OHLC 数据 v0.2

import { NextRequest, NextResponse } from 'next/server';
import { getOHLC } from '../../../lib/data/yahoo';
import { CACHE_MAX_AGE } from '../../../lib/config';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // 解析查询参数
    const symbol = searchParams.get('symbol');
    const interval = searchParams.get('interval') as '1d' | '5m';
    const range = searchParams.get('range');
    const tz = searchParams.get('tz') || undefined;

    // 基础校验
    if (!symbol || !interval || !range) {
      return NextResponse.json(
        { error: { code: 'MISSING_PARAMS', message: 'symbol, interval, range are required' } },
        { status: 400 }
      );
    }

    // 调用数据封装
    const result = await getOHLC(symbol, interval, range, tz);

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    // 成功响应
    return NextResponse.json(
      {
        candles: result.candles,
        symbol,
        interval,
        range,
      },
      {
        headers: {
          'Cache-Control': `public, max-age=${CACHE_MAX_AGE}`, // 基础缓存
        },
      }
    );
  } catch (error: any) {
    console.error('API Route error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
      },
      { status: 500 }
    );
  }
}