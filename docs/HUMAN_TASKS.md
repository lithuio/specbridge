# SpecBridge — Human Decision & Action Queue

仅列必须由项目负责人决定或亲自核验的事项；Agent 不得把本表当作自动执行指令。

## 现在
- [ ] 审核 `docs/product/DECISIONS.md` 与 v0.2 设计文件是否一致。
- [ ] 检查本地 Git 工作区、远程 origin、现有 CI 与测试脚本。
- [ ] 审核根目录 AGENTS.md、文档索引及 GitHub 模板。
- H-01（历史）：Health Check 已有合并提交 `c64eb44`（PR #2）；原“尚未提交”状态过期。本轮未重新核验远程人工评审/CI 证据，不影响 R01 本地工作。

- [x] H-02：审核 `apps/api/drizzle/0000_database_foundation.sql` 与 `0001_immutable_history.sql`。负责人于 2026-11-08 明确回复“已审批，可以继续”；两份 SQL 未改变。已在隔离 PostgreSQL 实例验证迁移与 10 项集成测试，解除迁移审批阻塞。运行证据和网络环境限制见 `STATE.md`；未来新增/修改迁移仍须审查。

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
