> 后续AI工作流D已实现Owner网页确认、本地Codex安装/诊断/卸载；0008获批仅隔离5434应用，当前23表/9迁移。实际Host与人工信任边界见[D证据](evidence/ai-workflow-d/README.md)，[当前检查点](AI_WORKFLOW_CHECKPOINT.md)。本节不改写原R08历史结论。

# R08 — AI & Agent Integration

2026-11-13后续：负责人已批准并要求实施新的项目背景/分步工作稿/Copilot确认执行/Codex接入升级，单独记录在 [AI工作流计划](AI_WORKFLOW_PLAN.md)。A/B/C已实现并通过获批隔离迁移、受影响回归和真实DeepSeek浏览器验证；D随后完成安装授权与受影响联调，[0008](AI_WORKFLOW_D_SQL_REVIEW.md)获批且仅5434应用，E尚未开始；不把该新增范围写成本R08已验证能力。R08本地启用修复已由负责人提交6fb81b8。

批准基线：负责人确认的修订计划；Issue [#17](https://github.com/lithuio/specbridge/issues/17)。一个 Issue、一个最终 PR；A–F 各自独立 Session，每阶段负责人本地 Commit。禁止自动 Commit/Push/PR/Merge/部署。本文首次落盘随 Phase A 实施授权；D先生成最小Schema/SQL并停在审批点，负责人随后回复“已审批”。0004先在隔离测试库应用；F提交后，负责人追加授权在本机开发库应用，已完成，见下方本地启用记录。D/E/F已由负责人分别提交55ad908/d75d39e/922eef1。F本地联调和完整回归已完成，独立人工验收与远程CI仍待办；本地PASS不等于整个Issue DoD或发布批准。

## 基线与阶段

- NestJS 模块化单体，复用 OpenAI SDK/Zod、Session/CSRF、Project Policy、原 R04–R06 写 API；不新增 AI 框架、Redis、向量库或微服务。
- 三角色均可分析有权读取的需求；Client 无 Revision/Ready 权限。AI 只作建议，不自动写业务或商业审计，不审批、不验收。
- Copilot 历史仅浏览器内存，按 epoch/user/project 隔离；历史不可信，业务事实经工具重新授权读取。来源可追溯不等于模型判断正确。
- DeepSeek 官方 origin `https://api.deepseek.com`，当前支持配置 `deepseek-flash`；服务端 Key 不进代码/日志/客户端。Chat Completions 非流式、thinking disabled、JSON mode + 服务端 Zod。未知模型配置 fail closed，不自动换模型。
- 费用采取单实例限额，UTC 日计数、重启清零，不宣称持久账单硬上限；不新增预算表。
- 中文 UI；AI/MCP 为 P1，不阻断 P0。依据 DECISIONS、最新 STATE 和实际脚本解释历史文档，不改变 P0 基线。

| 阶段 | 可运行交付 | 状态 |
|---|---|---|
| A Provider & Analysis | 配置、Provider、授权分析 API、Schema、限额、异常、契约与定向测试 | 已由负责人本地提交6bfe681；真实DeepSeek Smoke PASS |
| B Assistance UI | 原文对照、编辑建议、人工采用到既有表单、stale/未知结果处理 | 已由负责人本地提交 642954a |
| C Global Copilot | Shell 项目助手、内存对话、有界只读工具、来源卡片 | 已由负责人本地提交 9ba8f34 |
| D Project Token | Owner 管理、批准规格投影、已审 Schema/SQL 与测试 | 已由负责人本地提交55ad908；0004已在隔离库及追加授权的本机开发库应用 |
| E MCP & Skill | SDK v2 stdio、两个工具、requirement-analyst、真实 Host 验证 | 已由负责人本地提交d75d39e |
| F Final Integration | 真实 DeepSeek/Web/MCP 与 R01–R08 完整回归、人工 Review、远程 CI | 已由负责人本地提交922eef1；本地自动验证PASS，人工Review与远程CI待完成 |

## A：接口与实现约束

`POST /api/v1/requirements/{id}/ai-analysis`，Session + CSRF；200 标准 envelope。请求严格拒绝未知键：

```ts
{ expectedVersion: number; revisionId?: UUID; includeClarifications?: boolean;
  draft?: { content: string; acceptanceCriteria: string[] } }
```

expectedVersion 为 R04 draftVersion。includeClarifications 默认 true；revisionId 省略时取 latestRevisionId，必须属于同需求。draft 是未保存人类材料。正文沿用 R04 20000、criteria 100 项各 1000 字符限制。读取授权优先于版本和修订检查；无权对象 404、stale 409；不调用模型、不消耗调用配额。澄清超过 500 条或装配输入超过 128 KiB 返回 413，不静默截断；可显式排除澄清后重试。

响应 data：`analysisId,schemaVersion:1,source,result`。source 含 requirementId、draftVersion、revisionId|null、clarificationIds、includesUnsavedDraft、readAt。analysisId 仅关联本次响应，不是持久作业。

result 为 `summary:string, assumptions:string[], openQuestions:string[], acceptanceCriteria:string[], risks:string[]`。严格对象；summary trim 后非空且 ≤1000；数组可空、≤10 项，每项非空且 ≤500；文本合计 ≤6000 UTF-16 code units。JSON 内容 ≤64 KiB；Provider HTTP 响应 ≤256 KiB。拒绝空白、截断、非法 JSON、未知字段、工具调用和类型错误，不自动修复。

所有材料包装为不可信数据；系统提示固定，客户端不能注册工具或指定模型/origin。需求分析服务仅使用只读 Repository；C 工具复用既有授权读取服务。短只读 REPEATABLE READ 快照之后结束事务再请求模型；调用前和返回前重验 Session/项目权限，撤权则丢弃。生成期间版本变化仍返回旧 source，后续 B 禁止直接采用。

新增安全码：503 AI_UNAVAILABLE / AI_INVALID_RESPONSE。上游 401/402/500/503、网络/超时统一 AI_UNAVAILABLE；429 映射 RATE_LIMITED，Retry-After 限 1–300 秒。无配置仅禁用 AI，不影响 Health/P0。SDK retries=0，不将上游 401 解释为用户登录失效。

限额默认：30 秒/调用，8192 output tokens，用户 5 次/分钟，用户/项目/实例日调用 100/200/500；并发用户1/项目2/实例4。调用失败不退日计数，释放并发；计数容量10000，满则拒绝，过期清理。只有通过授权/输入/配置检查才预留；真实 usage 用于观察，未知不伪造为零。输入字节数不等于精确 token 数。

日志只含 requestId、actor/project ID、模型、usage、耗时、结果；没有原始异常、Prompt、正文、Key。AI 路由成功/失败 no-store，Observe 禁止内容捕获和 AI HTTP trace。仅 AI 请求允许 256 KiB JSON，其他路由保留 100 KiB。

## B–F 已批准边界（各阶段独立启动）

B：分析前先保存 Requirement；summary/criteria 填入现有 Revision 编辑器，问题可填单条澄清。AI 不覆盖 originalText；assumptions/risks 默认不当作确认事实。保留分析版本及本地草稿，迟到结果不覆盖编辑。版本变化必须人工对照再更新 expectedVersion；未知写结果不重放。Mark Ready 独立人工操作。不持久保存 AI 正文或逐句来源证据。

C：`POST /projects/{id}/copilot/messages`，当前消息 ≤4000 字符、最多10轮历史，页面资源ID须验证父链；不接收 system/tool 消息。固定工具 get_project_overview、list/get_requirement、list/get_change_request、list/get_delivery；列表20默认/50上限。最多2次工具选择+1次无工具JSON总结，最多4次工具调用，串行及本轮去重；累计8192 output tokens、256 KiB输入、60秒。sources 必须来自本轮实际读取，action仅导航。无跨项目汇总；刷新清空，撤权/换号清空；不新增 DB 聊天表。

D：POST/GET `/projects/{id}/api-tokens`、DELETE `/api-tokens/{tokenId}` 仅 Owner Session+CSRF。新增 api_tokens：uuid id/project_id/user_id、非空name≤100、unique char(64) token_hash、text[] scopes、created_at/expires_at/revoked_at；外键RESTRICT，hash格式/固定scope/期限/撤销时间CHECK，索引(project_id,created_at,id)。Token sbp_+32随机bytes，仅SHA-256，scope approved_specs:read，默认30天/1–90天。每次重验期限/撤销/Owner资格；明文仅创建响应一次且UI关闭/隐藏时销毁。创建/撤销与Owner可见审计同事务，重复撤销不重复审计；响应未知先核对撤销，不自动重试。设计审核→批准生成SQL→实际SQL审核和哈希→批准隔离库应用。A无迁移。

D新增 GET `/projects/{id}/approved-specs` 和 `/{versionId}`：显式认证路由元数据支持Session或独立Token principal，不使用Public绕过，不赋予Token完整Owner身份。混合Cookie/Bearer拒绝；普通业务路由不接受Token；HEAD同等鉴权。只返回精确同版双方批准的技术投影及关联不可变Revision，不返回当前标题/原文、新Revision、报价/工时/工期、审批评论/邮箱。批准范围和引用需求资料分别标注，不自动扩张交付范围。

E：apps/mcp 使用 SDK v2 McpServer/serveStdio，编译后直接node启动；stdout仅协议，stderr脱敏。list_project_requirements 按批准版本列条目，get_approved_spec(versionId)读精确快照；严格input/output schema、structuredContent与一致文本。通过HTTP API，固定可信origin、HTTPS或loopback HTTP，不跟随重定向携带Token；有超时、响应限额和取消。只需SpecBridge Token，不需DeepSeek Key/DB。Skill位于 skills/requirement-analyst/SKILL.md，标准YAML，读取→分析→引用→标记待人审；不写文件/命令/审批。Skill不是宿主沙箱，本方案不是完整HTTP OAuth MCP授权。

F：Mock CI与真实联调分开；真实合成数据DeepSeek、Chromium、MCP SDK Client、Inspector及至少一个真实Agent Host/Skill。完整Lint/typecheck/build/unit/integration/HTTP/DB/browser/OpenAPI/db:check/MCP回归，数据库串行。人工安全Review和远程CI独立记录，不以本地测试代替。

## 本机启用与人工测试交接（2026-11-12，F提交后）

负责人报告本地503并明确要求应用0004及提供全功能人工测试范例。本轮不扩展功能，修复实际运行配置并将已经审核的SQL应用到获授权的开发目标。

- 确认根.env的AI开关未开启；Key存在且开启后配置校验有效。仅设置 `DEEPSEEK_ENABLED=true`，保留其他配置，重新启动标准API进程。原日志0模型调用/4ms符合Provider前的本地配置拒绝；Observe禁用不影响AI。
- 开发目标限定 `127.0.0.1:5433/specbridge`，既有0000–0003哈希/时间戳匹配后，运行现有迁移runner。0004 SHA-256 `7133f1d8fc11ef93f84314dede4257cbba23452dec9ca49a2fdb57ce5cc0bd0a`，迁移4→5，旧15表列定义与行数保持。没有新SQL或生产迁移。
- 真实开发Web→API→DeepSeek PASS：需求分析200且五类结果展示，Copilot200且3次模型请求/2次只读工具/真实来源，需求状态不变；实际Token创建/列表/UI、MCP两工具发现/读取、未批准空目录及撤销拒绝通过。验证使用新建独立合成项目，临时Token和会话结束撤销，不改已有用户项目。
- [本轮结果与截图](evidence/r08-local/README.md)、[完整人工测试范例](R08_MANUAL_TEST.md)。人工手册覆盖分析/选择编辑采用、409、Copilot多轮与隔离、人工同版双重批准、Token/真实MCP/Skill及AI故障降级。已批准详情与完整角色/异常矩阵沿用F隔离库证据，本轮未在开发项目自动批准业务。
- Web3000/API4000保持运行。后续从.env启动需重启最外层 `pnpm dev:api`；终端变量优先，必要时显式 `DEEPSEEK_ENABLED=true pnpm dev:api`。外部宿主的Token连接由用户按手册配置，未修改Codex用户配置。
- 本轮无未解决FAIL；不重复不受影响的完整回归。独立人工Review/远程CI仍待办。未Commit/Push/PR/Merge/部署。

## F 最终联调与交接（2026-11-12，历史记录，后续已提交922eef1）

开工分支 `feat/17-ai-agent-integration`，HEAD `d75d39e`；初始仅 tracked `apps/api/tsconfig.build.tsbuildinfo` 有改动，备份并保留其开工字节，不恢复到HEAD。已阅读AGENTS、A–E交接/STATE/本计划、Issue #17、R07设计、相关业务/授权/AI/Token/MCP源码与测试。仅完成本轮验证范围；没有新增业务功能、生产代码、Schema/SQL、依赖版本或远程操作。

交付：

- 新真实浏览器测试入口 `test:browser:real-ai`，密钥仅API子进程加载；生产Provider真实请求有4次/8192预留输出tokens上限，显式opt-in、禁止CI/Mock混用。验证Draft五类分析→人工编辑选择→R04 expectedVersion保存→真实Copilot工具/版本来源，业务和审计不变量不变。
- 新官方Inspector CLI受控测试，两个工具经真实stdio→Nest→隔离PG读取；凭据只从环境传入，CLI参数仅进程内组装，memory store，不写系统argv/配置/日志。真实Codex Host/Skill重验且可指定F证据目录；真实客户端结束撤销临时Token、清临时目录。
- CI增加4项真实Smoke拒绝检查；保留既有AI/Copilot Mock、MCP SDK/DB和全部浏览器验证，常规CI不依赖付费模型或用户凭据。
- 修复全量回归发现的旧15表/PK/id计数断言，使之精确包含D已审Token表；Copilot axe等按钮启用过渡结束后检查，保留同样阈值。无产品主题/业务改动。

实际验证：

| 检查 | 结果 |
|---|---|
| 根Lint/单元/生产build，API/Web/MCP typecheck | PASS；API128、MCP16，Web25路由 |
| OpenAPI/Web类型漂移、Drizzle db:check | PASS，36路径；迁移SQL未变 |
| 数据库集成 | 最终92 PASS；含升级、事务/并发、不可变历史、Token约束 |
| HTTP/代理/R01–R07业务与Token/MCP回归 | 基础5；Auth16/RBAC13/Requirement9/Change8/Delivery7/reads9/Token9/MCP6 PASS |
| AI/Copilot HTTP/DB Mock | 19 PASS；授权/注入/正文泄露/预算/模型异常 |
| 完整浏览器 | 最终36 PASS；初次Copilot过渡帧失败后定向4+4通过，未重复已通过组 |
| 真实DeepSeek Provider独立Smoke | PASS，225输入/295输出tokens，2405ms |
| 真实DeepSeek浏览器 | PASS 1，16.4s；4请求全部200，6505输入/1791输出tokens，1次实际工具读取，Requirement与Revision真实引用 |
| 官方Inspector2.15.0 | PASS 1；tools/list严格Schema检查，两个tools/call与结果校验 |
| Codex Host0.167.1 / Skill | PASS 1，43.03s；list→detail、范围分离、注入忽略、无写操作；Skill格式PASS |
| CI真实Smoke防护 | 4 PASS；真实模型/外部Inspector默认不执行 |

精确命令、初次FAIL与最终结果、负面矩阵、用量及安全自查见 [F工程证据](evidence/r08-f/README.md)；[真实桌面/手机与键盘证据](../ux/evidence/r08-f/README.md)、[本轮Host合成答案](evidence/r08-f/host-smoke.json) 已逐项查看。六张截图无阻断布局问题，真实AI五状态axe自动违规0；叠层/裁剪对比度与焦点守卫未判定项保留。真实回答偏长、偶有内部状态码，留人工产品验收。

安全自查未发现未解决的越权/自动审批/可变历史/凭据泄露缺陷；不替代独立人工Review。保留单实例内存配额、外部Host独立权限、已返回数据无法撤回等边界。未故意对真实供应商制造402/429/503；异常确定性模拟验证。没有持久聊天正文或扩展为HTTP OAuth MCP。

最终本地无未解决FAIL/实施BLOCKED。NOT RUN：远程CI、独立人工安全/视觉签字、多浏览器/OS/真实手机/读屏/真实200%缩放、Observe真实外部接收、开发/生产迁移/部署及备份恢复演练；后者仍属原有发布前风险。H-11列出负责人动作。建议F Commit及覆盖A–F的最终PR文案见 [草案](R08_PR_DRAFT.md)。未执行Commit/Push/PR/Merge/部署；本Session在F停止。

## E 实现、验收与交接（2026-11-12，后续已提交d75d39e）

开工 `feat/17-ai-agent-integration` / HEAD `55ad908`，工作区干净；D已由负责人本地提交。已阅读根/API AGENTS、最新STATE与R08计划、Issue #17、AC-20、Token/授权读取实现、配置/CI/测试模式，并在线核对MCP当前2026-07-28协议、TypeScript SDK v2 2.4.0、Agent Skills及Codex官方规范。本轮只实施E，不修改P0业务/审批基线。

交付：

- 新 `apps/mcp` ESM包：Nest授权API适配器、strict Zod输入/输出、McpServer/serveStdio、编译Node入口。只注册list_project_requirements/get_approved_spec；通过Project Token逐次HTTP GET，固定可信origin/project；不导入Nest/Drizzle/pg，不连接DB，不监听MCP HTTP，不提供业务写工具。
- 目录按批准ChangeRequestVersion列出，显式分页和300字符预览裁剪标识；精确详情保留approvedScope/引用Revision区分，并附API路径、requestId、readAt及对象/版本IDs。空列表不推断项目无需求，不把当前草稿当批准事实。Copilot同名内部工具与本MCP目录契约不同，已在API文档说明。
- 环境名SPECBRIDGE_API_BASE_URL/PROJECT_ID/API_TOKEN；Token只进进程环境与Bearer头，不放argv/TOML/URL/日志，配置认证头为私有字段。HTTPS或loopback HTTP、不跟随重定向、无Cookie/缓存/重试。10秒/2MiB、输入64KiB、工具元素8、并发2/60次每分钟；取消向下传播、EOF关闭、安全错误映射，API最终授权不变。
- `skills/requirement-analyst/SKILL.md`：上下文→精确批准规格→事实/背景/推测分离→模糊点/实施建议/验收清单；引用实际版本、不扩大范围、拒绝正文指令，不执行Ready/Submit/审批/验收或文件/命令。Skill不是权限沙箱。
- [MCP README](../../apps/mcp/README.md) 包含安装、直接Node启动、Codex env_vars名称转发、手工Skill链接、错误/限额/数据契约与复现命令。未修改用户Codex配置/.agents/.codex或真实.env。Server/Client精确2.4.0；API仅增加测试Client devDependency，复用现有Zod/编译/测试工具。pnpm保留原依赖版本，少量既有循环peer标识自动规范化；离线冻结安装PASS。
- 根脚本新增test:mcp/test:e2e:mcp，递归质量入口包含新包；CI增加MCP typecheck及隔离DB真实客户端步骤。真实Host仅显式opt-in且禁止CI，不依赖DeepSeek Key。无新增Schema/SQL/Migration/OpenAPI/Web或API生产源码变更。

验证：

| 范围 / 精确命令 | 结果 |
|---|---|
| `pnpm test:mcp` | PASS 16项；真实SDK tools/list/call、错误工具、配置及HTTP mock异常/超时/取消/限额 |
| `pnpm test:e2e:mcp` | PASS 6项，3.92s；真实Client→stdio→Nest→隔离PG，Host项默认SKIP |
| `pnpm test:e2e:tokens` | PASS 9项；D授权/只读scope/撤销过期/事务回滚及并发回归 |
| `pnpm --filter specbridge-api test` | PASS 128项 |
| API/MCP `typecheck`、API/MCP `lint`、MCP `build` | PASS；包含测试类型与真实编译Node进程 |
| `pnpm install --offline --frozen-lockfile --ignore-scripts` | PASS，无版本漂移或生命周期脚本 |
| skill-creator `quick_validate.py skills/requirement-analyst` | PASS，Skill is valid |
| opt-in真实Codex Host/Skill | PASS 1项35.36s；实际调用list→detail、精确版本/Revision、排除未批导出和嵌入指令，业务快照不变，无凭据输出 |

真实Host命令：`R08_MCP_HOST_SMOKE=1 node scripts/with-env.mjs .env.test pnpm --filter specbridge-api exec vitest run --config vitest.config.mcp-e2e.ts -t 'installed Codex Host'`。Codex0.167.1，合成项目、内存临时Token、只读临时工作区，禁Shell/插件/hooks/委派/浏览；使用CLI自身登录而不读取凭据文件。首次同场景PASS后，为保存合成答案取证再次PASS，结束撤销凭据/清临时目录。只保留安全断言及验证后的合成分析，原始stdout/stderr不落盘。

[完整测试证据/已解决FAIL/NOT RUN](evidence/r08-e/README.md)，[真实Host合成答案](evidence/r08-e/host-smoke.json)。已阅读该答案并自检批准范围、背景、提议及验收检查区分；一个场景的模型表现不替代通用防注入或人工安全Review。最初stdio测试因沙箱子进程限制2项FAIL，获准外部运行同测试后全部PASS；无未解决FAIL。

NOT RUN：Inspector、多Host/多OS、远程CI、独立人工安全评审、DeepSeek/Web真实联调及完整R01–R08回归，仍留F。未访问开发/生产数据，未新增或修改迁移；D的0004和API tracked构建缓存字节未变。自建测试HTTP/stdio进程已退出，隔离DB保持原运行状态。

人工：审阅diff、MCP安装说明及合成Host答案后自行本地Commit。实际使用须由Owner另发项目Token并在可信本地终端配置；不提供远程HTTP OAuth。单进程配额/宿主保管数据/已返回资料无法追溯撤回仍是边界。建议摘要：`feat(mcp): add project-scoped read-only stdio tools and requirement analyst skill (#17)`。本Session在E结束，不自动Commit/Push/PR/Merge/部署，不进入F。

## D 实现、验收与交接（2026-11-12，后续已提交55ad908）

开工 `feat/17-ai-agent-integration` / HEAD `9ba8f34`，初始工作区干净；已阅读AGENTS、STATE、DATA_MODEL/SECURITY/ADR-002/004、R02 Session/Guard、R03 Project Policy、Database/Audit及测试启动器，在线核对Issue #17。首次生成最小Schema/SQL后按要求停止，未先运行会自动migrate的测试。负责人随后回复“已审批”，本次续接保留候选变更并实施D。

审批对象：[完整SQL Diff及审核记录](R08_D_SQL_REVIEW.md)，`0004_project_api_tokens.sql` SHA-256 `7133f1d8fc11ef93f84314dede4257cbba23452dec9ca49a2fdb57ce5cc0bd0a`。应用前后均核对一致，仅在本机5434/specbridge_test库及账号应用；H-10已完成。9列Token表、PK/hash唯一、5个CHECK、2个RESTRICT FK、分页索引；旧15表及0000–0003 SQL/snapshots/旧journal逐字节保持。

实现：

- Owner Session管理创建/分页列表/幂等撤销，复用CSRF和Workspace→Project事务锁。256-bit随机sbp_凭据，数据库仅SHA-256；固定approved_specs:read、默认30/整数1–90天。每次读取重验创建者Owner资格、ACTIVE项目、未撤销/未过期和精确scope；新Owner可撤销旧Token。归档/资格丢失动态不可用，永久失效用撤销。
- 两条显式授权GET/HEAD批准规格路由使用独立Token principal，不赋Owner Session。拒绝混合Cookie/Bearer、重复头、跨Project/Workspace及所有普通业务读写。精确同版不同人VENDOR→CLIENT批准，技术范围与引用不可变Revision分开；不读最新草稿/原文/当前标题、商业报价/工时/工期或审批评论/人员邮箱。
- 创建、撤销、成功使用与审计同事务。使用actor=null并标明project_token；仅保留必要元信息。Owner-only事件在SQL分页前过滤，Developer不因“非Client”获得访问。读取锁与撤销串行；撤销先提交则已认证但尚未读取的请求也失败。已经提交的读取响应不能追溯撤回。
- 复用单进程限流：创建30/用户/分钟，Bearer120/连接IP/分钟及60/Token/分钟，429有Retry-After。不信任XFF；反向代理用户会共享IP配额。列表1–100条、固定排序，不引入Redis或持久配额。
- 项目导航Owner专属“访问凭据”，默认只读、期限输入、一次性明文和撤销确认。明文只在组件内存，不入Query/Mutation缓存、URL或浏览器持久存储；关闭、切页、后台、权限丢失和身份边界销毁；取消请求并丢弃迟到响应。创建响应未知先核对并撤销，不自动重发。15秒客户端等待上限不能证明服务器未提交。用户主动复制后自行保管系统剪贴板。
- 沿用R07 Shell/组件；审计UI支持三种Token事件及Owner管理链接。OpenAPI与Web类型更新至36路径，no-store覆盖错误，Observe忽略Token路由，全局捕获关闭、敏感模式脱敏。无新依赖/环境变量/DeepSeek调用，CI不需真实Key。没有MCP Server/Skill/OAuth实现，未进入E。

| 实际命令 / 检查 | 结果 |
|---|---|
| `pnpm db:migrate:test` | PASS；守卫校验隔离库/账号身份；获批0004应用成功；后续各套件重复migrate无变化 |
| `pnpm --filter specbridge-api test` | PASS；13文件128项，包含Token随机凭据/规范编码、输入及Owner-only审计单元验证 |
| `pnpm test:e2e:tokens` | PASS；最终9项3.82秒：真实HTTP/DB创建列表撤销过期、scope/CSRF/跨租户、伪造/混合/重复凭据、GET/HEAD、批准投影、Owner变化/归档、审计事务回滚、真实锁等待撤销竞争、限流与日志/错误不泄露 |
| `node scripts/with-env.mjs .env.test pnpm --filter specbridge-api exec vitest run --config vitest.config.integration.ts test/database/api-token-migration.integration-spec.ts test/database/auth.integration-spec.ts test/database/rbac.integration-spec.ts` | PASS；3文件19项；升级前后15表数据不变、FK/unique/name/hash/scope/期限/撤销约束、Auth/RBAC真实事务 |
| `node scripts/with-env.mjs .env.test pnpm --filter specbridge-api exec vitest run --config vitest.config.integration.ts test/database/api-token-migration.integration-spec.ts` | PASS；补充多维scope拒绝并修正同一pg client并行查询后，2项464ms，无pg并发查询弃用警告 |
| `node scripts/with-env.mjs .env.test pnpm --filter specbridge-api exec vitest run --config vitest.config.auth-e2e.ts` | PASS；16项，真实Auth HTTP及编译API/Next代理 |
| `node scripts/with-env.mjs .env.test pnpm --filter specbridge-api exec vitest run --config vitest.config.rbac-e2e.ts` | PASS；最终13项3.90秒，三角色项目授权与代理 |
| `node scripts/with-env.mjs .env.test pnpm --filter specbridge-api test:e2e:reads` | PASS；9项，R07读取/审计/父链/能力与实际HTTP契约 |
| `pnpm test:browser:tokens` | PASS；最终4场景7.7秒，真实Next/Nest/Chromium/隔离PG；创建→空批准读取→撤销→401、后台/Activity切页/刷新清除、迟到结果丢弃、未知创建不重放、Developer/Client直接路由拒绝、键盘与320/390/1440重排 |
| `pnpm --filter specbridge-api typecheck`、`pnpm --filter specbridge-api lint`、`pnpm --filter web typecheck`、`pnpm --filter web lint` | PASS；最终无lint警告 |
| `pnpm --filter specbridge-api openapi:generate`、`pnpm --filter specbridge-api openapi:check` | PASS；包含API生产build，36路径生成及零漂移；Web生产build也PASS |
| `pnpm --filter specbridge-api db:check`、SQL SHA-256、旧表/snapshot/journal逐字节对照、`git diff --check` | PASS |
| [截图与可访问性证据](../ux/evidence/r08-d/README.md) | PASS；桌面列表/手机撤销确认2张已逐张查看，无明文；三状态axe违规0，手机裁剪导航颜色未判定项保留并补充计算对比度 |

已解决的FAIL：默认沙箱5434连接EPERM、Turbopack临时端口限制（获授权重跑并保留失败缓存于/tmp）；OpenAPI正整数exclusiveMinimum与现有Ajv兼容问题（改为等价min(1)）；单元测试undefined/null断言；重复头测试TS类型；pg同客户端并行查询弃用警告；Dialog动画中取证、切页尚未提交即reload的测试竞态；RBAC代理与浏览器占用同端口（改串行）。最终无未解决FAIL。既有Node NO_COLOR/FORCE_COLOR提示不影响浏览器结果。

NOT RUN：开发/生产Migration、真实DeepSeek、MCP/Skill/HTTP OAuth、真实Observe外部接收、远程CI、独立人工安全/视觉评审、Firefox/WebKit/真实设备/读屏及R01–R08完整回归。D不调用模型；最终整体验证留F，不将本地PASS当远程CI或人工签字。

收尾：自建测试HTTP子进程已退出，隔离测试DB保持原运行状态；未访问开发业务数据或读取/修改.env。tracked API构建缓存恢复为开工内容。负责人审阅diff及证据后自行本地Commit；开发/生产迁移另行审批。建议摘要：`feat(auth): add owner-managed project API tokens for approved specs (#17)`。本Session停在D，不Commit/Push/PR/Merge/部署，不进入E。

## C 实现、验收与交接（2026-11-12，后续已提交9ba8f34）

仅实施 C。开工分支 `feat/17-ai-agent-integration`，HEAD `642954a`，工作区干净，B 已由负责人提交。已阅读根/API/Web AGENTS、最新交接、R07读取与Dashboard、授权服务、DeepSeek Provider/限额和现有UI组件；在线核对 Issue #17 与 [DeepSeek Tool Calls](https://api-docs.deepseek.com/guides/tool_calls/)、[Chat Completions](https://api-docs.deepseek.com/api/create-chat-completion/)。复用当前 deepseek-flash 非思考模式工具调用，不启用 beta strict，工具参数和最终 JSON 均由服务端 Zod 验证。

实现与边界：

- `CopilotController/Service/Tools` 与严格契约新增于 `apps/api/src/ai`。复用 Provider 的受限 HTTP transport，分析继续拒绝工具响应；首次工具选择 required，第二次 auto，最后请求完全不带 tools 并要求 JSON。不使用第三方 Agent 框架。
- 七个注册工具只调用现有 Projects/Requirements/Changes/Deliveries 授权读取方法；构造器类型也限制为读取方法。Dashboard 的既有查询从 Controller 提取到 Service 供复用，原 HTTP 契约不变。模型不能提交 projectId、任意SQL/Shell、审批、验收或写文件；整个 batch 参数先校验再读取，每个对象的真实项目归属再检验。
- Session/当前项目/初始角色在模型调用、工具读取及返回前复核。页面父链先授权再传模型；Client商业draft由现有 ChangesService 剔除。每次短只读事务后结束，再等待模型，不跨推理持锁；不同工具读取可能时间不同，以各来源readAt为准。
- 仅本轮真实读取生成 sources，提供项目/对象ID、编辑版本或不可变Revision/变更版本/交付编号、时间和服务端站内链接。模型只返回来源编号，未知引用拒绝；不是逐句事实证明，状态推断仍须人工查看来源。
- 按批准基线限制10轮历史、4工具、2次选择+1次总结、60秒、累计256 KiB输入/8192输出tokens。历史24 KiB和工具正文有标记裁剪，单请求仍≤128 KiB，单工具含来源≤48 KiB；过大413。配置可降低总输出预算，每次选择预留1/4，总结使用剩余预算。模型usage不能突破每次预留。
- A/C共享内存配额：一次分析或一次Copilot轮次算一次用户/项目/实例请求、占一个并发槽；Copilot轮次最多包含3次模型HTTP请求，总输出预算受同一上限约束。计数不是精确成本账本，重启清零。日志仅标识符、调用次数、输入字节、预留输出预算、耗时和成功标记；无聊天/工具正文/Prompt/Key。Observe排除Copilot路由。
- Web Shell顶部全局入口、右侧Drawer、当前项目/页面上下文；无项目先选授权项目。支持多轮自然语言、阻塞点/人工下一步、来源跳转、空项目、503/429/格式或来源错误/65秒浏览器等待上限及手动重试。工具名/Token实现细节不出现在用户操作流程中。
- 聊天不进入数据库/QueryCache/localStorage，按epoch/user/project隔离；最多保留10轮，后端再次裁剪历史。刷新/换项目或账号清空；同项目页面切换保留已完成轮次。关闭/切页取消在途请求，迟到结果丢弃；重开先核验项目，明确失权清除，临时故障隐藏但保留输入。历史始终为不可信文本，业务事实重新工具读取。UI只渲染纯文本，保持R07样式及Dialog键盘焦点，无Shell重设计。
- 无新增依赖、数据库表、Migration、Token/MCP/Skill实现；未修改任何业务写流程或自动Ready/Submit/审批/验收。OpenAPI及Web生成类型已更新为32路径。独立测试transport扩展支持工具调用，生产main无Mock开关；CI已通过既有入口纳入C，真实Key不参与CI。

最小测试矩阵与实际结果：

| 验证 | 实际结果 |
|---|---|
| Provider/编排/Schema单元 | PASS；包含非法工具/参数、空或错误JSON、重复call ID、4调用去重、伪造来源、最终阶段再调工具、截断输出、历史裁剪、累计输入/输出预算、角色降级、60秒总期限 |
| 真实授权HTTP + 隔离DB + 模拟外部transport | PASS；C10项 + A9项，三角色读/版本来源、Client商业草稿不入模型、七个工具、同Owner跨项目/外部成员/错误父链、Session/CSRF、限额、402/429/503、注入、推理期间撤会话/成员；业务和审计前后相同 |
| Chromium + 生产Next/Nest + 隔离DB + 模拟外部transport | PASS；C4场景，多轮、来源与版本、项目选择/空数据/换项目、503/429/无效来源/前端超时/权限撤回、输入保留、手动入口正常、关闭取消与迟到响应隔离、Tab/Shift-Tab/Escape/返回焦点 |
| 视觉/响应式 | PASS；桌面1440×1000、手机390×844两张截图已逐张查看；320/390/1440无横向溢出。三状态axe自动违规0，未判定项保留；补充计算对比度5.94–16.03:1，非独立人工可访问性认证 |
| 真实DeepSeek端到端Smoke | PASS；真实Session HTTP→Provider→实际授权工具→JSON/来源验证。模型deepseek-flash，HTTP200，3次模型请求、2次工具、2个真实需求/Revision来源，4096预留输出tokens，9646ms；业务及审计未变化。只用合成资料，未输出聊天/密钥 |

精确命令（隔离数据库5434；本机端口/Chromium/Turbopack需要沙箱外执行授权）：

| 实际命令 | 结果 |
|---|---|
| `pnpm --filter specbridge-api typecheck`、`pnpm --filter specbridge-api lint` | PASS；最终类型/静态检查 |
| `pnpm --filter specbridge-api test` | PASS；最终12文件125单元测试 |
| `pnpm --filter specbridge-api openapi:generate`、`pnpm --filter specbridge-api openapi:check` | PASS；含生产build，32 paths；Web类型由脚本生成 |
| `pnpm test:e2e:ai` | PASS；2文件19项，5.01秒 |
| `node scripts/with-env.mjs .env.test pnpm --filter specbridge-api test:e2e:reads` | PASS；9项，4.69秒，含Dashboard与读取契约 |
| `node scripts/with-env.mjs .env.test pnpm --filter specbridge-api test:e2e:auth` | PASS；16项，12.57秒，含HTTP及编译Next代理 |
| `node scripts/with-env.mjs .env.test pnpm --filter specbridge-api test:e2e:requirements` | PASS；9项，5.04秒，含HTTP及编译Next代理 |
| `pnpm --filter web build`、`pnpm --filter web typecheck`、`pnpm --filter web lint` | PASS；生产build及最终检查 |
| `pnpm test:browser:copilot` | PASS；最终4场景12.2秒，截图及可访问性重采 |
| `R07_EVIDENCE_ROOT=test-results/evidence pnpm test:browser:auth` | PASS；6场景6.2秒 |
| `R07_EVIDENCE_ROOT=test-results/evidence pnpm test:browser:ai` | PASS；6场景50.8秒，包含既有35秒真实浏览器等待超时 |
| `R07_EVIDENCE_ROOT=test-results/evidence pnpm test:browser:integration` | PASS；三角色纯UI全链路与Dashboard聚合，1场景20.6秒 |
| `node scripts/with-env.mjs .env node scripts/with-env.mjs .env.test node apps/api/scripts/copilot-smoke.mjs --run` | PASS；仅一次完整真实对话，不自动重试；上表记录真实计数 |
| `CI=true node apps/api/scripts/copilot-smoke.mjs --run` | PASS保护检查；输出NOT RUN并exit0，未调用真实模型 |
| `node --check apps/api/scripts/copilot-smoke.mjs`、`node --check apps/api/scripts/browser-ai-fixture.mjs`、`git diff --check` | PASS |

已解决FAIL：沙箱5434/本地端口权限阻止测试和Smoke启动（0次模型请求）；Turbopack CSS绑定端口EPERM及其失败缓存，移开自己生成的缓存后获准构建通过；测试夹具误在READY需求添加问题（改用独立不可信原文需求）；浏览器夹具误把新Revision当DRAFT（实际CLARIFYING）；Tab测试过早读取异步焦点（等待项目输入可用及焦点转移后验证）。最终无未解决FAIL。浏览器超时场景只缩短原生65秒timer用于定向验证，后端60秒由fake timers验证；没有声称真实等待65秒。

NOT RUN：远程CI、独立人工安全/视觉评审、Firefox/WebKit/真实设备/读屏、真实DeepSeek浏览器联调、真实Observe外部接收、完整R01–R08回归。真实Smoke覆盖HTTP/编排/工具，但浏览器端到端使用模拟外部transport；最终全量与MCP/Host联调留F，不以本阶段结果替代。

交接：契约见 [API.md](../architecture/API.md)，安全边界见 [SECURITY.md](../architecture/SECURITY.md)，启动与真实Smoke见 [DEVELOPMENT.md](DEVELOPMENT.md)，证据见 [C截图](../ux/evidence/r08-c/README.md)。负责人审阅diff/截图后自行本地Commit，建议 `feat(ai): add scoped read-only project copilot with verified sources (#17)`。实际服务启用仍需服务端安全Key及 `DEEPSEEK_ENABLED=true`；Smoke只临时改变子进程环境，未编辑.env。未Commit/Push/PR/Merge/部署；本Session在C停止。D的Token表/SQL需独立设计与生成/应用审核，当前没有生成或应用新Migration。

## B 实现、验收与交接（2026-11-12，后续已提交642954a）

本 Session 仅 B。开工分支 `feat/17-ai-agent-integration`，HEAD `6bfe681`，工作区干净；Phase A 已由负责人提交。在线核对 Issue #17、AC-18/19 及 AC-06/08/16，阅读 R07 设计、已安装 Next 的 Client Components/Activity 文档与 R04 编辑器。没有更改 App Shell、业务 API/权限/状态机、依赖、Schema 或 Migration，没有读取真实 `.env` 或调用真实模型。

实现范围：新增 `apps/web/src/features/requirements/analysis.tsx`；详情接入面板，既有编辑器增加一次性 AI 草稿预填；局部 R07 样式；独立测试 Provider transport 启动脚本、浏览器入口与六场景、文档和截图。生产服务不提供 Mock 切换点。

- 先通过既有流程保存 Requirement，详情页原文下方分析；包含最新 Revision，可选择排除澄清。当前打开表单必须先保存/关闭才能发起新的分析或采用；已在生成中的分析不会阻止手动编辑，也不会覆盖表单。
- 五类结果明示「AI 草稿」。摘要/验收标准默认不选中，问题单选；所有建议可编辑/删除。假设与风险仅待核实推断，不自动写入事实。结果及来源版本保存在页面内存，展示读取时间、问答数量、可点击的来源 Revision。
- 「确认采用」只把摘要/criteria 填入新 Revision 编辑器，或把一条问题填入澄清编辑器；摘要不选时保留原有规格正文，criteria 保留已有标准并追加去重，R04 表单校验合并后的总长度/数量。只有再次保存/提交问题才调用既有写 API。AI 不覆盖 originalText，不更新不可变 Revision，不 Mark Ready/Submit/审批。
- 生成结束重读当前需求。source.draftVersion 过期时保留建议但禁采用，必须人工对照新资料后确认。采用后的写入继续使用 R04 expectedVersion；409 保留输入并要求再次确认版本，未知结果禁重放。原始分析来源版本始终保留，不因人工核对而伪装成新分析。
- Loading、35 秒浏览器等待上限、503/格式错误/413/429/网络失败均有安全反馈；重试只由人触发，429 等待 Retry-After。服务端超时与其他 AI_UNAVAILABLE 不做虚假的原因区分。AI 失败可继续手动保存。
- AbortController/请求身份检查取消隐藏页面的在途工作，结合现有 epoch/user/project 边界处理会话恢复、撤权和退出。同身份临时读取失败保留编辑；明确失权清除。控件 ID 和 radio 组按组件隔离，兼容 Next 保留隐藏页面；删除后焦点留在建议组。纯文本显示，不执行模型 HTML/指令，不使用 localStorage，不输出模型正文到日志。

最小验收矩阵（真实 Next 生产构建 / Nest / 5434 隔离 PostgreSQL / Chromium；仅外部模型 transport 为固定合成响应）：

| 场景 | 已验证结果 |
|---|---|
| Draft 从 UI 创建、五类结构化结果、选择/编辑/删除/采用 | 分析与采用前后业务读取完全相同；人工保存后才新增 Revision，原文保留且不自动 Ready |
| 生成期间编辑与版本变化 | 迟到结果不覆盖手动内容；旧 source 禁采用，明确核对后继续 |
| 采用后并发保存 | 实际 R04 POST 返回409；正文保留、禁重试，人工更新 expectedVersion 后成功 |
| 503/非法结构/413/429/409/35秒等待超时 | 安全提示、Retry-After 倒计时、手动草稿保存正常；失败后显式重试成功 |
| Client 与不可信文本 | 只能采用一条问题，无 Revision 入口；HTML 字符串不执行；换 Client 后移除私有审阅 |
| 不可变历史与未知结果 | 旧 Revision 可追溯且内容未改；写成功但503响应后禁止自动/重复写入 |
| 生命周期与父链 | 项目500/同用户复核保留；切页取消迟到响应；错项目URL拒绝；不同需求控件及草稿隔离；退出清除 |
| R07 视觉/可访问性 | 桌面1440、手机390截图；320/390/768/1440无横向溢出；删除焦点；两状态axe自动违规0，未判定项保留 |

| 实际命令 / 检查 | 结果 |
|---|---|
| `pnpm run db:test:up` | PASS；确认既有隔离库健康，首次沙箱 Docker socket 拒绝后获准重跑 |
| `pnpm --filter specbridge-api build` | PASS；编译既有 API 供浏览器运行 |
| `pnpm --filter web build` | PASS；最终生产构建。首次沙箱 CSS 编译端口 EPERM、缓存重复失败，移开失败缓存后获准重跑通过 |
| `pnpm --filter web typecheck`、`pnpm --filter web lint` | PASS；最终类型与 ESLint 无错误/警告 |
| `pnpm run test:browser:ai` | PASS；六场景52.3秒，含真实35秒超时；最终控件隔离后的相关场景另定向复测，见下方补充记录 |
| `R08_AI_FIXTURE=1 node scripts/with-env.mjs .env.test pnpm --filter web test:e2e ai-assistance.spec.ts --grep '真实 Draft\|审阅编辑跨'` | PASS；最终2场景8.7秒，验证删除焦点、桌面/手机截图、不同需求控件ID/radio分组、读取失败/切页/退出隔离 |
| `R08_AI_FIXTURE=1 node scripts/with-env.mjs .env.test pnpm --filter web test:e2e ai-assistance.spec.ts --grep '真实 Draft'` | PASS；最终1场景5.0秒，修正取证滚动位置后重采4张截图；断言摘要、手机正文及保存按钮确实进入视口 |
| `R07_EVIDENCE_ROOT=test-results/evidence pnpm run test:browser:requirements` | PASS；2场景16.7秒，包含 Pending/Ready/409/不可变历史 |
| `R07_EVIDENCE_ROOT=test-results/evidence pnpm run test:browser:forms` | PASS；6项12.5秒（5 Chromium 场景+1会话状态测试） |
| `R07_EVIDENCE_ROOT=test-results/evidence pnpm run test:browser:auth` | PASS；6场景6.1秒，含切号、迟到响应、401/网络恢复与手机Shell |
| `node --check scripts/browser-stack.mjs`、`node --check apps/api/scripts/browser-ai-fixture.mjs`、`git diff --check` | PASS |
| 真实 DeepSeek 浏览器调用、远程 CI、独立人工视觉/安全评审、R01–R08全量回归 | NOT RUN；B 使用模拟外部 transport，A 的历史真实 Smoke 不充作 B 浏览器模型联调；最终全量与真实联调留 F |

首次新增类型检查误用 capability 字段名，已改为既有 allowed/reasonCode 判别联合并复测。测试服务首次受沙箱监听限制未启动，获准外部运行后通过。移缓存第一次跨设备 rename 失败，改用安全移动后成功。最后补充测试曾错误要求切换动态 Requirement 再返回必定保留 AI 内存；既有 keyed 详情可能重建，该保证不在本阶段契约中。保留临时读取失败/同身份复核的严格输入保持断言，改为验证不同需求的控件与输入隔离、退出清除，最终2项PASS。截图自检发现平滑滚动尚未完成；新增视口断言又发现手机表单高于视口，改用即时滚动和表单末端定位后重采，最终1项PASS。没有将这些失败记为 PASS，也没有启用测试自动重试掩盖失败；最终无未解决实现 FAIL。

正式截图及证据：[B evidence](../ux/evidence/r08-b/README.md)。测试只用公开一次性合成账号/数据和5434隔离库，启动器复用此前已审迁移，未生成/应用新SQL；不访问开发/生产DB。测试自建HTTP服务退出，既有测试DB保持运行；tracked API 构建缓存恢复开工内容。Mock浏览器入口加入全量脚本，CI不依赖真实密钥；历史R07截图未覆盖。

人工后续：审阅diff、桌面/手机截图、AI内容质量及未判定可访问性项，自行本地Commit；实际调用需服务端 `DEEPSEEK_ENABLED=true` 与安全Key。页面内存草稿可能因刷新/路由缓存淘汰丢失，不提供持久来源历史或费用硬上限；B 不代表最终发布验收。建议提交摘要：`feat(web): add human-reviewed AI requirement assistance (#17)`。本 Session 到 B 停止，未 Commit/Push/PR/Merge/部署，不开始 C。

## A 验证与交接（历史记录，后续已提交 6bfe681）

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
