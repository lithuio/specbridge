# SpecBridge 开发工作流

## 单一工作任务流程
1. 在 GitHub 创建 Issue（业务背景、Scope、Out of Scope、验收、测试、依赖）。
2. `git switch main && git pull --ff-only origin main`；要求工作区干净。
3. `git switch -c feat/<short-topic>` 或 `fix/<short-topic>`。
4. 启动 Codex：阅读 `AGENTS.md`、`docs/STATE.md`、Issue 和任务相关设计；先出计划。
5. 审核计划 → 实现最小完整变更和必要测试；禁止无关重构。
6. 本地跑相关测试、lint/build，人工审查 `git diff`，必要时 DeepSeek 独立 Review。
7. `git add <明确的文件>`、`git diff --cached`、创建 Conventional Commit。
8. `git push -u origin <branch>`、`gh pr create --fill`；在 PR 填测试证据和风险。
9. `gh pr checks`、Review、修复，只有真实通过后人工同意合并。
10. `gh pr merge --squash --delete-branch`（须经人工授权）、同步 main，更新 STATE/Issue。

## Definition of Done（DoD）
- [ ] 达到 Issue 对应 AC；所有非范围内变更有明确批准。
- [ ] 相关 API/数据结构与设计契约一致；跨租户权限和异常路径已验证。
- [ ] 涉及状态机/审批的数据库事务、幂等/冲突/审计测试通过。
- [ ] 实际运行过相关测试、Lint、Build；PR 的 CI 为绿色。
- [ ] 文档、迁移与执行代码同步；无密钥/演示冒充事实。
- [ ] 人工 Code Review 完成，PR 合并，Issue 关闭。

## 人机职责
- 产品负责人：确定需求、取舍、数据/权限方案、合并和发布。
- Codex：设计建议、编码、测试、解释更改与报告真实执行结果。
- DeepSeek：可提供独立方案/Review；若无工具权限，不假定能修改本地代码。

## 代码和协作约定
- `main` 始终可构建；短期功能分支；尽量每 Issue 一 PR。
- Commit 使用 `feat(scope): ...`, `fix(scope): ...`, `docs: ...`, `chore: ...`。
- 本地可并行使用 worktree，但认证/DB 契约等共享高冲突模块尽量串行。
- 避免 `git add -A` 在没有先确认全部新增文件的情况下提交。
