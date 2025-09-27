# Stock Simulator — 基于历史K线的模拟操盘（Next.js + Cloudflare）

概述
- 目的：提供针对单只股票的历史K线回放训练，支持播放/暂停、快进/快退、单根K线步进以及下单（含做空），并记录账户与成交明细。
- 版本范围：采用预设B（已确认）
  - interval：1d、5m
  - range：1d 最长 5y；5m 最长 30d
  - 初始资金：50000
  - 下单数量：用户自定义（整数股）
  - 手续费：0.2%（万2），最低 1
  - 滑点：5 bps（0.05%）
  - 交易：允许做空（不加杠杆）
  - 时区：按交易所时区（如美股 America/New_York）
  - 复权：优先使用复权后的 close；OHLC 不可得时以 adjClose 替代 close

技术栈
- 前端：React 19 + Next.js 15 App Router
- 部署：Cloudflare Workers（通过 OpenNext Cloudflare）
- 图表：lightweight-charts
- 数据：yahoo-finance2（仅服务端调用）
- 语言：TypeScript

开发计划
- 完整分步文档见 [docs/development-plan.md](docs/development-plan.md)

快速开始
1. 安装依赖
   ```bash
   npm i
   npm i yahoo-finance2 lightweight-charts
   ```
2. 本地开发
   ```bash
   npm run dev
   ```
   打开 http://localhost:3000
3. 构建与启动
   ```bash
   npm run build
   npm start
   ```
4. Cloudflare 预览与部署
   ```bash
   npm run preview   # 预览
   npm run deploy    # 部署
   ```

重要约束与约定
- 服务端数据源
  - 仅在服务端（API 路由）调用 yahoo-finance2；客户端禁止直接导入。
  - 项目通过 [wrangler.jsonc](wrangler.jsonc) 启用了 nodejs_compat 以兼容该包。
- API 合约
  - GET /api/ohlc
    - query：
      - symbol：股票代码（如 AAPL）
      - interval：1d 或 5m
      - range：如 5y、30d（对应 interval 限制）
      - tz（可选）：时区标识
    - 响应：KLine[]，字段 time, open, high, low, close, volume
- 播放与交互
  - 播放控制：播放/暂停、速度选择、快进/快退、单根步进、日期跳转
  - 键盘快捷键（预留）：Space 播放/暂停，Left/Right 步进，Up/Down 快进/快退

项目目录（目标结构）
- [src/app/page.tsx](src/app/page.tsx)
- [src/app/api/ohlc/route.ts](src/app/api/ohlc/route.ts)
- [src/components/Chart.tsx](src/components/Chart.tsx)
- [src/components/PlaybackControls.tsx](src/components/PlaybackControls.tsx)
- [src/components/TradePanel.tsx](src/components/TradePanel.tsx)
- [src/components/TradeLog.tsx](src/components/TradeLog.tsx)
- [src/lib/types.ts](src/lib/types.ts)
- [src/lib/trade/sim.ts](src/lib/trade/sim.ts)
- [src/lib/replay/engine.ts](src/lib/replay/engine.ts)
- [src/lib/data/yahoo.ts](src/lib/data/yahoo.ts)
- [src/lib/config.ts](src/lib/config.ts)

手工验收清单（v0.2）
- AAPL 1y 1d 回放：可播放/暂停、单根步进、快进/快退
- AAPL 5d 5m 回放：加载与回放稳定
- 下单流程：买入、做空、平仓；账户与成交明细正确
- 播放到末尾进入 Completed 状态；边界步进行为正确

常见问题
- Cloudflare Workers 环境下的 Node API 限制
  - 已通过 nodejs_compat 解决多数兼容性；若仍遇到问题，可改用 Yahoo Chart JSON 接口直连实现，保持同一输出结构（作为降级方案）。
- 分钟线数据窗口
  - 按预设B：5m 支持最长 30d，超出范围需提示或裁剪。

里程碑
- M1：加载并显示K线，播放/暂停与步进
- M2：下单（含做空）、账户与成交明细正确
- M3：快进快退、日期跳转、快捷键
- M4：本地持久化与基础测试

协作与代码规范
- 类型优先，纯函数优先（撮合与回放推进）
- 组件仅客户端渲染图表，服务端处理数据
- 后续可引入 Zustand 做更细粒度状态管理

参考
- Next.js 文档：https://nextjs.org/docs
- OpenNext Cloudflare：https://opennext.js.org/cloudflare
- lightweight-charts：https://github.com/tradingview/lightweight-charts
- yahoo-finance2：https://github.com/gadicc/node-yahoo-finance2
