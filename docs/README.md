# SpecBridge 文档中心

[项目首页](../README.md) · [快速启动](guides/GETTING_STARTED.md) · [使用指南](guides/USER_GUIDE.md) · [当前状态](STATE.md)

按你要完成的事情选择入口。产品规范说明“应当怎样”，[STATE](STATE.md) 与验证证据说明“已经做到哪里”；批准的设计不等于功能已发布。

## 从这里开始

| 你的目标                           | 推荐阅读顺序                                                                                                             |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 了解项目                           | [项目 README](../README.md) → [产品概览](product/PRD.md)                                                                 |
| 在本地运行                         | [运行指南](guides/GETTING_STARTED.md) → [使用指南](guides/USER_GUIDE.md)                                                 |
| 以 Owner / Developer / Client 使用 | [使用指南](guides/USER_GUIDE.md) → [综合人工验收示例](engineering/AI_WORKFLOW_E_ACCEPTANCE.md)                           |
| 开发或修复问题                     | [STATE](STATE.md) → 当前 GitHub Issue → [验收标准](product/ACCEPTANCE.md) → 相关契约 → [工程入口](engineering/README.md) |
| 接入本地 Agent                     | [MCP README](../apps/mcp/README.md) → [连接与恢复手册](engineering/AI_WORKFLOW_D_MANUAL.md)                              |
| 准备评审或发布                     | [人工待办](HUMAN_TASKS.md) → [测试策略](engineering/TEST_STRATEGY.md) → [发布检查表](release/RELEASE_CHECKLIST.md)       |

## 产品与业务规范

| 文档                                  | 回答的问题                             |
| ------------------------------------- | -------------------------------------- |
| [PRD](product/PRD.md)                 | 为谁解决什么问题，P0 / P1 的边界是什么 |
| [产品决策](product/DECISIONS.md)      | 哪些业务选择已经由负责人批准           |
| [用户故事](product/USER_STORIES.md)   | 各角色需要完成哪些任务                 |
| [验收标准](product/ACCEPTANCE.md)     | 通过哪些 AC 判断行为正确               |
| [路线图](product/ROADMAP.md)          | 规划阶段与依赖，实际进度另看 STATE     |
| [基线变更记录](BASELINE_CHANGELOG.md) | 产品规范如何演变                       |

## 技术与设计规范

| 文档                                                                                                       | 回答的问题                               |
| ---------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| [系统架构](architecture/ARCHITECTURE.md)                                                                   | 服务和模块如何划分                       |
| [数据模型](architecture/DATA_MODEL.md)                                                                     | 实体、关系、事务与并发约束               |
| [状态机](architecture/STATE_MACHINES.md)                                                                   | 哪些转换允许，哪些历史不可修改           |
| [API 契约](architecture/API.md)                                                                            | 接口、授权、输入输出与错误语义           |
| [OpenAPI](architecture/openapi.json) · [R07 读取契约](architecture/R07_READ_MODELS.md)                     | 生成的机器契约与读取模型；OpenAPI 不手改 |
| [安全模型](architecture/SECURITY.md)                                                                       | 身份、租户隔离、凭据与 AI 边界           |
| [ADR-001 架构](adr/ADR-001-modular-monolith.md) · [ADR-002 认证](adr/ADR-002-auth-tenancy.md)              | 关键技术取舍                             |
| [ADR-003 版本审批](adr/ADR-003-versioned-approval.md) · [ADR-004 AI / MCP](adr/ADR-004-ai-mcp-boundary.md) | 冻结版本与外部工具的设计理由             |
| [线框](ux/WIREFRAMES.md) · [R07 视觉规范](ux/R07_DESIGN.md) · [交互原型](ux/prototypes/r07/README.md)      | 页面结构、视觉和交互设计                 |

## 开发、状态与验证

| 文档                                                                                                            | 用途                                             |
| --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| [工程文档入口](engineering/README.md)                                                                           | 开发流程、阶段计划、SQL 审核、人工手册与证据索引 |
| [Web README](../apps/web/README.md) · [API README](../apps/api/README.md) · [MCP README](../apps/mcp/README.md) | 各应用的实现与维护说明                           |
| [STATE](STATE.md)                                                                                               | 最近已验证的工作，以及保留的历史交接             |
| [HUMAN_TASKS](HUMAN_TASKS.md)                                                                                   | 待负责人处理的评审、决定与环境事项               |
| [发布检查表](release/RELEASE_CHECKLIST.md)                                                                      | 发布门槛、运维和恢复验收                         |
| [竞品调研](research/COMPETITOR_RESEARCH.md)                                                                     | 调研记录，不作为已经验证的产品结论               |

阶段文档名称中的 R07 / R08 / AI_WORKFLOW 用于追溯任务；其中的“本轮未做”“尚未迁移”描述写作当时的状态。日常安装从运行指南进入，最新执行情况看 STATE。所有阶段、截图与测试记录集中在 [工程索引](engineering/README.md#阶段记录与证据)，不需要首次使用时全部阅读。

## 文档组织与维护

```text
README.md                  项目门面：介绍、预览、启动摘要
docs/README.md             文档导航：按读者任务找入口
docs/guides/               当前可操作的安装与使用指南
docs/product/              产品范围、决策、故事、验收
docs/architecture/         架构、数据、状态、API、安全契约
docs/adr/                  架构决策及理由
docs/engineering/          工程流程、阶段记录、迁移审核与证据
docs/ux/                   设计规范、原型与视觉验证
docs/release/              发布与运维检查
docs/research/             调研材料
docs/STATE.md              实施状态入口
docs/HUMAN_TASKS.md        人工事项入口
```

文档整理方案、后续历史归档步骤、命名和更新规则见 [文档规划](engineering/DOCUMENTATION.md)。本次保留现有规范与证据路径，减少历史 Issue、PR 和文档链接失效。

**规范优先级**：负责人确认的业务决策 → 已接受 PRD / ADR → 状态机、数据、API 契约 → 当前 Issue。发现冲突应记录并交负责人确认，不依据 README 或运行指南改变批准基线。
