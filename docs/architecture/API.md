# SpecBridge REST API 契约（设计基线）

## R08 Phase C — 项目 Copilot（2026-11-12）

`POST /api/v1/projects/{id}/copilot/messages`：Session + CSRF，三角色仅在当前授权项目内读取，所有结果 no-store。无聊天表、业务写入或商业审计；认证活动时间更新沿用现有契约。

- 严格请求 `{message, history?:[{user,assistant}], page?}`：message ≤4000 字符；history ≤10轮，每条 user≤4000 / assistant≤6000，全部作为不可信用户数据，不接受角色或 system/tool 消息。禁止未知字段/query、客户端模型配置或工具注册。
- page：`{kind:'overview'|'dashboard'|'requirements'|'changes'|'deliveries'|'members'|'audit'}`；或 `{kind:'requirement',id,revisionId?}`、`{kind:'change',id,versionId?}`、`{kind:'delivery',id}`。UUID 父链先由已有授权服务验证，再进入模型。项目从路由绑定，工具参数不能覆盖。
- 200 `{data:{conversationTurnId,projectId,result,sources,context},meta:{requestId}}`。result 包含 answer≤3000、blockers≤8×500、nextSteps≤8×`{text≤500,sourceIds}`、sourceIds；合计文本≤6000字符。所有文本仅为未批准建议。来源编号每组1–12个，必须出自本轮实际工具读取，伪造编号安全失败。
- sources：`{key,type,id,projectId,title,version,href,readAt}`。type 为 project/requirement/revision/change_request/change_version/delivery；href 和版本由服务端生成，只导航真实业务对象。项目/列表注明实时或分页快照；可变对象注明 draftVersion/lockVersion，不可变对象注明 Revision/versionNo/交付编号。旧版本阶段依据该版本审批记录判断，不能套用变更当前状态。来源可追溯不保证模型的文字判断正确。
- context：`{historyDropped,truncated,toolCalls}`，明确历史/正文裁剪；分页和片段不能解释为完整项目。历史先裁剪到24 KiB，工具正文字符串默认1500字符、数组20项，较大结果再裁剪为300字符/10项；单工具序列化内容含来源≤48 KiB，否则413。
- 固定七工具：get_project_overview、list_project_requirements、get_requirement、list_change_requests、get_change_request、list_deliveries、get_delivery。列表 limit 默认20/最大50，offset 0–10000；详情只接受 id 及适用的 revisionId/versionId；概览 bucket=mine/waiting/completed，默认mine。每次读取复用已有项目授权服务，并检验实际 projectId；Client 不含供应方 draft。未注册工具、额外参数、错误类型及重复 call ID 拒绝。
- 每轮≤2次工具选择+1次无工具JSON总结、≤4次工具调用，串行执行、本轮同参数去重；输出预算为 `min(DEEPSEEK_MAX_TOKENS,8192)`，每次选择预留四分之一，总结使用余额，不因前次少输出扩大总额度。单请求输入≤128 KiB、整轮累计≤256 KiB；单次模型≤30秒、整轮含授权/工具≤60秒。历史字节限制不是精确 input token 计费。
- 与需求分析共享用户/项目/实例配额；每次 API 对话轮次预留一次计数和并发槽，最多含3次模型请求，输出总预算相同。调用失败不退日计数；无自动重试。调用模型前/工具读取前/返回前重验 Session、项目及角色；权限撤销或角色改变则丢弃在途结果。
- 400非法请求；401Session失效；403CSRF；404不可见项目/对象/父链或在途角色变更；413上下文过大；429 RATE_LIMITED 带 Retry-After；503 AI_UNAVAILABLE / AI_INVALID_RESPONSE。沿用 Phase A 的供应商超时、402/429/503、空/非法JSON处理。日志不记录聊天、工具正文或完整Prompt。

实际实现、测试和限制见 [R08_PLAN](../engineering/R08_PLAN.md)。Project Token 已在 D 实现（见下文）；E 的本地 MCP 复用批准读取 API，见 [MCP 契约](../../apps/mcp/README.md)。注意 Copilot 内部的同名 `list_project_requirements` 按 Session 读可见需求，而 MCP 工具仅按项目 Token 列出批准版本，两者不是同一权限/响应契约。

## R08 Phase A — 需求分析（2026-11-12）

`POST /api/v1/requirements/{id}/ai-analysis`：Session + CSRF；Owner/分配 Developer/绑定 Client 仅可分析可见需求。200 `{data:{analysisId,schemaVersion:1,source,result},meta:{requestId}}`。不创建作业/业务记录或 Revision，不触发 Ready/审批。所有响应 no-store。

- 请求：`{expectedVersion,revisionId?,includeClarifications?,draft?:{content,acceptanceCriteria}}`；严格禁止未知字段/query。expectedVersion 为正整数 R04 draftVersion。includeClarifications 默认 true；指定 Revision 必须属于同需求，省略读取当前 latestRevisionId。draft 是未保存人类输入，沿用 R04 长度限制。
- source：requirementId、draftVersion、revisionId|null、clarificationIds、includesUnsavedDraft、readAt；生成期间版本变化不更新 source。客户端未来采用时必须人工核对版本并调用既有写 API。
- result：summary:string、assumptions/openQuestions/acceptanceCriteria/risks:string[]。全部为不可信 AI 草稿，不表示客户确认。summary 非空≤1000，各数组≤10项，每项非空≤500；合计≤6000 UTF-16 code units。数组可空。
- 401无效Session；403 CSRF；404无权/不存在/Revision父链错误；400输入/query错误；409 STALE_VERSION；413输入过大。分析最多500条澄清、装配材料128 KiB、输出8192 tokens；不静默截断。
- 429 RATE_LIMITED（本地用户/项目/实例限额或上游429），带 Retry-After。503 AI_UNAVAILABLE（禁用/配置/上游认证、402、500/503、网络或超时）；503 AI_INVALID_RESPONSE（空白/截断/非法JSON/Schema/输出超限）。供应商401不返回为浏览器401，不透传任何原始供应商错误。
- 调用前后重验项目权限/Session；模型等待不持有DB事务/锁。AI数据查询仅SELECT，已有Session认证正常活动时间更新保持原契约。
- OpenAPI 与 Web 类型已纳入生成/漂移检查。模型调用参数、限额和后续B–F计划见 `../engineering/R08_PLAN.md`。Phase A 无Web界面、Copilot、Token或MCP实现。

