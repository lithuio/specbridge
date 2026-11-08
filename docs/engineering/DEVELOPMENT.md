# SpecBridge — Local Development

## 已有环境（由项目负责人验证）
- Ubuntu 22.04 on WSL2，工作目录 `/home/lumi/projects/specbriage`
- 本机原生 Docker Engine；PostgreSQL 17 Docker Compose 容器
- pnpm Monorepo：`apps/web`, `apps/api`; MCP 未来作为独立应用（P1）
- DeepSeek API 密钥仅保存在本地 `.env`，不提交。

## 启动（在项目根目录）
```bash
cd /home/lumi/projects/specbriage
nvm use
pnpm install --frozen-lockfile
pnpm run db:up
pnpm run dev:api    # 终端 B；默认 http://localhost:4000
pnpm run dev:web    # 终端 C；默认 http://localhost:3000
```
以上脚本已按仓库 `package.json` 核对。仅验证健康检查时无需 `pnpm run db:up`，也无需数据库或 AI 凭据。

## 常见检查
```bash
git status --short
pnpm run lint
pnpm run build
pnpm run test
pnpm --filter specbridge-api test:e2e
pnpm run db:logs
```
`pnpm run test` 只运行 API 单元测试；API E2E 与 PostgreSQL 集成测试有独立命令，Web 尚无自动测试脚本。R01 的 CI 配置新增 API E2E 和独立 PostgreSQL job，但远程执行结果须另行确认；路由 E2E 不等于 Web 代理链路已验证。

## 服务接口
- 前端：`http://localhost:3000`
- 后端：`http://localhost:4000`
- PostgreSQL：`127.0.0.1:5433`（容器内 `db:5432`）
- API 前缀约定：`/api/v1`；目前健康检查使用显式路径，尚未设置 NestJS 全局前缀。

## 健康检查与 Web 代理

启动 API 和 Web 后，在第三个终端执行：

```bash
curl --noproxy '*' --max-time 10 -i http://localhost:4000/api/v1/health
curl --noproxy '*' --max-time 10 -i http://localhost:3000/api/v1/health
```

两者应返回 HTTP 200、`application/json` 和相同的 `{"data":{"status":"ok"}}`。
这是无需认证的进程存活检查，不代表数据库、AI 或业务流程就绪；响应不包含环境变量、版本或主机信息。

Next.js 将 `/api/v1/:path*` 代理到固定开发地址 `http://127.0.0.1:4000/api/v1/:path*`，普通 Rewrite 在已有文件路由之后匹配，不影响 Web 首页。修改 API 端口或部署到独立容器时，需要调整代理目标并重新启动/构建 Web。

回归检查：Web `/` 应返回 200，API `/` 仍返回 `Hello World!`。停止本次启动的 API 后，代理健康检查应失败而非返回健康成功（当前开发环境返回 HTTP 500）；完成后停止本次启动的 Web。自动 E2E 验证真实 Nest 路由，以上双服务检查验证实际 Rewrite，二者不能相互替代。

## 秘钥与迁移
- `.env` 和私密配置不得提交，仓库仅保留 `.env.example`。
- Drizzle SQL Migration 必须先人工审查，再对本地 DB 执行。
- 不执行 `docker compose down -v`、数据库清空或任何生产部署，除非明确批准。

## R01 数据库基础

**0000/0001 两份迁移已于 2026-11-08 经负责人批准，并在隔离库验证通过。未来新增或修改 SQL 仍须先人工审核；现有开发库/生产库尚未迁移。**

已有依赖足够，不需新增安装。API 运行时从进程环境读取 `DATABASE_URL`，不会主动加载开发 `.env`；启动涉及数据库的业务时由启动环境注入。DatabaseModule 延迟创建连接池，现有 `/` 和 `/api/v1/health` 不访问数据库。首次 DB 访问缺少配置会明确失败，禁止使用 pg 隐式默认库。当前连接 URL 不接受 query 参数；生产 TLS/角色部署另行设计。

离线生成与检查（项目根目录）：

```bash
pnpm run db:generate
pnpm run db:check
pnpm --filter specbridge-api typecheck
```

审查 `apps/api/drizzle/0000_database_foundation.sql` 和 `0001_immutable_history.sql`：核对 15 表、可空草稿、复合外键、部分唯一索引、CHECK、四张历史表与初始范围触发器，确认不含删除既有数据的操作。Schema/snapshot 不包含触发器，不可只检查生成器输出。应用后不得修改旧迁移；修正需新增迁移。

开发迁移使用 `pnpm run db:migrate`：优先读取进程 `DATABASE_URL`，缺失时才显式加载根目录 `.env`。只对已确认的本地目标运行；现有表冲突应停止调查，禁止清库重试。脚本不自动迁移生产、不输出 URL/SQL 参数。数据库用户须具备建表/建函数权限；运行时最小权限角色在生产任务另行配置。

### 隔离测试与空库开发迁移验证

测试实例与开发实例的 Compose 项目、端口、用户及存储完全分开：

