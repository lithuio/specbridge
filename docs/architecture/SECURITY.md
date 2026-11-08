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

- 必须先核对项目授权、当前阶段、具体版本和 `lock_version`；所有状态更新条件写 + Approval/Review + AuditEvent 在单事务内。
- 冻结快照只有 INSERT，没有业务 UPDATE；拒绝后新建版本重新审批。
- 审批人、审批时间与精确 Version ID 不可由请求体自行指定，均从认证上下文和数据库读取。
- 客户只批准已由 Owner 批准的同一快照。

## 7. AI / MCP 威胁控制（P1）

- DeepSeek Key 仅服务器环境变量，绝不出现在 `NEXT_PUBLIC_*`、前端 bundle、API 响应或日志。
- AI 输出当作不可信外部数据；先 Schema 校验、人审再落正式 Revision，不允许执行 AI 生成的指令、URL、代码或商业审批动作。
- 对 Prompt Injection：客户需求文本可能含“忽略系统限制”等字样；当普通文本处理，不授予提升权限。
- stdio MCP 默认只读工具；调用后端时使用项目限定、可过期、可撤销的 Token；不提供 `approve_change_request` 等高影响工具。
- MCP 工具说明/注解不替代服务器授权。远程 MCP/OAuth 不是 v1 的安全承诺。

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
