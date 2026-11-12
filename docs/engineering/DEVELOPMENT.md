# SpecBridge — Local Development

## R08 Phase C 本地 Copilot

App Shell 顶部「Copilot」打开项目抽屉。项目页面自动选择当前项目和页面资源；其他页面先从授权列表选项目。提问不会发送尚未保存的表单内容；答案给出业务来源、版本与读取时间，仅建议人工核对，不执行 Ready/Submit/审批/验收。对话最多保留10轮，仅当前浏览器内存；刷新/切换项目或账号清空。Drawer 关闭保留已完成对话并取消在途请求，再次打开先重新核验项目。

配置沿用下方 A 的服务端变量，不新增依赖或聊天 Schema。单轮上限为60秒、4工具、3模型请求和8192输出tokens（可通过既有配置降低）。所有列表/详情均经过现有权限服务，Client 草稿过滤不变。来源链接只导航，敏感文本不进入日志。

```bash
pnpm --filter specbridge-api build
pnpm --filter web build
pnpm test:e2e:ai
pnpm test:browser:copilot
```

HTTP/浏览器套件使用隔离5434数据库与模拟外部模型transport，不需要真实Key；CI的既有AI HTTP入口和全量browser入口已包含C。单独浏览器入口输出 [C截图与验证](../ux/evidence/r08-c/README.md)，回归可设置 `R07_EVIDENCE_ROOT=test-results/evidence`。

可选真实 Copilot smoke（先确认安全Key与已初始化的隔离测试库；不在CI运行）：

```bash
node scripts/with-env.mjs .env node scripts/with-env.mjs .env.test node apps/api/scripts/copilot-smoke.mjs --run
```

脚本拒绝非测试数据库身份；仅写入UUID合成账号/项目/需求/Revision夹具，再通过真实授权HTTP→编排→DeepSeek→工具读取→来源Schema完成一轮。最多3次模型请求、4096预留输出tokens、60秒，不自动重试；前后比较业务及审计不变。夹具只留在可丢弃测试库，不生成/应用迁移、不清空历史。只打印状态、模型、计数、预算、耗时与验证布尔值，不打印密钥/聊天/Provider原始错误。`.env`只由子进程加载，不由测试或Web自动读取；CI/无--run/无Key时NOT RUN。真实模型失败记录FAIL，不能用Mock结果代替。

## R08 Phase A 本地 AI

复用根 `.env` 中服务端 `DEEPSEEK_API_KEY`、`DEEPSEEK_BASE_URL=https://api.deepseek.com`、`DEEPSEEK_MODEL=deepseek-flash`。负责人还需设置 `DEEPSEEK_ENABLED=true` 才开启 API 调用；默认关闭，缺少/非法配置不会阻断 P0。不要复制到 NEXT_PUBLIC_*，不要输出 `.env`。可选限额见 `.env.example` 和 R08_PLAN；数值非法仅使 AI 不可用。

```bash
pnpm --filter specbridge-api test
pnpm run test:e2e:ai  # 仅 .env.test / 5434 隔离库 / Mock Provider，无真实Key
pnpm --filter specbridge-api openapi:check
```

受控真实 Smoke：仅使用已安全更换的服务端 Key、合成资料、一次请求；先 build，再从仓库根执行：

```bash
pnpm --filter specbridge-api build
node scripts/with-env.mjs .env node apps/api/scripts/ai-smoke.mjs --run
```

Smoke 直接验证生产 Provider/Schema，最多2048 output tokens/30秒，不查询数据库或启动Web；只输出状态/模型/用量/耗时，不输出Prompt、响应正文或Key。脚本在CI或未显式--run时跳过，不作为CI步骤；已知泄露或未确认安全的Key不得使用。没有Key或未获安全确认记录NOT RUN，网络/模型失败记录FAIL，不自动重试。API完整授权/版本边界由Mock Provider真实HTTP/DB套件验证。

