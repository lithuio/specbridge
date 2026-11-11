# R07 Phase H — 最终本地集成证据

2026-11-12；分支 `feat/15-web-integration`，开工 HEAD `92f4a99`、工作区干净。已在线核对 [Issue #15](https://github.com/lithuio/specbridge/issues/15)。B–G 实现均已存在，G 已由负责人提交；C–G 历史截图保留原值。

**最终结果：本地范围 PASS，无未解决 FAIL / BLOCKED。** 全量检查曾遇失败，按下表记录并从失败点续跑；不是声称根命令首次完整一次通过。未 Commit/Push/创建 PR/Merge/部署。

## 真实业务与风险覆盖

`apps/web/e2e/integration.spec.ts` 使用三个独立 Chromium Context，连接 Next 生产构建、编译 Nest API 与 `127.0.0.1:5434/specbridge_test`。除 UUID 账号注册 fixture 外，项目和业务的全部写入均通过正式 UI；少量 API GET 只核对持久化结果。无 Mock Dashboard、无直接 SQL 建立批准前置条件。

Owner 创建空间/项目、添加并分配 Developer、绑定 Client → Client 创建需求 → Developer 提问 → Client 回答 → Developer 创建不可变 Revision/Ready/评估/提交 → Owner 批准 v1 → Client 拒绝 → Developer 重开、修改标准并提交 v2 → Owner 和 Client 重新批准同一 v2 → Developer 提交 D1 → Client 退回 → Developer 新建 D2 → Client 接受。最后核对旧拒绝/退回/Revision 深链接刷新、真实 Audit 链接，以及三角色一致的已完成数 1、待处理/等待均 0。

| 风险 / AC | 最终证据来源（本轮均运行） |
|---|---|
| AC-01/02/16，会话过期与 A→B、旧 200/401、共享 Cookie、CSRF、429 | C 6 场景；R02 HTTP/DB |
| AC-03/04/05/16/22/23/24/26，成员、唯一客户、跨项目与混合角色、锁定竞争 | D 2 场景；RBAC/Changes HTTP/DB |
| AC-06/07/08/25，问答/Revision/Ready、stale 保留输入、Pending 禁修订、父链 | E 2 场景；Requirements HTTP/DB |
| AC-09/10/11/12，双方拒绝、新版重审、409 旧决定不重放、精确金额与草稿裁剪 | F 2 场景；Changes HTTP/DB |
| AC-13/14/15/27，退回重交、重复终审/交付、旧批准可交付、未知响应不重发、Audit/Dashboard | G 2 场景；Deliveries/Reads HTTP/DB |
| 三角色完整业务闭环、历史与写后聚合、键盘/语义/响应式 | H 1 场景；本目录截图与 JSON |

AC-17 的数据库持久化/迁移沿用既有集成证据；备份恢复、生产服务重启/HTTPS不属于本轮 PASS。P1 未实现，不据此宣布全部 P0 或发布 DoD 完成。

## 精确命令与结果

根脚本只显式加载 `.env.test`；API HTTP 分套件命令由 `test:e2e:db` 顺序调用。DB/HTTP/浏览器和最终生产构建在获准的沙箱外运行；沿用已审迁移、既有库/角色校验，无新表/迁移/契约/业务写范围。

| 实际命令 | 状态与结果 |
|---|---|
| `pnpm run db:test:up` | PASS；既有测试容器 Running / Healthy，保持运行 |
| `pnpm run lint`、`pnpm run test` | PASS；两包 Lint、既有完整单元套件 |
| `pnpm run build` | PASS（沙箱外干净构建）；此前沙箱端口限制 FAIL，缓存保留后重建 |
| `pnpm --filter specbridge-api typecheck`、`pnpm --filter web typecheck` | PASS |
| `pnpm run test:integration` | PASS；8 文件 / 90 PostgreSQL 用例 |
| `pnpm run test:e2e` | PASS；3 文件 / 5 基础 HTTP 用例 |
| `pnpm run test:e2e:db` | PASS；auth 16、rbac 13、requirements 9、changes 8、deliveries 7、reads 9；含真实编译 API / Next Rewrite |
| `pnpm --filter specbridge-api openapi:check` | PASS；30 paths，机器契约及 Web 生成类型无漂移 |
| `pnpm --filter specbridge-api db:check` | PASS；迁移元数据 |
| `pnpm run test:browser:run` | 首轮 FAIL：C 6 PASS / 6.6s，D 旧入口定位超时；后续未运行。修复后从 D 续跑，未重跑 C |
| `R07_EVIDENCE_ROOT=test-results/evidence pnpm run test:browser:projects` | PASS；2 场景 / 7.6s |
| `R07_EVIDENCE_ROOT=test-results/evidence pnpm run test:browser:requirements` | PASS；2 场景 / 16.2s |
| `R07_EVIDENCE_ROOT=test-results/evidence pnpm run test:browser:changes` | 最终 PASS；2 场景 / 17.4s；前次金额文本节点回归失败已修复 |
| `R07_EVIDENCE_ROOT=test-results/evidence pnpm run test:browser:deliveries` | PASS；2 场景 / 10.4s |
| `pnpm run test:browser:integration` | 最终 PASS；1 场景 / 20.5s（流程 17.8s），无 pageerror；必要修复后仅重跑受影响 H |
| `pnpm --filter web build`、`pnpm --filter web lint`、`pnpm --filter web typecheck` | 最后 UI 修复后 PASS；构建成功后跑 H，未重复后端回归 |
| `git diff --check`、本轮文档相对链接检查 | PASS |
| 远程 CI / 人工视觉、API 集成及安全评审 | NOT RUN；没有触发远程操作或代替人工签字 |
| Firefox/WebKit、真实手机/辅助技术、实际浏览器 200% zoom、生产 HTTPS、备份恢复、性能基准 | NOT RUN；720px 为半桌面 CSS 视口重排检查，不冒充实际浏览器缩放或设备测试 |

全量浏览器最终各套件合计 **15 场景 PASS**，按失败点分段执行。完整可复现入口仍为 `pnpm run test:browser`（含 API/Web build）；已有最新构建则 `pnpm run test:browser:run`。不要同时启动数据库/代理/浏览器套件；不要放宽真实认证限流。CI 已追加 Web typecheck、Chromium 安装、生产 Web 和相同浏览器入口，**配置已修改不代表远程 CI 已通过**。

本机无需历史 `/tmp` 浏览器库/字体前缀。临时原始日志在 `/tmp/specbridge-r07-h-checks/`，不是交接依赖；所有稳定证据均在仓库。测试启动器已退出自建 API/Web，既有隔离 DB 保持运行；开发 `.env`、开发/生产库未读取。

## 视觉与可访问性

沿用 Phase A Tokens、中文字体、浅色中性与靛蓝、原有布局。本轮逐张查看以下最终截图，未发现主要信息遮挡、整体横向溢出或金额/历史丢失；这是代理自检，不是负责人视觉签字。

| 截图 | 场景 |
|---|---|
| [客户审批桌面](client-approval-desktop.png) | v2、双方步骤、金额、长规格及 v1 拒绝历史 |
| [手机接受确认](client-accept-mobile.png) | 390×844，D2/批准 v2、成果/证据、评论、明确确认动作 |
| [客户 Audit](client-audit-desktop.png) | 退回 D1 与接受 D2，两条真实可导航记录 |
| [Developer Dashboard 桌面](developer-dashboard-desktop.png) | 真实已完成事项与授权统计，无装饰数据 |
| [Developer Dashboard 手机](developer-dashboard-mobile.png) | 390px 重排、真实统计/事项/项目与折叠账号区 |

[accessibility.json](accessibility.json)：axe-core 4.14.0，17 个正式状态，WCAG 2 A/AA、2.1 A/AA 标签，**0 自动 violations**；登录、成员、需求/商业表单、Ready 长文、审批、交付/终态、历史/Audit、Dashboard 与 Drawer。覆盖 1440、900、720、390、320 CSS px；检查整页无横向溢出、窄屏项目导航每个链接聚焦后在视口内。

保留 axe `incomplete` 原始目标与原因：可横向滚动导航的离屏部分、模态层叠背景导致无法自动判断颜色；Base UI inert/焦点守卫要求检查是否可 Tab 到背景。补充验证：这些元素按真实计算样式与祖先背景合成后的文本对比度 **5.94–16.03:1**，均超过对应 4.5:1；手机验收框和 Drawer 双向 Tab 均留在对话框，Escape 返回发起按钮。计算颜色检查不覆盖任意图片/渐变背景，也不等于独立 WCAG 认证；未将 `incomplete` 删除或冒充 axe PASS。

## 真实失败与修复

- **生产问题**：品牌链接可访问名称漏可见副标题；金额辅助说明位于非法 `dl` 层级；审批/验收按钮先禁用导致关闭后焦点丢失；表单引用未挂载错误节点。已分别修复名称、`dt/dd` 结构与独立金额节点、显式发起目标/刷新备用焦点、稳定隐藏错误节点，并通过最终浏览器验证。
- **验证问题**：D 仍引用 G 已替换的 Dashboard 入口，更新为现有真实链接且保留断言；焦点守卫跨越需等待浏览器恢复后断言；焦点回调不能在关闭清理阶段提前判断按钮 disabled（DOM 尚未恢复），改由 Base UI 在更新后恢复已捕获目标。没有删除失败测试、降低业务权限/版本检查或加自动重试。
- **环境限制**：离线安装缺 axe 元数据、Docker/监听/Turbopack 沙箱限制；获准后解决。保留失败缓存 `/tmp/specbridge-r07-h-build-2sg_i38a/next`，无 reset/clean 或开发库回退。固定已存在的 axe-core 为直接测试依赖，未升级其他锁定版本；既有 openapi-typescript/TS6 peer warning 不新增运行失败。

负责人剩余事项：按 H-09 审阅本目录与 diff，独立记录视觉/API集成/安全评审结论；未来明确授权后再提交、推送、运行远程 CI、开 PR/合并。生产与备份恢复按发布清单另行验收。本轮到 H 结束。

建议提交摘要（未执行）：`fix(r07): complete browser integration and accessible workflow verification`。
