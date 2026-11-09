# SpecBridge 功能验收标准（Acceptance Criteria）

> 版本 v0.2｜状态：**已批准 P0 规格；待实现测试**。编号用于 PRD、User Stories、GitHub Issue、E2E 之间的追踪。本文未声称任何测试已通过。

## 通用验收规则

- 每个场景必须保留 Given/When/Then、角色和预期 HTTP/界面结果；由人工核对真实运行与数据库状态。
- 所有 P0 核心 API 必须覆盖合法、非法状态和未授权访问；接口错误不泄露客户私有信息。
- UI 需包含 Loading/Empty/Error/Success；权限仅靠隐藏前端按钮不算通过。
- 关键状态转换要验证 AuditEvent；审批写入与状态更新在同一个事务中。

## P0 核心验收表

| ID | Given（前置） | When（操作） | Then（期望） |
|---|---|---|---|
| AC-01 | 未注册邮箱 | 用户注册并登录 | 密码哈希存储；创建 Session；可 GET /me |
| AC-02 | 已登录 | 退出后使用原 Cookie 请求保护 API | 返回 401；Session 已撤销 |
| AC-03 | Owner 已登录 | 创建 Workspace/Project 并填写非空 `baseline_scope` | 数据持久化，范围不可就地修改；初始可未分配 Client |
| AC-04 | 项目 Owner | 将已注册 Developer 加入项目并指定唯一已注册 Client | Developer 仅访问自己项目；Client 不加入供应方 Workspace；不能越权审批 |
| AC-05 | 两个不同 Project/Client | Client A 枚举/猜测 B 的 ID | 读写均失败，响应不暴露 B 的业务内容 |
| AC-06 | Client 有权限 | 创建/编辑自己 Draft Requirement | 原文持久化，非法字段返回 400 |
| AC-07 | Requirement 在 Clarifying | Developer 发问，Client 回复，Developer 标为 Ready | 问答可查且状态变化可审计 |
| AC-08 | 存在 Revision 1 | 创建 Revision 2，尝试编辑 Revision 1 | Revision 1 内容不变；版本连续递增 |
| AC-09 | 最新 Revision Ready | Developer 创建评估、提交 | 先保存可编辑评估草稿，再 Submit 产生不可变快照，绑定最新 Ready RequirementRevision |
| AC-10 | ChangeRequestVersion 已 Submitted | Owner 批准供应方阶段 | 写 Approval 与 AuditEvent，状态进入 VendorApproved |
| AC-11 | 已 VendorApproved | 指定 Client 批准 | 同一 ChangeRequestVersion 状态 Approved；其他 Client 无权限 |
| AC-12 | 重复/并发审批或旧 `lock_version` | 发出重复/过期请求 | 不生成重复/矛盾 Approval；过期写返回 409 |
| AC-13 | 已 Approved | Developer 提交 Delivery URL + 说明 | 与已批准版本关联；未批准版本不能交付 |
| AC-14 | Delivery Submitted | Client 拒收并评论→新 Delivery→接受 | 历史拒收保留；新交付产生独立 deliveryNo；最终状态 Accepted |
| AC-15 | 任一关键状态变化 | 授权用户查看审计记录 | 记录 actor、action、entity、timestamp、版本；客户仅能查可见事件 |
| AC-16 | API 未认证、角色不足、对象非本项目 | 调用任意敏感写接口 | 分别 401/403/404；不发生数据写入 |
| AC-17 | 数据库重启/服务重启 | 重启服务并重新登录 | 数据仍在；迁移可重复执行；有备份/恢复实测记录 |

## P1 扩展验收

| ID | Given | When | Then |
|---|---|---|---|
| AC-18 | 有权限的 Requirement | 触发 AI 需求分析 | 生成结构化建议，显示“AI 草稿”，用户可编辑后采用 |
| AC-19 | API 超时/格式错误/密钥不可用 | 触发 AI 分析 | UI 提示失败，原始需求和 P0 流程无损坏；无密钥泄露 |
| AC-20 | 项目作用域 API Token | MCP 调用读取批准版本和其他项目 | 只返回授权/Approved 版本；跨项目拒绝；无法审批 |
| AC-21 | Developer 有项目权限 | 保存合法 GitHub Issue URL | URL 绑定到变更；不访问外部内容，不自动执行工具 |

## 验收证据与测试层级

| 场景 | 建议验证方式 | 保留证据 |
|---|---|---|
| 业务规则、状态机 | Vitest 单元测试 | 测试输出/CI 链接 |
| 事务、并发、授权 | PostgreSQL 集成测试 | 冲突/事务用例与结果 |
| 三角色主流程 | Playwright 浏览器 E2E | 运行结果、关键截图/视频 |
| 生产访问 | 手工 Smoke Test | 部署版本与 URL，不贴真实凭据 |
| 数据恢复 | 一次备份→隔离环境恢复 | 操作步骤与恢复校验结果 |