本地计数为单实例内存、UTC日重置、重启清零；不是持久费用账本。AI失败不修改业务，不自动重试。

## R08 Phase B 需求分析与人工采用

在项目内创建并保存 Requirement 后，从详情页原文下方的「AI 需求分析」进入。三角色均依后端权限读取分析；Client 只能采用问题，创建 Revision 仍限供应方。调用只发送已保存的原文、最新 Revision 与可选澄清，不发送当前打开表单的未保存输入。发送前页面提示材料将提供给 DeepSeek。

建议标为「AI 草稿」，默认不选中。摘要可作为新 Revision 正文，选中的验收标准追加到已有标准（精确重复项去重），单次只采用一个问题；假设与风险可编辑或删除，但不自动转为事实。确认采用仅打开预填表单，继续通过 R04 的保存/提交问题按钮及 expectedVersion 写入。不会覆盖 originalText、修改已有 Revision，或自动 Mark Ready/Submit/审批。

来源版本变化需对照最新资料后明确确认；保存 409 保留输入，沿用原有重新核对按钮。未知写入结果禁重放。AI 35 秒浏览器等待上限、503/格式错误/413/429 提供安全提示与手动重试，429 倒计时遵守 Retry-After；服务端超时统一表现为 AI_UNAVAILABLE，不能在前端推断为某种供应商故障。失败不妨碍手动编辑。

建议只在页面内存保存；同账号短暂会话/项目读取失败保留编辑，切页取消在途分析，撤权/换号/退出卸载旧私有状态。刷新、路由缓存淘汰会丢失建议；没有持久 AI 历史，也没有逐句来源证明。

```bash
pnpm run db:test:up
pnpm --filter specbridge-api build
pnpm --filter web build
pnpm run test:browser:ai
# 按受影响范围运行，端口 3000/4000 必须空闲：
R07_EVIDENCE_ROOT=test-results/evidence pnpm run test:browser:requirements
R07_EVIDENCE_ROOT=test-results/evidence pnpm run test:browser:forms
R07_EVIDENCE_ROOT=test-results/evidence pnpm run test:browser:auth
```

AI 浏览器入口运行真实 Next/Nest/5434 隔离数据库；仅通过独立测试启动脚本 `apps/api/scripts/browser-ai-fixture.mjs` 注入模拟 DeepSeek HTTP transport，保留真实 Adapter/JSON/Zod/授权/限流。脚本只接受 NODE_ENV=test 和受限测试数据库，覆盖为合成凭据；生产 main 不加载该脚本。失败路径额外拦截浏览器响应/网络。CI 和 `test:browser:phases` 已包含该入口，不需要真实 Key，也不会加载 `.env`。单独运行默认输出 [B 截图](../ux/evidence/r08-b/README.md)；全量入口通过 R07_EVIDENCE_ROOT 将证据放入忽略目录，避免覆盖已审历史截图。

## 本地环境（2026-11-11）

沿用仓库和 CI：Node **22.23.4**（`.nvmrc`）、pnpm **10.34.9**、PostgreSQL **17-alpine**、根目录 `pnpm-lock.yaml`。当前工作目录为 `/home/lenovo/projects/specbriage`；命令均在仓库根目录执行，不使用 `apps/web` 的独立锁文件安装。

### 首次配置

本次机器已创建 `.env` 和 `.env.test`，权限均为 600，且被 Git 忽略。`.env` 的开发密码为本机随机生成值；不要覆盖已有文件或将内容贴入日志。新机器可执行：

```bash
nvm use
pnpm install --frozen-lockfile
# 仅在文件不存在时复制，然后在编辑器中配置密码：
test -e .env || cp .env.example .env
test -e .env.test || cp .env.test.example .env.test
chmod 600 .env .env.test
```

