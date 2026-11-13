# R08 Phase F — 最终 AI / Agent 联调证据

2026-11-12，本地 `feat/17-ai-agent-integration`，开工 HEAD `d75d39e`（A–E 已由负责人提交）。本轮只补联调、回归和交接；没有增加业务功能、改变授权/审批规则或新增迁移。Issue [#17](https://github.com/lithuio/specbridge/issues/17)，覆盖 AC-18/19/20 及既有 P0 回归。独立人工安全/视觉验收及远程 CI 尚未执行，不把本地 PASS 当作发布许可。

## 环境与证据边界

- Node 22.23.4、pnpm 10.34.9；本机 Linux/Chromium 149.0.7827.55、Playwright 1.61.1，系统 Noto CJK。Nest/Next/MCP 使用现有锁文件，无仓库依赖升级。
- 所有 DB/HTTP/browser/MCP 组串行运行；仅 `127.0.0.1:5434` 的 `specbridge_test` 库及同名账号，合成用户/项目/需求/Token。没有读取开发或生产业务资料。
- 复用已审 0000–0004 SQL；0004 SHA-256 仍为 `7133f1d8fc11ef93f84314dede4257cbba23452dec9ca49a2fdb57ce5cc0bd0a`。升级测试从旧 15 表迁移至 16 表、保留旧数据并验证约束；没有生成/修改/应用新的迁移。
- `.env` 只由获授权的真实 Smoke API 子进程加载，不打印、不修改。Next、Playwright、MCP 不接收 DeepSeek Key。截图及保存的回答只包含合成数据；不保存 HAR/trace、Cookie、原始模型诊断或进程环境。
- 可复现测试代码在仓库；原始命令日志位于被忽略的 `test-results/r08-f/`。本目录与 [浏览器证据](../../../ux/evidence/r08-f/README.md) 保存脱敏后的可审阅结果。

## 实际命令与结果

| 范围 / 命令 | 结果 |
|---|---|
| `pnpm lint` | PASS API/MCP/Web；最终测试改动后再次通过 |
| `pnpm test` | PASS API 128 / 13 文件，MCP 16 / 2 文件 |
| `pnpm --filter specbridge-api typecheck`、`pnpm --filter web typecheck`、`pnpm --filter specbridge-mcp typecheck` | PASS；含测试代码 |
| `pnpm build` | PASS Nest、MCP、Next 生产构建，Web 25 路由 |
| `pnpm --filter specbridge-api openapi:check` | PASS，36 路径与生成 Web 类型无漂移 |
| `pnpm db:check` | PASS，Drizzle 元数据合法 |
| `pnpm test:integration` | 最终 PASS 92 / 9 文件，14.05s |
| `pnpm test:e2e` | PASS 5 / 3 文件，1.18s |
| `pnpm test:e2e:db` | PASS Auth 16、RBAC 13、Requirement 9、Change 8、Delivery 7、R07 reads 9、Token 9、MCP 6；外部 Host 默认跳过 |
| `pnpm test:e2e:ai` | PASS 19 / 2 文件，4.65s；真实 HTTP/DB，模拟外部 Provider |
| `pnpm test:browser:run`，随后定向重跑 Copilot/Token（见下文） | 最终所有 36 场景 PASS：6/2/2/2/2/1/1/6/6/4/4；顺序为 Auth/Project/Requirement/Change/Delivery/三角色集成/呈现/表单/AI/Copilot/Token |
| `pnpm test:smoke-guards` | PASS 4；即使 opt-in 和合成 canary 同时存在，CI 仍拒绝真实模型/Inspector 执行，输出无 canary |
| `python3 /home/lenovo/.codex/skills/.system/skill-creator/scripts/quick_validate.py skills/requirement-analyst` | PASS `Skill is valid!` |
| 真实 Provider 独立 Smoke（下文） | PASS，一次真实 DeepSeek 请求 |
| `pnpm test:browser:real-ai` | PASS 1，16.4s 场景 / 19.1s 套件；真实 DeepSeek、Next/Nest/DB 和浏览器 |
| 真实 Inspector CLI（下文） | PASS 1，1.29s 场景；其他 7 项按名称过滤跳过 |
| 最终 MCP + Inspector 合并验证（下文同环境前缀，执行 `pnpm --filter specbridge-api test:e2e:mcp`） | PASS 7 / Host 1 SKIP，4.22s；额外检查临时目录没有 Token 明文，未重复调用真实 Host |
| 真实 Codex Host + Skill（下文） | PASS 1，43.03s 场景；其他 7 项按名称过滤跳过 |

后端完整组合为 `pnpm test:integration && pnpm test:e2e && pnpm test:e2e:db && pnpm test:e2e:ai`，最终退出 0。事务/供应商故障测试中预期出现的安全 500/503 元信息日志不表示套件失败。

CI 已有 AI/Copilot Mock HTTP、真实 SDK stdio→API→隔离 DB 和全部浏览器组；本轮增加真实 Smoke 的 CI 拒绝测试，明确标注 R01–R08 浏览器覆盖。CI 不配置 DeepSeek Key、真实项目 Token、Inspector 下载或真实 Host 模型。Inspector/Host 两项当前均默认 SKIP，需明确本地 opt-in；远程 CI 结果为 NOT RUN。

## 真实 DeepSeek

独立 Provider 命令：

```bash
node scripts/with-env.mjs .env node apps/api/scripts/ai-smoke.mjs --run
```

[结果](analysis-smoke.json)：`deepseek-flash`，结构 Schema PASS；225 输入 / 295 输出 tokens，2405ms。2048 预留输出预算、30秒、不自动重试；无数据库或浏览器。

浏览器前置：现有隔离库可用，执行 `pnpm build` 并安装 Playwright Chromium；根 `.env` 已有安全服务端配置。命令：

```bash
pnpm test:browser:real-ai
```

新 `browser-ai-real.mjs` 只在 test、本地 opt-in、非 CI 下加载 `.env`；先校验并固定隔离 DB，关闭外部 Observe 内容采集，继续运行真实 Provider Adapter。fetch 只增加次数与预算计数，未替换模型输出。API 子进程最多 4 请求/8192 预留输出 tokens，无自动重试；脚本不改变用户 `.env` 的启用配置。

[实际用量](real-provider.json)：4 次均 HTTP 200，6505 输入 / 1791 输出 tokens，usageMissing=0；分析 1 次、Copilot 编排 3 次，实际调用一个 `get_requirement`，最终引用真实 Requirement 和 Revision。加上独立 Smoke，本轮 DeepSeek 总计 5 请求、6730 输入 / 2086 输出 tokens；未估算货币费用，需以供应商账单为准。

浏览器断言保存前业务/审计不变，人工选择并编辑建议后使用 R04 `expectedVersion` 保存；原始输入保留，状态为 CLARIFYING；Copilot 后业务、审计、不可变 Revision 快照一致。真实结果未使用固定回答断言，只验证 Schema、授权来源和业务不变量。多轮对话、跨角色/项目、409、超时及失败恢复由确定性 HTTP/browser 套件覆盖。

## 真实 MCP / Skill

SDK Client 6 项覆盖 tools/list/call、有效/伪造/过期/撤销 Token、跨 Project/Workspace、未批准与单方批准版本不可见、后续草稿隔离、工具参数篡改、无写工具和业务快照不变。测试 Token 通过真实 Owner API 创建。

Inspector 使用官方 2.15.0，安装在临时目录，未改变仓库依赖或用户 MCP 配置：

```bash
npm install --prefix /tmp/specbridge-r08-f-inspector --ignore-scripts --no-audit --no-fund @modelcontextprotocol/inspector@2.15.0
R08_MCP_INSPECTOR_SMOKE=1 R08_MCP_INSPECTOR_ENTRY=/tmp/specbridge-r08-f-inspector/node_modules/@modelcontextprotocol/inspector/clients/cli/build/index.js node scripts/with-env.mjs .env.test pnpm --filter specbridge-api exec vitest run --config vitest.config.mcp-e2e.ts -t 'official Inspector CLI'
```

`mcp-inspector-smoke.mjs` 导入官方 CLI 的 `runCli`，把环境凭据组装为**进程内**解析参数，不放入操作系统 argv、磁盘配置、URL 或原始日志。临时 memory secret store、禁止 Token 持久化；未启动 Inspector Web/远程 HTTP MCP。严格工具 Schema 检查用于 tools/list，tools/call 结果再经测试 Zod 校验；[结果](inspector.json)。结束后撤销专用 Token、清临时工作区。该适配器对应精确 Inspector 版本，不承诺第三方 CLI 内部入口永久稳定。

Host 命令：

```bash
R08_MCP_HOST_SMOKE=1 R08_MCP_EVIDENCE_DIR=../../test-results/r08-f node scripts/with-env.mjs .env.test pnpm --filter specbridge-api exec vitest run --config vitest.config.mcp-e2e.ts -t 'installed Codex Host'
```

Codex CLI 0.167.1，临时工作区加载 `$requirement-analyst`；忽略用户配置，禁 Shell/文件写能力/插件/hooks/委派/浏览，90秒截止、95秒强制终止、2 MiB 输出上限。未读取认证文件，由已登录 CLI 自行认证；仅合成资料和内存 Token。结束撤销 Token/删除临时工作区，原始 stdout/stderr 不保存。

[本轮合成答案](host-smoke.json) 已逐项阅读：实际 list→detail，精确版本/Revision/读取时间；批准目录与引用背景分开，offline export 未获批准，实施和额外检查是待确认建议；正文中的泄露/审批指令被忽略，工具调用仅两个注册读取工具，无业务写入。一个真实场景通过不代表所有模型/注入样本安全。

## API / Token 安全复核

| 重点 | 本轮证据 / 结论 |
|---|---|
| Client/Developer/跨租户隔离 | AI/Copilot 19、RBAC 13、reads 9、Token 9、MCP 6；拒绝跨项目参数和页面父链，即使 Owner 同时能访问两项目也不能把另一项目混入上下文。Client 看不到商业草稿 |
| 推理前后授权 | 会话撤销、项目撤权与角色降级测试；在再次推理与返回之前重验，结果失效即丢弃 |
| 工具注入/伪造来源 | strict 参数、固定工具注册、整批校验；正文/历史只作为不可信数据。SQL/Shell/审批/验收工具不存在；引用必须来自真实本轮读取 |
| 人工确认与历史 | R04/R05/R06 数据库及浏览器回归；AI 分析不写对象，采用仅预填，人工保存走原 API/expectedVersion；409 与未知结果保留输入且不重放 |
| Token 生命周期 | Owner-only、摘要/唯一约束、固定 scope、有效期/撤销、ACTIVE 项目、当前 Owner 资格逐次检查；读与撤销竞争锁后重验。普通业务写 API 不接受 Token |
| 审计与凭据 | 创建/撤销/使用事务与失败回滚、Owner-only 元信息分页；响应/日志不含 Token 或摘要。UI 明文只一次、隐藏/导航/换号销毁，无持久存储或截图采集 |
| 模型与传输错误 | Mock 覆盖 402/429/503、空白/非法 JSON、输出 Schema、超时、取消、字节/输入/上下文/次数/预算上限。失败后手动流程正常；没有故意对付费服务制造 402/429/503 |
| 外部通信 | DeepSeek 固定官方 origin、不重定向/自动重试；MCP 固定可信 origin/project，Bearer 只在头，API 每次授权，无 DB 连接或写工具 |

本轮源码和负面测试复核未发现未解决的跨租户读取、自动审批、历史可变或凭据输出缺陷。这是 Agent 自查，不能代替 Issue 要求的独立人工安全 Review。既有限制：配额为单实例内存、重启清零；共享代理 IP 可能合并限额；已交给外部模型/Host 的资料不可追溯收回；Skill 不是沙箱；本地 stdio + Project Token 不是完整远程 HTTP OAuth MCP 授权。

## 已解决 FAIL / 未运行与风险

1. 基础数据库测试仍断言 15 表，首次 91 PASS/1 FAIL；补表名后第二次发现 PK/id 数量也仍为 15。最终同步三个精确断言至 16，92 项通过，未放宽任何数据库约束；旧库迁移前 15 表断言保留。
2. 完整浏览器首次停在 Copilot 对比度检查，前 28 场景通过。记录显示按钮刚启用时 opacity=0.5、动画 running；测试等到 enabled 且 opacity=1 再运行相同 axe 阈值，Copilot 4/Token 4 通过。定向命令：`R07_EVIDENCE_ROOT=test-results/evidence pnpm test:browser:copilot` 与同前缀 `pnpm test:browser:tokens`。没有屏蔽规则、降低阈值或修改产品主题。
3. Inspector 初次错误把 `--strict` 用于 tools/call；按官方限制仅用于 tools/list 后通过。安装入口/格式工具路径的初次探测错误也已解决；无仓库依赖变动。末次CI防护复验在受限沙箱中被阻止，获准执行原命令后4项PASS（390ms）。沙箱外权限用于本机 socket、子进程和明确授权外网调用。
4. 最终无未解决 FAIL；本地实施无 BLOCKED 项。**发布验收仍待人工和远程 CI**，并未宣告整个 Issue DoD 或生产发布完成。
5. NOT RUN：远程 CI、独立人工安全/视觉签字、Firefox/WebKit/其他 OS/真实手机/读屏、真实 200% 浏览器缩放、生产迁移/部署、实际 Observe 外部接收、备份恢复/重启演练。手机视口与 axe 不能替代这些检查；AC-17 备份恢复仍为原有发布前事项。
6. 真实模型回答较长、偶有内部状态/权限码，保留为文案质量待验收项；未扩大范围调整模型提示。5 个真实 AI 可访问性状态无自动违规，但裁剪/叠层颜色和焦点守卫仍有 axe 未判定项，详见视觉记录。

后续由负责人审阅 diff、真实合成答案和截图，完成 H-11/远程 CI 后决定提交与最终 PR。没有自动 Commit/Push/PR/Merge/部署。建议文案见 [PR 草案](../../R08_PR_DRAFT.md)。

收尾：3000/4000已无监听，5434既有隔离DB保持运行；构建缓存恢复到开工备份（SHA-256 `f80067229f3b8b7398df0905d8f44319b73e779d9e4bf210c7e56b6e6ae71443`），保留其原有未提交改动。新增/修改文本的凭据模式扫描无命中，本地文档链接和 `git diff --check` 通过；锁文件、SQL、Schema及API/Web/MCP生产源码无变动。

官方核对：[DeepSeek Chat Completions](https://api-docs.deepseek.com/api/create-chat-completion/)、[Inspector CLI](https://modelcontextprotocol.io/docs/2026-07-28/tools/inspector/cli)、[Inspector 配置](https://modelcontextprotocol.io/docs/2026-07-28/tools/inspector/configuration)。