> R07 Phase A 增量读取契约另见 [R07_READ_MODELS.md](R07_READ_MODELS.md)：七个 GET、capabilities、Audit 白名单和 Dashboard 定义。这些增量已在 Phase B 本地实现并生成 OpenAPI；不改变下文 R02–R06 已有写契约。

> v0.2（P0 需求基线已确认）｜Base Path：`/api/v1`｜API-01～30、API-32 与 Client 绑定已有本地实现；其余业务接口仍为设计基线。后续 NestJS 生成 OpenAPI，必须与本文保持一致。

## 1. 统一约定

- 浏览器以同源 `/api/v1/*` 访问，由 Next.js Rewrite/Caddy 转发 NestJS；不将数据库连接或密钥暴露给 Web。
- Session Cookie 认证；所有非公共写请求需有效会话与 CSRF/Origin 校验。所有对象端点必须做项目级授权。
- JSON 时间为 ISO-8601 UTC；ID 为 UUID；金额为整数最小单位 `costDeltaMinor` + 3 位 ISO `currency`；v1 列表统一 `limit`（1–100，默认 20）和 `offset`（非负安全整数，默认 0）。
- Requirement/ChangeRequest 的已有状态写请求使用 `expectedVersion` 进行乐观并发校验（Requirement 为正整数，CR 为非负整数），不接收客户端输入的审批人身份/时间。
- Idempotency v1 简化：数据库唯一约束+状态机防重复，重复审批返回 409；POST 创建操作建议支持 `Idempotency-Key`，但不作为首版必须，具体见 ADR。

### 统一成功/错误

```json
{"data":{"id":"UUID","status":"SUBMITTED"},"meta":{"requestId":"req-abc"}}
```

```json
{"error":{"code":"STALE_VERSION","message":"Resource was modified; reload and retry.","requestId":"req-abc","details":[]}}
```

**错误码约定**：400 `VALIDATION_ERROR`；401 `UNAUTHENTICATED`；403 `FORBIDDEN`；404 `NOT_FOUND`；409 `STALE_VERSION`/`INVALID_TRANSITION`/`ALREADY_REVIEWED`；422 `BUSINESS_RULE_VIOLATION`；429 `RATE_LIMITED`；503 `AI_UNAVAILABLE`。隐藏资源 404；同项目无权操作 403。

## 2. 路由清单（P0）

| ID | 方法 + 路径 | 权限 | 请求/响应要点 |
|---|---|---|---|
| API-01 | `POST /auth/register` | Public | email、password、displayName → user id |
| API-02 | `POST /auth/login` | Public | email、password → Set-Cookie + user |
| API-03 | `POST /auth/logout` | Auth | 撤销 Session → 204 |
| API-04 | `GET /me` | Auth | 仅 user；列表使用独立端点 |
| API-05 | `GET /workspaces` | Auth | 当前用户以 Owner/Developer 身份所属的 Workspace；Client 绑定不产生 Workspace 入口 |
| API-06 | `POST /workspaces` | Auth | name → Workspace，创建者自动 Owner |
| API-07 | `GET /workspaces/{workspaceId}/members` | Owner | Workspace 用户和角色 |
| API-08 | `POST /workspaces/{workspaceId}/members` | Owner | 以**已注册邮箱**加入 Developer，无邮件邀请 |
| API-09 | `GET /projects?workspaceId=...`（筛选可省略） | Auth | 始终按项目授权过滤；省略 workspaceId 返回全部获授权项目 |
| API-10 | `POST /projects` | Owner | workspaceId、name、baselineScope |
| API-11 | `GET /projects/{projectId}` | Project member / Owner | 项目信息、允许展示的成员字段 |
| API-12 | `POST /projects/{projectId}/members` | Owner | `{userId,role:"DEVELOPER"}`，只允许已有 Workspace Developer 加入项目；Client 通过独立 PUT 接口指定 |
| API-13 | `GET /projects/{projectId}/requirements` | Project viewer | 分页列表、状态、当前版本号 |
| API-14 | `POST /projects/{projectId}/requirements` | Project member | title、originalText → Draft |
| API-15 | `GET /requirements/{requirementId}` | Project viewer | 原始需求/澄清/最新版本 |
| API-16 | `PATCH /requirements/{requirementId}` | Draft 作者或 Owner | 标题/草稿正文；带 expectedVersion；不改变原始需求已形成的 Revision |
| API-17 | `POST /requirements/{requirementId}/clarifications` | Project member | expectedVersion、kind QUESTION/ANSWER、parentId、body |
| API-18 | `POST /requirements/{requirementId}/revisions` | Owner/Developer | expectedVersion、content、acceptanceCriteria → 不可变 Revision |
| API-19 | `GET /requirements/{requirementId}/revisions` | Project viewer | Revision history |
| API-20 | `POST /requirements/{requirementId}/mark-ready` | Owner/Developer | expectedVersion；必须有有效最新 Revision → Ready |
| API-21 | `POST /requirements/{requirementId}/change-requests` | Owner/Developer | 以最新 Ready Revision 新建 Draft ChangeRequest |
| API-22 | `GET /change-requests/{changeId}` | Project viewer | 当前摘要/草稿/冻结 Version/审批历史（字段按角色裁剪；交付另见 API-28～30） |
| API-23 | `PATCH /change-requests/{changeId}` | Owner/Developer | 仅 Draft 可编辑 `draft*` 商业评估（含需求版本、工时、费用、工期、验收标准），expectedVersion |
| API-24 | `POST /change-requests/{changeId}/submit` | Owner/Developer | expectedVersion → 校验 Client 存在、最新 Ready Revision；创建 ChangeRequestVersion，状态 Submitted |
| API-25 | `POST /change-requests/{changeId}/vendor-decision` | Owner | `decision: APPROVED/REJECTED`、expectedVersion、comment? |
| API-26 | `POST /change-requests/{changeId}/client-decision` | 项目 Client | 仅 VendorApproved；同样的冻结版本 |
| API-27 | `POST /change-requests/{changeId}/resubmit` | Owner/Developer | 被拒绝后重开草稿；下次 submit 形成新版本 |
| API-28 | `POST /change-requests/{changeId}/deliveries` | Owner/Developer | 仅 Approved；artifactUrl（HTTPS）、summary、evidenceLinks（HTTPS URL 数组） |
| API-29 | `GET /change-requests/{changeId}/deliveries` | Project viewer | 版本相关历史交付 |
| API-30 | `POST /deliveries/{deliveryId}/review` | 项目 Client | decision ACCEPTED/CHANGES_REQUESTED、comment |
| API-31 | `GET /projects/{projectId}/audit-events` | Project viewer | 分页、按角色过滤能看到的事件 |
| API-32 | `GET /health` | Public | liveness（不要泄露系统信息/密钥） |

