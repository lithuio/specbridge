# AI工作流 E — 最终集成验证

2026-11-13。负责人要求“继续阶段E”。开工分支`feat/17-ai-agent-integration`，HEAD`e9e5efd`、工作区干净，A–D已由负责人本地提交。本轮只补集成覆盖、测试编排与独立证据目录，未扩展业务范围、改变生产业务实现/依赖/数据库Schema。没有Commit/Push/PR/Merge/部署，真实用户Codex配置和`.env`未修改。

本轮结果以本目录记录为准，不覆盖原R08 F或后续A–D历史证据。完整人工流程见[综合验收范例](../../AI_WORKFLOW_E_ACCEPTANCE.md)。

## 实际结果

机器可读[验证矩阵](verification.json)，环境Node22.23.4、pnpm10.34.9、Codex0.167.1。以下不重复累加被重跑的测试。

| 检查 | 最终结果 |
|---|---|
| API/Web/MCP Build、Lint、分别typecheck | PASS |
| `pnpm test` | PASS：API161 + MCP28 |
| PostgreSQL集成 | PASS：13文件/102项，包含存量升级和真实约束 |
| 完整HTTP聚合 | PASS：141项；Auth16/RBAC13/Requirement9/Change8/Delivery7/reads9/Token9/MCP6/资料9/连接11/AI44；默认外部Host/Inspector两项SKIP |
| 公共路由 / 付费Smoke CI保护 | PASS：5 / 4项 |
| OpenAPI / 迁移元数据 / Skill格式 | PASS：51路径及Web类型无漂移、db:check、quick_validate |
| 完整真实浏览器（模型Mock） | PASS：14套件/44场景；原业务与A–D全部覆盖 |
| 真实MCP / Codex Host / Inspector | PASS：独立8项，无默认跳过；其中6项与普通聚合重合 |
| 真实DeepSeek | 三场景最终PASS；保留一次真实Provider校验失败及一次测试选择错误，详见下方；不是稳定性全绿承诺 |
| 可访问性 | 48个检查状态/0自动违规；26状态有incomplete，不当作人工PASS；[截图与说明](../../../ux/evidence/ai-workflow-e/README.md) |
| 依赖审计 | FAIL：全量27条；production口径2条，无本轮新增公告ID |
| 开发库新增功能启用 | BLOCKED：H-15尚无开发5433目标授权；因此开发迁移NOT RUN，隔离验证已完成 |
| 独立人工验收、真实信任自动加载、远程CI | NOT RUN，H-17/H-18/H-20/H-21跟踪 |

真实Provider总共14次上游请求、14个HTTP200，预留输出26624Tokens；通过Provider校验后记录的已知输入26083/输出6219，其中一次被拒绝响应的usage未记录，**不是完整计费总量**。完成三业务场景的12次请求已知输入23774/输出6162；没有自动重试、扩大单进程限额或重复运行已经成功的背景场景。

- [A需求整理与Copilot统计](real-a/real-provider.json)：4调用/全200；人工创建Revision，AI推理不修改原文/审计，真实来源可追溯。
- [B背景场景合成结果](../../../ux/evidence/ai-workflow-e/real/ai-workflow-b/real-background-result.json)：共享资料用于需求辅助，Copilot有真实背景版本来源，Requirement不变；Provider统计位于初次混合运行，见下方失败说明。
- [C有界诊断复验统计](real-c-diagnostic/real-provider.json)与[业务结果](../../../ux/evidence/ai-workflow-e/real/ai-workflow-c/real-proposal-result.json)：4调用/全200，准备前后业务不变；人工确认只发布1问题，无Revision，原文保留。首次独立C失败仍保存在[原统计](real-c/real-provider.json)。

## 本轮修正

