# Product Decision Register — SpecBridge v0.2

> 2026-11-03 整理；以下四项由产品负责人明确确认。其余为尚未确认的默认建议。

| ID | 状态 | 决策 | 影响 |
|---|---|---|---|
| D-01 | **Accepted** | 面向独立开发者、2–10 人软件工作室 | 产品叙事、角色、使用场景 |
| D-02 | **Accepted** | 每项目至多一个 Client 审批账号；提交正式审批前须指定 | 项目成员表约束、权限、邀请流程 |
| D-03 | **Accepted** | Workspace Owner 先批准，项目 Client 再批准同一冻结版本 | 状态机、Approval 唯一约束、事务 |
| D-04 | **Accepted** | 初始范围创建时固定；后续变化走 ChangeRequest；仅链接与说明交付 | Project、版本审批、Delivery |

## 已确认（不阻断 M1）
- D-05：界面首发中文，默认示例币种 CNY。
- D-06：DeepSeek / MCP 属于 P1，不阻断核心 P0 发布。
- D-07：v1 不接支付；访谈真实用户以验证商业价值。
- D-08：生产用 Linux VPS + Compose + HTTPS 或经审批的托管替代。
- D-09（2026-11-13 Accepted）：批准R08之后的AI工作流升级并授权实施。两类独立个人工作稿、常见文档背景（内部/共享分离）、预览确认后的有限业务操作、Linux/WSL Codex安装授权向导；外部MCP仍只读批准规格，无完整聊天持久化。具体边界及阶段见 [执行计划](../engineering/AI_WORKFLOW_PLAN.md)。新SQL仍须审核；不授权自动Commit/Push/PR/Merge/部署。

## 设计派生约束（需要代码测试）
- 项目初始可无 Client，但一旦开始正式审批，Client 绑定按 v0.2 规则锁定。
- ChangeRequest 草稿与冻结版本分开存储。
- Pending 审批阻止该需求产生新的 Revision。
- 已接受交付不可覆盖，历史保留。

上述派生约束如需改变，应先审核 PRD / Data Model / State Machine / API 的连锁影响。