API-32 实际完整路径为 `GET /api/v1/health`，无需认证，返回 HTTP 200、`application/json` 和 `{"data":{"status":"ok"}}`。仅表示 API 进程可响应，不查询数据库或外部服务，不返回环境变量、版本、主机或凭据。当前使用显式 Controller 路径，未设置全局前缀；现有脚手架 `/` 接口保留。

### 重要边界

- 初始项目 baseline_scope 是项目创建时固定**参考**快照（非双方签署合同）；项目列表中不直接允许静默编辑。新需求/变化走 Requirement/ChangeRequest。
- Client 可以提交 Requirement 草稿和澄清答复；不能直接标记 Ready、设置商业评估、供应方批准或提交交付。
- Developer 不能批准供应方阶段；只拥有 `Owner` 的账号可以做供应方审批。
- 同一个用户若在同项目同时被指派 Client 与供应方角色，API 应拒绝这种成员配置。

## 3. 关键请求/响应样例

### 创建需求

`POST /projects/{projectId}/requirements`

```json
{"title":"积分抵扣","originalText":"用户消费获得积分，积分可以抵扣订单"}
```

201:

```json
{"data":{"id":"uuid-req","status":"DRAFT","title":"积分抵扣","draftVersion":1}}
```

### 添加版本

`POST /requirements/{requirementId}/revisions`

```json
{
  "expectedVersion": 3,
  "content":"仅已注册会员可累积积分；规则由客户明确确认",
  "acceptanceCriteria":["用户能看到积分余额","退款完成后余额按批准规则回退"]
}
```

201: `{ "data": { "id": "uuid-rev", "requirementId": "uuid-req", "revisionNo": 2, "draftVersion": 4, "status": "CLARIFYING", "latestRevisionId": "uuid-rev" }, "meta": { "requestId": "req-abc" } }`（其余 Revision 字段省略）。旧版无法通过 PATCH 更新。

### 提交变更快照

`PATCH /change-requests/{changeId}`

```json
{
  "expectedVersion": 1,
  "scopeSummary":"增加会员积分与结算时抵扣",
  "estimateHours": "16.00",
  "costDeltaMinor": 150000,
  "currency": "CNY",
  "scheduleDeltaDays": 2,
  "acceptanceCriteria": ["余额可见","退款积分正确回滚"]
}
```

`POST /change-requests/{changeId}/submit`

```json
{"expectedVersion":2}
```

201:

```json
{"data":{"changeRequestId":"uuid-cr","changeRequestVersionId":"uuid-crv","versionNo":1,"status":"SUBMITTED","lockVersion":3}}
```

### Owner 决定

`POST /change-requests/{changeId}/vendor-decision`

```json
{"decision":"APPROVED","expectedVersion":3,"comment":"工时评估已复核"}
```

200：`{ "data": { "status": "VENDOR_APPROVED", "lockVersion": 4, "approvedVersionId": "uuid-crv" } }`

### Client 决定

`POST /change-requests/{changeId}/client-decision`

```json
{"decision":"APPROVED","expectedVersion":4,"comment":"确认实现范围"}
```

200：`{ "data": { "status": "APPROVED", "lockVersion": 5, "approvedVersionId": "uuid-crv" } }`

### 提交交付、验收

`POST /change-requests/{changeId}/deliveries`

```json
{"artifactUrl":"https://demo.example.org/feature/points","summary":"积分模块已上线测试环境","evidenceLinks":["https://demo.example.org/reports/42"]}
```

`POST /deliveries/{deliveryId}/review`

```json
{"decision":"CHANGES_REQUESTED","comment":"积分退款流程仍需修改"}
```

