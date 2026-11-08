# ADR-002：服务端 Session、Workspace/Project 作用域授权

- **状态**：Accepted（产品负责人已确认身份与角色业务边界；技术实现待审）
- **日期**：2026-11-01

## 背景

v1 主要是浏览器协作系统，存在同一个用户加入不同项目、不同 Workspace 的情况。最重要的风险是项目对象越权访问。

## 决策

采用数据库持久化随机 Session Token（库内仅存 Token 哈希）+ HttpOnly/Secure/SameSite Cookie；服务端基于 Workspace 和 Project 关系进行访问控制。Owner 可管理自己 Workspace 全部项目；Developer 只管理被分配项目；Client 只访问被绑定项目。项目创建时可以无 Client，但首个正式提交前必须唯一 Client；首次 Submit 后不允许在 v1 替换该账号。

## 备选

1. localStorage JWT：前端管理简单，但撤销和浏览器 Token 暴露风险更高。
2. 只用全局 RBAC：不能表达“同用户可看 A 不能看 B”的对象级授权。
3. 外部 Auth SaaS：可减少一些认证工作，但引入供应商依赖、回调配置与额外流程，当前不优先。

## 代价与风险

需要维护 Session 生命周期、CSRF 策略、对象级 Policy 和账号管理。可复用框架成熟模块，不自行设计加密算法。

## 验证

独立两个 Client 账号互相访问项目不可成功；Session 撤销生效；Owner/Developer/Client 权限矩阵测试通过。

## v0.2 限制

Client 不加入 Workspace 内部成员；同一账号不得兼任同一 Workspace 的供应方成员和项目 Client。客户绑定使用独立 Owner-only 端点，先注册后分配，无邮件邀请。

## R02 技术落实（2026-11-08）

负责人确认采用：256-bit 随机 Cookie Session、SHA-256 摘要存库、7 天绝对期、24 小时空闲期；新增 last_activity_at 增量迁移，不修改 R01 SQL。认证默认保护，@Public() 显式开放。JSON 写接口采用严格 Origin + 自定义请求头 + Fetch Metadata 校验，包含注册/登录。

本阶段 /me 只返回用户，不实现组织/项目授权；重复注册以通用 409 返回，接受有限邮箱枚举风险；限流采用有界单实例内存，重启清零，多实例上线前必须另行设计。具体接口、安全参数、验证证据分别以 API.md、SECURITY.md、STATE.md 为准。

## R03 已确认细化

- /me 持续仅用户；GET /workspaces 仅供应方所属空间；GET /projects 的 workspaceId 可选，Client 直接查询授权项目列表。
- Owner 通过 Workspace 所有权访问项目，不额外添加 Project Developer 记录。
- 首次 Submit 前 Client PUT 为串行更正，最后成功提交生效；历史锁定后同账号重试 200，无副作用，实际换人 409。
- 利用现有唯一索引和事务行锁，无新增迁移：成员写锁 Workspace、Client 写再锁 Project；反向角色分配共享 Workspace 锁。未来 Submit 必须共享 Project 锁并查询唯一 Client。
- 本阶段仅 API、数据库及 HTTP/Next Rewrite E2E，不增加前端页面。权限校验始终在 API。
