# SpecBridge — Human Decision & Action Queue

仅列必须由项目负责人决定或亲自核验的事项；Agent 不得把本表当作自动执行指令。

## 现在
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