- 新增Owner网页授权兑换出的Token贯穿真实stdio客户端的集成测试：列工具、读取明确批准版本/Revision、跨项目/伪造参数拒绝、撤销后拒绝，确认业务快照不变和stderr无秘密。原连接HTTP10项现11项。
- `test:e2e:connections`显式先构建MCP，保证CI单独运行也可复现；根`test:e2e:db`补入AI/工作稿/提案/Copilot套件，避免“完整HTTP回归”遗漏44项。
- 真实Provider统计增加`R08_REAL_EVIDENCE_DIR`，只传API子进程；三个真实浏览器场景遵循`R07_EVIDENCE_ROOT`，保留A–D历史文件。没有放宽付费预算、授权检查或CI禁用保护。
- 修正真实AI脚本的Playwright文件正则：原`real-ai.spec.ts`也选中背景/提案文件，导致同一进程共享预算。现在精确匹配路径中的完整文件名；`--list`确认仅1文件/1场景。
- 既有CI继续分别运行全部HTTP/浏览器套件，新联调用例随连接套件执行；模型仍为Mock，真实Host/Inspector/DeepSeek只在显式本地Smoke运行。CI步骤名称更新以反映资料、提案和连接覆盖。

## 业务与安全检查

| 范围 / 验收条件 | 本轮证据与结论 |
|---|---|
| AC-28/29分步任务、本人工作稿 | 生成无业务写入；两类工作稿、作者隔离、CAS/删除重建、刷新恢复由AI HTTP及工作台浏览器覆盖 |
| AC-30人工确认与原状态机 | 批量发布/审计/回执原子性、重放、expectedVersion、Pending冻结、不可变Revision；R04–R06 HTTP和三角色纯UI业务闭环回归 |
| AC-31背景隔离 | 内部/共享版本投影、撤回/替换、跨租户、上传配额/真实解析子进程/来源重验；对客生成固定shared-only，Owner内部Copilot按权限读取 |
| AC-32提案执行 | 仅本人/白名单准备和显式确认；R04/R05既有事务命令，商业金额人工核对；锁等待后Session复核、并发确认/审计回滚/撤权/到期/版本冲突均覆盖 |
| AC-33本地连接 | Owner/原Session/项目/PKCE/state/port绑定，专用兑换拒绝混合认证与浏览器头，Token+grant+audit同事务；真实CLI、MCP生命周期和隔离Host通过。实际用户Codex信任后的自动加载仍待H-20 |
| AC-34故障与注入 | Provider Mock覆盖超时、429/402/503、空/非法JSON/Schema/预算；模型和工具参数严格白名单，伪造项目/未注册工具拒绝，模型正文不成为指令。浏览器故障/409/未知响应保留输入，手动业务正常 |
| Token与日志 | 每次核对摘要、期限、撤销、scope、当前Owner/项目状态；跨Project/Workspace拒绝。响应/日志/stdio/浏览器持久存储秘密断言，真实Host与Inspector输出无Token |

本轮自查未发现新增业务或授权缺陷；这不等于独立安全评审已通过。测试中的500/503审计回滚与模型故障日志来自有意的负面夹具，不是测试失败。没有任意SQL/Shell/审批/验收MCP工具；Copilot准备/模型推理与人类确认执行保持分离。

## 可复现命令

从仓库根目录运行。测试数据库必须为已批准的5434/specbridge_test；常规套件不需要真实Key。不要同时运行两个占用3000/4000的浏览器栈，也不要并发两个清理同一API dist目录的构建。

```bash
pnpm build
pnpm lint
pnpm test
pnpm --filter specbridge-api typecheck
pnpm --filter web typecheck
pnpm --filter specbridge-mcp typecheck
pnpm test:integration
pnpm test:e2e:db
pnpm test:smoke-guards
pnpm test:e2e
pnpm --filter specbridge-api openapi:check
pnpm db:check
R07_EVIDENCE_ROOT=../../docs/ux/evidence/ai-workflow-e/mock pnpm run test:browser:phases
```

复现真实DeepSeek应单独执行三个进程，每进程最多4调用/8192预留输出Tokens、单请求30秒；已有真实配置只由安全API子进程载入。示例为A，B/C分别换为`'(^|/)documents-real-ai\.spec\.ts$'`/`'(^|/)proposals-real-ai\.spec\.ts$'`及`real-b`/`real-c`统计目录：

```bash
R08_REAL_PROVIDER=1 \
R07_EVIDENCE_ROOT=../../docs/ux/evidence/ai-workflow-e/real \
R08_REAL_EVIDENCE_DIR="$PWD/docs/engineering/evidence/ai-workflow-e/real-a" \
node scripts/with-env.mjs .env.test pnpm --filter web test:e2e '(^|/)real-ai\.spec\.ts$'
```

外部客户端独立安装于临时目录，不修改仓库依赖。Codex使用已经存在的本机账号，隔离执行，不保存原始宿主日志：

