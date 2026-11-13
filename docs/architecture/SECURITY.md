# SpecBridge 安全设计与权限模型

> v0.2 已确认 P0 业务决策；安全设计仍待实施验证｜参照 OWASP ASVS 5.0 官方标准的相关控制类别。此文是设计目标，未进行安全审计/渗透测试。

## 1. 威胁模型

受保护资产：账号与会话、客户项目/需求、报价工时、审批历史、交付链接、审计日志、DeepSeek Key/MCP Token。  
对手与入口：未认证者、恶意/误操作客户、跨项目用户、受污染的 AI 输出、被盗凭据、可控 URL、暴露的日志/仓库。

最高风险：BOLA/IDOR（改项目 ID 窃取他人资料）、CSRF、会话窃取、权限提升、审批版本替换、重复审批竞态、密钥泄漏、Prompt Injection。

## 2. 身份认证与会话

- 密码使用成熟的 `Argon2id` 实现；禁止明文、可逆加密或自行发明哈希。
- 邮箱在服务器统一大小写/规范化；注册/登录错误不可泄漏账户存在性超过必要范围。
- 成功登录生成 256-bit CSPRNG 随机 Token；数据库只保存安全哈希，`HttpOnly; Secure; SameSite=Lax` Cookie；生产采用 `__Host-` 前缀，配合 `Path=/`、无 Domain。
- Session 设置绝对有效期（建议 7 天）、空闲失效（建议 24 小时），登出/改密即撤销；登录成功更换 Session，防 Session Fixation。
- 生产强制 HTTPS，反向代理正确配置受信任代理；开发 localhost 可特殊处理 Secure Cookie。
- 表单写请求执行 Origin/Fetch Metadata 校验及 CSRF 防护，不能只依赖 SameSite。
- 登录/注册限流；数据库/日志不得保存或输出 Cookie、Bearer Token、原始密码或 API Key。

## 3. 权限矩阵（默认拒绝）

| 操作 | Workspace Owner | 项目 Developer | 项目 Client | 其他用户 |
|---|---|---|---|---|
| 创建/管理本 Workspace | 允许 | 拒绝 | 拒绝 | 拒绝 |
| 创建项目、分配成员 | 允许 | 拒绝 | 拒绝 | 拒绝 |
| 查看项目/需求 | 允许 | 仅获分配项目 | 仅自身项目 | 拒绝 |
| 发起需求 | 允许 | 项目内 | 项目内 | 拒绝 |
| 澄清与产生 Revision | 允许 | 项目内 | 回复澄清，不能擅改 Ready 规格 | 拒绝 |
| 评估和提交 ChangeRequest | 允许 | 项目内 | 拒绝 | 拒绝 |
| Vendor 审批 | 允许 | 拒绝 | 拒绝 | 拒绝 |
| Client 审批 | 拒绝 | 拒绝 | 仅本项目 | 拒绝 |
| 提交 Delivery | 允许 | 项目内 | 拒绝 | 拒绝 |
| 验收 Delivery | 拒绝 | 拒绝 | 仅本项目 | 拒绝 |
| 看历史审计 | 全本 Workspace | 自己项目已授权子集 | 自己项目已授权子集 | 拒绝 |

注：同一自然人可以在不同工作空间有不同角色，但对同一业务审批步骤必须按操作上下文检查，不能用全局 `user.role` 代替项目关系。一个账号不应同时在同一 Workspace 供应方身份与其项目 Client 身份之间拥有冲突权限（创建/分配成员时阻止冲突）。

## 4. 对象级授权（BOLA 防护）

- 每次针对 `:projectId`, `:requirementId`, `:changeId`, `:deliveryId` 的请求，服务端先解析父项目，再依据 membership 查询授权；不得只看 token 内 role。
- Client 跨项目读取返回 404，避免暴露资源是否存在；认证失败 401，同项目无操作权 403。
- UI 隐藏按钮只用于体验，不是权限边界；MCP 和 Web 走相同服务端 Policy。
- 自动化测试构造 Client A / Client B / Developer C / Owner D 的交叉矩阵覆盖所有敏感端点。

## 5. 输入、输出、文件、外部链接

