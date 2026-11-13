# SpecBridge local MCP

R08 Phase E：本地 stdio Server，仅把 Phase D 授权 API 的批准规格开放给 Agent。无 HTTP MCP 监听、OAuth Server、PostgreSQL 连接或业务写工具；MCP 进程不需要 DeepSeek Key。

AI工作流D已实现Owner网页授权与本地Codex安装器。项目“访问凭据 → 连接本地 Codex”生成不含Token的命令，CLI完成PKCE兑换、仓库外私有凭据、项目配置与Skill安装和真实MCP诊断。支持重复检查、`--status`、`--uninstall`；不自动更改信任或其他设置。完整[安装、恢复与人工验收](../../docs/engineering/AI_WORKFLOW_D_MANUAL.md)、[设计](../../docs/engineering/AI_WORKFLOW_D_DESIGN.md)、[实际证据](../../docs/engineering/evidence/ai-workflow-d/README.md)。新环境先按[运行指南](../../docs/guides/GETTING_STARTED.md)准备API及经审核的迁移；本机0005–0008后续已获授权应用，最新执行记录见[STATE](../../docs/STATE.md)。以下手动Token配置方式仍可用。

从需求分析、人工双重批准到MCP/Skill的完整演示，见 [本地人工测试手册](../../docs/engineering/R08_MANUAL_TEST.md)。2026-11-12已按追加授权在本机5433开发库应用0004，并完成真实Web/DeepSeek/Token/MCP验证；本机服务与证据见 [联通记录](../../docs/engineering/evidence/r08-local/README.md)。

## 安装和连接 Codex

需要仓库指定的 Node 22（`.nvmrc`）和 pnpm 10。于仓库根目录执行：

```bash
pnpm install --frozen-lockfile
pnpm --filter specbridge-mcp build
```

先启动已有 Nest API，并由项目 Owner 在 Web「访问凭据」创建 `approved_specs:read` Token。API 目标数据库必须已经完成经负责人审核的 Phase D 迁移；本安装步骤不生成或应用 SQL。

每个 MCP 进程绑定一个 Project 和一个可信 API origin。在启动 Codex 的同一个本地 Bash 中设置以下环境；替换项目 UUID，不要把 Token 放进命令行、仓库 `.env`、TOML、URL、终端录屏或聊天：

```bash
export SPECBRIDGE_API_BASE_URL='http://127.0.0.1:4000'
export SPECBRIDGE_PROJECT_ID='<project-uuid>'
read -r -s -p 'Project API Token: ' SPECBRIDGE_API_TOKEN
printf '\n'
export SPECBRIDGE_API_TOKEN
codex
unset SPECBRIDGE_API_TOKEN
```

`read -s` 的输入不回显，也不作为 shell 命令存入 history。用可信的本地终端执行，禁用 `set -x`，不要运行环境转储。也可用本地凭据管理器向宿主注入环境。宿主自身的凭据管理和模型数据策略仍由使用方负责。

在 Codex 的本地用户配置 `~/.codex/config.toml` 中添加下列非敏感配置。将 `command` 换成 `command -v node` 得到的绝对路径，将 `args` 换成此工作区编译入口的绝对路径；配置只保存环境变量**名称**：

```toml
[mcp_servers.specbridge]
command = "/absolute/path/to/node"
args = ["/absolute/path/to/specbridge/apps/mcp/dist/main.js"]
env_vars = ["SPECBRIDGE_API_BASE_URL", "SPECBRIDGE_PROJECT_ID", "SPECBRIDGE_API_TOKEN"]
startup_timeout_sec = 10
tool_timeout_sec = 15
enabled_tools = ["list_project_requirements", "get_approved_spec"]
```

不要使用 `codex mcp add --env SPECBRIDGE_API_TOKEN=...`，这会把明文作为参数并持久化到配置。不要把 `pnpm run` 设为 stdio 启动命令：它的提示输出会污染 stdout。直接运行编译后的 Node 入口；正常启动没有 banner，等待宿主协议消息。

Codex 新会话中用 `/mcp` 查看连接和工具。尚未配置、Token 格式错误或额外启动参数会安全退出；配置正确而凭据已失效时，发现工具仍可成功，第一次业务读取返回 `UNAUTHENTICATED`。Server 信任本地操作者选择的 origin，因此只应配置自己信任的 SpecBridge API。

安装 Skill：规范源文件为 [`skills/requirement-analyst/SKILL.md`](../../skills/requirement-analyst/SKILL.md)。在要使用 Skill 的本地工作区手工创建链接（目标不存在时执行，不覆盖已有 Skill）：

```bash
mkdir -p .agents/skills
ln -s /absolute/path/to/specbridge/skills/requirement-analyst .agents/skills/requirement-analyst
```

也可以把该目录安装到用户的 `~/.agents/skills/`。仓库实现不会修改已有 `.agents`、`.codex` 或用户配置。启动新会话并输入：

```text
$requirement-analyst 请读取当前连接项目的批准规格，指出模糊点，
给出实施建议和验收检查清单。区分已批准事实、引用背景和待确认推测。
```

