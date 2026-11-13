# SpecBridge API

NestJS 模块化单体，负责服务端身份与项目授权、需求版本、商业审批、交付验收、事务审计，以及可选 AI 和项目背景解析。数据库访问通过 API 的持久化层；Web 和本地 MCP 不直接访问数据库。

[项目首页](../../README.md) · [运行指南](../../docs/guides/GETTING_STARTED.md) · [API 契约](../../docs/architecture/API.md) · [当前状态](../../docs/STATE.md)

## 本地运行

使用仓库指定的 Node / pnpm，在**仓库根目录**安装依赖、配置 `.env`，按 [运行指南](../../docs/guides/GETTING_STARTED.md) 完成经审核的本地数据库迁移。随后执行：

```bash
pnpm dev:api
```

根命令显式加载 `.env` 并设置 `PORT=4000`；已有终端变量优先。API 本身不自动加载环境文件，直接运行子包脚本时需自行注入环境。Web 使用 `/api/v1` 同源代理，开发可信来源为 `http://localhost:3000`。

- API 健康检查：`http://localhost:4000/api/v1/health`；该检查不访问数据库。
- 数据库：开发默认 `127.0.0.1:5433/specbridge`；自动化测试使用 5434 隔离库。
- 认证：数据库 Session、HttpOnly Cookie 与 CSRF 校验，详见 [安全模型](../../docs/architecture/SECURITY.md)。

## 业务与集成边界

- 每次资源访问均执行工作空间 / 项目权限校验，不能依赖 UI 隐藏按钮。
- 规格 Revision 和已提交变更版本不可变；审批、状态与审计在同一事务中处理。
- Owner 先批准，Client 再批准同一版本；审批中的需求禁止新建 Revision。
- 交付绑定已批准版本；客户退回后创建新交付，保留历史。
- AI 输出需校验并经人工采用，不能自动审批或验收；关闭 AI 不阻断手动主流程。
- 外部 MCP 通过项目作用域凭据调用授权 API，仅能读取批准规格。

详细定义见 [状态机](../../docs/architecture/STATE_MACHINES.md)、[数据模型](../../docs/architecture/DATA_MODEL.md) 和 [验收标准](../../docs/product/ACCEPTANCE.md)。

## 构建、测试与契约

以下命令均从仓库根目录执行：

| 命令                                            | 用途                                        |
| ----------------------------------------------- | ------------------------------------------- |
| `pnpm --filter specbridge-api build`            | 编译 API                                    |
| `pnpm --filter specbridge-api typecheck`        | 检查源码、测试与配置类型                    |
| `pnpm --filter specbridge-api lint`             | 静态检查                                    |
| `pnpm --filter specbridge-api test`             | Vitest 单元测试                             |
| `pnpm test:e2e`                                 | 基础 HTTP 回归                              |
| `pnpm test:integration`                         | 显式加载 `.env.test` 的 PostgreSQL 集成测试 |
| `pnpm test:e2e:db`                              | 显式加载 `.env.test` 的业务 HTTP / 代理回归 |
| `pnpm --filter specbridge-api openapi:check`    | 校验 OpenAPI 与 Web 生成类型是否漂移        |
| `pnpm --filter specbridge-api openapi:generate` | 契约变更后重生成 OpenAPI 与 Web 类型        |

数据库 / HTTP 测试的准备和端口互斥要求见 [测试运行说明](../../docs/guides/GETTING_STARTED.md#运行检查与测试)。不要手改 [openapi.json](../../docs/architecture/openapi.json) 或 Web 生成类型。新增 SQL 须人工审核，运行时迁移目录为 `drizzle/`，历史 SQL 不覆盖。

## 项目背景解析

解析要求 Linux / WSL、Node 22 权限模式、`/usr/bin/prlimit` 及可读 `/proc`。运行产物除 `dist` 外必须保留 `apps/api/scripts/document-parser.mjs` 和 pnpm 解析依赖路径，仅复制 `dist` 不支持背景上传解析。

原件默认保存在 API 用户的 `~/.local/share/specbridge/documents`；服务端 `DOCUMENT_STORAGE_DIR` 可覆盖，但必须是仓库外私有目录，目录权限 0700、原件 0600。不能指向 Next public 目录；当前没有原件下载端点。Node 权限和进程资源限制不等于完整 OS 沙箱，生产环境需另行验证。

- `pnpm test:e2e:documents`：真实 HTTP / 隔离 PostgreSQL / 解析进程，Mock AI。
- `pnpm test:browser:documents`：已构建 API / Web 后运行浏览器验证，使用临时原件目录。
- 手册与边界：[背景资料](../../docs/engineering/AI_WORKFLOW_B_MANUAL.md)；实际证据：[工程记录](../../docs/engineering/evidence/ai-workflow-b/README.md)。

## AI、观测与部署

AI 配置只在服务端，见 [.env.example](../../.env.example) 与 [启用说明](../../docs/guides/GETTING_STARTED.md#可选启用-ai)。真实模型测试是独立的可选验证，普通 CI 无需真实 Key。

现有应用集成 NestJS Observe；是否启用由服务端环境配置决定，日常 P0 开发无需其密钥。密钥、会话和业务私有正文不得写入日志。观测与生产配置需要按实际环境核对。

仓库中的本地 Compose 仅启动数据库。生产部署、迁移与备份恢复需遵循 [发布检查表](../../docs/release/RELEASE_CHECKLIST.md)，本 README 不代表生产验收已完成。API 包的许可证字段为 `UNLICENSED`，框架许可证不代表项目授权。