- DTO/Zod 校验：最大长度、枚举、数值范围、URL scheme（只允许 https，开发特殊 localhost 另议）、分页限制。
- 默认 HTML escape；富文本 v1 不支持可执行 HTML；不用 dangerouslySetInnerHTML 渲染 AI/客户文本。
- 仅保存 Delivery/GitHub HTTPS URL；服务端不自动 fetch 用户提供的 URL，防 SSRF；如果后来实现抓取必须引入目的地白名单和防内网地址策略。
- v1 不支持可上传任意文件，减少病毒扫描、存储授权和资源滥用风险。
- 生产设置必要的安全响应头；CSP 在项目实际依赖梳理后配置并逐步收紧。

## 6. 审批安全与事务完整性

- 必须先核对项目授权、当前阶段、具体规格版本；Requirement/CR 另检查聚合版本，Delivery 使用下述方案 A；所有状态更新条件写 + Approval/Review + AuditEvent 在单事务内。
- 冻结快照只有 INSERT，没有业务 UPDATE；拒绝后新建版本重新审批。
- 审批人、审批时间与精确 Version ID 不可由请求体自行指定，均从认证上下文和数据库读取。
- 客户只批准已由 Owner 批准的同一快照。

## 7. AI / MCP 威胁控制（P1）

2026-11-13批准的后续 [AI工作流升级](../engineering/AI_WORKFLOW_PLAN.md) 将新增私有工作稿、受控背景上传及独立的人类确认执行接口。模型工具继续不拥有业务写权限；新增执行接口必须复用Session/CSRF、事务授权和expectedVersion。背景默认内部，对客生成只读取共享材料；个人工作稿不能被同项目其他人读取。文件上传仅放宽特定路由的内容类型，不能放开全站CSRF。安装器的本地凭据保存在仓库外，外部Token仍只读批准规格。阶段A现已接通两任务生成、个人工作稿和明确确认发布；ID+CAS、回执重放、R04事务/Pending与前后权限复核经真实HTTP/DB测试。工作稿正文仅服务端私有表和组件内存，不入公开活动/日志/Observe/浏览器持久存储。AI生成仍无写权限，发布是独立Session+CSRF人工命令。B已接通受控背景上传/解析和共享版本隔离，0006仅获批隔离库应用；C已接通本人提案及人工确认事务，0007仅获批隔离应用；D安装授权尚未实现；以下R08外部MCP只读边界仍保持。

- DeepSeek Key 仅服务器环境变量，绝不出现在 `NEXT_PUBLIC_*`、前端 bundle、API 响应或日志。
- AI 输出当作不可信外部数据；先 Schema 校验、人审再落正式 Revision，不允许执行 AI 生成的指令、URL、代码或商业审批动作。
- 对 Prompt Injection：客户需求文本可能含“忽略系统限制”等字样；当普通文本处理，不授予提升权限。
- R08 C Copilot 仅允许七个注册只读工具；严格 Schema 禁止模型覆盖 projectId、调用任意 SQL/Shell/文件/业务写方法。读取通过现有授权业务服务且核验真实父项目；Client 商业草稿在业务服务层剔除，不进入模型上下文。页面资源亦先授权核验父链。
- 用户问题/历史、页面提示、工具正文和来源标题均为不可信资料；工具结果保留 tool role，不提升为 system 指令。每次模型调用/工具读取/最终返回重验 Session、项目和初始角色；失败时不返回已生成私有内容。无权用户不能通过错误区分隐藏资源。
- 最终来源只接受本轮实际读取的编号，链接/版本/时间由服务端生成；模型文本纯文本展示，不能执行 URL/HTML 或审批。引用可追溯不代表结论正确，UI 始终标注待核实建议。注入测试验证权限/执行边界，不声称消除模型语义幻觉。
- 聊天仅浏览器内存，按 epoch/user/project 隔离、最近10轮；不进入 QueryCache/localStorage/数据库/审计正文，刷新或切换作用域清除，明确撤权清除，临时故障隐藏并允许重验。Provider 仅收到经授权的必要片段，遵循有界裁剪/循环/Token/超时配额。Copilot HTTP 路由排除 Observe trace，且全局内容捕获关闭。
- stdio MCP 默认只读工具；调用后端时使用项目限定、可过期、可撤销的 Token；不提供 `approve_change_request` 等高影响工具。
- MCP 工具说明/注解不替代服务器授权。远程 MCP/OAuth 不是 v1 的安全承诺。

### R08 D 项目凭据边界

