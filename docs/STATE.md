# SpecBridge — Current Project State

> 更新时间：2026-11-08；只记录有证据的进度，不把已编写测试当作通过。

## 当前里程碑与任务

M2 — Database Foundation（R01，进行中）。[Issue #3](https://github.com/lithuio/specbridge/issues/3)，分支 `feat/3-db-foundation`。

**状态：2026-11-08 负责人批准两份 SQL；隔离库迁移和 10 项数据库集成测试通过，本地验证完成。尚未提交/推送，远程 CI 与 PR Review 未运行，Issue DoD 未完成。**

## 已有基线

- v0.2 产品/架构文档、AGENTS.md 和 GitHub 模板已在仓库中。
- Health Check & API Proxy 已出现在 Git 历史：`c64eb44 feat(api): add healthcheck and web proxy verification (#2)`。先前“尚未提交”的记录已过期；本轮未重新核验远程 PR Review/CI 结果。
- 保留无 DB/AI 依赖的 `/api/v1/health` 和原 `/`。Web 代理本轮未改；之前的手工代理验证记录及复现方法见 `engineering/DEVELOPMENT.md`。

## R01 已编写内容

- 15 表 Drizzle schema：UUID、外键/复合归属、唯一键、部分唯一 Client/Owner/待验收交付索引及 CHECK。
- `apps/api/drizzle/0000_database_foundation.sql`、`0001_immutable_history.sql` 和迁移元数据；四张历史表与初始范围触发器。已在两个隔离库应用；已审批 SQL 未修改。
- Nest DatabaseModule：延迟连接、事务入口、连接池关闭；不在应用启动时迁移。
- 独立 PostgreSQL 17 测试 Compose、端口 5434、tmpfs、目标校验、10 项集成用例；CI 增加 PostgreSQL job 和路由 E2E。实际 PostgreSQL 17.11 验证通过；本机 Docker 发布端口异常使用临时 host 网络覆盖绕行，详见下文。
- 文档记录约束责任和操作步骤。无新增依赖、无生产操作、未提交或推送。

## 本轮验证证据

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

## 已确认决定与剩余边界

- 商业评估 draft_* 可为 NULL，draft_requirement_revision_id 必填；冻结 Version 必填。
- 使用数据库触发器保护四张历史表和 baseline_scope；数据库管理员权限不在防篡改保证内。
- Requirement expectedVersion 缺少对应字段、Session 空闲失效活动时间设计：负责人确认延至对应功能任务处理。
- 跨表角色分离、Client 绑定锁定、Pending 禁止修订、审批顺序、Approved/Accepted 交付规则仍需后续领域事务与授权测试。本轮不是完整 P0 AC 验收。
- 约束责任见 `architecture/DATA_MODEL.md` 第 9 节；测试范围见 `engineering/TEST_STRATEGY.md`。

## 下一步

1. H-02 SQL 审批与本地数据库验证已完成。
2. 后续进入获授权的提交/PR/CI 流程；远程 CI 和人工 PR Review 通过后再完成 Issue DoD。
3. 本机 Docker 标准端口转发问题可单独排查；本轮不扩大到系统网络修改。禁止清空现有开发库或执行生产迁移。