新机器须将 `.env` 中两处 `replace_me` 改为同一个本地密码；建议使用十六进制随机值，特殊字符需要在 DATABASE_URL 中做 URL 编码。开发库用户/库名均为 `specbridge`。已有卷不会因修改 POSTGRES_PASSWORD 自动更新数据库密码，认证失败时先排查配置，不删卷重建。

`.env` 只存开发数据库和认证配置；`.env.test` 只存公开的一次性测试 URL 与 `NODE_ENV=test`。无需 DeepSeek 或 Observe 密钥即可开发 P0；不要向 Web 环境变量复制数据库凭据。

### 启动开发

```bash
pnpm run db:up       # 等待 PostgreSQL 健康；保留开发持久卷
pnpm run db:migrate  # 应用已审阅的 0000～0003，重复运行不会重复应用
pnpm run dev:api     # 终端 A；显式加载根 .env，监听 4000
pnpm run dev:web     # 终端 B；http://localhost:3000
```

`dev:api` 通过 `scripts/with-env.mjs` 注入环境，现有进程变量优先；API 本身仍不隐式加载文件。直接执行 `pnpm --filter specbridge-api start:dev` 时须自行注入变量和 `PORT=4000`。如终端曾导出其他环境的 DATABASE_URL，应先 `unset DATABASE_URL` 再运行本地命令。仅健康检查不访问数据库，不能据此认定迁移或认证可用。

### Docker 用户组

本机账号已在 `docker` 组，但启动本次会话时组权限尚未生效。重新登录终端后可使用普通命令；当前终端也可执行 `newgrp docker`，或临时：

```bash
sg docker -c 'pnpm run db:up'
sg docker -c 'pnpm run db:test:up'
```

无需修改 socket 权限或重装 Docker。所有 `db:up/down/logs` 与 `db:test:up/down` 都需要 Docker 权限；迁移和测试只需连通本机端口。

### 测试库与常用命令

```bash
pnpm run db:test:up
pnpm run db:migrate:test
pnpm run db:migrate:verify   # 5434 上独立 specbridge_dev_verify 空库验证
pnpm run db:migrate:verify   # 重复执行，验证幂等
pnpm run test               # 单元测试，不需要数据库
pnpm run test:integration   # 根命令只加载 .env.test
pnpm run test:e2e           # 基础 HTTP 回归
# 先停止自己的 dev:api/dev:web，确保 3000/4000 空闲：
pnpm run test:e2e:db        # 顺序执行 auth/rbac/requirements/changes/deliveries/reads
pnpm run db:test:down       # 测试 tmpfs 数据随容器移除而消失
```

直接运行 API 子包命令/CI 时仍需显式导出 TEST_DATABASE_URL；它们不读取 `.env` 或 `.env.test`。根测试命令允许已导出的 TEST_DATABASE_URL 优先，但现有保护仍拒绝非本机、非 5434、非测试账号/库名。测试与开发可同时启动，只有真实 Next 代理 E2E 要求开发 HTTP 端口空闲。不要并行运行多个数据库测试套件。

| 用途 | 地址 | 库名 / 用户 | 存储 |
|---|---|---|---|
| 开发 | `127.0.0.1:5433` | `specbridge` / `specbridge` | `specbridge-dev_pgdata` 持久卷 |
| 测试 | `127.0.0.1:5434` | `specbridge_test` / `specbridge_test` | tmpfs |
| 迁移验证 | `127.0.0.1:5434` | `specbridge_dev_verify` / `specbridge_test` | 同测试实例，独立库 |

数据库客户端的开发密码从本地 `.env` 读取；连接本机容器无需 TLS。测试密码为模板中的公开一次性值。正常停止开发库使用 `pnpm run db:down`，保留卷；不要执行 `down -v`。

### 后续数据库版本变更

