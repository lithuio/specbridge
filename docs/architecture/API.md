# SpecBridge REST API 契约（设计基线）

> v0.2（P0 需求基线已确认）｜Base Path：`/api/v1`｜尚未实现。后续 NestJS 生成 OpenAPI，必须与本文保持一致。

## 1. 统一约定

- 浏览器以同源 `/api/v1/*` 访问，由 Next.js Rewrite/Caddy 转发 NestJS；不将数据库连接或密钥暴露给 Web。
- Session Cookie 认证；所有非公共写请求需有效会话与 CSRF/Origin 校验。所有对象端点必须做项目级授权。
- JSON 时间为 ISO-8601 UTC；ID 为 UUID；金额为整数最小单位 `costDeltaMinor` + 3 位 ISO `currency`；列表统一 `limit` (1–100) 和 `cursor`（v1 可用 limit/offset，但须一致）。
- 写请求对状态机使用 `expectedVersion` 正整数进行乐观并发校验，不接收客户端输入的审批人身份/时间。
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
| API-04 | `GET /me` | Auth | user + 可用 workspace/project 列表入口 |
| API-05 | `GET /workspaces` | Auth | 当前用户可访问的 Workspace |
| API-06 | `POST /workspaces` | Auth | name → Workspace，创建者自动 Owner |
| API-07 | `GET /workspaces/{workspaceId}/members` | Owner | Workspace 用户和角色 |
| API-08 | `POST /workspaces/{workspaceId}/members` | Owner | 以**已注册邮箱**加入 Developer，无邮件邀请 |
| API-09 | `GET /projects?workspaceId=...` | Auth | 根据 Owner/Developer/Client 项目授权过滤 |
| API-10 | `POST /projects` | Owner | workspaceId、name、baselineScope |
| API-11 | `GET /projects/{projectId}` | Project member / Owner | 项目信息、允许展示的成员字段 |
| API-12 | `POST /projects/{projectId}/members` | Owner | 只允许已注册的 Workspace Developer 以 `role=DEVELOPER` 加入项目；Client 通过独立 PUT 接口指定 |
| API-13 | `GET /projects/{projectId}/requirements` | Project viewer | 分页列表、状态、当前版本号 |
| API-14 | `POST /projects/{projectId}/requirements` | Project member | title、originalText → Draft |
| API-15 | `GET /requirements/{requirementId}` | Project viewer | 原始需求/澄清/最新版本 |
| API-16 | `PATCH /requirements/{requirementId}` | Draft 作者或 Owner | 标题/草稿正文；带 expectedVersion；不改变原始需求已形成的 Revision |
| API-17 | `POST /requirements/{requirementId}/clarifications` | Project member | kind QUESTION/ANSWER、parentId、body |
| API-18 | `POST /requirements/{requirementId}/revisions` | Owner/Developer | content、acceptanceCriteria → 不可变 Revision |
| API-19 | `GET /requirements/{requirementId}/revisions` | Project viewer | Revision history |
| API-20 | `POST /requirements/{requirementId}/mark-ready` | Owner/Developer | 必须有有效 Revision → Ready |
| API-21 | `POST /requirements/{requirementId}/change-requests` | Owner/Developer | 以最新 Ready Revision 新建 Draft ChangeRequest |
| API-22 | `GET /change-requests/{changeId}` | Project viewer | 当前 Draft/Version/审批/交付信息（字段按角色裁剪） |
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
  "content":"仅已注册会员可累积积分；规则由客户明确确认",
  "acceptanceCriteria":["用户能看到积分余额","退款完成后余额按批准规则回退"]
}
```

201: `{ "data": { "id": "uuid-rev", "revisionNo": 2 } }`。旧版无法通过 PATCH 更新。

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
| `DELETE /api-tokens/{tokenId}` | 撤销 Token |
| `GET /projects/{projectId}/approved-specs` | Owner/Developer/Client/Scoped Token 查已批准快照 |

MCP `list_project_requirements` 和 `get_approved_spec` 通过上述授权 API 访问，不提供审批工具。GitHub Issue URL P1 作为普通链接字段，不需要 GitHub OAuth 或 Webhook。

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

**一致性**：所有写请求检查对象的父项目与身份；锁版本过期 `409 STALE_VERSION`。服务端不能根据客户端提交的 actorId、审批时间或 VersionId 信任其审批身份。

**API 契约核对**：该文保持“设计契约”性质；NestJS 生成 OpenAPI 后需核查以上字段命名、权限、响应和错误码，不应当把未实现的路由标记为已上线。
