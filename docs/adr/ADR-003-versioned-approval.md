# ADR-003：不可变规格快照、两阶段审批与乐观并发

- **状态**：Accepted（业务策略已确认；数据库与 API 实施待审）
- **日期**：2026-11-01

## 背景

如果批准后继续编辑原文、范围、费用或工期，就无法证明客户批准了什么。两个浏览器同时批准还可能出现覆盖或双重提交。

## 决策

- `RequirementRevision`、`ChangeRequestVersion` 创建后只读。
- ChangeRequest 的 `draft_*` 字段可编辑；Submit 时以事务复制成冻结版本，记录引用的最新 Ready RequirementRevision 和商业影响；项目必须已分配唯一 Client。
- 供应方 Owner 首先决策；指定 Client 再决策。Approval 关联准确 ChangeRequestVersion。
- Rejected 后返回 Draft，重新 Submit 产生新版本，不继承旧审批；Approved 后的新范围变化需新建 ChangeRequest。
- 事务中以 `lock_version` 条件更新、唯一键及 AuditEvent 保证一致性。

## 备选

1. 仅记录状态 + 最后编辑时间：简单，但无法恢复签认时的具体内容。
2. 全量事件溯源：审计能力更强，但两周 MVP 实现维护成本过高。
3. 最后写入覆盖：会引入审批竞态与歧义，不接受。

## 代价

数据表与状态机较复杂、需要明确 UI 的历史版本视图，但属于项目最值得保留的工程深度。

## 验证

旧版本不可修改；审批关联固定版本；并发冲突返回 409；拒绝重提交不继承旧批准；交付只允许绑定 Approved 版本。

## v0.2 延伸业务约束

- 初始范围只作为创建时不可修改的参考快照，后续跟踪的正式交付要关联已批准 CRVersion。
- 同 Requirement 有提交中/供应方已批但客户未决的版本时不允许产生新 Revision；需先完成或拒绝当前审批。
- 审批和交付均关联不可变 Version；客户拒收 Delivery 后创建新的 Delivery；已 Accepted 版本不得继续交付。
- 首次正式 Submit 后 v1 禁止项目 Client 更换，避免审批主体身份漂移。


## R04 已批准实施细化（2026-11-09；本地实现及验证完成）

Requirement 使用独立 draft_version（初始 1），PATCH、问答、Revision、Ready 均要求 expectedVersion，并在同一事务递增。统一聚合版本使旧页面不能确认并发创建的新 Revision；代价是追加问答也可能需刷新重试。READY 不允许追加问答，先由供应方创建新 Revision 重开澄清。

复用 Workspace → Project → Requirement → CR 锁序；R04 锁到 Requirement，未来 Submit 必须共享该锁。只有唯一键或“先查询 Pending”不足以防止 Submit/Revision 竞态。新字段通过 0003 增量迁移加入，生成后须人工审核才能执行；本决定本身不代替 SQL 审批；0003 的后续批准及隔离验证证据见 STATE / HUMAN_TASKS。
