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
| R08 AI/Agent 总计划与 A–F 交接 | `engineering/R08_PLAN.md` |
| R08 F 最终回归、安全自查、真实Provider/MCP/Host与PR草案 | `engineering/evidence/r08-f/README.md`, `engineering/R08_PR_DRAFT.md` |
| R08 F 真实AI浏览器、Token桌面/手机与键盘检查 | `ux/evidence/r08-f/README.md` |
| R08 D Token SQL、Diff/SHA-256与审批记录（仅隔离库已应用） | `engineering/R08_D_SQL_REVIEW.md` |
| R08 E 本地MCP、Codex配置与Skill安装 | `../apps/mcp/README.md`, `../skills/requirement-analyst/SKILL.md` |
| R08 E 真实SDK Client/数据库与Codex Host/Skill测试证据 | `engineering/evidence/r08-e/README.md` |
| R08 AI 建议人工审阅、桌面/手机截图与浏览器验证 | `ux/evidence/r08-b/README.md` |
| R08 全局项目 Copilot、工具来源与浏览器验证 | `ux/evidence/r08-c/README.md` |
| 发布前检查 | `release/RELEASE_CHECKLIST.md` |
| 竞品调研 | `research/COMPETITOR_RESEARCH.md` |
| R07 只读契约、Audit/Dashboard 与生成 OpenAPI（Phase B 本地完成） | `architecture/R07_READ_MODELS.md`, `architecture/openapi.json` |
| R07 视觉规范、交互原型与浏览器截图 | `ux/R07_DESIGN.md`, `ux/prototypes/r07/README.md` |
| R07 正式 Web 认证/Shell 与生产浏览器证据（Phase C 本地完成） | `../apps/web/README.md`, `ux/evidence/r07-c/README.md` |
| R07 项目准备/两级成员/唯一客户与真实浏览器证据（Phase D 本地完成） | `../apps/web/README.md`, `ux/evidence/r07-d/README.md` |
| R07 需求/问答/Revision/Ready 与真实浏览器证据（Phase E 本地完成） | `../apps/web/README.md`, `ux/evidence/r07-e/README.md` |
| R07 商业评估/顺序审批/拒绝重提与真实浏览器证据（Phase F 本地完成） | `../apps/web/README.md`, `ux/evidence/r07-f/README.md` |
| R07 交付/验收、真实 Dashboard/Audit 与浏览器证据（Phase G 本地完成） | `../apps/web/README.md`, `ux/evidence/r07-g/README.md` |
| R07 最终三角色集成、集中回归与正式可访问性证据（H 本地完成） | `ux/evidence/r07-h/README.md`, `ux/evidence/r07-h/accessibility.json` |
| 本地 UI 细化、项目侧栏和完整回归截图 | `ux/evidence/ui-polish/README.md` |
| R07 总规划、当前进度、跨 Session 提示词与精简验证 | `engineering/R07_PLAN.md` |

**权威优先级**：负责人确认的业务决策 → 已接受 PRD/ADR → 状态机、数据、API 契约 → 当前 Issue。
出现矛盾时不要擅自判断，必须记录并经负责人批准调整。

**维护原则**：文档随被批准的行为变更同步更新；STATE 是状态快照，不复制长篇 PRD；Issue 是具体任务，不取代架构文档。
