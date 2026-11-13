# AI工作流 A — 实际验证证据

2026-11-13，`feat/17-ai-agent-integration`，开工HEAD `6fb81b8`。负责人批准0005后，仅在5434/specbridge_test完成迁移与验证；开发5433/生产未由本轮迁移。当前阶段A可在已迁移的本地环境运行；B只有独立候选SQL，C/D/E尚未交付。

## 实际结果

| 状态 | 命令/范围 | 实际结果 |
|---|---|---|
| PASS | `pnpm db:migrate:test` | 0005哈希复核一致，既有安全runner确认隔离数据库/角色后应用；环境重启后重建原测试容器，浏览器runner重复迁移通过 |
| PASS | `pnpm test:integration` | 10文件95项，含0000–0004升级、0005约束/回执历史、原业务事务/不可变历史回归；最终14.69s |
| PASS | `pnpm --filter specbridge-api test` | 15文件149项；两任务Provider/输出Schema、预算、失败、旧分析/Copilot兼容 |
| PASS | `pnpm test:e2e:ai` | 3文件33项，新增工作稿14项；真实HTTP/PG、Mock DeepSeek；作者隔离、两任务、CSRF、输入、CAS/ABA、批量发布、回执重放、失败原子回滚、Pending、归档/撤权、模型故障 |
| PASS | `node scripts/with-env.mjs .env.test pnpm --filter specbridge-api test:e2e:auth` | 16项（含Next代理和伪造转发头限流） |
| PASS | 同前缀 `test:e2e:rbac` / `test:e2e:requirements` / `test:e2e:reads` | 13 / 9 / 9项；均实际执行 |
| PASS | `pnpm test:browser:ai` | 最终6场景、15.9s；真实Web/API/DB，模型Mock；跨刷新、部分发布、只存工作稿、409/CAS、未知发布回执、503/429/非法结果/超时、Client个人隔离、删除稿、会话Activity恢复 |
| PASS | `R07_EVIDENCE_ROOT=test-results/evidence pnpm test:browser:requirements` | 2场景、18.2s |
| PASS | 同前缀 `test:browser:forms` / `test:browser:copilot` | 6场景12.6s / 4场景7.7s |
| PASS | `pnpm test:browser:real-ai` | 单独付费真实验证1场景，18.5s（套件21s）。规格建议→人工编辑/保存→显式发布Revision→Copilot真实只读工具与Revision来源 |
| PASS | API/Web `typecheck`、`lint`、`build` | 所有实际执行检查通过；无未解决类型或Lint错误；候选B Schema另经类型/Lint静态检查 |
| PASS | `pnpm --filter specbridge-api openapi:check` | 41路径及Web生成类型无漂移 |
| PASS | `pnpm db:check` / snapshot对照 / `git diff --check` | 生效journal仅0000–0005；B独立候选未注册。0005旧16表不变；B候选旧18表不变 |
| NOT RUN | B SQL执行/上传/解析/检索、C提案执行、D一键Codex、E最终全量 | 仍待后续实施；不能以A证据代替 |
| NOT RUN | 远程CI、部署、开发/生产0005/0006迁移、独立人工验收、多OS/读屏/真实设备 | 未授权或未执行，无自动Commit/Push/PR/Merge/部署 |

[真实业务/来源断言](real-browser-result.json)与[真实Provider计数](real-provider.json)：deepseek-flash，4模型调用全部200，预留输出预算8192，实际7146输入/2216输出Tokens；单次耗时4794/580/4022/5428ms。无自动重试或故意制造付费失败。密钥只由独立API子进程加载.env，Web/测试进程不接收；计数文件不含Prompt、Key、Token或正文；截图/来源证据仅含合成资料。运行只操作合成账号/项目和隔离库。

[截图与可访问性结果](../../../ux/evidence/ai-workflow-a/README.md)。状态与来源核对由测试断言，而非仅凭截图。真实测试确认原文保留、Revision 1由显式人工按钮创建、状态CLARIFYING，Copilot前后业务/审计/不可变Revision快照一致；没有AI Ready/Submit/审批/验收。

## 失败与修复记录

- 隔离迁移初次受沙箱网络限制，使用获批命令重跑成功；环境切换后测试容器未运行导致浏览器启动失败，恢复既有 `pnpm db:test:up` 后通过。没有转用开发数据库。
- 新API审计事件类型遗漏导致初次typecheck失败，补充仅元信息事件类型，公开活动白名单不增加这些私有事件；后续通过。
- 初次Web类型检查发现重复kind字段；已修复。Web无独立prettier命令，复用API现有prettier，无新依赖。
- 首次新浏览器错误定位器同时匹配Next路由播报器，改为工作台内定位；未降低断言。
- Auth代理回归与OpenAPI构建并发时，构建产物被重建导致API子进程提前退出；改为串行完整重跑，16项全通过。之后不并发运行会重建共享dist/占用3000、4000的检查。
- 第6个浏览器场景触发真实同邮箱5次登录限额；改用原fixture的另一测试账号，不修改限额。最终6项通过。
- 代码审查发现Activity隐藏后在途请求可能留下busy状态，补充取消/恢复、旧请求身份检查和未知保存核对，并新增真实浏览器覆盖；此前付费成功流程无需重复花费。

## 安全审查与剩余边界

- 个人工作稿查询强制当前作者；Client无规格任务，Owner无代读；发布只读本人服务端草稿，严格Schema拒绝伪造publication/作者/项目。
- 同一事务复用R04业务命令、授权锁/Requirement锁、expectedVersion、Pending、审计；批量失败全回滚。draftId+version防删除重建ABA，operationId请求hash及唯一消费约束防重复。
- AI输入均进入非系统材料；无额外工具/写权限，推理前后重验权限。私有工作稿正文不入Query缓存/localStorage、日志/Observe或公开活动。0005是经批准的数据模型，不持久化完整聊天。
- 真实模型回答仍偏长并展示内部状态码；审阅还发现已保存Revision正文残留“草案/未保存”措辞会误导Copilot。随后仅收紧规格提示（正文不嵌入保存/批准状态）和Copilot提示（存储状态以真实对象/版本元数据为准），149项Mock/Provider单元回归通过。这项措辞调整未再次付费验证，不承诺模型完全避免该问题；实际UI/版本来源与人工核对优先。
- 当前限流/预算仍为单实例内存；未保存输入应离开前手动保存；模型输出仍需人工核对。已发布的问题正文不可改，后续澄清通过追加问答。新Revision依旧是需求规格版本，不代表已批准商业范围。
- B候选不改变运行时行为；后续SQL须另审。开发环境如尚未应用0005，新工作台会显示加载失败并保留原手动业务入口，不能宣称本轮已替负责人启用开发库。
