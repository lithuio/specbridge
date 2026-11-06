# SpecBridge 文档索引

**状态**：产品决策 D-01～D-04 已由项目负责人确认，v0.2 是设计基线，**不代表代码已经实现**。

| 问题 | 主要文档 |
|---|---|
| 为什么做、目标用户和 P0 范围 | `product/PRD.md`, `product/DECISIONS.md` |
| 用户怎样使用 | `product/USER_STORIES.md`, `ux/WIREFRAMES.md` |
| 怎样判断完成 | `product/ACCEPTANCE.md` |
| 版本与时间安排 | `product/ROADMAP.md` |
| 服务、模块、集成关系 | `architecture/ARCHITECTURE.md` |
| 数据库和并发约束 | `architecture/DATA_MODEL.md` |
| 状态转换与异常分支 | `architecture/STATE_MACHINES.md` |
| REST 接口设计 | `architecture/API.md` |
| 权限、安全和密钥 | `architecture/SECURITY.md` |
| 为什么如此设计 | `adr/` |
| 如何开发与验收 | `engineering/WORKFLOW.md`, `engineering/DEVELOPMENT.md`, `engineering/TEST_STRATEGY.md` |
| 当前进度 / 人工责任 | `STATE.md`, `HUMAN_TASKS.md` |
| 发布前检查 | `release/RELEASE_CHECKLIST.md` |
| 竞品调研 | `research/COMPETITOR_RESEARCH.md` |

**权威优先级**：负责人确认的业务决策 → 已接受 PRD/ADR → 状态机、数据、API 契约 → 当前 Issue。
出现矛盾时不要擅自判断，必须记录并经负责人批准调整。

**维护原则**：文档随被批准的行为变更同步更新；STATE 是状态快照，不复制长篇 PRD；Issue 是具体任务，不取代架构文档。
