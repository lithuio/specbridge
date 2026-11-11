# R07 Phase F — 真实变更审批证据

2026-11-12，分支 `feat/15-web-integration`，开工 HEAD `cef9e44`。正式 Next 生产构建、编译 Nest API、5434 隔离 PostgreSQL 与 Chromium Headless Shell；Owner/Developer/Client 使用独立浏览器 Context。不是 Phase A 原型或 Mock 数据。

| 截图 | 场景 |
|---|---|
| [客户审批桌面页](client-approval-desktop.png) | 1440px；v1 客户拒绝后，供应方重开并选择新 Ready Revision，重新提交 v2；Owner 已批准 v2，等待 Client 确认同一版。商业快照、需求规格、双方审批顺序及 v1/v2 历史同时可查 |
| [客户审批手机确认框](client-confirmation-mobile.png) | 390×844；明确 v2、Revision 2、冻结时间、CNY +123.45、12.35 小时、+2 天，以及双方可见的评论；真正提交前再次核对 |

两张最终截图已查看；禁用截图动画，手机只采集视口，避免捕获弹窗入场中间态。截图无密码、Cookie、随机邮箱。历史 C/D/E 图片未改；本证据不代表人工视觉验收通过。

## 实际验证

```bash
pnpm --filter web build
pnpm --filter web typecheck
pnpm --filter web lint
pnpm run db:test:up
pnpm run test:browser:changes
git diff --check
docker compose -f infra/compose.test.yml stop db
```

- 最终浏览器：2/2，16.5 秒，无 pageerror。第一条真实 UI 流程覆盖 lockVersion=0/NULL 草稿、部分保存、完整冻结提交、Owner→Client 同版决定、客户拒绝→仅重开→新规格显式选择→新版本双方重审，APPROVED 不可重开/编辑。第二条覆盖草稿/Submit stale、旧 v1 审批框面对新 v2 的 409 不重放、Owner 拒绝重提、列表分页/筛选、未知创建结果禁重发。
- 同时验证 Client 响应完全无 draft、Client PATCH/Developer Vendor决定403、Client 提前审批409、父链/跨项目404、冻结历史与刷新、需求 Pending 能力失效、320px 无横向溢出。费用超界/工时指数被拒绝，`-9007199254740991` 与 `999999.99` 保存及显示精确，空白未变成0。
- Web build/typecheck/lint、diff 检查通过。首轮类型反馈泛型、Turbopack 沙箱失败缓存、测试库未启动、隐藏页面选择器冲突和截图动画均已处理；失败不计为通过。无后端修改，未重复 R01–R06、C–E 全量回归或重新生成契约。

## 本机与复现边界

- 系统现有浏览器和中文字体可用，无需 C/E 历史中的 `/tmp` 库/字体前缀；未下载新依赖。新机器按 [Web README](../../../../apps/web/README.md) 安装 Chromium/系统依赖。
- 本机需沙箱外执行构建/监听/Docker。构建失败缓存保存在 `/tmp/specbridge-r07-f-build-p4q5dmge/next`；其后干净构建成功，该临时目录不作为复现依赖。
- 开工时5434未运行，本轮启动仓库标准测试Compose，端口映射可用；未使用host覆盖。原启动器校验测试库/账号并应用已审迁移，不读取开发`.env`，不访问5433开发数据，不清表或关闭历史触发器。
- 结束由原启动器回收API/Web，本轮启动的测试DB已停止。只读核对：开发DB仍healthy/5433，3000/4000/5434无监听。未删除容器或开发卷。
- 根 `test:browser` 已纳入 F，但本轮只运行定向 F。远程CI、人工视觉/安全Review、生产HTTPS、多浏览器及完整交付闭环留后续阶段。