1. 在 API persistence 层修改 `apps/api/src/database/schema/index.ts`。
2. 执行 `pnpm run db:generate` 和 `pnpm run db:check`；一起审查新增 SQL、snapshot 和 journal。触发器需要单独审核，生成器不包含它们。
3. 新 SQL 经人工审核后，先 `pnpm run db:migrate:test` 并运行集成测试，再执行 `pnpm run db:migrate`。不要使用 schema push 或修改已应用的历史迁移。
4. 迁移版本记录在目标数据库的 `drizzle.__drizzle_migrations`；SQL 按 journal 顺序应用。无自动 down/回滚命令，修正应新增迁移；已有数据先备份，不能清库解决冲突。

现有版本依次为 `0000_database_foundation`、`0001_immutable_history`、`0002_session_activity`、`0003_requirement_draft_version`。以下 R01/R02 章节保留历史实施细节；当时“开发库未迁移”是历史状态，当前验证结果见 `docs/STATE.md` 顶部。

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

**历史记录：0000/0001 两份迁移已于 2026-11-08 经负责人批准，并在隔离库验证通过。未来新增或修改 SQL 仍须先人工审核；当时开发库/生产库尚未迁移。**

已有依赖足够，不需新增安装。API 运行时从进程环境读取 `DATABASE_URL`，不会主动加载开发 `.env`；启动涉及数据库的业务时由启动环境注入；当前根 `dev:api` 命令负责加载 `.env`。DatabaseModule 延迟创建连接池，现有 `/` 和 `/api/v1/health` 不访问数据库。首次 DB 访问缺少配置会明确失败，禁止使用 pg 隐式默认库。当前连接 URL 不接受 query 参数；生产 TLS/角色部署另行设计。

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

API 环境需显式注入 DATABASE_URL、AUTH_TRUSTED_ORIGINS（开发默认 http://localhost:3000）与 AUTH_TRUSTED_PROXIES（开发默认 loopback；生产默认空）。运行时不自动读取根目录 .env；当前根 `dev:api` 包装命令会显式注入。生产 Origin 必须精确 HTTPS 来源，无尾斜杠/通配符，多个来源用逗号分隔；现有 Next Rewrite 不保证覆盖客户端转发头，因此认证限流固定使用 API Socket 对端 IP，不受 AUTH_TRUSTED_PROXIES 影响，也不从其他头提取 IP。同一代理出口的用户共用注册/登录 IP 配额，可能互相触发 429；当前配置无法为限流可靠识别真实客户端 IP。Cookie/限流细节见 SECURITY.md。

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

## R06 交付开发与验证

无新增 Schema/Migration。使用上述隔离测试实例和显式 TEST_DATABASE_URL；运行 `pnpm --filter specbridge-api test:integration` 和 `pnpm --filter specbridge-api test:e2e:deliveries`，同时保留 auth/rbac/requirements/changes E2E 回归。新增 E2E 同样先编译 API，并临时启动真实 Next Rewrite，3000/4000 被占用时明确失败，不复用或停止用户服务。

API-28 输入 HTTPS artifactUrl、summary、可选 evidenceLinks；API-30 输入 decision、comment（退回必填）。两者均不传 expectedVersion，身份/Version/编号来自 Session 与锁后数据库；复用现有 Origin、X-CSRF-Protection 和 Cookie 契约。API-29 用 limit/offset 遍历历史，每条附 review。没有 Delivery 内容 PATCH/DELETE，也不抓取链接或上传文件。

## R07 读取契约与生成类型

```bash
pnpm --filter specbridge-api openapi:generate
pnpm --filter specbridge-api openapi:check
# 沿用上述隔离库环境变量与启动方式：
pnpm --filter specbridge-api test:e2e:reads
pnpm --filter web exec tsc --noEmit --incremental false
```

生成器只在脚本中运行，先编译 API；输出 `docs/architecture/openapi.json` 和 `apps/web/src/lib/api/generated/schema.d.ts`。check 在系统临时目录重生成后逐字比较，不改工作区产物。不要手改生成文件。Swagger 仅加载 Controller 元数据并以空 provider 导出，不导入 AppModule、启动认证/DB/Observe、读取 .env 或监听端口。