客户退回后不可修改旧 Delivery；Developer 新建下一号 Delivery。一个 Delivery 至多一条终审意见。

## 4. 状态、版本、权限共同约束

| 端点 | 前置状态 | 后置状态 | 主要冲突 |
|---|---|---|---|
| mark-ready | Requirement Draft/Clarifying + Revision | Ready | 无 Revision → 422 |
| submit | ChangeRequest Draft + Ready 最新 Revision | Submitted | old version → 409 |
| vendor-decision APPROVED | Submitted | VendorApproved | 非 Owner → 403 |
| client-decision APPROVED | VendorApproved | Approved | 非唯一 Client → 403 |
| vendor/client REJECTED | 对应待审阶段 | Rejected | 重复决策 → 409 |
| resubmit | Rejected | Draft | 无权限/错误阶段 → 403/409 |
| create Delivery | Approved | Delivery Submitted | 关联版本不匹配 → 409 |
| review Delivery | Delivery Submitted | Accepted 或 ChangesRequested | 重复 review → 409 |

## 5. P1 API（第二阶段、不可阻断 P0）

| 方法 + 路径 | 作用 |
|---|---|
| `POST /requirements/{id}/ai-analysis` | 创建 AI 分析作业/返回建议；结果必须人工确认 |
| `GET /ai-analysis/{runId}` | 查询结构化建议及错误 |
| `POST /projects/{projectId}/api-tokens` | Owner 创建项目只读 Token，明文只展示一次 |
| `GET /projects/{projectId}/api-tokens` | Owner 分页查看安全元信息，不返回明文或摘要 |
| `DELETE /api-tokens/{tokenId}` | 撤销 Token |
| `GET /projects/{projectId}/approved-specs` | Owner/Developer/Client/Scoped Token 查已批准快照 |
| `GET /projects/{projectId}/approved-specs/{versionId}` | 精确已批准版本的技术投影 |

MCP `list_project_requirements` 和 `get_approved_spec` 通过上述授权 API 访问，不提供审批工具。GitHub Issue URL P1 作为普通链接字段，不需要 GitHub OAuth 或 Webhook。

### R08 D 已实现 Token 契约

路由统一前缀 `/api/v1`。管理接口仅接受当前项目 Owner 的 Session；创建/撤销沿用 Origin、CSRF 校验。创建必须项目 ACTIVE；归档后仍可列出及撤销。创建 body 严格为 `{name, expiresInDays?}`：name 去首尾空白后1–100字符，expiresInDays 为整数1–90、默认30，不接受 userId/projectId/scope/hash/时间覆盖。

- POST 201：`{data:{id,projectId,name,scopes,createdAt,expiresAt,revokedAt,status,token},meta:{requestId}}`；`token` 仅此响应一次。不提供重新读取/续期/恢复接口。
- GET 列表 200：标准 `limit` 1–100（默认20）、offset 分页；按创建时间及id倒序。相同元信息，无 token/tokenHash/userId。status 为 REVOKED、EXPIRED、UNAVAILABLE（项目归档或创建者已非当前Owner）、ACTIVE；顺序即优先级。
- DELETE 204：幂等，只在首次撤销时写审计；未知/跨项目对象404、同项目非Owner403。拒绝额外请求字段。
- 批准规格 GET/HEAD：Session 三角色可读，或独立 `Authorization: Bearer sbp_…` 身份。拒绝任何 Cookie 与 Bearer 混用、重复认证头、URL/body 凭据和普通业务路由的 Bearer；无效/撤销/过期/资格丢失401，Token跨项目和不可见版本404。不会将Token提升为Owner Session。
- 精确投影：`projectId,requirementId,changeRequestId,versionId,versionNo,submittedAt,approvedAt,approvedScope:{summary,acceptanceCriteria},referencedRequirement:{revisionId,revisionNo,content,acceptanceCriteria,createdAt}`。必须同一不可变版本有不同人的 VENDOR→CLIENT 两次 APPROVED。列表按提交时间倒序、id正序分页；不要求它仍是当前 activeVersion，保留历史批准规格。
- `approvedScope` 是批准交付范围；`referencedRequirement` 是该快照引用的原始规格版本，不能据此扩张批准范围。不返回当前需求标题/原文/最新Revision、报价/工时/工期、审批评论、人员邮箱。
- 上述接口（含错误）`Cache-Control: no-store`。创建限额30次/用户/分钟，Bearer 120次/连接IP/分钟、60次/Token/分钟，429带Retry-After；限额是单进程内存计数，不承诺跨实例或重启持久限额。
- `api_token.created/revoked/used` 仅Owner可见，分页前过滤。成功Bearer读取（含空列表/HEAD）与使用审计同事务；actor=null、principalType=project_token，保留Token id、项目、时间、操作、精确versionId（详情）/resultCount，不记录正文/名称/凭据/摘要。审计失败拒绝读取；Session读取不新增Token使用事件。

这不是 HTTP OAuth MCP 授权；D未实现MCP Server/Skill。

## 6. 契约落地要求

- 此文是设计草案，**不等同于可执行的 OpenAPI**。M1 审批后使用 NestJS Swagger 输出 `openapi.json`，生成前端 TypeScript types；在 CI 中检测契约漂移。
- 每个 API 都应有请求响应 Schema、权限、状态约束与错误用例。未完成 API 不得写在上线 Release Notes 中。


## 7. v0.2 业务 API 修订（必须落实）

