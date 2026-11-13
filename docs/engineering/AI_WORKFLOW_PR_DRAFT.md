# 人工Commit与PR摘要草案

本轮不创建Commit或PR。A/B/C/D已实现并完成受影响验证，E未开始；最终PR需E之后定稿。2026-11-13 D延续HEAD`c0960b0`及已有准备改动，0008获批仅隔离5434应用。

D建议本地Commit：`feat(agent): add owner-authorized local Codex connection installer`。

D审阅摘要：

> Owner可从项目访问凭据页生成不含秘密的连接命令，并在浏览器核对项目/指纹/期限后确认。安装器通过PKCE与固定loopback一次性交换只读Token，保存到仓库外私有文件，诊断真实MCP后保留原设置安装项目配置与Skill；支持重复检查/卸载和未知结果核对。后端重验当前Owner/原Session，Token、消费、审计同事务，外部仍只有批准规格读取工具。
>
> 0008已审哈希原字节只应用5434，旧22表/数据保持。102数据库、161单元、连接HTTP10、Auth16/RBAC13/Token9、MCP28、真实MCP6+Codex Host1、浏览器2+4通过；类型/Lint/Build、51路径契约通过。Host用生成表CLI覆盖隔离验证，不冒称实际用户信任自动加载已验收。当前依赖审计27条与开工基线相同，无新增ID，仍需专项处理；开发/生产0005–0008、E全量/远程CI/独立人工验收未执行。

建议负责人分阶段本地Commit：

- A：`feat(ai): separate clarification and specification work drafts`
- B：`feat(context): add private project documents and authorized AI retrieval`
- C：`feat(copilot): add private proposals with human-confirmed execution`
- D：`feat(agent): add owner-authorized local Codex connection installer`

A–C历史PR摘要（D增量以上方为准，E后统一重写）：

原PR标题：`feat(ai): add project context, private work drafts and human-confirmed copilot proposals`

原PR正文：

> 需求AI辅助分为澄清与整理规格，支持保存本人工作稿和选择、编辑后明确发布问题/创建Revision。项目可附带PDF/DOCX/Markdown/TXT背景，默认内部，Owner明确共享指定版本后Client才能读取。需求辅助只使用共享背景，Copilot按角色检索并返回真实业务版本来源。
>
> Copilot提供独立个人提案工作区，可准备问题、Revision或商业草稿，预览阶段不写业务。确认重新验证本人、来源和版本，复用R04/R05事务命令，将业务、审计和执行回执一次提交。CAS、operationId及未知结果查询防止覆盖与重复；取得聚合锁后复核并共享锁定Session，修复等待锁时退出登录仍可能执行的竞态。模型没有执行工具，Ready、Submit、审批和验收继续从原人工入口完成。
>
> 0005–0007只在已批准的隔离数据库应用。C验证通过100项数据库、158项单元、44项AI HTTP，Auth/RBAC/Requirement/Change/读取共55项受影响回归；新增浏览器4项及原Copilot4项通过。独立真实DeepSeek浏览器1场景、4模型请求全部200，6497输入/1815输出Tokens；确认前业务不变，人工确认后仅发布1个问题。类型、Lint、Build、47路径契约和迁移静态检查通过；常规CI只用Mock模型。
>
> D一键Codex安装授权、E最终全量、开发/生产新增迁移、远程CI与独立人工验收未执行。提案24h有效但不自动清理，已执行提案与回执不可变保留；B解析限制不等于完整OS沙箱，原有shadcn链low/moderate公告各1仍待处理。真实模型回答的准确性、长度和技术字段文案需人工核对。

审核重点：本人提案/草稿隔离；共享资料与内部对话边界；R04/R05状态不变量和事务锁序；锁等待后Session复核；operationId/回执原子性；409和未知结果保留输入；解析资源与数据保留边界。精确命令及修复记录见[A证据](evidence/ai-workflow-a/README.md)、[B证据](evidence/ai-workflow-b/README.md)、[C证据](evidence/ai-workflow-c/README.md)。