## v1.0 发布门槛

1. **全部 P0（AC-01 至 AC-17、AC-22 至 AC-27）可验证通过**；真实失败保留 Issue。
2. 没有已知越权、密钥泄露、审批冲突、数据丢失等 P0 缺陷。
3. CI（Lint/类型检查/Build/测试）绿；浏览器 E2E 主链路实际运行。
4. HTTPS、最小日志、部署环境变量、数据库迁移、备份恢复演练完成。
5. README、演示视频/过程、Release Notes 反映实际功能。P1 未做可明确声明，不能伪装完成。

## v0.2 产品决策新增验收用例（P0）

| ID | Given（前置） | When（操作） | Then（期望） |
|---|---|---|---|
| AC-22 | Owner 新建未绑定 Client 的项目 | 尝试提交 ChangeRequest | 返回 422 `CLIENT_REQUIRED`；不会生成冻结 Version/审计审批事件 |
| AC-23 | Project 还未首次 Submit | Owner 指定/更正 Client；再指定第二人或供应方成员 | 指定成功，替换原账号而非追加；跨角色冲突 422；数据库部分唯一索引确保同时最多一人 |
| AC-24 | Project 已发生过正式 Submit | Owner 尝试更换 Client | 返回 409 `CLIENT_ASSIGNMENT_LOCKED`；不改变之前审批人的权限身份 |
| AC-25 | Requirement 存在 SUBMITTED / VENDOR_APPROVED 的 ChangeRequest | 再创建新 RequirementRevision | 返回 409 `REVIEW_IN_PROGRESS`，当前冻结版本不变 |
| AC-26 | `baseline_scope` 已创建 | 调用项目编辑 API 修改范围 / 尝试假冒初始范围正式签署 | 范围原值不变；v1 无初始范围审批/签名 API |
| AC-27 | 某已批准 CR 已有 SUBMITTED Delivery 或 ACCEPTED Delivery | 再次创建 Delivery | 对未审情况返回 409 `DELIVERY_PENDING`；已验收后返回 409 `DELIVERY_COMPLETED`；退回后允许新 HTTPS 链接交付 |

**交付格式补充**：`artifactUrl` 为 HTTPS URL，`summary` 为纯文本，`evidenceLinks` 为可选 HTTPS URL 数组；不接受二进制文件上传或服务端自动抓取 URL。


## R04 验收细化（本地 API/数据库证据见 STATE）

- AC-06/16：仅 DRAFT 作者/Owner 可 PATCH；全部已有 Requirement 写接口要求 expectedVersion，过期 409 STALE_VERSION 且无业务/审计副作用。
- AC-07：所有问题均必答，至少一个同需求合法 Answer 即已答；父项必须是 QUESTION。READY 禁止追加问答；Owner/Developer 创建新 Revision 后恢复 CLARIFYING，再重新 Mark Ready。Client 无 Revision/Ready 权限。
- AC-08/25：同版本并发 Revision 一成功一 stale，刷新后重试编号连续；Ready/Revision 竞争不能确认未看过的新版本；任一 SUBMITTED/VENDOR_APPROVED CR 阻断新 Revision。
- 本阶段 AC-15 仅验证事务审计写入，AC-09 仅提供最新 Ready Revision 前置条件；不代表审计查询、Submit/审批或浏览器验收完成。

## R05 验收细化

- AC-09/22：最新 Ready Revision 创建 NULL 商业草稿，完整评估后 Submit 冻结全部字段；无 Client、非最新 Revision、非法/不完整评估不得创建 Version。
- AC-10/11/12：Owner→Client 依次决定同一 Version；任一拒绝终止该版，重开后新 Submit 生成新编号且无旧审批。并发/重复不得产生矛盾决定，stale 409；APPROVED 为终态。
- AC-24/25：真实 Submit 与 Client 更换/Revision 创建的双顺序竞争测试，不再仅依赖 SQL 协议 fixture。任一 Pending CR 阻止 Revision，拒绝/重开不解除 Client 历史锁定。
- AC-05/16：七接口 HTTP 角色/跨项目矩阵；Client 隐藏全部商业草稿，所有正式快照和双方评论可见；请求不能注入审批身份、时间或 Version ID。
- AC-15 本阶段仍仅证明事务审计写入与失败回滚；未实现审计查询、Delivery、完整浏览器页面或生产发布。实际本地执行证据见 STATE，不据此宣称全 P0 验收。