| 方法与路径 | 角色 | 约束及结果 |
|---|---|---|
| `PUT /projects/{projectId}/client` | Owner | `{email}` 已注册；原本无客户或首个 Submit 前可替换；`200` 返回 Client；同 Workspace 供应方账号 `422 ROLE_CONFLICT`；首次 Submit 后 `409 CLIENT_ASSIGNMENT_LOCKED` |
| `POST /projects/{projectId}/members` | Owner | 仅分配已有 Workspace Developer；不再接收 `CLIENT` 角色，避免一个项目两个竞争的客户分配入口 |
| `POST /change-requests/{changeId}/submit` | Owner/Developer | 缺少唯一 Client 则 `422 CLIENT_REQUIRED`；要求最新 Ready Revision，冻结 `draft_*`；已提交版本不能被 PATCH |
| `POST /requirements/{requirementId}/revisions` | Owner/Developer | 如果同 Requirement 正在 `SUBMITTED/VENDOR_APPROVED`，`409 REVIEW_IN_PROGRESS`；不改变旧冻结版本 |
| `POST /change-requests/{changeId}/deliveries` | Owner/Developer | 只能对当前已批准 CRVersion 创建 HTTPS 链接；已有 `SUBMITTED` 则 `409 DELIVERY_PENDING`；已存在 `ACCEPTED` 则 `409 DELIVERY_COMPLETED` |
| `POST /deliveries/{deliveryId}/review` | 该项目唯一 Client | `ACCEPTED` 或 `CHANGES_REQUESTED`，不允许替换审查记录；必须包含 `comment` 才能请求修改 |

**初始范围字段**：`POST /projects` 必须携带非空 `baselineScope`；任何 `PATCH /projects/{id}` 只可编辑非基线元数据，不能修改 `baselineScope`。v1 不提供初始范围确认签名接口。

**身份**：客户端只能通过供应方 Owner 在 `PUT /projects/{id}/client` 绑定一个**已注册邮箱**，API 不提供未注册邮箱直接创建 Client 的邀请或短信/邮件发码。

**审批不变量**：`vendor-decision` 仅 `SUBMITTED` 可调用、`client-decision` 仅 `VENDOR_APPROVED` 可调用，必须落在同一 `changeRequestVersionId`；任何拒绝使该冻结版本变成 REJECTED 并阻断后续审批/交付。`resubmit` 只在 REJECTED 时开启新草稿。`APPROVED` 后新增需求必须使用新的 ChangeRequest，而不是覆盖旧版本。

**一致性**：所有写请求检查对象的父项目与身份；Requirement/CR 锁版本过期 `409 STALE_VERSION`。服务端不能根据客户端提交的 actorId、审批时间或 VersionId 信任其审批身份。

**API 契约核对**：该文保持“设计契约”性质；NestJS 生成 OpenAPI 后需核查以上字段命名、权限、响应和错误码，不应当把未实现的路由标记为已上线。

## R02 Authentication 实施补充

本节落实 API-01～04。负责人确认 API-04 在 R02 仅返回用户；Workspace/Project 列表及授权后续实现。

| 路由 | 成功响应 | 错误 |
|---|---|---|
| POST /api/v1/auth/register | 201 `{data:{id},meta:{requestId}}`；不自动登录 | 400 VALIDATION_ERROR；409 REGISTRATION_UNAVAILABLE；429 RATE_LIMITED |
| POST /api/v1/auth/login | 200 `{data:{user},meta:{requestId}}` + Set-Cookie | 400；401 UNAUTHENTICATED（邮箱不存在/密码错误相同）；429 |
| POST /api/v1/auth/logout | 204，无 body；撤销当前 Session、清 Cookie | 401（凭据无效）；403（CSRF 不满足） |
| GET /api/v1/me | 200 `{data:{user},meta:{requestId}}` | 401 |

`user` 仅包含 id、email、displayName、createdAt（ISO UTC）；不含角色、hash、Session ID 或 Token。所有认证 JSON 失败返回统一 error envelope；details 为安全空数组，未知异常返回通用 500 INTERNAL_ERROR。响应带服务端生成的 X-Request-Id，认证响应禁止缓存。Health 与根路由保持原成功格式。

写请求必须发送 `Origin: <AUTH_TRUSTED_ORIGINS 中的精确来源>` 与 `X-CSRF-Protection: 1`，有请求体使用 application/json；Sec-Fetch-Site 存在时必须 same-origin。公共注册/登录同样受保护。CSRF 不满足优先返回 403，满足 CSRF 但缺失/过期 Session 返回 401。空 logout body 可省略 Content-Type，其余保护头仍必需。无跨域凭据 CORS，无 CSRF Token 获取端点。

邮箱 trim + lowercase；注册 password 15–128 Unicode code points / 至多 512 bytes，displayName trim 后 1–100；未知字段（含 userId/role）返回 400。重复注册 409 不返回已存在账号信息，但注册成功/失败仍构成已确认接受的有限枚举风险。429 提供 Retry-After 秒数。

## R03 Workspace / Project 实施契约

负责人确认：Client 不加入供应方 Workspace；项目列表 workspaceId 可选；/me 仍仅用户；Owner 不额外分配为 Project Developer；首次 Submit 前不同 Client PUT 串行替换，最后成功提交生效；锁定后相同 Client PUT 返回 200 且不写审计。本阶段无 Web 页面，仅 HTTP 与真实 Next Rewrite 验证。

