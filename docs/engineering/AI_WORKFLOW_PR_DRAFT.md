# 人工Commit与最终PR草案

2026-11-13。A–D已由负责人本地提交至e9e5efd，E完成最终本地验证，以下供人工审阅；本轮未Commit/Push/创建PR/Merge/部署。Issue [#17](https://github.com/lithuio/specbridge/issues/17)；新增工作流范围依据已确认D-09与[执行计划](AI_WORKFLOW_PLAN.md)，原R08只读工具边界保持。

建议E Commit：`test(ai): verify integrated AI workflows and agent connections`

建议最终PR标题：`feat(ai): add project context, human-reviewed workflows and secure Codex onboarding`

## 建议PR正文

需求分析原先把澄清和规格保存放在一次交互中，项目背景和本地Agent接入也需要人工反复传递。现在提供独立的“问清楚/整理规格”任务和本人工作稿：只保存问题不会创建Revision，选定、编辑和明确预览确认后才写入正式业务。PDF/DOCX/Markdown/TXT可作为项目背景，默认内部，Owner明确共享指定版本；公开需求辅助仅检索共享资料，Copilot按当前权限读取并附真实版本来源。

Copilot可以围绕真实需求准备个人提案，人工确认后发布问题、创建Revision或创建/更新商业草稿。确认重新验证作者、会话、项目、来源及expectedVersion，通过既有R04/R05事务命令将业务、审计与幂等回执原子提交。未知结果先查回执，409保留输入；原Ready、Submit、串行Owner/Client审批和交付验收保持人工入口。模型只有白名单只读工具，不保存敏感聊天正文。

Owner可从网页生成无秘密的本地Codex连接命令，在浏览器核对项目、指纹和期限后授权。Linux/WSL安装器通过PKCE与loopback一次性交换项目只读Token，存于仓库外0700/0600私有文件；验证真实MCP后保留原设置合并项目配置/Skill，支持检查和安全卸载。Token不进入提示词、URL、配置或日志，撤销/过期/项目权限变化后立即拒绝。MCP仍只有列批准版本与读取指定批准规格两个工具，不直连数据库。

### 验证

- API161+MCP28单元、102真实数据库、141 HTTP、5公共路由、4付费CI保护、14套件44真实浏览器通过。类型/Lint/完整Build、51路径OpenAPI/Web类型与迁移元数据、Skill格式通过。常规CI的AI使用Mock，新增连接Token→真实stdio→批准规格→撤销链路已纳入。
- 真实DeepSeek三场景最终通过：需求稿人工Revision、共享背景检索、Copilot准备提案并明确确认仅发布一个问题。记录14次上游HTTP200、26624预留输出；已知输入26083/输出6219，1次失败响应usage未知，不作为完整计费总量。
- 独立真实MCP8项通过，包括Codex0.167.1 Host、Inspector2.15.0和安装Skill；业务快照不变、专用Token撤销。Host用实际生成MCP表的隔离CLI覆盖，**实际用户信任后的自动加载尚未验收**。
- 桌面/320/390px、键盘和48个axe状态0自动违规；26个状态仍含未判定项，保留补充计算及人工验收边界。[工程证据](evidence/ai-workflow-e/README.md)、[截图](../ux/evidence/ai-workflow-e/README.md)。

### 已知风险与发布前事项

- 依赖审计FAIL：27既有公告（8high/13moderate/6low）；production口径2条，无本轮新增ID。H-17需要专项修复和复验。
- 首次独立真实提案场景出现上游200但Provider校验失败；一次有界诊断复验通过，原失败根因未确定。失败统计保留，不能承诺模型输出稳定全绿。另一个Playwright文件正则误选导致预算拒绝已修；没有放松生产输出验证。
- 0005–0008只应用已批准5434隔离库；开发5433/生产目标尚未授权。真实用户Codex信任自动加载、独立安全/设备/读屏、远程CI尚未完成。没有自动Git或部署操作。
- 解析器资源限制不是完整OS沙箱，私有文件不防同UID/root，安装跨文件崩溃不保证事务，一目录一托管连接；单实例配额重启清零，提案24h到期但无自动清理。模型长答复与业务术语仍需人工核对。

人工验收入口：[综合范例](AI_WORKFLOW_E_ACCEPTANCE.md)、[H-15/H-17/H-18/H-20/H-21](../HUMAN_TASKS.md)。审核重点：项目/作者/共享版本隔离、锁后Session复核、R04–R06不变量、业务/审计/回执原子性、未知响应恢复、Token/PKCE兑换与本地安装边界。
