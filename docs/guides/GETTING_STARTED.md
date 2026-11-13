# 本地运行指南

[项目首页](../../README.md) · [文档中心](../README.md) · [产品使用指南](USER_GUIDE.md)

本页用于首次安装与日常开发。所有命令在仓库根目录的 Bash 终端执行，以根 `package.json`、`.nvmrc` 和 `.env.example` 为配置依据。本机已执行的迁移及验收记录见 [STATE](../STATE.md)，不代表新机器已完成同样配置。

## 准备环境

| 依赖             | 要求 / 检查                                                         |
| ---------------- | ------------------------------------------------------------------- |
| Node.js          | `.nvmrc` 指定 22.23.4；`node --version`                             |
| pnpm             | `packageManager` 指定 10.34.9；`pnpm --version`                     |
| Docker / Compose | `docker --version`、`docker compose version`，当前用户能访问 Docker |
| 完整文件解析     | Linux / WSL、`/usr/bin/prlimit`、可读 `/proc`                       |
| 本地 Codex 连接  | Linux / WSL、已安装 Codex CLI、本仓库 MCP 构建产物                  |

使用 nvm 时先执行 `nvm install` 和 `nvm use`；其他 Node 管理器使用相同版本。安装依赖只使用根锁文件：

```bash
pnpm install --frozen-lockfile
```

不需要重新运行 Next / Nest 脚手架，也不需要进入 `apps/web` 单独安装。

## 配置本地环境

```bash
test -e .env || cp .env.example .env
test -e .env.test || cp .env.test.example .env.test
chmod 600 .env .env.test
```

在编辑器中配置 `.env`，不要把其内容复制到 Issue、聊天或日志。

| 配置                   | 说明                                                                       |
| ---------------------- | -------------------------------------------------------------------------- |
| `POSTGRES_PASSWORD`    | 为本地开发库设置密码，替换模板占位值                                       |
| `DATABASE_URL`         | 同步替换 URL 中的密码；默认 `127.0.0.1:5433/specbridge`、用户 `specbridge` |
| `AUTH_TRUSTED_ORIGINS` | 本地保留 `http://localhost:3000`；浏览器访问地址需与其一致                 |
| `AUTH_TRUSTED_PROXIES` | 本地模板为 `loopback`，其他部署拓扑需单独配置                              |
| `DEEPSEEK_ENABLED`     | 默认 `false`；手动需求、审批、交付均可使用                                 |

建议密码使用随机十六进制字符串；特殊字符需要在数据库 URL 中编码。已有持久卷的数据库密码不会随 `.env` 自动变更，认证失败时先核对配置，不能靠删卷修复。

`.env.test` 使用模板中的公开一次性测试凭据，目标仅为 5434 上的隔离测试库。数据库和模型密钥只供 API 使用，不写入 `NEXT_PUBLIC_*`。

## 首次初始化与日常启动