| 端点 | Body | 成功 |
|---|---|---|
| GET /workspaces | — | 200，仅当前用户所属供应方空间 |
| POST /workspaces | `{name}` | 201，Workspace + 唯一 Owner + 审计原子创建 |
| GET /workspaces/{id}/members | — | 200，Owner-only 分页列表 |
| POST /workspaces/{id}/members | `{email}` | 201；相同 Developer 重试 200，无新审计 |
| GET /projects | — | 200，workspaceId 可选，与权限取交集 |
| POST /projects | `{workspaceId,name,baselineScope}` | 201，ACTIVE，无 Client |
| GET /projects/{id} | — | 200，安全详情 |
| POST /projects/{id}/members | `{userId,role:"DEVELOPER"}` | 201；同分配重试 200，无新审计 |
| PUT /projects/{id}/client | `{email}` | 200，指定/更正或同账号无副作用重试 |

- 名称 trim 后 1–100 字符；baselineScope trim 后 1–20,000 字符，保留内部换行。邮箱复用 R02 的 trim/lowercase 和 254 长度上限。UUID、角色和分页严格校验，拒绝未知字段。无 PATCH/DELETE Project、Owner 转移、成员移除、Client 解绑或邀请端点。
- 列表为 `{data:[...],meta:{requestId,limit,offset,hasMore}}`，按 createdAt/id 升序；SQL 先授权过滤再分页。不存在/无权的 workspaceId 筛选均返回空项目列表；不返回未授权总数。
- Workspace 列表/创建返回 id、name、createdAt、workspaceRole。成员管理返回 id、userId、displayName、email、role、createdAt，仅 Owner 可查。
- Project 列表返回 id、workspaceId、name、status、createdAt、projectRole；创建响应另含 baselineScope。详情另含 baselineScope、owner、members、clientAssignmentLocked。人员字段仅 userId、displayName、role；不公开邮箱或整个供应方成员名册。项目成员/Client 写响应为该人员安全字段。
- 所有新业务成功响应 `Cache-Control: no-store`。同一请求的项目详情授权与投影使用只读 repeatable-read 快照，避免换 Client 时拼接不同时间点的数据。
- 401 为未认证；保留 R02 CSRF 优先 403。对象不可见/不存在均 404；可见对象但无管理权 403。未注册邮箱在通过 Owner 授权后返回 422 USER_NOT_REGISTERED；目标不为本空间 Developer 返回 422 WORKSPACE_DEVELOPER_REQUIRED；Owner/供应方/Client 冲突返回 422 ROLE_CONFLICT；有历史 Version 时实际换 Client 返回 409 CLIENT_ASSIGNMENT_LOCKED。
- 领域错误 code 仅通过“状态码+code”白名单返回；details 为空，不回传数据库错误、SQL 或约束名称。
- Workspace/Project 创建不承诺 Idempotency-Key，重复创建可产生独立对象；名称不作为唯一键。成员重复分配无副作用，不能据此改变既有角色。
- Client 锁定由任意历史 ChangeRequestVersion 判断，不依赖 CR 当前状态或 active pointer。R03 不实现 Submit；AC-22 仍留后续变更工作流验收。


## R04 Requirement / Revision 实施契约

API-13～20 已完成本地实现及 PostgreSQL/HTTP/代理测试；未部署。SQL 审核与验证证据见 STATE / HUMAN_TASKS。

- Requirement 创建返回 `draftVersion=1`。PATCH、添加问答、创建 Revision、Mark Ready 均必填正整数 `expectedVersion`，与持久化 `draftVersion` 比较；每次成功写入（含同值 PATCH）只递增一次，同时更新 updatedAt。版本不是 revisionNo；相同版本并发请求一成功一 `409 STALE_VERSION`，失败无业务记录或审计。
- PATCH 至少提供 title/originalText 之一，只允许 DRAFT 原作者或 Owner；不接收项目、作者、status、最新指针等服务端字段。
- 三种项目角色均可提问/回答；QUESTION 的 parentId 省略或 null，ANSWER 必须引用同需求 QUESTION。非法父项统一 422 BUSINESS_RULE_VIOLATION，不披露其他资源。READY 下问答返回 409 INVALID_TRANSITION，须先由 Owner/Developer 创建 Revision。
- 创建 Revision 使状态变为 CLARIFYING，首次创建亦如此；正文非空，acceptanceCriteria 可以为空数组。Mark Ready 必须确认最高 revisionNo 对应的最新指针、非空正文、非空验收标准及全部问题已答。重复 Mark Ready 返回 409 INVALID_TRANSITION。
- title trim 后 1–200 字符；originalText/content 1–20,000；问答 body 1–10,000；验收标准最多 100 条，每条 trim 后 1–1,000 字符，保留文本内部换行。拒绝未知字段、null 可编辑文本、空 PATCH 和非法 UUID/版本。版本受 PostgreSQL integer 上限约束，耗尽时拒绝写入，不溢出或归零。
- 需求列表按 createdAt/id 升序，含 draftVersion/latestRevisionId/latestRevisionNo；Revision 历史按 revisionNo 降序，均复用 limit/offset/hasMore。详情含原文、按 createdAt/id 排序的问答及完整最新 Revision。
- 问答/Revision 创建返回 201，保留自身字段，并附 requirementId/draftVersion/status/latestRevisionId；PATCH、Mark Ready 返回 200 更新后需求。沿用 data/meta.requestId、no-store 和安全字段投影。
- 检查顺序：Session/CSRF、输入校验、数据库父链与项目可见性、操作权限、expectedVersion、状态与业务资格。不可见 404，无操作权 403；版本过期 409 STALE_VERSION；非法状态 409 INVALID_TRANSITION；待审批禁止修订 409 REVIEW_IN_PROGRESS；Ready 不合格 422 BUSINESS_RULE_VIOLATION。details 保持安全空数组。
- UUID 在 Service 边界规范化，响应/审计使用数据库规范 ID；不得只依赖 DTO 转换。Client 无权创建 Revision 或 Mark Ready。创建 Requirement 不要求已绑定 Client。

