# SpecBridge — Human Decision & Action Queue

仅列必须由项目负责人决定或亲自核验的事项；Agent 不得把本表当作自动执行指令。

## 现在
- [ ] H-08：R06 人工安全/并发 Review。负责人已批准方案 A 并授权实施；本地 240 项测试、类型/Lint/完整构建已通过。重点核对父链/角色锁后重验、同版本批准证据、Workspace→Project→Requirement→CR→Delivery 锁序、SUBMITTED 条件更新、真实 23505 回滚映射、退回重交/Accepted 终态和审计原子性。原因：Issue #13 DoD 要求人工安全/并发评审。状态：待审核，不阻塞已完成本地实现；不授权提交/推送/合并/部署，远程 CI/PR 需后续授权。无新增 Schema/Migration 或 SQL 审批任务。
- [ ] H-07：R05 人工安全/并发 Review。负责人已批准规划及版本从 0 开始、Client 草稿隔离/正式评论公开的契约；本地 176 项测试、类型/Lint/完整构建已通过。重点：七接口授权、同 Version 双批准、拒绝重提、共享锁与 R03/R04 竞争、审计回滚和金额序列化。原因：Issue #11 DoD 要求人工 Review；不阻塞已完成实现，不授权提交/推送/合并/部署。无新增 Migration；下一步在获授权后运行远程 CI。
- [x] H-05：R04 `apps/api/drizzle/0003_requirement_draft_version.sql` 已获负责人明确回复“已审批”。执行前核对 SHA-256 `73d3b4839fdc64f43a420a4cf4bd15f2923e194a014a86d174a205ddd4695d68` 一致；仅在 5434 隔离测试实例应用并完成存量升级/回归验证。0000–0002 未改，开发库/生产库未操作。
- [ ] H-06：R04 人工安全与并发 Review。重点：8 接口父链授权、作者限制、expectedVersion、Workspace → Project → Requirement → CR 锁序、Ready/Revision 与未来 Submit 竞态、审计回滚。状态：本地验证已完成，待人工 Review 和后续获授权的远程 CI；不阻塞已完成实现，不授权提交/推送/合并/部署。
- [x] R03 范围/契约决策：负责人确认 Client 使用独立项目列表、workspaceId 可选、/me 仅用户、Owner 不额外分配为 Developer、提交前 Client 串行更正/锁定后同账号无副作用重试，以及本阶段不增加 Web 页面。
- [ ] H-04：R03 人工安全与 PR Review。原因：Issue #7 DoD 要求人工评审；重点核对双向角色冲突、列表隔离、锁序、审计原子性和未来 Submit 协议。建议按 STATE 的 87 项本地测试证据审阅 diff。状态：待审核，不阻塞已完成的本地实现；远程 CI、提交/推送/合并需后续授权。R03 无新增 SQL，不新增迁移审批任务。
- [ ] 审核 `docs/product/DECISIONS.md` 与 v0.2 设计文件是否一致。
- [ ] 检查本地 Git 工作区、远程 origin、现有 CI 与测试脚本。
- [ ] 审核根目录 AGENTS.md、文档索引及 GitHub 模板。
- H-01（历史）：Health Check 已有合并提交 `c64eb44`（PR #2）；原“尚未提交”状态过期。本轮未重新核验远程人工评审/CI 证据，不影响 R01 本地工作。

- [x] H-02：审核 `apps/api/drizzle/0000_database_foundation.sql` 与 `0001_immutable_history.sql`。负责人于 2026-11-08 明确回复“已审批，可以继续”；两份 SQL 未改变。已在隔离 PostgreSQL 实例验证迁移与 10 项集成测试，解除迁移审批阻塞。运行证据和网络环境限制见 `STATE.md`；未来新增/修改迁移仍须审查。

- [x] H-03（已解除 R02 数据库验证阻塞）：审核 `apps/api/drizzle/0002_session_activity.sql` 并批准仅在隔离测试实例应用。只增加 last_activity_at、回填 created_at、设 DEFAULT now()/NOT NULL；不修改 R01 SQL。SHA-256：`236ecd64b2a7d1ea437ba48a09077107e8cb789a3cced16f5a7dd080a9839ee3`。Issue #5 DoD 明确要求新增 SQL 人工审核。负责人明确回复“已审核通过，可以继续进行”；已核对 SQL 哈希不变，允许隔离实例迁移/验证，不涉及开发库或生产库。隔离迁移与 R01/R02 数据库/认证 E2E 已通过，证据见 STATE.md。
- [x] R02 范围决策：负责人确认 /me 仅返回用户、重复注册通用 409、单实例内存限流。实现与验证状态见 STATE.md；不代表已通过安全 Review。

## 后续开发
- [ ] 审核后续新增/修改的 ERD 与 Migration SQL，尤其租户/审批约束；R01 初始两份 SQL 见已完成 H-02。
- [ ] 审核 Auth/Session/RBAC 的安全边界。
- [ ] 审核商业状态机、并发冲突和审计实现。
- [ ] 决定 D-05～D-08（见 `docs/product/DECISIONS.md`）。

## 发布前
- [ ] 配置真实部署凭据与 HTTPS，密钥不进入仓库或 Agent 输出。
- [ ] 检查演示账户、隐私数据与安全测试结果。
- [ ] 审核备份恢复测试，批准生产部署与 Release。
- [ ] 完成真实用户反馈并区分实证与假设。