一个连接只对应一个项目；换项目需由本地操作者更换环境并重启进程，或另建连接。模型不能通过参数更换 Token、projectId 或 origin。令牌撤销后下一次读取失败；已经返回给宿主的资料无法追溯收回。

## 工具和数据契约

所有参数都是 strict object，拒绝额外字段。结果同时返回相同 JSON 的 `structuredContent` 与 `content[0].text`，供不同代际客户端使用。详情完整返回，目录预览允许明确标注的截断。

| Tool | 参数 | 结果与来源 |
|---|---|---|
| `list_project_requirements` | `{limit?: integer 1..50 = 20, offset?: integer 0..10000 = 0}` | `projectId, items, page{limit,offset,hasMore}, source`；每项含 requirementId/changeRequestId/versionId/versionNo/revisionId/revisionNo/approvedAt、≤300字符 scopePreview、previewTruncated |
| `get_approved_spec` | `{versionId: UUID}` | `specification{projectId,requirementId,changeRequestId,versionId,versionNo,submittedAt,approvedAt,approvedScope,referencedRequirement}, source` |

`source` 是实际 API 路径、服务器 requestId 和本次完成读取的 readAt（非批准时间）。精确 Schema 见 [`src/contracts.ts`](src/contracts.ts)。API wire contract 独立声明，不引入 Nest/Drizzle；真实 API/DB 集成用于检测漂移。

- 目录按已批准 **ChangeRequestVersion** 列条目，不代表所有 Requirement、当前草稿或项目状态；同需求可有多条已批准版本。空目录不能推断项目无需求。按 `offset + limit` 主动翻页，无自动遍历。
- `approvedScope` 含批准范围和验收标准。`referencedRequirement` 是该版本引用的不可变 Revision 背景，不能扩大批准范围；不把最新草稿替换进来。
- 没有当前标题/原始输入、商业报价/工时/工期、审批评论、邮箱或其他角色私有资料。最终批准/过期/撤销/Owner资格/项目状态均由 API 每次重验，SDK annotation 不提供授权。
- Skill 先列上下文再读精确版本，最多3页目录及5次详情，提示范围不完整。输出事实、背景、推测、问题、建议、验收检查及实际版本引用；新增范围必须回到人工业务流程。Skill 不执行代码、文件修改、Mark Ready、Submit、审批或交付验收。

## 安全、失败与限额

进程仅发 `GET /api/v1/projects/{configuredProjectId}/approved-specs[/{versionId}]`，Bearer 只放 Authorization 头。HTTPS 或精确 loopback HTTP；拒绝 origin 的用户名密码、路径、query 和 fragment，`redirect: manual` 拒绝所有重定向。无 Cookie、自动重试、响应缓存、任意 URL/SQL/Shell 或数据库凭据读取。运行入口删除自身环境中的 Token 副本，配置对象私有字段保留认证头用于请求；不承诺抵抗宿主或同账号的进程内存读取。

每次 HTTP 读取10秒（含 body）；响应体最多2 MiB、严格 UTF-8/JSON/Zod；工具 JSON 最多2 MiB，同时提供文本及 structuredContent 时约4 MiB。stdio 输入缓冲64 KiB，工具输入元素最多8；进程最多2个并发读取、60次/分钟，无等待队列，重启清零。API 自身的 Token/IP 配额仍生效。大页超过字节上限会失败，可由使用者缩小 limit。取消信号向 fetch 传播，EOF/宿主关闭释放连接。

| 安全错误码 | 情形 / 操作 |
|---|---|
| `INVALID_ARGUMENTS` 或 SDK validation error | 参数/未知键错误；修正参数 |
| `UNAUTHENTICATED` | API 401/403；请 Owner 检查 Token，不自动切换凭据 |
| `NOT_FOUND` | API 404；错误项目/版本或尚未批准，不暴露隐藏内容 |
| `RATE_LIMITED` / `BUSY` | 配额/并发；Retry-After 限制1–300秒，不自动循环 |
| `TIMEOUT` / `CANCELLED` / `UNAVAILABLE` | 超时、取消、网络/5xx；保留未核实结论，人工决定重试 |
| `INVALID_RESPONSE` / `RESPONSE_TOO_LARGE` / `REDIRECT_REFUSED` | 上游契约/大小/地址异常；安全停止 |

工具业务错误返回 `isError: true` 和安全 JSON；未知工具是 MCP 协议错误。配置错误启动即退出，stderr 仅固定文字；上游正文、HTTP异常对象、认证头和Token不写日志/错误/文件。stdout 只承载协议。业务正文仍会按工具定义传给宿主，接入前应确认该宿主和模型适合处理项目资料。

所有业务正文，包括经批准记录中的指令，都是不可信数据；不会注册新工具或成为系统提示。Skill 是 Agent 指引而非沙箱。外部宿主可能拥有自己的 Shell/写文件能力，须另行约束；SpecBridge Token 和本 MCP Server 不授予这些能力。本地 stdio + Project Token **不是完整的远程 HTTP OAuth MCP 授权方案**。