- 审计事件为 requirement.created、requirement.draft_updated、clarification.question_added/answer_added、requirement.revision_created、requirement.marked_ready。Revision 事件 entityVersion 为 revisionNo，metadata 包含 requirementId/draftVersion；其他写操作记录聚合版本。字段/状态/ID 为白名单元数据，不记录正文。业务失败或审计失败整体回滚。
- 已有需求写入若 draftVersion 达到 2147483647，或创建 Revision 时 revisionNo 达到该上限，返回 422 BUSINESS_RULE_VIOLATION。无客户端自动重试或 Idempotency-Key 承诺。

## R05 ChangeRequest / Approval 实施契约

负责人已确认 CR `lockVersion` 初始为 **0**，CR 写请求 `expectedVersion` 接受 0～2147483647 的 JSON 整数；Requirement 仍初始 1、要求正整数。上方示例从 1 开始表示已经保存过一次草稿，不代表 CR 初始版本。无新增 Migration，0000～0003 保持不变。

| API | 请求 | 成功 |
|---|---|---|
| 21 POST /requirements/{id}/change-requests | `{}`，Owner/Developer；服务器选择最高编号且指针一致的最新 Ready Revision | 201，DRAFT/lockVersion=0/activeVersionId=null，商业字段 NULL |
| 22 GET /change-requests/{id} | 本项目 viewer；limit/offset 对历史 Version 分页 | 200，摘要、角色允许的 draft、activeVersion、versions；meta 含 requestId/limit/offset/hasMore |
| 23 PATCH /change-requests/{id} | expectedVersion + 至少一个商业字段，仅 DRAFT Owner/Developer | 200，摘要与 draft，lockVersion +1 |
| 24 POST /change-requests/{id}/submit | `{expectedVersion}`，Owner/Developer | 201，changeRequestId/changeRequestVersionId/versionNo/status/lockVersion |
| 25 POST /change-requests/{id}/vendor-decision | `{expectedVersion,decision,comment?}`，仅 Owner | 200，CR/Version ID、status、lockVersion、approval |
| 26 POST /change-requests/{id}/client-decision | 同上，仅绑定 Client | 200，同 Vendor 的精确 Version；必须已由 Owner 批准 |
| 27 POST /change-requests/{id}/resubmit | `{expectedVersion}`，仅 REJECTED Owner/Developer | 200，回到 DRAFT、版本 +1，**不立即创建 Version** |

- PATCH 字段为 `requirementRevisionId/scopeSummary/estimateHours/costDeltaMinor/currency/scheduleDeltaDays/acceptanceCriteria`；映射持久化 draft_*。省略保持原值；商业字段 NULL 表示清空，Revision ID 不得 NULL。范围 trim 后 1–20,000 字符；验收标准至多 100 条，每条 trim 后 1–1,000 字符，草稿可空数组，Submit 必须非空。
- 工时为十进制字符串，0～999999.99，最多两位小数，保存后规范为两位小数；禁止指数/NaN/Infinity。金额输入/输出为 JSON 安全整数（±9007199254740991），库内 bigint；不舍入超界存量，读取时安全失败。工期为 int32，可正负/零。币种为运行时 `Intl.supportedValuesOf('currency')` 接受的三位大写代码，不自动填 CNY；不换汇。
- decision 仅 APPROVED/REJECTED；comment 可省略，提供时 trim 后 1–10,000 字符，不接收 null。双方评论均对本项目 Client 可见，不作内部备注。
- 摘要为 id/requirementId/projectId/status/lockVersion/activeVersionId/createdAt/updatedAt。Owner/Developer 另有 draft；Client 响应彻底省略 draft，即使当前 DRAFT。activeVersion 与每个历史 Version 包含完整商业快照、所引用不可变 requirementRevision 和 approvals；历史按 versionNo 降序。所有正式快照对 Client 可见，包括 Vendor 待审/拒绝历史；首次提交前只显示安全摘要、空历史与 null activeVersion。R05 不返回交付信息，不实现审计查询。
- APPROVED 决策响应保留示例的 `approvedVersionId` 别名，含义为**该审批步骤**批准的 Version，不能单独证明双方完成审批；同时返回 changeRequestVersionId。REJECTED 不返回该别名；数据库无 approvedVersionId 字段。
- Submit 检查唯一 Client 和角色分离、最新 Ready Revision、商业字段完整性，在同一事务复制草稿并创建 MAX(versionNo)+1；无任何 Version/Approval 更新入口。PATCH 不会修改已提交快照。重开保留商业草稿及旧 activeVersionId；若需求已修订，必须显式选择新 Ready Revision。APPROVED 不可重开。
- 成功 PATCH（含同值）、Submit、决定、重开均恰好推进一次 lockVersion/updatedAt；不推进 Requirement draftVersion。CR 创建不承诺 Idempotency-Key，同一 Requirement 可有多个 CR，任一 Pending 都阻止新 Revision。
- 检查顺序：Session/CSRF、DTO、父链与项目可见性、操作权限、expectedVersion、已有决定/状态、业务资格。stale 优先 409 STALE_VERSION；当前版本重复步骤 409 ALREADY_REVIEWED；非法阶段 409 INVALID_TRANSITION。缺 Client 422 CLIENT_REQUIRED，身份冲突 422 ROLE_CONFLICT，非最新 Ready/跨需求 Revision/评估不完整/编号耗尽 422 BUSINESS_RULE_VIOLATION。未知错误保持通用 500，details 为空。DRAFT 下审批始终 INVALID_TRANSITION，不把旧 activeVersion 的决定当成新草稿审批。
- 所有 UUID 在 Service 边界规范小写。请求不接受 actorId、时间、所属项目、状态或审批 Version ID；身份来自 Session，父链和当前 Version 来自锁后数据库。读取采用只读 REPEATABLE READ，写统一 Workspace → Project → Requirement → CR 锁序。
- 六类审计：change_request.created/draft_updated/submitted/vendor_decided/client_decided/reopened，entityType=change_request，entityVersion=更新后的 lockVersion（创建为 0）；metadata 仅相关 ID、快照编号、状态、步骤、决定及字段名，不含商业正文/金额/评论。任何失败整体回滚。

