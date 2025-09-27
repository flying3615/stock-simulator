# 股票模拟操盘器 开发计划（v1.0）

概述：本计划面向一款用于单只股票历史回放与纸面交易演练的 Web 应用，提供 K 线回放（播放/暂停、单根步进、快进快退、选择起点）、买卖操作、交易明细记录与账户面板。历史行情通过开源包 yahoo-finance2 调用官方 API 获取与归一化处理。

1. 目标与范围

- 支持按时间周期回放：1d（日）、5m（5 分钟）、1h（1 小时）、1wk（周）。
- 支持播放控制：播放/暂停、单步前进/后退、按固定步长快进/快退、进度条拖拽。
- 支持选择起点：可切换“选择 K 线”模式并通过点击图表选定起始索引。
- 支持交易：买入、卖出、做空、回补；记录手续费与滑点；计算持仓与盈亏。
- 支持交易明细：系统以表格形式记录每次操作与关键衍生值（现金、头寸、均价、已实现盈亏）。
- 支持基本设置：回放速度、时间周期与数据范围；快捷键（空格播放/暂停）。
- 非目标（v1.0）：策略回测、复权处理、组合多标的、交易委托簿/撮合深度、风控规则配置化。

2. 非功能性要求

- 可靠性：数据请求失败可重试，前端错误有友好提示。
- 可用性：UI 简洁、对比度友好、在 13 寸屏幕下具有良好可视面积。
- 性能：单次加载最多 1 万根 K 线；播放刷新间隔最小 50ms。
- 可维护性：前后端 TypeScript，关键模块分层清晰，具备基础单元测试。
- 部署：Cloudflare Workers（通过 OpenNext），公共静态资源 CDN 缓存。

3. 技术栈与架构

- 前端：Next.js App Router、React、TypeScript、Tailwind CSS、lightweight-charts v4。
- 后端：Next.js API Route（运行于 Cloudflare Workers），yahoo-finance2。
- 状态：React Context 管理回放与账户状态。
- 工具：ESLint、Prettier、Vite/Next 构建链内置工具、Vitest/Playwright（可选）。

架构与数据流（自上而下）：

- 浏览器发起 GET /api/ohlc?symbol=...&interval=...&range=...。
- API 层调用 yahoo-finance2 的 chart 接口，按请求周期与范围拉取历史数据。
- 服务端精简并标准化为 Candle 数组：{ time, open, high, low, close, volume }。
- 前端接收后写入回放上下文，图表组件据此渲染；控制条驱动状态推进。
- 交易面板基于当前索引处价格撮合，输出 Trade 记录与账户 Portfolio 更新。

4. 模块划分

- 数据模块：封装 yahoo-finance2 调用与结果映射；时间与数值校验。
- API 模块：对外暴露 /api/ohlc；参数校验、错误处理与速率限制。
- 回放引擎：状态机（idle/playing/paused/completed）、速度控制、步进/快进。
- 图表模块：K 线与成交量渲染、增量揭示、可选起点选择模式。
- 控制条模块：速度/周期菜单、选择起点、步进/快进、进度条。
- 交易引擎：下单（买/卖/做空/回补）、手续费/滑点、均价、盈亏计算。
- 日志模块：交易明细记录与展示；导出 CSV（可选）。
- 持久化（可选）：本地存储最近一次会话与设置。

5. 数据与 API 设计

5.1 数据源与限制

- 使用 yahoo-finance2 的 chart API。
- 支持的 interval：1d、5m、1h、1wk（为保证稳定性，不含 2h/4h/90m 等边缘值）。
- 建议范围（range）：1d→1y、5m→30d、1h→120d、1wk→3y。
- 时区：默认 America/New_York，可按需扩展。

5.2 标准化 K 线

- intraday（5m/1h）时间统一为秒级 Unix 时间戳（number）。
- daily/weekly（1d/1wk）时间统一为 yyyy-mm-dd（string）便于 v4 图表处理。
- 过滤无效数据点：O/H/L/C 任意非有限数值则丢弃；volume 非数值置 0。

5.3 API 规范

- 路径：GET /api/ohlc
- 查询参数：
  - symbol: string（必填）
  - interval: '1d'|'5m'|'1h'|'1wk'（必填）
  - range: string（如 '30d'、'1y'，必填）
- 响应：
  - 200: { candles: Candle[]; symbol: string; interval: string; range: string }
  - 4xx/5xx: { error: { code: string; message: string; details?: any } }
- 错误码示例：INVALID_PARAMS、YF_UPSTREAM_ERROR、NO_DATA、RATE_LIMITED。

5.4 速率限制与缓存

- 单 IP 每分钟最多 10 次请求（可在 API 层做简单计数或使用 CF 限流）。
- 响应头 Cache-Control: public, max-age=300。
- 开发环境可禁用缓存，便于调试。

6. 状态与领域模型

- 回放状态：index、speed、status（idle/playing/paused/completed）、symbol、interval、range、candles。
- 账户状态：cash、positionQty（正多负空）、avgPrice、equity、pnlUnrealized、pnlRealized。
- 交易记录：id、time、side（buy/sell/short/cover）、price、qty、fee、slippage、pnlRealizedAfter。

7. 回放引擎设计

- 状态机：idle→playing/paused→completed。
- 推进机制：基于 speed 计算帧间隔（intervalMs = max(50, floor(1000/speed))）。
- 单步/快进：index ±1 / ±SEEK_SIZE，越界保护与 completed 状态设置。
- 进度条：range input 写入 index；播放中变更需先暂停或自动暂停。
- 自动跟随：播放时将可见范围右移，使最新 bar 保持在可视区域 70%~90%。
- 裁剪揭示：处于播放或选定起点后，以 slice(0, index+1) 增量绘制。