```bash
npm install --prefix /tmp/specbridge-workflow-e-inspector --ignore-scripts --no-audit --no-fund @modelcontextprotocol/inspector@2.15.0
R08_MCP_HOST_SMOKE=1 R08_MCP_INSPECTOR_SMOKE=1 \
R08_MCP_INSPECTOR_ENTRY=/tmp/specbridge-workflow-e-inspector/node_modules/@modelcontextprotocol/inspector/clients/cli/build/index.js \
R08_MCP_EVIDENCE_DIR=../../docs/engineering/evidence/ai-workflow-e \
node scripts/with-env.mjs .env.test pnpm --filter specbridge-api test:e2e:mcp
```

## 迁移、外部Host与审计边界

0005–0008按各自审核包SHA-256复核不变。102项数据库测试含旧库升级、真实事务/约束；全部只在获批5434隔离目标。当前23表/9迁移/10自定义触发器。本轮未生成新迁移，未应用开发5433或生产；H-15目标授权未扩大。

[真实Codex Host](host-smoke.json)使用安装器生成且解析后的同一非秘密MCP表作为隔离CLI覆盖，运行私有凭据launcher与已安装Skill；调用两工具、保留真实批准版本/Revision来源、区分范围/背景/推测并忽略正文中的秘密泄漏/审批指令。业务快照不变，专用Token结束撤销，临时凭据/配置清理。它不是实际用户交互式信任后的项目自动发现测试，不能据此关闭H-20。[Inspector2.15.0](inspector.json)验证真实tools/list、tools/call及输入输出Schema。

**FAIL：依赖审计仍非零。** `pnpm audit --json`共27条：8high/13moderate/6low，与已提交D证据相同，无新增公告ID；本轮未修改依赖。`pnpm audit --prod --json`为2条：deepmerge low、minimatch moderate，都来自Web的shadcn依赖链；不能把生产依赖口径说成零风险。[完整安全摘要](dependency-audit.json)。H-17需有范围的依赖修复与复验。

单实例配额重启清零；解析资源限制不是完整OS沙箱；私有文件权限不防同UID/root；跨文件安装不保证崩溃事务，未知结果先撤销再恢复；每代码目录一个托管连接；提案24h有效但无自动清理。真实模型生成内容仍需人类审阅，不因来源存在就成为批准事实。

NOT RUN：实际用户Codex信任自动加载、WSL/其他OS实际设备、独立安全/读屏/视觉签字、远程CI、开发/生产新增迁移。上述人工/环境项不作为已授权E本地测试的重复审批点，也不冒充完整发布验收。

## 过程问题

首次契约检查与HTTP聚合中另一个Nest build并发，dist被清理导致`ERR_MODULE_NOT_FOUND`。待聚合完成后串行重跑`openapi:check`通过51路径；没有修改契约或生产实现。此失败为验证编排问题，已在复现说明要求构建串行。

首次真实AI命令未精确限定文件名，Playwright选择3个文件。背景场景先成功使用4次真实请求（全部200），随后的提案在首次推理前被本地Smoke预算拒绝503，原需求场景因maxFailures未运行。见[初次选择失败记录](initial-mixed-run/selection-failure.json)和[原始安全计数](initial-mixed-run/real-provider.json)；该JSON保留`CALL_FAILED`，不能改为全绿。修正文件选择并用`--list`确认后，只运行未完成的A/C，未重跑已通过的B、未增加预算或向上游发送失败的第五次请求。

首次独立C的第二次推理HTTP200但Provider校验失败，页面503，未到提案创建/确认。该次没有保留响应元数据，不能事后断言是截断、格式还是其他响应问题。新增仅用于Smoke的有界白名单诊断：最多256KiB读取、只保存响应长度/结束枚举/工具数量/Token计数和已知错误码，不保存正文、工具参数或原始异常；一次有界复验4请求全部通过，未修改生产Provider/提示词或放松Schema。此单次异常根因仍未确认，保留为真实模型可靠性风险，H-21验收，不继续付费循环追求“全绿”。

辅助日志在本机`/tmp/specbridge-workflow-e-*.log`，持久证据只保存安全计数、合成结果和截图，不保存原始Host/Provider日志、Token、Prompt、trace/HAR。API已跟踪构建缓存最终恢复开工字节。