## R06 Delivery / Acceptance 实施契约

API-28～30 使用既有 Schema，无新增 Migration。负责人批准方案 A：Delivery 无 lockVersion，创建和 Review 均不接收 expectedVersion；R04/R05 的乐观版本契约不变。

| API | 请求 | 成功 |
|---|---|---|
| 28 POST /change-requests/{id}/deliveries | Owner/项目 Developer；`{artifactUrl,summary,evidenceLinks?}` | 201，新的 SUBMITTED Delivery，deliveryNo 从 1 连续递增 |
| 29 GET /change-requests/{id}/deliveries | 项目 viewer；limit/offset | 200，全部 Version 下的分页交付历史，附对应 review 或 null |
| 30 POST /deliveries/{id}/review | 仅唯一项目 Client；`{decision,comment?}` | 200，更新后的 Delivery 与唯一 Review |

- Delivery 投影：id、changeRequestId、changeRequestVersionId、versionNo、deliveryNo、artifactUrl、summary、evidenceLinks、status、createdBy、createdAt、review。Review：id、deliveryId、reviewerId、decision、comment、createdAt。沿用 data/meta.requestId、no-store；历史另含 limit/offset/hasMore，按 versionNo/deliveryNo/id 降序。不返回商业草稿或认证字段。
- summary trim 后 1–20,000 字符；comment 提供时 trim 后 1–10,000，不接受 null。decision 仅 ACCEPTED/CHANGES_REQUESTED，后者必须提供非空 comment。文本作为纯文本保存。
- artifactUrl 和每个 evidenceLink 最多 2,048 字符，必须完整解析为 HTTPS、非空主机、无凭据段/空白/控制字符/反斜杠；evidenceLinks 可省略（保存 []），至多 100 条，不接受 null。服务端不抓取链接、不上传文件。
- DTO 拒绝未知字段，包括 expectedVersion、actor/reviewer、时间、父项目、Version ID、状态、deliveryNo。UUID 在 Service 边界规范小写。
- 创建要求 CR.status=APPROVED；active Version 必须为同 CR 最新 Version、Revision 归属正确、双方审批 APPROVED 且身份匹配 Owner/唯一 Client。Requirement 后续修订不会阻断旧批准版本的交付，不要求其仍为最新 READY Revision。
- 同版本 ACCEPTED 阻止后续创建（409 DELIVERY_COMPLETED）；否则 SUBMITTED 阻止创建（409 DELIVERY_PENDING）。退回后新建下一编号，保留旧交付及 Review；编号耗尽为 422 BUSINESS_RULE_VIOLATION。
- Review 只允许 SUBMITTED，一次终审；重复/竞争失败 409 ALREADY_REVIEWED，无成功重放或自动重试。其他非法 CR 阶段 409 INVALID_TRANSITION；异常批准证据/指针 422 BUSINESS_RULE_VIOLATION。角色不足 403、不可见/不存在 404，保留 CSRF 优先 403、未认证 401。
- 写锁 Workspace→Project→Requirement→CR，Review 最后锁 Delivery；锁后重验父链、权限、批准资格。Review INSERT、Delivery WHERE status='SUBMITTED' 条件 UPDATE、AuditWriter 同 tx。业务失败或审计失败整体回滚；不推进 CR lockVersion/Requirement draftVersion。
- 明确识别 PostgreSQL 23505 的 Review 唯一键/待审部分唯一索引/编号唯一键，事务回滚后分别映射 ALREADY_REVIEWED/DELIVERY_PENDING/CONFLICT；其他数据库异常不吞掉、不公开 SQL。
- 审计为 delivery.submitted / delivery.reviewed，entityType=delivery、entityVersion=deliveryNo；metadata 仅关联 ID、versionNo、状态、决定，不存 URL/说明/评论。审计查询、完整前端页面不属于 R06。

## R07 Phase B 读取与生成契约（本地完成）

新增七 GET 和四类详情 capabilities 的精确定义见 [R07_READ_MODELS](R07_READ_MODELS.md)，机器契约见 [OpenAPI](openapi.json)。已有 mutation 响应不附 capabilities，UI 写后刷新详情；Client 的 CR draft 仍完全缺席，OpenAPI 使用封闭 Supplier/Client oneOf。

OpenAPI 覆盖 R07 使用的 R02–R06 API 和七 GET，共 30 paths / 38 operations；日期为标准 UTC ISO、工时为十进制字符串、金额为 JSON 安全整数，null/optional 显式定义。为满足已有日期契约，R03 Workspace 列表/成员（含重复添加返回值）和 Project 列表/详情已规范化原生 SQL 日期文本；没有修改权限或状态转换。

离线生成 `pnpm --filter specbridge-api openapi:generate`，漂移验证 `pnpm --filter specbridge-api openapi:check`。不加载 .env、连接数据库或启动 Observe/Swagger UI。真实 HTTP 响应验证与运行证据见 STATE；不替代后续浏览器验收。