8. 交易引擎与风控

- 下单类型：buy、sell、short、cover；数量为正整数。
- 成交价：默认取当前索引 K 线收盘价，可扩展市价/限价模式。
- 手续费：百分比模型（例：0.2%，最低 1）；滑点：bps（如 5 bps）。
- 平均价与头寸：加权更新；空头 positionQty 为负。
- 盈亏计算：未实现盈亏 = (市价-均价)*数量；已实现盈亏累积更新。
- 账户权益：equity = cash + 未实现盈亏 + 持仓市值。
- 风控（v1.0 简版）：资金充足校验、禁止负现金（或允许杠杆后期支持）。

9. 前端 UI/UX 设计

- 页面结构：
  - 顶部表单：股票代码、区间选择、加载按钮、错误提示。
  - 主区图表：K 线 + 成交量，70vh 高度，留白与对比度优化。
  - 底部控制条：起点选择菜单、速度菜单、周期菜单、步进/快进、进度条。
  - 交易面板：买卖/做空/回补、数量与价格展示、账户快照。
  - 交易日志抽屉：从右侧滑入，记录每次交易与账户变更。
- 交互细节：
  - 空格键播放/暂停。
  - 选择 K 线：点击控制条中的菜单项进入“选择中”状态，点击图表后自动退出。
  - 周期切换：切换后自动重新加载数据与适配范围。
  - 进度拖拽：可快速定位历史任意位置。

10. 里程碑与任务拆解

M1 项目骨架（0.5d）
- 初始化 Next.js、TypeScript、Tailwind、ESLint；Cloudflare/OpenNext 配置。

M2 数据 API（1d）
- 接入 yahoo-finance2；实现 /api/ohlc；完成时间标准化与异常处理。

M3 图表基础（1d）
- 引入 lightweight-charts v4；渲染 K 线与成交量；适配窗口尺寸。

M4 回放控制（1.5d）
- 回放状态机；播放/暂停；单步/快进；进度条；自动跟随。

M5 交易与账户（1.5d）
- 下单、手续费/滑点、均价与盈亏；账户面板；基本校验。

M6 交易日志（0.5d）
- 记录表与展示组件；支持导出 CSV（可选）。

M7 多周期（0.5d）
- 支持 1d/5m/1h/1wk；切换后自动 reload 与视图初始化。

M8 选择起点（0.5d）
- 控制条触发选择模式；图表点击选定后退出；增量揭示。

M9 体验优化（1d）
- 对比度与色彩；按钮与反馈；错误提示；边界处理。

M10 测试与发布（1d）
- 单元测试（回放推进、交易计算）；端到端（加载与播放流程）；Cloudflare 部署。

预估总工期：8–10 人日（按单人实现）。

11. 验收标准（节选）

- 成功加载 AAPL 在 1d/5m/1h/1wk 四个周期的数据，曲线渲染正确，无控制台报错。
- 播放连续推进，自动跟随可见范围；拖拽进度与单步/快进行为正确。
- 选择 K 线后立即跳转到对应索引，并自动退出选择模式。
- 下单四种类型均可执行；账户与盈亏随之正确变化；交易日志准确记录。
- 切换周期后自动重新加载数据并正确渲染。

12. 测试计划

- 单元测试：
  - 回放推进：各速度下的 index 推进与 completed 状态。
  - 交易计算：手续费/滑点、均价、盈亏与现金/权益更新。
- 集成测试：
  - /api/ohlc 参数校验与错误路径；数据字段完整性。
  - 前端加载/播放/下单/日志流程。
- E2E（可选）：
  - Playwright 脚本覆盖加载与回放主路径。

13. 部署与运维

- 使用 OpenNext 产物部署到 Cloudflare Workers。
- wrangler.jsonc 配置 Node 兼容选项；环境变量管理（如 API 缓存开关）。
- 设置静态资源缓存与 API max-age=300。
- 监控：Cloudflare 控制台与浏览器控制台错误汇总（可选接入 Sentry）。

14. 风险与对策

- 第三方 API 波动：增加重试与错误提示；设置缓存与速率限制。
- 图表版本差异：锁定 lightweight-charts v4；时间字段严格标准化。
- 大数据集性能：限制最大根数；分页或按需加载（后续迭代）。

15. 后续增强（Backlog）

- 条件单（止盈止损）、Trailing、仓位管理规则。
- 注解/标记与截图导出，绘图工具。
- 策略脚本与回测框架对接；指标计算（MA、EMA、MACD 等）。
- 多标的与多图表联动；对比指数与自选列表。
- 服务端缓存与预取；离线数据导入。

16. 开发指南（片段）

- 代码风格：TypeScript 严格模式，ESLint + Prettier。
- Git 提交规范：feat/fix/refactor/docs/test/chore 样式；PR 需附带说明与测试要点。
- 命名约定：文件名-kebab-case，类型与接口 PascalCase，变量 camelCase。
- 异常处理：API 出口统一错误结构；前端 toast/提示文案友好。
- 文档：重要决策与接口变更同步到本开发计划或 README。

附：运行与调试（简述）

- 本地开发：pnpm i && pnpm dev（或 npm/yarn 等价命令）。
- 访问 http://localhost:3000，输入代码与周期，点击加载开始体验。
- 若需部署：构建 OpenNext 产物并使用 wrangler 发布到 Cloudflare。

版本记录

- v1.0（当前）：完成基础设计，覆盖回放/交易/日志/多周期与选择起点。