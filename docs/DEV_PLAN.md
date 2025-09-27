# 股票模拟操盘器 - 分步骤开发计划

版本: v0.1 目标平台: Next.js 15 App Router + Cloudflare Workers 部署

范围与目标
- 针对单支股票进行历史K线回放与模拟交易
- 支持播放控制: 播放 暂停, 变速, 快进 快退, 单根K线前进 后退
- UI: 历史K线图, 播放控制条, 买卖面板, 用户资产面板, 交易明细
- 数据源: yahoo-finance2 开源包 API 拉取
- 持久化: 本地 localStorage 初期, 预留服务端存档扩展点
- 首批时间粒度: 日级 K 作为 Phase 1, 预留分钟级 Phase 2

关键技术选型
- 前端框架: Next.js 15 App Router React 19
- 图表库: TradingView lightweight-charts 轻量, K线表现优秀
- 状态管理: useReducer 简化首版 或 Zustand 如需更强扩展性
- 数据获取: 服务端 Route Handler 调用 yahoo-finance2 并做缓存
- 部署: OpenNext Cloudflare Workers nodejs_compat 已启用

架构总览
- Pages 结构: 单页面回放页 Replay
- Server 路由: GET api candles 拉取与缓存K线数据
- Client 组件: Chart, PlaybackControls, TradePanel, PortfolioPanel, TradesTable
- 播放内核: 可控时间推进器 PlaybackEngine 驱动当前回放索引
- 模拟撮合: 简化为按当前K线收盘价 成交 的市价单模型 Phase 1
- 持久化: Portfolio 与 Trades 序列化到 localStorage

数据模型 TypeScript
interface Candle { time: number; open: number; high: number; low: number; close: number; volume?: number; }
type Side = buy | sell
interface Order { id: string; symbol: string; side: Side; qty: number; submittedAt: number; filledPrice?: number; filledAt?: number; }
interface Trade { id: string; orderId: string; symbol: string; side: Side; qty: number; price: number; time: number; }
interface Position { symbol: string; qty: number; avgPrice: number; }
interface Portfolio { cash: number; positions: Record<string, Position>; equity: number; }
interface PlaybackState { symbol: string; timeframe: 1d; candles: Candle[]; index: number; speed: number; playing: boolean; }

播放内核设计
- 状态: index 指向当前可见最新一根K线
- 播放推进: requestAnimationFrame 或 setInterval 基于 speed 推进 index
- 快进 快退: 按 N 根步长调整 index 并边界保护
- 单根进退: index ± 1
- 跳转: 指定 index 或 datetime 二分定位
- 变速: speed 枚举 0.5x 1x 2x 4x 8x
- 事件: onIndexChange 回调通知 UI 刷新
- 性能: 仅增量推入图表点 rather than 全量重绘

撮合与风控简化规则 Phase 1
- 仅多头 市价单 成交价取当前 index K 线收盘价
- 数量校验: qty > 0 且现金充足
- 持仓更新: 加权平均价, 数量变更
- 资金: 现金减少 买入价*数量, 卖出增加
- PnL: 浮动盈亏以当前 index 收盘价计算, 实现盈亏按成交记录汇总
- 交易成本: Phase 1 忽略 预留固定佣金与滑点参数

服务端数据层
- Route: GET api candles 例如 GET api candles?symbol=AAPL&interval=1d&range=5y
- 实现: 调用 yahoo-finance2 的 historical API 返回标准 Candle 数组
- 服务器缓存: 基于 Cloudflare Cache API 或 内存 LRU TTL 1h
- 错误处理: 参数校验 符号不存在 超限速退避
- 兼容性: 若 yahoo-finance2 在 Workers 上不兼容 则直接用官方 HTTP 端点作为回退

客户端 UI 布局
- 上方: 工具条 符号输入 时间范围 时间粒度 下载刷新
- 左中: K线图 Chart 占主区
- 右侧: 用户面板 PortfolioPanel 现金 持仓 实时权益
- 下方: 播放控制条 播放 暂停 单步 前后 快进 快退 速度滑块 当前时间 指标
- 最下: 交易明细 TradesTable 成交列表 PnL 汇总

组件切分与职责
- ReplayPage: 组合容器 拉数据 管理播放与交易状态
- CandleChart: 基于 lightweight-charts 渲染K线与成交标记
- PlaybackControls: 播放与步进控制
- TradePanel: 输入数量 买入 卖出
- PortfolioPanel: 显示现金 持仓 浮盈亏
- TradesTable: 展示成交明细 可导出 CSV

关键交互流程
1. 用户输入 AAPL 点击加载 -> 请求服务器拉取历史K线 -> 初始化 PlaybackState index 指向初始可视点
2. 用户点击播放 -> 引擎按 speed 推进 index -> Chart 追加最新蜡烛 -> Portfolio 实时估值
3. 用户下单买入 -> 校验资金 -> 以当前收盘价成交 -> 更新 Portfolio 与 Trades
4. 用户快进或单步 -> index 变更 -> UI 同步刷新 -> 显示最新持仓和盈亏