- 仅当前Owner可创建、列出、撤销；256-bit CSPRNG、固定sbp_前缀和规范base64url编码，数据库只存完整凭据SHA-256。高熵随机凭据不使用密码KDF；hash不返回Web或写日志。只能读取绑定项目的已批准技术规格，不能读取商业详情或调用业务写API。
- 每个请求按数据库当前关系重验创建者Owner资格、项目ACTIVE、expires_at > clock_timestamp()、未撤销及精确只读scope。所有普通业务路由拒绝Bearer；仅显式注册的两条批准读取路由接受独立Token principal。拒绝Cookie/Bearer混合及重复Authorization头；HEAD同等鉴权。缺少/错误身份不回退到其他认证方式。
- 创建/撤销和Token读取遵循Workspace→Project→Token行锁顺序；读取返回前再次验证并写使用审计。撤销先获锁提交则后续读取被拒绝；已先完成授权/读取/审计事务的在途响应可能抵达客户端，不能追溯收回已交付数据。当前授权变更遵循相同Workspace/Project锁协议；以后新增资格变更功能需延续这一协议。
- api_token审计只对Owner可见，SQL分页前过滤；使用actor为null而非冒充创建者。成功使用保存必要元信息，401/404失败不写高基数审计正文。保留现有受控错误日志，不采集Token路由HTTP trace/正文；全局Observe捕获关闭且脱敏键及模式包含Token。
- 浏览器通过Session管理，不把Bearer设置为浏览器身份。明文仅组件内存，不入Query/Mutation缓存、URL、localStorage/sessionStorage；关闭、隐藏、切页、换身份或权限丢失销毁，取消在途请求并丢弃迟到结果。复制仅由用户明确触发；操作系统剪贴板由用户保管。未知创建结果先核对列表并撤销，不自动重放。
- 生命周期1–90天、默认30天；不提供恢复/续期。归档和资格变化为动态不可用，若条件恢复且未过期/撤销可重新有效；需要永久失效必须显式撤销。新Owner可撤销旧Owner创建的凭据。
- 限流复用单进程内存服务：创建30/用户/分钟，读取120/连接IP/分钟及60/Token/分钟；使用socket peer，不信任可伪造XFF。反向代理可能使多个客户端共享IP配额；多实例/持久配额及使用审计长期保留策略需要后续容量评审。未引入Redis或HTTP OAuth。

### R08 E 本地 MCP / Skill 边界

- `apps/mcp` 仅 stdio，SDK Server 2.4.0；只注册 `list_project_requirements` 和 `get_approved_spec`。进程只向可信固定API origin发送两条批准规格GET，不直接连接数据库，不赋予Agent普通业务会话。Project/Token/origin从本地环境绑定，严格参数Schema禁止模型覆盖，API仍在每次请求中执行D的独立principal/项目/有效期/批准状态检查。
- HTTPS或精确loopback HTTP；拒绝带认证信息/路径/query/fragment的origin，拒绝HTTP重定向，Bearer不进入URL/argv/配置/日志。只保留配置私有字段中的认证头，运行入口删除环境副本；无持久缓存或自动重试。撤销后再次读取拒绝，不承诺收回宿主已获得的资料或防御同账号内存读取。
- HTTP10秒、响应2MiB、工具JSON2MiB（双表示约4MiB）、输入缓冲64KiB、并发2/每分钟60次；传递取消并在EOF关闭。API仍有限额；未知正文/字段/外项目响应/无效JSON失败关闭。stdout只输出协议、stderr固定错误，不透传原始异常及上游正文。
- 批准目录预览标注截断；精确详情把approvedScope与referencedRequirement分开。Skill明确区分批准事实、引用背景、未确认推测/建议，引用真实ID/版本/读取时间；嵌入记录的指令不成为系统授权，不自动扩张范围。Skill不是宿主沙箱，宿主自有Shell/写工具另行限制。
- 已验证真实SDK Client→stdio→Nest→隔离PostgreSQL以及一次真实Codex Host场景（合成资料、临时Token、禁Shell/插件/委派）。注入用例验证已注册工具和业务权限边界及该场景的模型表现，不承诺通用语义防注入。无远程MCP HTTP/OAuth服务。配置、错误契约和复现入口见 [MCP README](../../apps/mcp/README.md)。

## 8. 密钥管理、日志与部署

