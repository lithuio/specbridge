# SpecBridge — Current Project State

> 更新时间：2026-11-08；只记录实际运行证据。历史记录见后半部分。

## 当前任务

R02 — Authentication & Session，[Issue #5](https://github.com/lithuio/specbridge/issues/5)。R01 已有合并提交 `43343d3`，Issue #3 已关闭；之前“R01 尚未提交”是过期状态。本轮未重新核验远程 CI/Review。

**状态：R02 P1 转发头限流绕过已完成最小修复与本地验证。修复前 6 项回归真实失败；修复后全部 64 项测试及质量检查通过。当前分支 feat/5-auth-session，改动保留供审核，本轮未 Commit/Push/Merge。**

## R02 已实现内容

- 注册/登录/登出/me、Argon2id、SHA-256 摘要 Session、事务轮换、7 天绝对与 24 小时空闲期限。
- 默认认证 Guard、Public 路由、Origin/自定义头/Fetch Metadata CSRF、环境 Cookie、有界单实例限流、共享启动配置、统一错误和敏感日志保护。
- /me 仅用户；重复注册通用 409；单实例内存限流均已由负责人确认。Workspace/Project RBAC、邮箱验证和密码重置不在范围内。
- 新增 `0002_session_activity.sql`：last_activity_at 回填 created_at，再设默认值与 NOT NULL。R01 两份 SQL/snapshot 未改；DatabaseModule 与 Web Rewrite 未改。
- 真实 PostgreSQL 集成、R01→R02 升级、真实 HTTP 和编译 API + Next Rewrite E2E 已执行通过；CI PostgreSQL job 已配置认证测试，远程结果尚未验证。

## R02 P1 修复检查点

- 基线 HEAD：`44d371c`，开始时工作区干净。当前 Next base-server 使用 `x-forwarded-for ??=` 保留已有头；两个认证限流入口优先使用 req.ip，loopback 代理信任使攻击者可改变桶身份。
- RED 已执行：`TEST_DATABASE_URL=<隔离测试库> pnpm --filter specbridge-api test:e2e:auth`，仅新增测试、尚未改生产代码时 6 FAIL / 10 PASS。Next 与 API 直连三种限流均可绕过（期望 429，注册实际 201、登录实际 401）。原始测试输出：`/tmp/specbridge-r02-xff-red.log`。
- 修复：只将 configure-app 与 AuthController 两处限流 IP 改为 socket.remoteAddress；保留现有 trust proxy、限流阈值、Cookie/CSRF/Guard。同一 Next 出口的用户共享 IP 配额；真实客户端 IP 不用于限流。
- GREEN 已执行：相同 `test:e2e:auth` 命令，16/16 PASS，包含全部 6 项新增回归及原有 10 项。输出保存在 `/tmp/specbridge-r02-xff-green.log`；修复前后测试未修改。

| 状态 | 本轮命令 / 范围 | 实际结果 |
|---|---|---|
| FAIL（修复前，预期复现） | `TEST_DATABASE_URL=<隔离测试库> pnpm --filter specbridge-api test:e2e:auth` | 6 项新增回归失败、原有 10 项通过；生产代码未修改时执行 |
| PASS（修复后） | 同一 `test:e2e:auth` 命令 | 16/16，含 Next Rewrite + trust loopback、直连、Cookie/CSRF/login/logout |
| PASS | `pnpm --filter specbridge-api test` | 27/27 单元测试 |
| PASS | `TEST_DATABASE_URL=<隔离测试库> pnpm --filter specbridge-api test:integration` | 16/16，含认证与 R01 数据库回归 |
| PASS | `pnpm --filter specbridge-api test:e2e` | 5/5 基础真实 HTTP 测试 |
| PASS | `pnpm --filter specbridge-api typecheck` | 类型检查 |
| PASS | `pnpm run lint` | API + Web，无警告 |
| PASS | `pnpm run build` | API + Web 完整构建（沙箱外运行，未再发生缓存失败） |
| PASS | `pnpm --filter specbridge-api db:check` | 迁移元数据检查；SQL/snapshot/schema 本轮无 diff，0000/0001/0002 哈希不变 |
| PASS | `git diff --check` | diff 空白检查，生成的 tracked tsbuildinfo 恢复 |
| NOT RUN | 远程 CI、安全渗透测试、生产验证 | 本轮未提交、推送或部署，不宣称远程验证通过 |

- 检查覆盖：注册第 6 次、同邮箱登录第 6 次、变化邮箱登录第 31 次在伪造不同转发头时均被限流，返回 429/RATE_LIMITED/Retry-After；阈值以内请求照常处理。数据库只使用 5434 专用临时实例及既有已批准迁移；开发库/生产环境未访问。
- 已知限制：同一代理 Socket 出口用户共用注册 5 次/小时、登录 30 次/15 分钟配额，存在相互限流/耗尽配额风险；IP+邮箱维度仍按邮箱分开。没有从未经验证的头恢复真实用户 IP。保留全局 trust proxy 的元信息语义，但认证安全判断不依赖它；将来增加依赖该元信息的安全功能需另行验证入口。
- PASS：已关闭并移除本轮 specbridge-test 临时容器，核对 specbridge-dev-db-1 仍 healthy（5433）。修复代码已完成，无待修复测试失败。下一步为负责人审阅本轮 diff；本轮未 Commit/Push/Merge。
- 建议修复提交：`fix(auth): key rate limits by socket peer to block spoofed forwarding headers`。

## R02 基础实现验证证据（P1 修复前）

| 状态 | 命令 / 范围 | 结果 |
|---|---|---|
| PASS | `pnpm --filter specbridge-api test` | 最终 5 文件、27 项单元测试，含真实 Argon2id 和错误脱敏 |
| PASS | `pnpm --filter specbridge-api test:e2e` | 3 文件、5 项真实 HTTP 测试；原 health/root + 默认保护/CSRF/DB 故障拒绝；无数据库连接 |
| PASS | `pnpm --filter specbridge-api typecheck` | 生产代码、测试和配置类型检查 |
| PASS | `pnpm run lint` | API/Web，无警告 |
| PASS | `pnpm run build` | API/Web 完整构建；沙箱/失败缓存问题处理后在沙箱外通过 |
| PASS | `pnpm --filter specbridge-api db:check` | 迁移元数据有效；不表示 SQL 已在数据库执行 |
| PASS | `git diff --check`、原 SQL SHA-256 | 空白检查；0000/0001 与审批记录一致 |
| PASS | `TEST_DATABASE_URL=<隔离测试库> pnpm --filter specbridge-api db:migrate:test` | 已批准的三份 SQL 在隔离 5434 实例应用成功；沙箱连接失败后获准在沙箱外运行 |
| PASS | `TEST_DATABASE_URL=<隔离测试库> pnpm --filter specbridge-api test:integration` | 3 文件、16 项通过，含全部 R01 回归与 R02 升级/Session 验证 |
| PASS | `TEST_DATABASE_URL=<隔离测试库> pnpm --filter specbridge-api test:e2e:auth` | 2 文件、10 项通过；真实 HTTP + 编译 API/Next Rewrite，Cookie/CSRF/logout 往返 |
| PASS | `TEST_DATABASE_URL=<隔离验证库> pnpm --filter specbridge-api db:migrate:verify` | 空库应用及重复迁移通过；中断后重新运行确认成功 |
| PASS | 隔离库只读核对 | PostgreSQL 17.11、specbridge_test 专用角色/库、3 条迁移；last_activity_at NOT NULL DEFAULT now() |
| NOT RUN | 真实浏览器/生产 HTTPS、外部 Observe 接收 | HTTP 响应与配置测试不能代替这些验收 |
| NOT RUN | 远程 CI / PR Review | 尚未提交、推送或创建 PR |

已处理失败：初次 typecheck 发现 Drizzle 不接受 expression index 作为 onConflict target，改为只捕获指定邮箱 unique constraint；修复测试类型后通过。HTTP E2E 在沙箱内因 listen EPERM 失败，获准在沙箱外重跑通过。完整构建首次因 Turbopack 本地端口权限失败，沙箱外复用了失败缓存；旧缓存已保存在 `/tmp/specbridge-r02-build-cache-thxifq8w/next`，新缓存构建通过。跨文件系统首次 rename 缓存失败，随后 move 成功。构建生成的已跟踪 tsbuildinfo 恢复，避免夹带缓存。

## 人工审核与下一步

- H-03：审核 `apps/api/drizzle/0002_session_activity.sql`，SHA-256 `236ecd64b2a7d1ea437ba48a09077107e8cb789a3cced16f5a7dd080a9839ee3`。负责人明确回复“已审核通过，可以继续进行”；SQL 哈希复核一致，H-03 审核阻塞已解除。
- 已完成全部本地验证，无待修复的测试失败。所有数据库命令仅操作 5434 的 specbridge_test / specbridge_dev_verify；开发库和生产库未访问。
- 本轮沿用已记录的隔离 host 网络覆盖 `/tmp/specbridge-r01-test-host.yml`，仅绑定 127.0.0.1:5434；未重新宣称标准 Docker 端口映射故障已修复。测试容器清理结果见下文。
- 下一步为获授权的提交/PR/远程 CI 与人工安全 Review；本轮未提交、推送、合并、生产迁移或部署。建议提交/PR 标题：`feat(auth): add database-backed authentication and session security (#5)`。
- 已知范围限制：限流为单实例内存、重启清零；/me 仅用户；注册 409 存在已接受的有限邮箱枚举风险；真实浏览器/生产 HTTPS/外部 Observe 接收仍待后续验收。
- PASS：`docker compose -f infra/compose.test.yml -f /tmp/specbridge-r01-test-host.yml down` 已关闭并移除本次测试容器；随后核对开发容器 specbridge-dev-db-1 仍 healthy，端口 5433。认证 E2E 已在 teardown 关闭其 API/Next 子进程。

## R01 历史验证记录（当时的执行快照）

以下保留 R01 实施时的证据与限制；其中“未提交/远程未运行/下一步”描述当时状态，当前合并状态以上方为准。

### 已有基线

- v0.2 产品/架构文档、AGENTS.md 和 GitHub 模板已在仓库中。
- Health Check & API Proxy 已出现在 Git 历史：`c64eb44 feat(api): add healthcheck and web proxy verification (#2)`。先前“尚未提交”的记录已过期；本轮未重新核验远程 PR Review/CI 结果。
- 保留无 DB/AI 依赖的 `/api/v1/health` 和原 `/`。Web 代理本轮未改；之前的手工代理验证记录及复现方法见 `engineering/DEVELOPMENT.md`。

### R01 已编写内容

- 15 表 Drizzle schema：UUID、外键/复合归属、唯一键、部分唯一 Client/Owner/待验收交付索引及 CHECK。
- `apps/api/drizzle/0000_database_foundation.sql`、`0001_immutable_history.sql` 和迁移元数据；四张历史表与初始范围触发器。已在两个隔离库应用；已审批 SQL 未修改。
- Nest DatabaseModule：延迟连接、事务入口、连接池关闭；不在应用启动时迁移。
- 独立 PostgreSQL 17 测试 Compose、端口 5434、tmpfs、目标校验、10 项集成用例；CI 增加 PostgreSQL job 和路由 E2E。实际 PostgreSQL 17.11 验证通过；本机 Docker 发布端口异常使用临时 host 网络覆盖绕行，详见下文。
- 文档记录约束责任和操作步骤。无新增依赖、无生产操作、未提交或推送。

### 本轮验证证据

| 状态 | 命令 / 范围 | 结果 |
|---|---|---|
| PASS | `pnpm --filter specbridge-api db:generate` | 初始 15 表迁移生成；再次生成报告无 schema 变化 |
| PASS | `pnpm --filter specbridge-api db:check` | 迁移元数据有效；不等于 SQL 已被 PostgreSQL 验证 |
| PASS | `pnpm run test`；后续 `pnpm --filter specbridge-api test` | 最终 3 文件、15 单元测试通过 |
| PASS | `pnpm --filter specbridge-api typecheck` | schema、配置、测试类型检查 |
| PASS | `pnpm --filter specbridge-api test:e2e` | 原有 2 项路由测试通过；沙箱 EPERM 后获准在沙箱外运行 |
| PASS | `pnpm run lint` | API + Web；已修复排序比较器警告 |
| PASS | `pnpm run build` | API + Web；沙箱失败及失败缓存问题处理后，在沙箱外成功 |
| PASS | `docker compose -f infra/compose.test.yml config --quiet` | 测试 Compose 配置语法；容器健康，标准端口映射的主机握手超时（见下文） |
| PASS | `node --check apps/api/scripts/migrate.mjs`、`git diff --check` | 脚本语法和 diff 空白检查 |
| PASS | `TEST_DATABASE_URL=<隔离测试库> pnpm --filter specbridge-api db:migrate:test` | 2026-11-08，已审查的两份 SQL 应用成功 |
| PASS | `TEST_DATABASE_URL=<隔离测试库> pnpm --filter specbridge-api test:integration` | 2026-11-08，1 文件、10 项通过，包括重复迁移保留数据、并发、触发器和事务回滚 |
| PASS | `TEST_DATABASE_URL=<隔离验证库> pnpm --filter specbridge-api db:migrate:verify`（执行两次） | 空库建立与重复运行通过；psql 核对 PostgreSQL 17.11、15 核心表、2 条迁移记录 |
| NOT RUN | 现有开发库/生产库迁移 | 本轮仅使用隔离实例，没有连接或修改现有开发库 |
| NOT RUN | 远程 CI / PR Review | 本轮未提交、推送或创建 PR |

首轮单元测试曾因测试构造 URL 时误替换用户名失败，已修正并重跑通过。Web 首次构建因沙箱端口限制失败，沙箱外重跑仍复用失败缓存；旧 `.next` 保留在 `/tmp/specbridge-r01-build-cache-0ee9_m9b/next`，新缓存构建通过。构建生成的已跟踪 tsbuildinfo 已恢复，避免夹带无关缓存修改。

2026-11-08：重新运行 `pnpm run test`、`typecheck`、`db:check`、`pnpm run lint`、`git diff --check` 通过。生产代码未改变，因此沿用上一轮 E2E/完整构建通过证据，未无意义重复构建。

### 本机数据库网络故障与实际验证环境

- FAIL（已定位）：标准 `db:test:up` 容器健康，但宿主 `127.0.0.1:5434` PostgreSQL 握手超时；容器内及容器 IP `172.19.0.2:5432` 可响应。首次迁移失败、集成套件初始化失败且 10 项未执行，不能把该次视为通过。
- 隔离实例采用 `/tmp/specbridge-r01-test-host.yml` 临时覆盖：移除 published ports、`network_mode: host`，PostgreSQL 仅监听 `127.0.0.1:5434`。未修改仓库标准 Compose、开发实例或系统防火墙。相同已审核 SQL 与相同测试随后全部通过。
- PASS：验证后执行 `pnpm run db:test:down`，已移除本次测试容器和测试网络；开发持久卷未操作。
- 精确覆盖配置和启动命令见 `engineering/DEVELOPMENT.md`。标准 Docker 端口转发在此机器上的问题仍存在，远程 CI service 网络尚未验证。
- 审批 SQL SHA-256：`0000` = `6d889c530d70c1544aa5755164a49683f2e54a7e9cd5f346da9f3b2a9c96f996`；`0001` = `8d225e656539733de64267a58b14b68b82c9c6198f167ac58a25d7bbc758f98f`。本轮未改 SQL。

### 已确认决定与剩余边界

- 商业评估 draft_* 可为 NULL，draft_requirement_revision_id 必填；冻结 Version 必填。
- 使用数据库触发器保护四张历史表和 baseline_scope；数据库管理员权限不在防篡改保证内。
- Requirement expectedVersion 缺少对应字段、Session 空闲失效活动时间设计：负责人确认延至对应功能任务处理。
- 跨表角色分离、Client 绑定锁定、Pending 禁止修订、审批顺序、Approved/Accepted 交付规则仍需后续领域事务与授权测试。本轮不是完整 P0 AC 验收。
- 约束责任见 `architecture/DATA_MODEL.md` 第 9 节；测试范围见 `engineering/TEST_STRATEGY.md`。

### 下一步

1. H-02 SQL 审批与本地数据库验证已完成。
2. 后续进入获授权的提交/PR/CI 流程；远程 CI 和人工 PR Review 通过后再完成 Issue DoD。
3. 本机 Docker 标准端口转发问题可单独排查；本轮不扩大到系统网络修改。禁止清空现有开发库或执行生产迁移。