固定开发依赖为 openapi-typescript 7.10.1、Ajv 8.17.1、ajv-formats 3.0.1；生成器声明 TS5 peer，与 API 的 TS6 有安装警告，本地实际生成与类型检查通过。CI 沿用根 pnpm-lock.yaml；未改 Web 子目录 lockfile。

## R07 正式 Web 与浏览器测试（Phase C）

`pnpm run dev:api` / `pnpm run dev:web` 后打开 `http://localhost:3000`，从真实注册/登录进入 `/app`。没有内置演示账号或全局角色；项目/空间流程待 D。现有 Cookie/CSRF 与 `/api/v1` Rewrite 保持。

浏览器环境首次执行 `pnpm --filter web exec playwright install --only-shell chromium`，Linux 缺系统库时在有 sudo 权限的终端运行 `pnpm --filter web exec playwright install-deps chromium`，截图建议安装 Noto CJK。随后 `pnpm run db:test:up` 与 `pnpm run test:browser`；后者构建 API/Web，运行 Next 生产服务器，按 `.env.test` 启动隔离链路。不要与占用 3000/4000 的开发/HTTP 测试并行。

本机 sudo 未完成安装，C 使用临时解包系统库和字体，通过的精确环境前缀见 [C evidence](../ux/evidence/r07-c/README.md)。该目录不保证重启后存在；无需改变应用源码来适配。Web 结构、typed client 与后续 Query 隔离约定见 [apps/web/README](../../apps/web/README.md)。


## R08 D 项目 API Token

负责人已批准的0004 SQL及SHA-256见 [D审核包](R08_D_SQL_REVIEW.md)。本轮仅授权5434隔离specbridge_test实例；开发/生产库应用仍需另行授权。现有自动migrate测试入口只应用人工审核SQL，禁止借测试生成新迁移。

```bash
pnpm db:migrate:test
pnpm test:e2e:tokens
# 浏览器前构建最新API/Web，3000/4000需空闲；不要与compiled-proxy测试并行。
pnpm --filter specbridge-api build
pnpm --filter web build
pnpm test:browser:tokens
```

Owner 从项目导航“访问凭据”创建默认30天、最长90天的固定只读凭据。关窗/隐藏/刷新后不能再读取明文；丢失时撤销并重新创建。未知创建响应先核对列表、撤销可能成功的记录。管理UI使用现有Session，外部客户端通过API origin及Authorization Bearer读取批准规格，不能带Cookie或将Token放入URL。真实使用必须HTTPS；本地隔离验证为loopback HTTP。不要将凭据写入命令历史、日志、截图或浏览器持久存储。

CI纳入SQL集成、Token HTTP与浏览器套件，不需要DeepSeek Key。该阶段不新增依赖/环境变量，不提供MCP或OAuth；不应运行真实DeepSeek Smoke来验证Token功能。

## R08 E 本地 MCP 与 Agent Skill

安装、环境安全传递、Codex配置、Skill安装、两个工具契约及错误处理见 [apps/mcp/README](../../apps/mcp/README.md)。只使用本地stdio，不提供HTTP MCP/OAuth；MCP进程不连接数据库、不需要DeepSeek配置。

`pnpm test:mcp` 包括Mock和真实SDK stdio客户端；`pnpm test:e2e:mcp` 在上述5434隔离库启动真实Nest API，以内存合成Token连接编译后的MCP子进程，复用已批准迁移。普通套件跳过真实Host模型测试。可选Codex Host/Skill Smoke只在显式 `R08_MCP_HOST_SMOKE=1` 且非CI时运行，命令和限制见MCP README；使用合成资料，不读取真实项目或.env。

根递归build/lint/test已自动包含MCP包，CI增加MCP typecheck与数据库集成步骤，不依赖真实API Key。测试证据见 [R08 E](evidence/r08-e/README.md)；本阶段不替代F的完整回归。
