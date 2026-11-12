# R08 — AI & Agent Integration

批准基线：本轮负责人确认的修订计划；Issue [#17](https://github.com/lithuio/specbridge/issues/17)。一个 Issue、一个最终 PR；A–F 各自独立 Session，每阶段负责人本地 Commit。禁止自动 Commit/Push/PR/Merge/部署。本文首次落盘随 Phase A 实施授权，不表示 B–F 已实施。

## 基线与阶段

- NestJS 模块化单体，复用 OpenAI SDK/Zod、Session/CSRF、Project Policy、原 R04–R06 写 API；不新增 AI 框架、Redis、向量库或微服务。
- 三角色均可分析有权读取的需求；Client 无 Revision/Ready 权限。AI 只作建议，不自动写业务或商业审计，不审批、不验收。
- Copilot 历史仅浏览器内存，按 epoch/user/project 隔离；历史不可信，业务事实经工具重新授权读取。来源可追溯不等于模型判断正确。
- DeepSeek 官方 origin `https://api.deepseek.com`，当前支持配置 `deepseek-flash`；服务端 Key 不进代码/日志/客户端。Chat Completions 非流式、thinking disabled、JSON mode + 服务端 Zod。未知模型配置 fail closed，不自动换模型。
- 费用采取单实例限额，UTC 日计数、重启清零，不宣称持久账单硬上限；不新增预算表。
- 中文 UI；AI/MCP 为 P1，不阻断 P0。依据 DECISIONS、最新 STATE 和实际脚本解释历史文档，不改变 P0 基线。

| 阶段 | 可运行交付 | 状态 |
|---|---|---|
| A Provider & Analysis | 配置、Provider、授权分析 API、Schema、限额、异常、契约与定向测试 | 本地完成；Mock/HTTP/DB及真实DeepSeek Smoke PASS |
| B Assistance UI | 原文对照、编辑建议、人工采用到既有表单、stale/未知结果处理 | NOT STARTED |
| C Global Copilot | Shell 项目助手、内存对话、有界只读工具、来源卡片 | NOT STARTED |
| D Project Token | Owner 管理、批准规格投影、已审 Schema/SQL 与测试 | NOT STARTED |
| E MCP & Skill | SDK v2 stdio、两个工具、requirement-analyst、真实 Host 验证 | NOT STARTED |
| F Final Integration | 真实 DeepSeek/Web/MCP 与 R01–R08 完整回归、人工 Review、远程 CI | NOT STARTED |

## A：接口与实现约束

`POST /api/v1/requirements/{id}/ai-analysis`，Session + CSRF；200 标准 envelope。请求严格拒绝未知键：

```ts
{ expectedVersion: number; revisionId?: UUID; includeClarifications?: boolean;
  draft?: { content: string; acceptanceCriteria: string[] } }
```

expectedVersion 为 R04 draftVersion。includeClarifications 默认 true；revisionId 省略时取 latestRevisionId，必须属于同需求。draft 是未保存人类材料。正文沿用 R04 20000、criteria 100 项各 1000 字符限制。读取授权优先于版本和修订检查；无权对象 404、stale 409；不调用模型、不消耗调用配额。澄清超过 500 条或装配输入超过 128 KiB 返回 413，不静默截断；可显式排除澄清后重试。

响应 data：`analysisId,schemaVersion:1,source,result`。source 含 requirementId、draftVersion、revisionId|null、clarificationIds、includesUnsavedDraft、readAt。analysisId 仅关联本次响应，不是持久作业。

result 为 `summary:string, assumptions:string[], openQuestions:string[], acceptanceCriteria:string[], risks:string[]`。严格对象；summary trim 后非空且 ≤1000；数组可空、≤10 项，每项非空且 ≤500；文本合计 ≤6000 UTF-16 code units。JSON 内容 ≤64 KiB；Provider HTTP 响应 ≤256 KiB。拒绝空白、截断、非法 JSON、未知字段、工具调用和类型错误，不自动修复。

所有材料包装为不可信数据；系统提示固定，客户端不能注册工具或指定模型/origin。AI 模块只拥有读取 Repository。短只读 REPEATABLE READ 快照之后结束事务再请求模型；调用前和返回前重验 Session/项目权限，撤权则丢弃。生成期间版本变化仍返回旧 source，后续 B 禁止直接采用。

新增安全码：503 AI_UNAVAILABLE / AI_INVALID_RESPONSE。上游 401/402/500/503、网络/超时统一 AI_UNAVAILABLE；429 映射 RATE_LIMITED，Retry-After 限 1–300 秒。无配置仅禁用 AI，不影响 Health/P0。SDK retries=0，不将上游 401 解释为用户登录失效。

限额默认：30 秒/调用，8192 output tokens，用户 5 次/分钟，用户/项目/实例日调用 100/200/500；并发用户1/项目2/实例4。调用失败不退日计数，释放并发；计数容量10000，满则拒绝，过期清理。只有通过授权/输入/配置检查才预留；真实 usage 用于观察，未知不伪造为零。输入字节数不等于精确 token 数。

日志只含 requestId、actor/project ID、模型、usage、耗时、结果；没有原始异常、Prompt、正文、Key。AI 路由成功/失败 no-store，Observe 禁止内容捕获和 AI HTTP trace。仅 AI 请求允许 256 KiB JSON，其他路由保留 100 KiB。

## B–F 已批准边界（后续独立启动）

B：分析前先保存 Requirement；summary/criteria 填入现有 Revision 编辑器，问题可填单条澄清。AI 不覆盖 originalText；assumptions/risks 默认不当作确认事实。保留分析版本及本地草稿，迟到结果不覆盖编辑。版本变化必须人工对照再更新 expectedVersion；未知写结果不重放。Mark Ready 独立人工操作。不持久保存 AI 正文或逐句来源证据。

C：`POST /projects/{id}/copilot/messages`，当前消息 ≤4000 字符、最多10轮历史，页面资源ID须验证父链；不接收 system/tool 消息。固定工具 get_project_overview、list/get_requirement、list/get_change_request、list/get_delivery；列表20默认/50上限。最多2次工具选择+1次无工具JSON总结，最多4次工具调用，串行及本轮去重；累计8192 output tokens、256 KiB输入、60秒。sources 必须来自本轮实际读取，action仅导航。无跨项目汇总；刷新清空，撤权/换号清空；不新增 DB 聊天表。

D：POST/GET `/projects/{id}/api-tokens`、DELETE `/api-tokens/{tokenId}` 仅 Owner Session+CSRF。新增 api_tokens：uuid id/project_id/user_id、非空name≤100、unique char(64) token_hash、text[] scopes、created_at/expires_at/revoked_at；外键RESTRICT，hash格式/固定scope/期限/撤销时间CHECK，索引(project_id,created_at,id)。Token sbp_+32随机bytes，仅SHA-256，scope approved_specs:read，默认30天/1–90天。每次重验期限/撤销/Owner资格；明文仅创建响应一次且UI关闭/隐藏时销毁。创建/撤销与Owner可见审计同事务，重复撤销不重复审计；响应未知先核对撤销，不自动重试。设计审核→批准生成SQL→实际SQL审核和哈希→批准隔离库应用。A无迁移。

D新增 GET `/projects/{id}/approved-specs` 和 `/{versionId}`：显式认证路由元数据支持Session或独立Token principal，不使用Public绕过，不赋予Token完整Owner身份。混合Cookie/Bearer拒绝；普通业务路由不接受Token；HEAD同等鉴权。只返回精确同版双方批准的技术投影及关联不可变Revision，不返回当前标题/原文、新Revision、报价/工时/工期、审批评论/邮箱。批准范围和引用需求资料分别标注，不自动扩张交付范围。

E：apps/mcp 使用 SDK v2 McpServer/serveStdio，编译后直接node启动；stdout仅协议，stderr脱敏。list_project_requirements 按批准版本列条目，get_approved_spec(versionId)读精确快照；严格input/output schema、structuredContent与一致文本。通过HTTP API，固定可信origin、HTTPS或loopback HTTP，不跟随重定向携带Token；有超时、响应限额和取消。只需SpecBridge Token，不需DeepSeek Key/DB。Skill位于 skills/requirement-analyst/SKILL.md，标准YAML，读取→分析→引用→标记待人审；不写文件/命令/审批。Skill不是宿主沙箱，本方案不是完整HTTP OAuth MCP授权。

F：Mock CI与真实联调分开；真实合成数据DeepSeek、Chromium、MCP SDK Client、Inspector及至少一个真实Agent Host/Skill。完整Lint/typecheck/build/unit/integration/HTTP/DB/browser/OpenAPI/db:check/MCP回归，数据库串行。人工安全Review和远程CI独立记录，不以本地测试代替。

## A 验证与交接

工作分支 feat/17-ai-agent-integration；起始 HEAD 9d43f8f，工作区干净。R08_PLAN 原不存在，本次依据对话批准基线创建。无需 Schema/Migration，无新依赖。受影响文件范围：API ai模块、配置接线/异常/Observe/OpenAPI、生成Web类型、测试入口/CI、本文/API/DEVELOPMENT/STATE。

2026-11-12 Phase A 本地交接：实现完成，未提交。AI Module 不注入业务写 Repository，分析前后需求/Revision/Audit 无变化；授权、stale和非法输入不触发Provider。模型期间撤销Session/更换Client，结果被拒绝；并发和项目共享预算、旧版本来源、无AI的P0正常读取均有实际HTTP证据。Web仅更新生成类型，未进入B。

| 实际命令 | 结果 |
|---|---|
| `pnpm --filter specbridge-api test` | PASS：11文件/113项（含新增20项AI单元）；后续Provider隐私加固另定向重测 |
| `pnpm --filter specbridge-api exec vitest run src/ai/ai.spec.ts src/http/api-exception.filter.spec.ts` | PASS：最终22项；含不可序列化Key、禁重定向和输出限制后的复测 |
| `node scripts/with-env.mjs .env.test pnpm --filter specbridge-api test:e2e:ai` | PASS：9项，真实Nest/5434隔离DB+Mock Provider；第一轮8项，补充共享配额/并发后9项 |
| `node scripts/with-env.mjs .env.test pnpm --filter specbridge-api exec vitest run --config vitest.config.integration.ts test/database/auth.integration-spec.ts test/database/requirements.integration-spec.ts` | PASS：23项 |
| `node scripts/with-env.mjs .env.test pnpm --filter specbridge-api test:e2e:auth` | PASS：16项，含编译API与真实Next Rewrite |
| `node scripts/with-env.mjs .env.test pnpm --filter specbridge-api test:e2e:requirements` | PASS：9项，含R04并发/Pending/不可变与真实Next Rewrite |
| `pnpm --filter specbridge-api test:e2e` | PASS：5项基础HTTP/默认Guard/CSRF |
| `pnpm --filter specbridge-api typecheck`、`pnpm --filter web typecheck` | PASS |
| `pnpm --filter specbridge-api lint` | PASS，无warning |
| `pnpm --filter specbridge-api openapi:generate` | PASS：31 paths；生成契约和Web类型 |
| `pnpm --filter specbridge-api openapi:check` | PASS：API生产build与31 paths漂移检查 |
| `pnpm --filter specbridge-api exec prettier --check src/ai test/ai vitest.config.ai-e2e.ts` | PASS |
| `node --check apps/api/scripts/ai-smoke.mjs` | PASS |
| `CI=1 node apps/api/scripts/ai-smoke.mjs --run` | PASS：CI保护生效，输出NOT RUN，没有外部请求；不是实际模型验证 |
| `git diff --check` | PASS |
| `node scripts/with-env.mjs .env node apps/api/scripts/ai-smoke.mjs --run` | PASS：负责人确认Key已更换并授权后，仅一次合成需求真实请求；deepseek-flash，JSON/Zod验证通过，prompt_tokens=225、completion_tokens=306，3129ms，exit 0。最多2048输出tokens/30秒，无自动重试，无正文/密钥输出 |
| 远程CI、人工安全Review、全量浏览器/R01–R08回归 | NOT RUN：仅Phase A定向验证；最终全量留F |

已解决失败：首次HTTP测试误用非直接依赖express，改用既有Nest ExpressAdapter，无新增依赖；沙箱连接5434出现EPERM，获准沙箱外重跑通过。初次Lint两项warning已修复。服务重启中断最后一批工具，先核对已落盘文件，随后取得明确的Auth/契约最终PASS，未将未知结果记为通过。真实Smoke此前因安全Key未确认而NOT RUN；2026-11-12负责人确认更换并授权真实运行，获网络执行许可后一次请求PASS。不存在未解决测试FAIL。

本轮不新增/生成/应用新Migration；测试helper仅复用此前已审迁移，访问5434隔离实例。未访问开发/生产DB。测试HTTP进程由既有teardown退出，既有DB保持运行。构建改动的tracked tsbuildinfo恢复到开工内容；不夹带缓存。CI新增Mock AI套件，不需要真实Key。

人工后续：实际开启API需本地 `DEEPSEEK_ENABLED=true`；Smoke仅在子进程临时启用，.env由本地进程加载，未打印或修改。审阅diff和安全边界后负责人自行Commit。建议摘要：`feat(ai): add authorized DeepSeek requirement analysis with bounded usage (#17)`。不自动Commit/Push/PR/Merge/部署，不开始B。没有持久用量账本、AI正文历史或逐句来源证明；内存配额重启清零，输入字节限额不是精确token计数，真实Observe外部接收未验证。真实Smoke证明Provider/结构化输出与官方API连通，不代替人工内容质量评审或后续浏览器验收。

上下文不足时先写 CHECKPOINT：当前HEAD/diff、完成项、精确命令、失败原因、未完成项和下一步。任何未运行检查标 NOT RUN，不冒称通过。