| 用途 | 本地端口 | 数据库 | 存储 |
|---|---|---|---|
| 开发 | 5433 | specbridge | 现有持久卷，不由测试修改 |
| 集成测试 | 5434 | specbridge_test | 测试容器 tmpfs |
| 开发迁移空库验证 | 5434 | specbridge_dev_verify | 同一测试容器 tmpfs，独立库 |

审核后可执行：

```bash
pnpm run db:test:up
# 仅为公开、一次性测试凭据；测试不加载开发 .env。
export TEST_DATABASE_URL='postgresql://specbridge_test:local_test_only@127.0.0.1:5434/specbridge_test'
pnpm --filter specbridge-api db:migrate:test
pnpm run test:integration

# 验证开发配置所需的 schema 能从空库建立；不连接现有开发实例。
TEST_DATABASE_URL='postgresql://specbridge_test:local_test_only@127.0.0.1:5434/specbridge_dev_verify' pnpm --filter specbridge-api db:migrate:verify
TEST_DATABASE_URL='postgresql://specbridge_test:local_test_only@127.0.0.1:5434/specbridge_dev_verify' pnpm --filter specbridge-api db:migrate:verify

# 仅移除此次隔离测试实例，tmpfs 测试数据随容器消失；不删除开发卷。
pnpm run db:test:down
```

每次测试启动前核对 URL 的本地地址、5434 端口、专用账号和库名，再核对 `current_database()`/`current_user`；未设置或指向开发库直接失败，不跳过。CI 同样使用 5434 的独立 PostgreSQL 17 service 和测试凭据。

普通用例通过事务回滚隔离；并发用例使用两条独立连接和 UUID 数据，提交数据保留至测试容器销毁，不通过 DELETE/TRUNCATE 绕过不可变触发器。数据库错误与预期 SQLSTATE 不匹配时保留失败，不能声称集成测试通过。

### 本机 Docker 发布端口超时的临时验证方式（2026-11-08）

本轮出现容器健康、容器 IP 可达，但宿主 `127.0.0.1:5434` 握手超时的现象。没有修改系统防火墙或仓库 Compose。实际通过的验证使用以下 Linux/WSL 临时覆盖文件 `/tmp/specbridge-r01-test-host.yml`：

```yaml
services:
  db:
    ports: !reset []
    network_mode: host
    command: ["postgres", "-p", "5434", "-c", "listen_addresses=127.0.0.1"]
    environment:
      PGPORT: "5434"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -h 127.0.0.1 -p 5434 -U specbridge_test -d specbridge_test"]
```

```bash
docker compose -f infra/compose.test.yml -f /tmp/specbridge-r01-test-host.yml up -d --wait
# 然后执行上面的 db:migrate:test、test:integration 和 db:migrate:verify 命令。
pnpm run db:test:down
```

仅对可丢弃的测试实例使用：切换网络会重建容器并丢弃 tmpfs 测试数据。PostgreSQL 仍只绑定回环地址，不对外开放。本轮通过证据来自此临时配置；标准端口转发在当前机器仍有故障，不能将绕行成功表述为该故障已修复。CI 保留标准 PostgreSQL service，结果待远程执行。

## R02 认证开发与验证

API 环境需显式注入 DATABASE_URL、AUTH_TRUSTED_ORIGINS（开发默认 http://localhost:3000）与 AUTH_TRUSTED_PROXIES（开发默认 loopback；生产默认空）。运行时不自动读取根目录 .env。生产 Origin 必须精确 HTTPS 来源，无尾斜杠/通配符，多个来源用逗号分隔；代理必须覆盖客户端提供的转发头。Cookie/限流细节见 SECURITY.md。

新增 0002_session_activity.sql 必须经人工审核，再执行数据库命令；审批和验证状态见 STATE.md。不要修改或重新生成覆盖 R01 的两份 SQL。

```bash
# 仅使用一次性公开测试凭据；先按上文启动隔离测试实例。
export TEST_DATABASE_URL='postgresql://specbridge_test:local_test_only@127.0.0.1:5434/specbridge_test'
pnpm --filter specbridge-api test:integration
pnpm --filter specbridge-api test:e2e:auth
```

认证 E2E 自动编译 API、启动真实 HTTP listener；代理 smoke 还会临时启动编译产物和 Next dev，要求 3000/4000 空闲。测试结束关闭自己的子进程，不复用或停止用户服务。仅手动发送 Cookie，不替代浏览器验收。该测试可能更新本地 Next 缓存，不修改 Rewrite。

前端 JSON 写请求使用 `Content-Type: application/json`、`X-CSRF-Protection: 1`；浏览器自动附带 Origin，必须匹配配置。curl/测试客户端需显式提供 Origin。Cookie 交给浏览器 HttpOnly 存储，不写入 localStorage；注册成功不自动登录。

Argon2 使用依赖自带原生预编译二进制；本地和 CI 必须运行真实 hash/verify 测试。若目标平台无法加载，修复该平台的依赖安装，禁止降级到弱密码哈希。认证日志不包含请求体/凭据，Observe 未配置 key pair 时不发送。
