# R07 G — 真实交付与运营视图证据

2026-11-12；真实 Next 生产构建 → 同源 Rewrite → Nest → 5434 隔离 PostgreSQL → Chromium。通过正式 API 创建随机账号/授权项目/批准前置，浏览器完成交付退回→新 D2→接受。页面没有静态业务数据；测试 HTTPS 链接不发起外部抓取。C–F 历史截图原样保留。

| 截图 | 内容 |
|---|---|
| [dashboard-desktop.png](dashboard-desktop.png) | 1440×1000，真实授权项目聚合与已完成交付；计数来自全部集合，保留新Revision衍生的待办。随机邮箱遮罩 |
| [client-accept-mobile.png](client-accept-mobile.png) | 390×844，客户核对 v1 / D2、成果/证据与评论后确认接受；D1退回历史仍保留 |

两图来自最终干净构建，已逐张查看；手机320px另由自动断言验证概览/Audit无水平溢出。截图不等于人工视觉、安全或全面可访问性验收。

复现（仓库根目录，使用现有工具/依赖）：

```bash
pnpm run db:test:up
pnpm --filter web build
pnpm run test:browser:deliveries
```

需要已有 API 构建；如缺失，先 `pnpm --filter specbridge-api build`。启动器只读取 `.env.test`，校验真实测试库/角色、复用已审迁移；占用3000/4000时拒绝复用开发服务，完成后回收自建HTTP进程。系统Chromium Headless Shell与中文字体本轮可用，无下载/临时库。测试DB保持运行，不自动down/清表。

最终 `test:browser:deliveries`：2场景 / 10.2s，PASS，无pageerror。覆盖AC-13/14/15/16/27本阶段范围、无expectedVersion、旧规格仍可交付、角色403/跨项目404/Pending和Accepted409、终审竞争保留输入不重放、创建响应丢失不重发、HTTPS/证据/退回必填校验、真实三bucket与分页统计/审计裁剪、列表与活动筛选/分页、详情和批准历史深链刷新、Next Activity返回原页和缓存刷新、概览失败无假零值。

另运行现有账号切换定向用例：

```bash
node scripts/with-env.mjs .env.test pnpm --filter web test:e2e auth.spec.ts --grep 'A→B'
```

PASS，1项 / 3.9s；不生成/覆盖C阶段截图。Web lint/typecheck/最终干净build与diff检查通过。沙箱外执行构建/浏览器/测试库启动；沙箱内监听被拒绝。首轮测试筛选后reload抢先导航，增加URL就绪断言后通过。Turbopack旧CSS由保留旧 `.next` 后干净构建解决，最终产物和浏览器CSS断言一致。

未运行无关后端/全量浏览器回归、远程CI、生产HTTPS、多浏览器与人工Review；完整三角色准备→审批→交付全链路及全量验收留H。G只使用API准备批准前置，不声称已完成H。