开发数据库使用持久卷。新机器应先审阅仓库中将应用的 SQL，核对目标库；已有数据先备份。新增迁移需按 [数据库变更流程](../engineering/DEVELOPMENT.md#后续数据库版本变更) 审核，不能直接用 schema push 替代迁移。

```bash
# 清除可能覆盖根 .env 的旧进程配置
unset DATABASE_URL NODE_ENV
pnpm db:up

# 首次初始化或存在已审核、适用于此目标的新迁移时执行
pnpm db:migrate
```

随后分别运行：

```bash
# 终端 A
unset DATABASE_URL NODE_ENV
pnpm dev:api
```

```bash
# 终端 B
pnpm dev:web
```

访问 **http://localhost:3000**，注册后再登录。仓库不预置账号，也不自动填充演示项目。建议按 [使用指南](USER_GUIDE.md) 准备三个账号。

`dev:api` 显式加载根 `.env`，已有终端环境变量优先；API 自身不隐式加载该文件。更新配置后重启最外层 `pnpm dev:api` 进程。日常启动不必重复安装、构建或迁移；开发命令使用热更新。需要本地 MCP 安装器时另执行 `pnpm --filter specbridge-mcp build`。

### 确认服务可访问

```bash
curl --noproxy '*' --max-time 10 -fsS http://localhost:4000/api/v1/health
curl --noproxy '*' --max-time 10 -fsS http://localhost:3000/api/v1/health
```

两者分别验证 API 与 Web 同源代理，健康检查不访问数据库。还需通过真实注册 / 登录确认数据库链路，不能将健康响应当成迁移或完整业务验收。

## 数据保存与停止服务

| 内容                                              | 保存位置与生命周期                                                                                     |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 开发账号、项目、正式记录、已保存个人工作稿 / 提案 | PostgreSQL 持久卷 `specbridge-dev_pgdata`                                                              |
| 背景文件原件                                      | API 用户的 `~/.local/share/specbridge/documents`；可用服务端 `DOCUMENT_STORAGE_DIR` 指向仓库外私有目录 |
| Copilot 对话、尚未保存的编辑                      | 当前浏览器内存，刷新或切换上下文不保证保留                                                             |
| 自动化测试数据                                    | 5434 隔离数据库的 tmpfs，测试容器移除后丢失                                                            |

API / Web 终端按 `Ctrl+C`；数据库按需运行 `pnpm db:down`，保留开发卷。不要使用 `down -v` 清理开发环境。备份应同时包含数据库与背景原件目录；发布前恢复演练见 [发布检查表](../release/RELEASE_CHECKLIST.md)。

## 可选：启用 AI

在服务端 `.env` 中设置 `DEEPSEEK_ENABLED=true` 并填写自己的 `DEEPSEEK_API_KEY`。`DEEPSEEK_BASE_URL`、`DEEPSEEK_MODEL`、超时和预算字段以 [.env.example](../../.env.example) 为准，保留适用于账户的配置后重启 API。

若当前终端此前导出过禁用值，可显式运行：

```bash
DEEPSEEK_ENABLED=true pnpm dev:api
```

真实生成会调用模型服务并产生相应费用；页面使用前应核对发送材料与来源。缺少密钥、超时或限流时，可继续手动编辑、保存个人稿和走审批流程。普通测试无需启用真实 AI。

外部 MCP 使用宿主自身的模型；连接安装本身不调用 DeepSeek。Owner 从项目「访问凭据」进入本地连接向导，按实际目标目录生成命令、核对并授权。详见 [MCP README](../../apps/mcp/README.md) 与 [安装 / 恢复手册](../engineering/AI_WORKFLOW_D_MANUAL.md)。

## 运行检查与测试

### 不依赖测试数据库的检查

```bash
pnpm lint
pnpm test
pnpm build
pnpm --filter specbridge-api typecheck
pnpm --filter web typecheck
pnpm --filter specbridge-mcp typecheck
pnpm --filter specbridge-api openapi:check
pnpm db:check
pnpm test:smoke-guards
pnpm test:e2e
```

`pnpm test` 运行 API / MCP 测试，Web 使用单独的 Playwright 入口；`test:e2e` 是基础 HTTP 回归，不代表完整数据库业务测试。构建会写入构建目录，请避免与使用同一产物的服务并行。

### 隔离数据库与浏览器回归

先准备 `.env.test`，确保普通 `test:*` 没有继承其他用途的 `TEST_DATABASE_URL`。数据库测试使用已审 SQL，测试保护拒绝开发库目标。

```bash
pnpm db:test:up
pnpm db:migrate:test
pnpm test:integration

# 先在原终端停止自己的 API / Web，让 3000 和 4000 空闲
pnpm test:e2e:db

# 首次安装浏览器；Linux 缺系统库时在有权限的终端安装依赖
pnpm --filter web exec playwright install --only-shell chromium
# 按需：pnpm --filter web exec playwright install-deps chromium
pnpm test:browser

# 仅在不需要保留本次测试数据时停止并移除测试容器
pnpm db:test:down
```

各数据库 / HTTP / 浏览器套件顺序执行；不要与手动演示栈抢占端口，也不要同时运行多个构建。普通 AI 用例使用 Mock，付费模型和真实宿主验证是独立入口，详见 [工程记录](../engineering/README.md)。

## 常见问题

| 现象                          | 排查方法                                                                                          |
| ----------------------------- | ------------------------------------------------------------------------------------------------- |
| API 启动失败或注册 / 登录失败 | 核对开发库健康、迁移、URL 密码及终端遗留变量；健康接口成功不代表 DB 可用                          |
| JSON 写请求被拒绝             | 用 `http://localhost:3000` 访问，核对 `AUTH_TRUSTED_ORIGINS`；不要混用 `localhost` 与 `127.0.0.1` |
| Docker 权限不足               | 确认 Docker 正在运行和用户组权限；重新登录使组权限生效，不开放 socket 权限                        |
| 3000 / 4000 被占用            | 回到已有服务终端停止该进程；自动测试会自行启动服务，不复用开发进程                                |
| AI 不可用 / 503               | 检查服务端启用项、凭据、模型与网络，重启 API；仍可使用手动流程                                    |
| 背景资料上传失败              | 检查 Linux / WSL、`prlimit`、`/proc`、解析脚本和私有目录权限；扫描 PDF 无 OCR                     |
| Client 看不到资料 / 项目      | 由 Owner 核对客户绑定及文档共享版本；成员身份和共享权限分别控制访问                               |
| 浏览器测试缺依赖              | 安装 Chromium 与相应系统库；中文截图需要可用的中文字体                                            |

更详细的环境历史与定向验证保留在 [DEVELOPMENT](../engineering/DEVELOPMENT.md)。生产环境请从 [发布检查表](../release/RELEASE_CHECKLIST.md) 开始，本指南不构成生产部署验收。