持久化策略
- localStorage 键: replay portfolio:{symbol}:{timeframe} 保存 Portfolio 和 Trades
- 自动保存: 每次成交后写入
- 会话恢复: 页面加载尝试恢复上次 symbol 配置
- 导出 导入: JSON 文本

错误与边界
- 无数据或样本过短: UI 提示
- 越界 index: 禁止操作并禁用按钮
- 网络错误: 退避重试 提示刷新
- 交易数量 非法: 提示并拒绝

测试计划
- 单元: 播放内核推进器 交易撮合器 资金与持仓计算
- 组件: 播放控件禁用态 渲染正确性
- 合约测试: api candles 在符号无效或断网时行为
- 端到端: 回放下单 PnL 变化 Playwright

里程碑与迭代
- M0 验证: API 可用 与 Cloudflare 兼容性 验证 yahoo-finance2 或回退方案
- M1 回放最简版: 加载K线 + 播放 暂停 单步 控件 与图表渲染
- M2 交易与持仓: 买入 卖出 资产面板 交易表 持久化
- M3 体验优化: 变速 快进快退 历史时间跳转 成交标记
- M4 稳定性: 缓存与错误处理 单元和e2e 测试
- M5 扩展: 分钟级回放 成本模型 指标 订单类型

目录与文件规划
- src app replay page.tsx 回放页面
- src app api candles route.ts 服务端K线接口
- src lib data yahoo client.ts 封装 yahoo-finance2 与回退 fetch
- src lib playback engine.ts 播放内核
- src lib trading simulator.ts 撮合与账户模型
- src components CandleChart.tsx 播放控件等组件
- src store portfolio.ts 状态管理 如使用 Zustand

API 设计草案
- GET api candles
  - 请求: symbol 必填, interval 默认 1d, range 可选 1y 5y max
  - 响应: { candles: Candle[], meta: { symbol, timezone } }
- 错误码: 400 参数错误, 404 无数据, 429 频率限制, 500 服务端错误

yahoo-finance2 兼容性说明
- 开发期 Node 本地无问题
- 部署到 Cloudflare Workers 时 若包依赖 Node 专有模块可能报错
- 缓解: 使用 nodejs_compat 并在构建时 external 处理
- 回退: 直接请求 Yahoo 公开 JSON 端点 维持相同输出结构

性能与缓存
- 服务器端: 基于 symbol interval range 组成缓存键 TTL 1h 命中后直接返回
- 客户端: K线数据保存在组件状态 避免重复渲染 仅增量追加
- 图表: 使用 light series.setData 与 update 方式增量渲染

安全与限流
- 简单节流: 文本输入后 500ms 再发请求
- 服务端速率限制: 每IP 每分钟最多 N 次 通过内存令牌桶 Phase 2

实施清单
Phase 0 基础依赖
- 安装 yahoo-finance2 lightweight-charts
- 建立 api candles 路由 与兼容层
- 验证 Cloudflare 预览部署

Phase 1 回放最小可行
- 完成 PlaybackEngine
- 完成 CandleChart 渲染与增量推入
- 完成 PlaybackControls 与键盘快捷键
- 实现 ReplayPage 串联数据和引擎

Phase 2 交易与持久化
- 实现 TradePanel PortfolioPanel
- 实现撮合与 portfolio 更新逻辑
- 实现 TradesTable 与本地持久化

Phase 3 体验与稳健
- 快进快退 变速 跳转 指标 显示
- 错误处理 缓存 测试完善

后续扩展建议
- 分钟级回放 多品种 同步回放
- 交易成本与滑点模型 可参数化
- 策略脚本接口 与回测导出
- 云端用户系统 与数据同步

附录 Mermaid 架构图
flowchart LR
  User --> ReplayPage --> PlaybackEngine
  ReplayPage --> CandleChart
  ReplayPage --> PlaybackControls
  ReplayPage --> TradePanel
  ReplayPage --> PortfolioPanel
  ReplayPage --> TradesTable
  ReplayPage --> APICandles
  APICandles --> yahoo finance2
  APICandles --> Cache

附录 Mermaid 时序图
sequenceDiagram
  participant U as User
  participant R as ReplayPage
  participant E as Engine
  participant C as CandleChart
  participant A as APICandles
  U->>R: 输入符号并加载
  R->>A: 拉取历史K线
  A-->>R: 返回 Candle[]
  R->>E: 初始化 index 设为起点
  U->>E: 点击播放
  E->>C: 推进 index 并刷新蜡烛
  U->>R: 点击买入或卖出
  R->>R: 更新持仓与现金 记录成交
  R->>C: 标记成交点

落地注意
- 文件命名与路径可按上方目录建议创建
- Phase 1 尽量少依赖 保持 bundle 精简
- 提前做数据回退路径 以免 Workers 不兼容阻塞迭代