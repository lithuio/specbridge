# AI工作流升级 — A/B/C交付检查点

2026-11-13，分支 `feat/17-ai-agent-integration`，HEAD `6fb81b8`。保留A/B/C全部未提交改动；无Commit/Push/PR/Merge/部署。本任务总范围A–E，A/B/C已验证，D/E未交付。当前0007审批已用完并完成，不能继续标记“待批准0007”。

## 已完成与迁移授权

- A：双任务需求辅助、本人工作稿、明确人工发布问题/Revision、ID+CAS/原子回执。B：私有项目文件、受限解析、共享绑定具体版本、授权检索/来源与Web。
- C：四类本人提案、预览编辑/选择、显式确认、R04/R05事务命令复用、业务/审计/回执原子提交、来源及业务CAS、会话撤销竞争保护。没有模型写工具，没有自动Ready/Submit/审批/验收。商业工时/金额不由模型补成事实；工作稿复制不覆盖原稿。
- 0005：`3ef341ab762315d265f03ec32ab40813e32eaeec6b308fb7279297c1f0153e7c`。
- 0006：`6efe3cd862b3167478ce1be8095a791379eae39852801d7f0616c635516272e4`。
- 0007：`a5a9788072b5caf6366a83f28197340f7709fb4a5c50fd2c181d21407bc66010`。
- 三份均已获具体批准并仅应用 `127.0.0.1:5434/specbridge_test` / specbridge_test；0007在本轮“批准并继续”后原字节激活。运行时22表、8项journal、9个自定义触发器。原21表升级保持。开发5433/生产没有应用0005–0007，需H-15单独扩展目标授权；0004历史开发应用不等于新增SQL授权。

## C实际验证

100数据库、158单元、44 AI HTTP（原33+提案11）；Auth16/RBAC13/R049/R058/reads9；新增浏览器4、原Copilot4、真实DeepSeek1；API/Web类型/Lint/Build、47路径OpenAPI、db:check。精确命令和修复过程见[C证据](evidence/ai-workflow-c/README.md)，[人工范例](AI_WORKFLOW_C_MANUAL.md)、[截图](../ux/evidence/ai-workflow-c/README.md)。

真实模型4请求全200，6497输入/1815输出Tokens，8192预留；Copilot真实需求来源→个人提案→人工只发布1个问题。只有安全API子进程加载密钥，隔离合成资料、常规CI全Mock。模型回答仍偏长/技术字段文案较多，留H-18人工体验核对。

安全复核实际复现了“等待Workspace锁期间退出登录，确认仍成功”竞态，已把Session复核移到取得聚合锁后，并保持Session共享锁到事务结束。新增真实PG竞争测试现401且无业务写入；44项HTTP套件再次全PASS。

C提案正文80KiB/数据库96KiB，每人每需求100份未执行（含过期），24h有效，列表未执行优先/分页；30用户/60项目每小时准备限流。过期不自动删除；本人可删DRAFT，EXECUTED正文/回执保留不可变，无自动清理周期。Sources存ID/版本，无聊天/工具正文。MCP仍只有两个approved_specs:read工具。

## 下一阶段D

D一键Codex安装授权尚未实施，也没有0008候选或批准。既有总计划授权准备后续实现，不必重复询问常规可逆代码工作；任何新增SQL仍先形成具体Schema/SQL Diff/哈希，再按负责人批准的目标迁移，不能把0007批准扩展到未来SQL。

1. 读取AGENTS、STATE、[总计划](AI_WORKFLOW_PLAN.md)、当前Project API Token受控读取和MCP launcher/Skill；保留全部未提交改动。
2. 根据D范围使用可用openai-docs/skill-creator指引核查本机与官方Codex设置/Skill格式；不要仅凭旧记忆写配置。
3. Linux/WSL安装器首版本仓库构建产物；指令不含秘密，保留已有MCP/配置/信任策略。浏览器Owner确认、PKCE S256/loopback/state/一次性交换，重验资格后复用Token创建事务。API不公开通用写权限，不声称完整HTTP OAuth MCP。
4. Token只保存仓库外0700/0600，由launcher注入stdio环境；不进提示词、TOML、URL、日志或Web持久存储。配置/联网实际验证使用专用隔离项目与Token；本地卸载不冒充远端撤销。
5. 完成D受影响验证后再E全量，远程CI/独立人工验收/开发或生产迁移仍分别记录，不自动Git写操作。

## 环境、风险与清理

B文件解析仍需Linux/WSL、Node权限模式、prlimit与可读/proc及部署脚本/依赖；不是完整OS沙箱。默认仓库外私有目录，未实现OCR/原件下载/历史物理清理/后台队列。B依赖审计发现两项开工前shadcn链公告，H-17待处置，本轮无依赖变化或再次审计。

避免并发运行会重建API dist或占用3000/4000的Auth/浏览器/OpenAPI任务；浏览器同账号连续登录会命中真实限流，不放宽Auth。各浏览器文件单独运行。测试日志 `/tmp/specbridge-c-*.log` 是本机会话材料；脱敏结果和截图已存仓库evidence。真实Smoke计数复制到C自己的目录，不用后续会覆盖的test-results文件当长期证据。

收尾恢复tracked `apps/api/tsconfig.build.tsbuildinfo`开工字节（本轮备份`/tmp/specbridge-c-initial.tsbuildinfo`），不丢弃业务改动。无.env或用户Codex配置修改，测试子进程已退出；隔离PostgreSQL继续保留。当前建议Commit与PR正文见[草案](AI_WORKFLOW_PR_DRAFT.md)。
