# 工程文档入口

[项目首页](../../README.md) · [文档中心](../README.md) · [运行指南](../guides/GETTING_STARTED.md) · [当前状态](../STATE.md)

日常开发先看当前任务与契约；需要追溯某次实现、SQL 审核或测试结论时，再进入下面的阶段记录。阶段证据只证明其标明的环境、代码和运行范围。

## 日常开发

| 入口                                                                                                | 内容                                                           |
| --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| [本地运行指南](../guides/GETTING_STARTED.md)                                                        | 当前安装、配置、启动、测试和故障排查                           |
| [DEVELOPMENT](DEVELOPMENT.md)                                                                       | 已有本机演示命令、定向验证、迁移流程与历史环境记录             |
| [WORKFLOW](WORKFLOW.md)                                                                             | Issue → 实现 → 验证 → Review / PR 的协作流程                   |
| [TEST_STRATEGY](TEST_STRATEGY.md)                                                                   | 测试层次、授权负例、事务与并发验证                             |
| [CI_CHECKLIST](CI_CHECKLIST.md)                                                                     | CI 检查项；实际命令见 [ci.yml](../../.github/workflows/ci.yml) |
| [文档规划](DOCUMENTATION.md)                                                                        | 文件归属、维护规则与后续归档计划                               |
| [Issue 示例](EXAMPLE_HEALTHCHECK_ISSUE.md)                                                          | 健康检查任务的历史模板参考                                     |
| [API](../../apps/api/README.md) · [Web](../../apps/web/README.md) · [MCP](../../apps/mcp/README.md) | 子应用说明                                                     |

## 阶段记录与证据

### R07：完整 Web 协作流程

总入口：[R07 计划](R07_PLAN.md)。相关契约：[读取模型](../architecture/R07_READ_MODELS.md)、[视觉设计](../ux/R07_DESIGN.md)、[原型](../ux/prototypes/r07/README.md)。

| 阶段              | 验证记录                                                   |
| ----------------- | ---------------------------------------------------------- |
| C：认证与 Shell   | [桌面 / 手机 / 可访问性](../ux/evidence/r07-c/README.md)   |
| D：项目与成员     | [角色与项目准备](../ux/evidence/r07-d/README.md)           |
| E：需求与版本     | [问答 / Revision / Ready](../ux/evidence/r07-e/README.md)  |
| F：商业评估与审批 | [顺序批准 / 拒绝重提](../ux/evidence/r07-f/README.md)      |
| G：交付与验收     | [交付 / Dashboard / Audit](../ux/evidence/r07-g/README.md) |
| H：集中集成       | [三角色主流程与回归](../ux/evidence/r07-h/README.md)       |
| 后续界面细化      | [UI 调整与浏览器验证](../ux/evidence/ui-polish/README.md)  |

### R08：初始 AI / Copilot / Token / MCP

总入口：[R08 计划](R08_PLAN.md)、[完整人工测试范例](R08_MANUAL_TEST.md)。此处的 A–F 与后续 AI 工作流 A–E 是两轮不同任务。

| 内容              | 文档 / 证据                                                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------------------------------ |
| AI 建议与人工采用 | [B 浏览器记录](../ux/evidence/r08-b/README.md)                                                                     |
| 项目 Copilot      | [C 浏览器记录](../ux/evidence/r08-c/README.md)                                                                     |
| API Token         | [D SQL 审核](R08_D_SQL_REVIEW.md) · [D 界面记录](../ux/evidence/r08-d/README.md)                                   |
| 本地 MCP / Skill  | [E 工程记录](evidence/r08-e/README.md) · [Skill 源文件](../../skills/requirement-analyst/SKILL.md)                 |
| 最终集中回归      | [F 工程记录](evidence/r08-f/README.md) · [F 视觉记录](../ux/evidence/r08-f/README.md) · [PR 草案](R08_PR_DRAFT.md) |
| 当时本机真实启用  | [本地联通记录](evidence/r08-local/README.md)                                                                       |

### 后续 AI 工作流：个人稿、背景、提案与本地连接

总入口：[执行计划](AI_WORKFLOW_PLAN.md)、[阶段检查点](AI_WORKFLOW_CHECKPOINT.md)、[综合人工验收](AI_WORKFLOW_E_ACCEPTANCE.md)。

| 阶段                    | 使用 / 审核                                                                                                         | 工程 / 视觉证据                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| A：分步澄清与个人工作稿 | [人工手册](AI_WORKFLOW_A_MANUAL.md) · [0005 审核](AI_WORKFLOW_A_SQL_REVIEW.md)                                      | [工程](evidence/ai-workflow-a/README.md) · [视觉](../ux/evidence/ai-workflow-a/README.md) |
| B：项目背景资料         | [人工手册](AI_WORKFLOW_B_MANUAL.md) · [0006 审核](AI_WORKFLOW_B_SQL_REVIEW.md)                                      | [工程](evidence/ai-workflow-b/README.md) · [视觉](../ux/evidence/ai-workflow-b/README.md) |
| C：人工确认提案         | [人工手册](AI_WORKFLOW_C_MANUAL.md) · [0007 审核](AI_WORKFLOW_C_SQL_REVIEW.md)                                      | [工程](evidence/ai-workflow-c/README.md) · [视觉](../ux/evidence/ai-workflow-c/README.md) |
| D：本地连接授权         | [设计](AI_WORKFLOW_D_DESIGN.md) · [安装 / 恢复](AI_WORKFLOW_D_MANUAL.md) · [0008 审核](AI_WORKFLOW_D_SQL_REVIEW.md) | [工程](evidence/ai-workflow-d/README.md) · [视觉](../ux/evidence/ai-workflow-d/README.md) |
| E：最终集成验证         | [综合验收](AI_WORKFLOW_E_ACCEPTANCE.md) · [PR 草案](AI_WORKFLOW_PR_DRAFT.md)                                        | [工程](evidence/ai-workflow-e/README.md) · [视觉](../ux/evidence/ai-workflow-e/README.md) |
| 后续视觉与交互统一      | [截图、键盘与可访问性记录](../ux/evidence/ai-workflow-polish/README.md)                                             | [自动检查汇总](../ux/evidence/ai-workflow-polish/accessibility-summary.json)              |

`migrations/` 保存阶段审核材料，运行时迁移来自 `apps/api/drizzle/`。不要将审核包直接复制进生效迁移目录。SQL 审核记录中的授权与应用环境按当时记录理解；最新本机执行状态见 [STATE](../STATE.md)。

## 历史入口

- [SETUP_WORKSPACE](SETUP_WORKSPACE.md)：最初导入文档增量包的说明，非当前安装步骤。
- [README_ROOT_SUGGESTED](README_ROOT_SUGGESTED.md)：原 README 草案入口，现指向正式项目首页。
- [STATE](../STATE.md)：保留早期 R01–R06 和后续阶段交接；后续拆分方案见 [文档规划](DOCUMENTATION.md#后续整理顺序)。

验收记录中的 PASS 不替代独立人工评审、远程 CI 或发布批准。当前需要人处理的事项统一查看 [HUMAN_TASKS](../HUMAN_TASKS.md)。