- `.env` 不入库；提交 `.env.example`；生产使用服务端密钥注入，不在镜像里 Bake Secret。
- CI 的 PR 流程不暴露生产环境 Secrets；只允许受控发布步骤接触部署密钥。
- DB 生产端口不对公网开放；容器最小权限、镜像固定版本，依赖漏洞检查纳入发布清单。
- 结构化日志仅保留 requestId、actorId、项目作用域、动作、状态、耗时；审计业务元数据白名单，不记录全文敏感资料。
- 备份加密并验证恢复；访问备份受限；数据保留/删除政策在取得真实客户后进一步确定。

## 9. 验收策略

- 安全 P0：跨租户 API 负向测试、角色越权、双批准竞态、Session 失效、CSRF、输入边界、日志无密钥。
- 以 OWASP ASVS 5.0 认证/会话/访问控制/API/日志等 L1 控制作为核对参考，逐条记录适用性与证据；不要声称完成 ASVS 认证。
- 发布阻断：未授权访问成功、审批状态可绕过、敏感凭据泄漏、重大数据丢失路径。

## 10. 参考

- OWASP ASVS 5.0: https://owasp.org/projects/asvs
- NestJS Authentication: https://docs.nestjs.com/security/authentication
- MCP 2026-07-28 release: https://blog.modelcontextprotocol.io/posts/2026-07-28/


## 11. v0.2 客户分配与审批安全补充

- **唯一性**：只有 Owner 可以执行 `PUT /projects/{id}/client`，并在同一事务检查项目归属、已注册用户、角色冲突和是否曾 Submit。数据库部分唯一索引保证一个项目最多 1 名 Client。
- **不得替换历史审批人**：首次正式 Submit 后禁止换 Client 绑定，杜绝账户替换对后续审批/审计的歧义；未来多客户或转移能力需要新 ADR。
- **双重审批身份分离**：Owner 与 Client 的权限凭数据库关系解析，不能靠前端显示角色判断；同账号不得以供应方身份再作 Client 决定。
- **冻结范围**：`baseline_scope` 只写入一次，不提供修改或初始签署能力，避免把供应方录入信息伪装成客户合同认可。
- **链接交付**：仅接收 HTTPS URL 和纯文本；展示时使用安全文本渲染和显式跳转，不自动跟随任意客户端链接或执行内容；不上传文件。
- **并发约束**：客户审批、交付评论都要在数据库事务里检查版本、状态和唯一键；任何失败不得留下孤立 Approval/DeliveryReview/AuditEvent。

## 12. R02 认证实施契约

负责人已确认：`/me` 本阶段仅返回用户；重复注册返回通用 409（仍可区分邮箱存在性）；限流仅承诺单 API 实例。R02 不实现邮箱验证、密码重置或 Workspace/Project RBAC。

