# R07 增量读取契约 — Phase A

状态：2026-11-10 负责人已批准总体范围；本文件是 Phase A 已交付契约，人工评审结论未记录；后续实施入口遵循最新 [R07_PLAN](../engineering/R07_PLAN.md)。**Phase B 已本地实现七 GET、必要 capabilities、OpenAPI 与前端生成类型；验证见 R07_PLAN 的 B 交接和 STATE**。主任务 [#15](https://github.com/lithuio/specbridge/issues/15)。既有写契约以 [API.md](API.md) 的 R02–R06 实施章节为准。

## 1. 不变量与通用协议

- 仅新增七个 GET；不增加业务写入、表、Migration、全局角色或认证体系。GET 仍经过既有 Session Guard（其正常活动时间更新不属于新增业务写入）。
- Base `/api/v1`。成功 200：`{data,meta:{requestId}}`；分页另含 `limit,offset,hasMore`。错误沿用现有 envelope，details=[]。所有成功响应 `Cache-Control: no-store`，未知异常安全 500；不返回 SQL/约束名。
- UUID 规范小写；时间 UTC ISO 字符串；金额 JSON 安全整数最小单位；工时十进制字符串。不存在/不可见对象同为 404；401 未认证；400 无效 UUID/枚举/分页/未知参数。新增读取无 mutation 型 409；读取中发现异常父链/批准证据安全失败，不能伪造正常状态。
- list `limit=20`（1–100）、`offset=0`（非负安全整数）；SQL LIMIT limit+1 判 hasMore。下述筛选均可选，省略表示不筛选；空字符串、重复标量、未知枚举返回 400。不支持任意 sort、全文搜索或全局 total。
- 列表授权和事件可见性过滤在分页、计数前完成；复用 `AuthorizationRepository.visibleProjects/project`。对象读取先解析真实父链，拒绝请求路径父子不匹配。
- 多查询详情、Dashboard、capabilities 与数据在同一个只读 REPEATABLE READ 快照中计算。每个 HTTP 请求独立快照；offset 不保证跨页并发插入时完全不漂移。UI 刷新去重，历史详情链接不依赖页码。
- 显式 projectId 无权/不存在返回 404；仅 workspaceId 筛选与 GET /projects 一致：与授权项目取交集，空集合返回空数据，不能证明该 Workspace 存在。两种筛选同时提供时，先验证 projectId 可见，再取交集（不匹配为空）。

## 2. 共用 HTTP 投影

以下字段集为精确字段名单；附加字段必须更新契约，不直接序列化数据库行。

| 名称 | 字段 |
|---|---|
| Person | `userId:UUID, displayName:string`，不含 email；显示名是当前名称，不声称历史姓名快照 |
| Revision | `id,requirementId,revisionNo,content,acceptanceCriteria:string[],createdBy,createdAt`（复用 R04） |
| Approval | `id,changeRequestVersionId,step:VENDOR\|CLIENT,actorId,decision:APPROVED\|REJECTED,comment:string\|null,createdAt` |
| FrozenVersion | `id,changeRequestId,versionNo,requirementRevisionId,scopeSnapshot,estimateHours,costDeltaMinor,currency,scheduleDeltaDays,acceptanceCriteria,submittedAt,submittedBy,requirementRevision:Revision,approvals:Approval[]`（复用 R05） |
| Review | `id,deliveryId,reviewerId,decision:ACCEPTED\|CHANGES_REQUESTED,comment:string\|null,createdAt` |
| Delivery | `id,changeRequestId,changeRequestVersionId,versionNo,deliveryNo,artifactUrl,summary,evidenceLinks:string[],status,createdBy,createdAt,review:Review\|null`（复用 R06） |
| ChangeSummary | `id,requirementId,projectId,status,lockVersion,activeVersionId:UUID\|null,createdAt,updatedAt`（复用 R05） |

FrozenVersion 不新增 status 字段；版本审批阶段由该版 Approval 记录解释，不能使用当前 CR.status 冒充历史版状态。Approval 可能在快照创建后追加，因此历史版本查询也需要失效刷新。

## 3. 七项 API

### R07-01 项目 ChangeRequest 列表

`GET /projects/{projectId}/change-requests?requirementId=&status=&limit=&offset=`

- 项目 Owner/分配 Developer/绑定 Client 可读；status 是既有 CR 枚举。
- requirementId 仅作同项目筛选；不存在或来自别的项目时返回空列表，不泄露其归属。
- data：`Array<ChangeSummary & {requirementTitle:string,activeVersionNo:number|null}>`。
- `activeVersionNo` 必须来自同 CR activeVersionId。重开 DRAFT 仍可能指向旧版本，UI 显示“上一轮 vN”，不显示“当前待审批”。
- **所有角色的列表都不返回商业草稿/金额/工时/内部正文**；Client 可见首次提交前的安全摘要，与现有详情一致。点击后供应方从详情取得 draft。
- 顺序 `createdAt DESC,id DESC`；两个 CR 可引用同一 Revision，不额外假设一需求一 CR。

### R07-02 项目 Delivery 列表

`GET /projects/{projectId}/deliveries?changeRequestId=&status=&limit=&offset=`

- 项目 viewer；status 为 SUBMITTED/CHANGES_REQUESTED/ACCEPTED。
- data：`Array<Delivery & {projectId,requirementId,requirementTitle}>`。
- changeRequestId 仅过滤该项目集合，跨项目/不存在返回空；不逐个调用 CR 历史接口。
- 顺序 `createdAt DESC,id DESC`。跨 CR 没有统一 deliveryNo；UI 始终同时显示需求、CR 短 ID、vN / DN。
- 返回所有历史版本的交付；不要求其关联 Requirement 仍为最新 READY。

### R07-03 Dashboard

`GET /dashboard?workspaceId=&projectId=&bucket=&limit=&offset=`

- bucket 为 `mine`（默认）/`waiting`/`completed`；当前用户身份仅来自 Session。
- `data = {scope:{workspaceId:UUID|null,projectId:UUID|null},summary,items:DashboardItem[]}`。
- `summary = {projectCount,requirementCounts:{DRAFT,CLARIFYING,READY},changeCounts:{DRAFT,SUBMITTED,VENDOR_APPROVED,APPROVED,REJECTED},deliveryCounts:{SUBMITTED,CHANGES_REQUESTED,ACCEPTED},buckets:{mine,waiting,completed}}`；全部值为非负整数。
- summary 基于全部授权筛选集合，不受 bucket、limit、offset 影响。项目/需求/CR/Delivery 各自按主键去重后计数，不能用多表 JOIN 膨胀计数。Client 的 CR 草稿只计安全摘要，不提供草稿工作项或字段。
- items 仅返回选中 bucket；meta 标准分页 + `asOf:ISO`（本请求快照时间）。无到期日、逾期、完成率、收入/换汇或趋势比较，因为现有模型没有相应事实。
- DashboardItem：`key:string,type:DashboardType,bucket,projectId,projectName,projectRole:OWNER|DEVELOPER|CLIENT,entityType:project|requirement|change_request|delivery,entityId,requirementId:UUID|null,changeRequestId:UUID|null,changeRequestVersionId:UUID|null,versionNo:number|null,deliveryNo:number|null,title:string,occurredAt:ISO,action:OPEN_PROJECT|OPEN_REQUIREMENT|OPEN_CHANGE|OPEN_DELIVERY`。
- key 为 type+entityId 的稳定标识，不是数据库任务 ID。title 只来自项目名/需求标题，不摘录商业草稿、评论或原文。链接由前端用已验证父 ID 构造，不接受数据库任意 href。
- 不返回 assignee、dueAt、isRead 等未存在属性；“待我处理”表示当前项目角色可处理，不等于个人指派。
- 顺序为 `occurredAt DESC,key ASC`；不要凭前端局部数据排序“优先级”。completed 按 Review.createdAt；其他时间取触发状态的真实记录，详见第 5 节。

### R07-04 项目 AuditEvent

`GET /projects/{projectId}/audit-events?entityType=&entityId=&eventType=&limit=&offset=`

- 项目 viewer，字段/事件白名单见第 4 节；未知事件类型筛选返回 400；已知但当前角色不可见的事件返回空集合。
- entityId 仅筛选已经授权的项目事件；不单独暴露该对象是否存在。entityType 使用现有项目事件实体枚举（排除 workspace）。
- data：`Array<{id,projectId,actor:Person|null,eventType,entityType,entityId,entityVersion:number|null,createdAt,metadata:SafeMetadata,target:AuditTarget|null}>`。
- AuditTarget 为可辨识联合：`{kind:'project',projectId}` / `{kind:'requirement',projectId,requirementId,clarificationId?:UUID}` / `{kind:'revision',projectId,requirementId,revisionId}` / `{kind:'change',projectId,changeRequestId,versionId?:UUID}` / `{kind:'delivery',projectId,deliveryId}`。
- target 从数据库真实父链解析并重新核对归属；禁止只信任 metadata 内 ID 生成跨项目链接。无法安全解析时 target=null，事件仍作为安全时间线条目展示。
- actor=null 时显示“未知操作人”，不编造名字。Actor 只展示当前安全姓名，不提供账户查询入口。
- 顺序 `createdAt DESC,id DESC`。无敏感字段搜索、无导出、无全量 Workspace Audit API。

### R07-05 Revision 详情

`GET /requirements/{requirementId}/revisions/{revisionId}`

- 项目 viewer；先定位 Requirement 的项目，Revision 必须属于该 Requirement，否则 404。
- data：`Revision & {projectId}`。无分页参数；不接收任何写字段。
- 旧 Revision 的正文与标准保持原样；不能拼接今天的问答冒充当时的澄清快照。

### R07-06 ChangeRequestVersion 详情

`GET /change-requests/{changeId}/versions/{versionId}`

- 项目 viewer；Version 必须属于该 CR，Revision 属于 CR 的 Requirement，否则 404/安全内部失败。
- data：`FrozenVersion & {projectId,requirementId}`；所有正式版本和双方正式评论对本项目 Client 可见。
- 无 draft、无当前 CR 写能力；在历史页跳转当前 CR 后才能执行当前阶段操作。

### R07-07 Delivery 详情

`GET /deliveries/{deliveryId}`

- Delivery → Version → CR → Requirement → Project 真实父链授权，不从 query/body 获取身份或父项目。
- data：`Delivery & {projectId,requirementId,requirementTitle,capabilities:DeliveryCapabilities}`。
- 通过 changeRequestId/changeRequestVersionId 定位批准规格，不在该响应重复嵌套完整商业快照。
- 单对象无分页。Review 和 Delivery 来自同一快照。没有 expectedVersion/lockVersion。

## 4. Audit 事件与字段白名单

共同字段见 R07-04。Owner 和 Developer 仅能看到其可见项目下以下已定义事件；Client 按下表裁剪。未知事件对所有角色默认不投影，避免原样 metadata 泄露；以后新增事件必须更新名单和测试。

| eventType | Owner / Developer | Client | metadata 可返回键（仅存在且类型合法者） |
|---|---|---|---|
| project.created | 可见 | 隐藏 | 无 |
| project.developer_added | 可见 | 隐藏 | role（仅 DEVELOPER），不返回 target userId |
| project.client_bound / project.client_replaced | 可见 | 隐藏 | 无；不返回 previousClientId/clientId |
| requirement.created | 可见 | 可见 | 无 |
| requirement.draft_updated | 可见 | 可见 | fields，仅 title/originalText 的字段名 |
| clarification.question_added / answer_added | 可见 | 可见 | requirementId,parentId,fromStatus,toStatus |
| requirement.revision_created | 可见 | 可见 | requirementId,draftVersion,fromStatus,toStatus |
| requirement.marked_ready | 可见 | 可见 | revisionId,fromStatus,toStatus |
| change_request.created / draft_updated | 可见 | 隐藏 | requirementId,revisionId,fields（已知商业字段名），不含字段值 |
| change_request.reopened | 可见 | 隐藏 | fromStatus,toStatus,previousVersionId |
| change_request.submitted | 可见 | 可见 | fromStatus,toStatus,changeRequestVersionId,versionNo,revisionId；删掉 clientId |
| change_request.vendor_decided / client_decided | 可见 | 可见 | fromStatus,toStatus,changeRequestVersionId,versionNo,approvalId,step,decision |
| delivery.submitted / reviewed | 可见 | 可见 | changeRequestId,changeRequestVersionId,versionNo,fromStatus,toStatus,reviewId,decision |

- workspace.created/developer_added 不属于项目事件查询。Client 无内部成员事件；不能只隐藏 UI 行而让 Network 收到。
- metadata 值严格按 UUID/整数/受限枚举/字段名数组检查；所有未知键都丢弃。字段名数组不接受嵌套对象；不能回传对象再交给 UI 任意展示。
- 不返回商业正文、金额、原文、问答 body、comment、artifactUrl、evidenceLinks、email、Cookie、Token、密码或原始请求。
- entityVersion 的含义随实体变化：需求聚合 draftVersion、Revision 的 revisionNo、CR 的 lockVersion、Delivery 的 deliveryNo。UI 分别命名，不能统一标成“规格 vN”。CR 正式版本号使用 metadata.versionNo。
- 过滤后的 hasMore 不得泄露被隐藏事件数量；不提供未授权 total。

## 5. Dashboard 工作项定义

这是实时派生视图，不新建任务系统。“已完成”严格指交付已验收，不把供应方审批通过冒充项目完成。

| type / 来源 | 条件（授权后） | mine | waiting | occurredAt |
|---|---|---|---|---|
| BIND_CLIENT / Project | 无 Client 且从未 Submit | Owner | 不生成其他角色项 | Project.createdAt |
| CLARIFY_REQUIREMENT / Requirement | 非 READY 且至少一个未答 QUESTION；按需求合并一项 | 三角色皆可（既有 API 允许成员回答）；标识“项目协作待办” | 不额外复制同一项 | 最早未答 QUESTION.createdAt |
| PREPARE_REVISION / Requirement | DRAFT/CLARIFYING、无未答问题、无 Pending CR；无可 Ready 的有效最新 Revision | Owner/Developer | Client | Requirement.updatedAt |
| MARK_READY / Requirement | 非 READY、无未答问题、无 Pending CR，最新指针与最高编号一致、正文及标准非空 | Owner/Developer | Client | Requirement.updatedAt |
| PREPARE_ASSESSMENT / Requirement | READY 且最新 Revision 尚无任何 CR 草稿引用或正式 Version 引用 | Owner/Developer | Client | Requirement.updatedAt |
| COMPLETE_ASSESSMENT / CR | DRAFT | Owner/Developer | Client 不生成内部草稿项 | CR.updatedAt |
| REVISE_ASSESSMENT / CR | REJECTED | Owner/Developer | Client（正式拒绝后的等待修订提示） | CR.updatedAt |
| VENDOR_APPROVAL / CR | SUBMITTED、合法 active Version | Owner | Developer/Client | activeVersion.submittedAt |
| CLIENT_APPROVAL / CR | VENDOR_APPROVED、同版合法供应方 APPROVED | Client | Owner/Developer | Vendor Approval.createdAt |
| SUBMIT_DELIVERY / CR | APPROVED、同版合法双批准、无 ACCEPTED/SUBMITTED Delivery；尚无交付 | Owner/Developer | Client | Client Approval.createdAt |
| REVISE_DELIVERY / CR | 上述资格成立，最近一次 Delivery 为 CHANGES_REQUESTED | Owner/Developer | Client | Review.createdAt |
| REVIEW_DELIVERY / Delivery | SUBMITTED 且父 CR/Version 批准资格合法 | Client | Owner/Developer | Delivery.createdAt |
| ACCEPTED_DELIVERY / Delivery | ACCEPTED 且存在合法 ACCEPTED Review | 不放 mine | 不放 waiting | Review.createdAt；放 completed，三角色皆可 |

- 每个候选项对当前用户仅属于一个 bucket；key=`type:entityId`。不同业务对象的待办可以并存（例如绑定 Client 和完善评估），不声称待办数等于项目数。
- clarification 无 assignee/question addressee，不能把所有问题强行分配给 Client；三角色都可答，当前提示不改变业务权限。Client UI 优先突出问答，供应方也保留处理入口。
- Requirement 只在上述适用条件中生成一个准备类项。Pending CR 时不再提示创建 Revision；合法问答仍按既有状态允许。
- 已 READY 且已有 CR 时从 CR 工作项继续；不会不停鼓励重复创建 CR。这是 Dashboard 去重，不限制手动新建多个 CR。
- 存在历史 CR 引用最新 Revision 但所有评估已终结时，不自动推断用户要新增范围；需求页面仍允许按已有权限新建评估。
- 已完成按 ACCEPTED Delivery 去重，一份已批准交付只出现一次；退回历史计入 deliveryCounts，不冒充新的待办。聚合阶段不扫描前端所有分页。
- Client 的等待项只暴露原本可见的项目/需求标题和正式状态，不显示供应方草稿金额/编辑字段。
- 异常角色、父链、active pointer、批准证据时不生成可执行事项；读能力默认拒绝并保留安全诊断，不“修复”数据。

## 6. Capabilities 精确范围

仅为 GET 项目、需求、CR 详情及新 Delivery 详情增加，既有 mutation 响应不强制增加。客户端 mutation 后失效刷新读取。

`Capability = {allowed:true} | {allowed:false,reasonCode:ReasonCode}`。

| 响应 | keys | 资格来源 |
|---|---|---|
| Project | createRequirement,assignDeveloper,bindClient | 既有项目可见性、Owner、历史提交锁定；bindClient=false 不阻断服务端同账号 PUT 无副作用重试 |
| Requirement | editDraft,askQuestion,answerQuestion,createRevision,markReady,createChangeRequest | 原作者/Owner、状态、draftVersion 上限、Pending CR、最新 Revision、问题回答情况 |
| CR | editDraft,submit,reopen,vendorDecision,clientDecision,createDelivery | 项目角色、lockVersion 上限、当前状态、最新 Ready、草稿完整性、Client、同版批准及交付终态 |
| Delivery | review | 绑定 Client、SUBMITTED、父链与批准资格；无 expectedVersion |

ReasonCode 封闭集合：`ROLE_FORBIDDEN,INVALID_TRANSITION,CLIENT_ASSIGNMENT_LOCKED,REVIEW_IN_PROGRESS,CLIENT_REQUIRED,ROLE_CONFLICT,REVISION_NOT_READY,UNANSWERED_QUESTIONS,ASSESSMENT_INCOMPLETE,ALREADY_REVIEWED,DELIVERY_PENDING,DELIVERY_COMPLETED,VERSION_EXHAUSTED,BUSINESS_RULE_VIOLATION`。这是提示码，不增加 HTTP 错误码。无操作权限时优先 ROLE_FORBIDDEN，不泄露内部资格细节；其余按既有领域检查顺序返回第一个阻塞理由。不得显示“权限允许但肯定提交成功”的承诺。

- 不创建另一份角色/状态矩阵引擎。AuthorizationRepository 决定作用域；从现有 service 局部提取无副作用 eligibility helpers，读/写共用，写锁和检查顺序保持。
- 读能力只判断已持久化上下文。editDraft/askQuestion 等为进入操作许可，不能预先保证未提交 payload 合法；answerQuestion 表示存在可回答 QUESTION，具体 parent/body 仍在写入校验。
- createRevision 在审批中禁止；markReady 按现有规则检查，不凭空新增“必须最新问答已被抄入版本”的业务规则。
- CR Client 返回 draft 完全缺席，并且内部编辑/提交能力只返回 ROLE_FORBIDDEN；不要通过 reasonCode 回传草稿完整性。
- 新旧读取统一不自动写审计、分配待办或更改状态。Session 活动更新仍是 R02 行为。

## 7. OpenAPI 与 Phase B 验收

- 复用 @nestjs/swagger；仅覆盖 R07 使用的 R02–R06 HTTP API、七个新增 GET、capabilities 与标准错误。公开 health 保留原结构。
- DTO 保留 class-validator；补显式响应 DTO/Schema，不迁移现有所有业务校验。日期 date-time、金额 safe integer 范围、工时 pattern、optional/null 和 Client 无 draft 必须精确。
- CR Supplier/Client 响应用 oneOf（Supplier 要求 draft，Client 禁止 draft）；生成类型需能安全区分，不用数据库类型冒充网络协议。
- 离线导出不连 DB、不读 .env、不启动 Observe；生成器只在受控脚本执行，默认不暴露生产 Swagger UI。
- 生成前端类型到 apps/web/src/lib/api/generated；固定版本生成器和确定性排序，CI 在临时目录重生成比较，不在 CI 隐式修改产物。
- HTTP 序列化测试检验真实 JSON 匹配 Schema；仅生成成功不等于契约正确。具体实施和测试矩阵见 [R07_PLAN.md](../engineering/R07_PLAN.md)。

## Phase B 实施入口（2026-11-10）

- 权威机器契约：[openapi.json](openapi.json)；离线定义 `apps/api/src/openapi`，生成类型 `apps/web/src/lib/api/generated/schema.d.ts`。`pnpm --filter specbridge-api openapi:generate` 更新产物；`openapi:check` 在临时目录比较，不改产物。
- 新读取及 capabilities 均为只读一致快照；Dashboard 用授权事实 CTE 聚合，在 SQL 内排序分页；异常批准证据不产生操作项。Audit target 对不合法 Version 候选回退到已验证 CR，无法确认实体父链时为 null。
- UTC 时间规范由真实 HTTP 测试严格验证；R03 既有原生 SQL 日期序列化已作等价格式修复。写请求/认证/Schema/Migration 未扩展。
- HTTP 契约验证入口 `test:e2e:reads`，真实 DB 权限、字段、分页、聚合及 R02–R06 使用路径响应均经 Schema 校验。具体已跑/未跑范围以 STATE 为准。
