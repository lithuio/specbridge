# SpecBridge 两周路线图与版本规划

> v0.2 已确认 P0 范围｜工期前提：14 个连续开发日，每日约 6–8 小时，已有开发环境。以下是**目标计划**，非完成记录。

## 关键路径与发布门槛

`需求基线 → 数据/权限模型 → Auth/Workspace/Project → Requirement/Revision → ChangeApproval → Delivery/Review → E2E/安全 → 部署/Release`

P1 AI/MCP 可在核心流程可用后并行补充，但不应阻塞 P0 上线。

| 日期 | 阶段 | 任务 | 可检查成果 |
|---|---|---|---|
| D1 | M1 产品 | PRD、用户故事、竞品、低保真页面、访谈提纲 | Product Baseline v0.2 范围确认 |
| D2 | M1 架构 | 数据模型、状态机、权限、API、安全、ADR | Architecture Baseline v0.2 需实施评审 |
| D3 | M1→M2 | 整理仓库规范/CI、基础 API 契约、迁移脚手架 | 设计评审通过、质量命令可运行 |
| D4 | M2 | User、Session、登录/登出 | auth 测试通过 |
| D5 | M2 | Workspace、Project、成员、项目隔离 | 跨租户负向测试通过 |
| D6 | M3 | Requirement、Clarification | 需求流转可运行 |
| D7 | M3 | RequirementRevision、ready 条件 | 不可变版本与测试 |
| D8 | M3 | ChangeRequest、冻结版本、Owner 审批 | 事务/乐观锁测试 |
| D9 | M3 | Client 审批、Delivery、Review | 不依赖 AI 的端到端闭环 |
| D10 | M3 | 前端整合：Dashboard、项目、审批和交付页面 | 三角色浏览器流程 |
| D11 | M4 | DeepSeek 结构化建议、人审、失败降级 | P1 AI 可用/可关闭 |
| D12 | M4/M5 | 本地只读 MCP、Skill（时间充足才做），测试强化 | P1 可选择削减 |
| D13 | M5 | Docker 生产组合、HTTPS、迁移、备份/恢复演练 | Release Candidate |
| D14 | M5 | 外部试用、修复 P0 缺陷、v1.0 发布与演示 | Release Notes、演示、复盘 |

## 里程碑定义

- **M1（设计冻结）**：D-01～D-04 产品决策已确认，P0 范围冻结；PRD、AC、Data Model、API、Security、ADR 形成 v0.2 基线。实际 Schema 和实现前仍需检查迁移 SQL、接口契约及团队代码规范。
- **M2（基础可用）**：认证+三角色+项目隔离；从 UI 或 API 可以创建并查询自己的项目。
- **M3（核心闭环）**：完整需求→双方批准→交付→验收；含拒绝、冲突和越权测试。
- **M4（AI 可选增强）**：一条 AI 澄清路径可用；MCP 只读；不可干预审批。
- **M5（正式发布）**：CI、E2E、部署、备份恢复、关键缺陷为零、Demo 可体验。

## 截止策略（Cut line）

- **D5 未完成 Auth/租户隔离**：暂停 UI 精修，优先后端基础能力。
- **D9 未完成无 AI 主链路**：立即冻结所有 P1；简化 Dashboard、UI，保证核心完整。
- **D12 仍有 P0 阻断缺陷**：不发布“可用正式版”；仅发布有明确限制的预览版，继续修复。
- **任何时间**：权限缺陷、凭据泄露、错误审批记录都是发布阻断项。

## v1.1 / v2 规划（非当前承诺）

- v1.1：邮件邀请、客户端通知、AI 评估报告、GitHub Issue 单向创建和同步状态。
- v2：多客户审批人、附件上传和版本 diff、账单集成、审计导出、远程 MCP OAuth、组织策略。

## 每日工作模式

Issue → 设计审阅 → 小步实现 → 测试 → PR → CI → 人审 → 合并 → 更新 `docs/STATE.md`。单次 PR 只解决一个可验证的主要目的；每日报告实际成果与下一个阻塞点。

## v0.2 依赖调整

- M2 Project Module 验证**一个项目最多一名 Client**，项目创建不要求先分配 Client；在首次变更提交时强制恰有一名 Client。
- M3 Requirement/Revision 先完成“审批中禁止新 Revision”的服务端规则，再开发审批流。
- M3 ChangeRequest 必须先实现**Draft 草稿字段 → Submit 不可变快照**，不得跳过。
- M3 Delivery 增加“同时仅一个待审核交付”和“已验收后不可再提交”的测试。
- M5 发布前核对固定初始范围、账号不可替换、HTTPS 链接规则；P1 不阻断。