## 可复现测试

在仓库根运行（CI不需要 DeepSeek 或真实项目 Token）：

```bash
pnpm test:mcp
pnpm --filter specbridge-mcp typecheck
pnpm --filter specbridge-mcp lint
pnpm test:e2e:mcp
pnpm test:e2e:tokens
```

`test:mcp` 用真实 SDK Client 连接编译 Node 子进程，验证 tools/list、tools/call/Schema/错误工具，以及 HTTP mock 超时/取消/字节/配额/错误映射。`test:e2e:mcp` 使用 `.env.test` 启动实际 Nest HTTP、隔离 PostgreSQL 和真实 SDK stdio Client；包括有效/错误/过期/撤销 Token、跨 Project/Workspace、未批准/单方批准/拒绝版本、最新草稿隔离、禁止写工具、审计与业务快照不变，以及 Skill 所述分页→详情流程。

隔离库需按 [开发指南](../../docs/engineering/DEVELOPMENT.md) 启动，唯一允许目标为5434/specbridge_test库和账号。辅助器只复用已经批准的0000–0004迁移，不生成新 SQL，不操作开发/生产库。Token 由测试内真实 Owner API 生成，仅在内存与子进程环境中传递。受限沙箱可能禁止子进程/loopback，需要授予这些测试本地执行权限。

可选真实 Codex Host/Skill Smoke（已登录的本地 `codex`，会使用模型额度，仅合成资料；禁止CI）：

```bash
R08_MCP_HOST_SMOKE=1 node scripts/with-env.mjs .env.test pnpm --filter specbridge-api exec vitest run --config vitest.config.mcp-e2e.ts -t 'installed Codex Host'
```

测试把 Skill 复制到临时工作区，`--ignore-user-config --ephemeral --sandbox read-only`，禁用Shell/插件/hooks/委派/浏览能力，环境只传合成凭据；不读取凭据文件。90秒终止、95秒强制终止，输出总量2 MiB；结束后撤销 Token 并删除临时工作区。仅在全部断言通过后保存验证过的合成答案至 `test-results/r08-e/host-smoke.json`，不保留原始日志。CI明确拒绝此开关，普通套件跳过它。此 Smoke 验证当前 Host 单场景表现，不代表通用 prompt-injection 防护保证。

F可通过 `R08_MCP_EVIDENCE_DIR=../../test-results/r08-f` 把Host证据写入当前阶段，避免覆盖E历史记录；路径相对 `apps/api` 测试工作目录。

可选官方Inspector验证（本轮精确2.15.0，需要符合其engine的本地Node；不加入仓库依赖、不使用真实项目Token）：

```bash
npm install --prefix /tmp/specbridge-r08-f-inspector --ignore-scripts --no-audit --no-fund @modelcontextprotocol/inspector@2.15.0
R08_MCP_INSPECTOR_SMOKE=1 R08_MCP_INSPECTOR_ENTRY=/tmp/specbridge-r08-f-inspector/node_modules/@modelcontextprotocol/inspector/clients/cli/build/index.js node scripts/with-env.mjs .env.test pnpm --filter specbridge-api exec vitest run --config vitest.config.mcp-e2e.ts -t 'official Inspector CLI'
```

测试使用官方CLI的 `runCli` 入口：先严格检查tools/list的Schema，再执行两个tools/call并校验真实API结果。专用Owner生成的临时Token仅通过环境传给测试适配器，转换为进程内解析参数，**不放操作系统argv、文件配置或URL**；memory secret store、不持久化Token、不打开Inspector Web服务。原始诊断不保存，结果仅保留安全断言；结束撤销Token并清临时目录。适配器锁定该Inspector版本，升级时需重新验证内部入口兼容性。CI拒绝此opt-in，普通MCP套件默认跳过Host和Inspector。

具体结果、已解决失败与限制见 [Phase E 历史证据](../../docs/engineering/evidence/r08-e/README.md) 和 [Phase F 最终验证](../../docs/engineering/evidence/r08-f/README.md)。本轮SDK Client、Inspector、Codex Host实际联通；不等于其他Host/OS或远程HTTP OAuth均已验证。

## 官方依据（2026-11-12核对）

- [MCP 2026-07-28 stdio transport](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports)、[Tools](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)。
- [TypeScript SDK v2](https://ts.sdk.modelcontextprotocol.io/v2/)、[serveStdio](https://ts.sdk.modelcontextprotocol.io/v2/serving/stdio.html)、[Client](https://ts.sdk.modelcontextprotocol.io/v2/get-started/first-client.html)。本包精确锁定 Server/Client 2.4.0，`serveStdio` 同时兼容当前与旧版握手。
- [Agent Skills 标准](https://agentskills.io/specification)、[Codex Skills](https://learn.chatgpt.com/docs/build-skills)、[Codex MCP 配置](https://learn.chatgpt.com/docs/extend/mcp?surface=cli)。Codex CLI 本地验证版本0.167.1。