- 注册/登录邮箱执行 trim + lowercase，不合并邮箱服务商别名；注册密码 15–128 Unicode code points、UTF-8 至多 512 bytes，不 trim/规范化；登录接受 1–128 code points，以兼容已存密码。displayName trim 后 1–100 字符。DTO 拒绝未知字段。
- Argon2id 使用随机盐、memoryCost=19456 KiB、timeCost=2、parallelism=1。不存在邮箱执行 dummy hash 验证；不存在账号与错误密码返回相同 401，不承诺严格恒定延时。
- Session 使用 32 随机 bytes 的规范 base64url，库内仅保存 SHA-256 hex。每次登录新建，并在同一事务撤销请求携带的旧 Session；其他设备保持登录。事务失败不发 Cookie。
- 绝对期 7 天不可延长，空闲期 24 小时，达到边界即无效。条件 UPDATE 同时验证有效性并刷新 last_activity_at，不复活 revoked session。CSRF 被拒绝的请求不更新活动时间。公共接口不更新 Session。
- 生产 Cookie 为 `__Host-specbridge_session; HttpOnly; Secure; SameSite=Lax; Path=/`，无 Domain；非生产为 `specbridge_session`，仅省略 Secure。expires 对应绝对期，登出清同作用域 Cookie。认证响应 `Cache-Control: no-store`。
- 所有写请求（含注册/登录）必须有精确可信 Origin 和 `X-CSRF-Protection: 1`；有 body 时只接受 application/json。Origin 缺失/null/非法均拒绝，无 Referer 回退。Sec-Fetch-Site 若存在必须 same-origin。未开放跨域凭据 CORS。标记头不是认证秘密；此方案依赖浏览器同源策略，不能防同源 XSS。
- `@Public()` 只豁免 Session 认证，不豁免 CSRF/限流。默认保护新 Controller；公开的旧 `/` 与 health 不访问 DB。
- 登录每 IP 30 次/15 分钟，IP+规范化邮箱 5 次/15 分钟；注册每 IP 5 次/小时，成功失败均计数。这里的 IP 统一取 API TCP Socket 的 remoteAddress（缺失时共用 unknown 桶），不使用 req.ip、X-Forwarded-For、X-Real-IP 或 Forwarded。最多 10,000 活动计数项，容量耗尽拒绝新键，返回 429 + Retry-After；进程重启清零，多实例部署前必须升级。
- 保留 Express 的代理元信息配置：开发默认 loopback、生产默认不信任代理，禁止 trust proxy=true。但 AUTH_TRUSTED_PROXIES 不会改变认证限流的 Socket IP 策略。现有 Next Rewrite 会保留客户端 XFF，不能据此识别真实客户端 IP。未来若需要基于真实客户端 IP 的安全决策，必须先建立可验证的入口清洗与代理信任边界。
- 同一 Next/API 连接出口地址后的所有用户共享注册 5 次/小时、登录 30 次/15 分钟的 IP 桶，可能互相触发 429，也可能被攻击者耗尽共享配额。IP+邮箱桶仍按规范化邮箱分开。直接访问 API 时按实际 Socket 对端计数；这是当前最小安全修复的可用性代价，不保证分布式防爆破。
- Cookie Secure 只由运行环境决定；CSRF 校验明确的 Origin 白名单及自定义头；Session Guard 不依赖代理 IP/协议。保留全局 trust proxy 不影响这些认证安全决策；不得在未来代码中将未经验证的 req.ip/req.protocol 当作安全事实。
- 结构化认证日志仅 requestId、actorId（已解析时）、action、status、durationMs。未知异常不输出原始对象/SQL 参数；Observe 关闭请求内容和源代码捕获，忽略认证路由 trace，保留脱敏；未配置真实 Observe key pair 时禁用发送。外部 Observe 服务端接收结果不属于本地测试证据。
- 登出撤销后后续认证返回 401；已通过认证的在途请求可能完成。Session 持久化不等于授权，后续资源端点仍须服务端作用域检查。

## R03 作用域授权实施

- Workspace 列表只包含供应方成员所属空间，Client 通过不带 workspaceId 的项目列表进入。项目列表过滤条件只能缩小授权集合；EXISTS 查询先过滤后分页，不公开全局总数。
- Owner 要求 owner_id 与 OWNER membership 一致；Developer 必须同时具有父 Workspace DEVELOPER 和 Project DEVELOPER；Client 必须有该项目 CLIENT 且没有本空间供应方身份。冲突配置默认拒绝。
- 写操作先锁 Workspace，项目写再锁 Project，并在事务内复核。加入 Workspace Developer 时检查目标是否为本空间任何项目 Client；绑定 Client 时反向检查全部供应方身份。Owner 不能被重复分配为 Developer。
- 首次正式提交历史存在后，换 Client 返回 409 CLIENT_ASSIGNMENT_LOCKED；同账号 PUT 是 200 无副作用重试。并发更正于提交前串行，真正变化才留审计。
- 未注册邮箱仅在 Owner 授权后报告；Client/Developer 项目详情不显示邮箱、密码摘要或 Session。领域错误经过状态/code 白名单，内部错误继续通用 500。
- 保留 R02 默认 Guard、CSRF 顺序、Cookie 和 Socket IP 限流。Next Rewrite、trust proxy 和转发头均不提供 RBAC 身份；身份只来自真实 Session。

任何已认证用户可创建新的 Workspace 并成为其 Owner；这不赋予其管理已有外部 Workspace 的权限。


## R04 授权与事务实施

Requirement ID 必须通过数据库解析所属 Project 后复用 R03 Policy；创建/读取允许本项目 Owner、Developer、Client，PATCH 仅 DRAFT 原作者/Owner，Revision 与 Ready 仅 Owner/Developer。写操作按 Workspace → Project → Requirement 锁行，锁后重新授权；Client 不需要供应方 Workspace membership。跨项目资源统一 404，可见对象无操作权 403，再检查版本、状态及业务规则。

READY 禁止所有角色追加问答；ANSWER 只能引用同需求 QUESTION。未知字段、客户端 actor/status/指针注入拒绝。UUID 在 Service 边界规范化。继续使用 Session、CSRF 与安全错误白名单；不输出父项所属资源、SQL、约束名或用户正文。审计与业务使用同一 tx，metadata 仅 ID/版本/状态/字段名。

## R05 审批与可见性实施

- 七接口均复用 R02 默认 Guard/CSRF 和 R03 Project Policy；不根据请求传入 actor/time/Version ID 授权。Owner/Developer 可创建、编辑、提交、重开；Vendor 仅 Workspace Owner，Client 决定仅唯一绑定账号。跨项目 404，同项目越权 403，未知输入 400。
- 写锁 Workspace→Project→Requirement→CR 后重新授权并验证父链，禁止反序锁；Client 路径使用 projectWrite，不要求供应方 membership。成员写/Submit/Revision 共享既有协议。
- Client 响应不包含商业 draft；所有正式快照（含 Vendor 待审/拒绝）及双方审批评论公开给本项目 Client。v1 无内部备注，Vendor 不应在 comment 写内部信息。原始实体不直接作为 CR 摘要返回，金额显式安全序列化，不暴露邮箱/认证字段。
- 多查询详情在只读 REPEATABLE READ 事务中授权与投影；更换之前已开始的读取可完成旧快照，后续旧 Client 请求 404。与 Session 的在途请求边界一致。
- Approval、CR 状态/lockVersion、AuditEvent 共享同一事务；审计异常传播并回滚，错误不输出数据库信息。审批过程验证当前 Version 属于 CR、为最新且引用本 Requirement Revision；Client 再核查该 Version 的 Vendor APPROVED 和 Owner 身份。
- 同 Workspace 写入串行化是既有吞吐量限制；没有新增 RLS 或任意 SQL 防绕过承诺。保留所有 R02 转发头限流回归，未修改 Auth/Next Rewrite。

## R06 交付授权与一致性

三接口继续使用真实 Session、CSRF 与 Project Policy。Owner/分配 Developer 可交付，仅唯一 Client 可验收；同 Workspace 未分配到项目的 Developer 也无权访问。无权对象 404、可见对象角色不足 403。所有身份、时间、精确 Version 和父关系由服务端决定，DTO 禁止 expectedVersion/身份/指针注入。

Review 从 Delivery→Version→CR→Requirement 定位项目，再按 Workspace→Project→Requirement→CR→Delivery 锁序获取行锁；不能先锁 Delivery 再回锁父级。锁后重新验证关系与角色，并核查批准证据。方案 A 不要求 Delivery lock_version，使用 SUBMITTED 条件更新和唯一 Review，与审计同事务；R04/R05 的版本校验仍保留。

链接仅校验和存储，不请求外部地址；纯文本不按 HTML 执行。审计仅存 ID/版本/状态/决定，不存链接或正文。DeliveryReview 数据库触发器拒绝改删；Delivery 内容通过无公开改删入口和受限 Repository 保留，不承诺任意直接 SQL 防篡改。历史列表授权与投影使用只读 REPEATABLE READ，返回交付和 Review 的一致快照。

## R07 只读模型安全边界

七 GET 复用 Session Guard 与项目授权，不增加身份来源或写业务。多查询详情/capabilities/Dashboard 在同一只读 REPEATABLE READ 中返回；capability 是即时提示，最终写授权、锁、expectedVersion 和资格检查继续由原业务入口执行。

Audit 事件可见性在 SQL 分页前过滤，未知事件默认隐藏；metadata 仅返回事件特定、类型合法的白名单键，actor 仅安全姓名/ID，target 由真实父链核实。Dashboard 仅统计授权集合，显式不可见 projectId 返回 404，workspaceId 与授权集合取交集。Client 无 CR 商业草稿或内部草稿工作项，内部操作 capability 优先 ROLE_FORBIDDEN。HTTP/真实 DB 验证范围见 STATE，不宣称生产安全评审完成。

## R07 Phase C 浏览器会话边界

Web 复用 R02 HttpOnly Cookie、Origin/JSON/CSRF 和同源 Rewrite，不建立第二套身份或前端最终权限。`GET /me` 恢复身份，只有认证成功才挂载私有子树。身份边界会 abort 旧请求、cancel/clear 旧 QueryClient，创建新的 session epoch/QueryClient；私有 key 带 epoch/userId，后续业务附加项目、资源、筛选与分页。响应解析前后检查 lifetime signal；旧 200 与旧 401 都不得改变新会话。

所有写请求禁自动重试；登录失败 401 仅在表单显示统一文案；保护请求 401 清除私有状态并转登录。退出先隐藏私有 UI，网络结果未知时显示重试退出，不自动恢复旧缓存。可见性、重新聚焦、pageshow 与不含个人数据的 BroadcastChannel 通知用于再次确认身份。私有响应不写浏览器持久存储或 Next 共享缓存；`/me` 不推导全局 role。

普通会话复核与身份边界分开：复核暂停私有 API、取消在途请求，并通过 Activity 隐藏页面及弹窗，保留该用户的内存草稿；同一用户验证成功后恢复并失效资源查询以重新核对授权。复核网络失败保持隐藏，不丢弃输入。不同用户、401、显式登录/退出和跨标签页会话变更通知仍更换 epoch 并清除缓存/表单；复核请求自身也受取消和最新请求检查保护。项目临时读取失败仅保留隐藏的编辑状态；403/404 销毁项目表单，并阻止后续网络失败重新展示此前缓存，直到新的授权读取成功。

浏览器证据使用真实 API/隔离 DB，覆盖退出撤销和延迟响应隔离；正式 HTTPS/Secure Cookie 跨浏览器策略与人工安全评审仍不由本地 HTTP 用例替代。

## 项目背景资料安全增量（工作流B）

只有 `POST /projects/:projectId/documents` 可用multipart；Origin、CSRF、Session和项目角色检查保持，先授权再进入10MiB/单文件受限解析器。上传50/用户/小时、60/项目/小时、单实例2在途；Project锁下20身份/100MiB聚合限额及审计原子性。Owner分享必须明确指定READY版本、CAS与二次确认；替换不会共享新内容，Client响应不含内部元信息。撤回/停用/撤权后旧链接重新授权拒绝。

API私有存储默认仓库外，UUID文件名、0700/0600/no-follow，不返回路径或原件下载。解析子进程不继承API密钥、DB URL或用户环境，Node权限仅脚本/依赖读取；CPU、墙钟、heap、采样RSS、解压、页数/文本和stdout限制。Node权限和JavaScript网络屏蔽不等于强OS沙箱，RSS采样不是硬峰值上限；生产需另外审核部署隔离。错误仅固定码，Observe忽略整个documents路径，日志/审计无文件名、正文、hash或blobId。

公开澄清/规格自动上下文始终shared-only；内部Copilot依据当前项目角色获取片段。背景正文是untrusted data，不能成为新系统指令；每次后续推理和返回前重验来源资格，已发出的数据无法追溯撤回。MCP工具与Token作用域不扩张。没有完整聊天持久化。实际负面测试、依赖审计2项既有公告及部署限制见[B证据](../engineering/evidence/ai-workflow-b/README.md)。

## Copilot人工提案安全增量（工作流C）

独立Session/CSRF提案API，模型注册工具仍全只读，Bearer不能调用。来源/目标/作者/业务版本由服务器绑定；客户端只能按严格Schema编辑白名单正文/人工商业评估，确认只传版本与operationId，不能替换payload/URL/HTTP方法。本人私有提案的准备、编辑、删除审计不进入公开活动白名单；日志和Observe不含正文、完整Prompt或Token。

生成对客材料重新使用A shared-only上下文；内部Copilot对话与工具正文不自动复制。显式复制本人工作稿保留原稿，确认再验证其版本与当前业务；共享撤回/来源更新后旧提案拒绝执行。商业生成只复制真实业务记录，估算空值由人判断。

确认取得聚合锁后复核并共享锁定Session，防止等待项目锁期间退出登录仍执行的已复现竞态。既有R04/R05事务命令、审计及执行回执原子提交；双击、不同operationId、同编号改参数、唯一约束冲突及审计失败均不得重复或部分提交。24h/100份未执行配额、30用户/60项目每小时准备限流、80KiB请求载荷上限与既有AI预算同时生效。

提案过期不自动删除；本人可删除未执行项，已执行正文与回执保留不可变，不代表已实现清理周期。客户端仅内存编辑/操作编号，刷新只能恢复已保存版本；没有完整聊天持久化。[C验证证据](../engineering/evidence/ai-workflow-c/README.md)。
