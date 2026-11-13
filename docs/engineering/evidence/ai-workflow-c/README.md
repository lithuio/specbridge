# AI工作流 C — 实际验证与安全审查

2026-11-13，分支 `feat/17-ai-agent-integration`，HEAD保持`6fb81b8`。负责人回复“批准并继续”，批准已提供0007仅用于5434/specbridge_test。保留A/B未提交改动；不修改.env、开发/生产数据库或用户Codex配置，无Commit/Push/PR/Merge/部署。

## PASS

| 实际命令 | 结果 |
|---|---|
| `pnpm db:migrate:test` | 复核0007哈希、snapshot父链、原21表一致后，已审SQL原字节仅应用5434；当前22表/9自定义触发器、8迁移 |
| `pnpm test:integration` | 12文件/100项，包括新表约束、不可伪造EXECUTED、终态不可改、跨需求目标拒绝、0000–0006升级原21表及业务数据保持 |
| `pnpm --filter specbridge-api test` | 18文件/158项，包括非法执行工具、确认参数注入、组合文本与不安全金额边界 |
| `pnpm test:e2e:ai` | 最终4文件/44项：原AI/工作稿/Copilot33，新提案11；真实HTTP/PG，模型Mock，不依赖付费Key |
| `node scripts/with-env.mjs .env.test pnpm --filter specbridge-api test:e2e:auth` | 16项PASS |
| 同上环境包装的 `test:e2e:rbac` / `test:e2e:requirements` / `test:e2e:changes` / `test:e2e:reads` | 13 / 9 / 8 / 9项PASS，R05 create/patch事务抽取后原API规则保持 |
| `pnpm test:browser:proposals` | 最终4项/11.0s PASS：真人界面路径、编辑/选择/确认、409保留、响应丢失查回执、关闭重开、商业创建/更新、AI失败手动工作稿、Client限制 |
| `R07_EVIDENCE_ROOT=test-results/evidence pnpm test:browser:copilot` | 原有4项/7.7s PASS，多轮/来源/失效/取消/全局项目选择 |
| API/Web `typecheck` / `lint` / `build` | PASS；无新增依赖 |
| `pnpm --filter specbridge-api openapi:check` / `pnpm db:check` / `git diff --check` | PASS；47路径，新增6操作、3个路径模板，输入/输出契约及Web类型已生成 |

新提案HTTP测试覆盖：Session/CSRF、项目与Workspace/作者/角色/Bearer拒绝、模型/请求伪造执行字段、共享资料隔离及撤回、生成后会话撤销、锁等待后会话撤销、业务/工作稿/提案CAS、过期/删除、100份配额和30次用户限流、分页、审计故障/唯一operationId冲突全回滚、并发两次确认只执行一次、同请求重放、R04 Pending/不可变与R05 DRAFT。

## 真实DeepSeek独立Smoke

`R08_REAL_PROVIDER=1 node scripts/with-env.mjs .env.test pnpm --filter web test:e2e proposals-real-ai.spec.ts`：1项PASS，测试15.2s/总17.6s。真实Copilot执行1个只读工具并返回真实Requirement来源，用户通过来源入口准备新的澄清提案，模型生成5个问题；人工改写且只选择1个，确认前Requirement完全不变，确认后只发布1个问题、业务版本1→2，没有Revision/Ready/Submit/审批。

模型4请求均200，预留8192输出Tokens，实际6497输入/1815输出，usage无缺失；耗时627/6643/3801/2487ms，无自动重试。只由安全API子进程加载密钥，Web/测试进程不载入真实密钥；合成项目使用隔离库。[计数证据](real-provider.json)、[合成回答与行为断言](real-proposal-result.json)。后续会话锁强化仅重跑Mock HTTP/PG并发及类型/契约，没有再次付费；最终预览收起聊天输入的布局已用Mock浏览器重拍。

## 实际发现与已修复失败

- **会话撤销竞态**：新增测试确实复现“确认请求等待Workspace锁期间退出登录，旧检查仍返回200并执行”。修复为取得业务聚合锁后重新检查Session，并在写事务持有Session共享锁。相同并发测试现为401且业务无变化；44项AI HTTP回归通过。未更改已有R04/R05外部API契约。
- 采用textarea包在label中时，自动化按完整标签不能稳定定位初始正文。改成独立label/htmlFor和唯一textarea ID，键盘/可访问名称与浏览器通过。
- 初次测试误用契约检查函数参数、无Origin的匿名请求状态和`/ready`测试地址；改为已有函数签名、有效CSRF下验证401及实际`/mark-ready`路由。没有放宽授权或改变业务状态机来迁就测试。
- 新分页契约检查发现直接SQL额度夹具用了空payload；将夹具改为合法的空问题列表/假设/风险对象，分页契约和44项套件重新通过。
- Web lint发现effect同步setState和render中Date.now；改为异步加载流程与用户点击时检查有效期，服务端仍最终验证。API lint的测试排序/stringify警告已修正。
- 首次回归命令误用了不存在的根script，随后使用真实API package scripts和.env.test包装，55项受影响回归实际PASS。

## 安全边界与未运行项

模型工具仍全部只读，没有prepare/execute模型工具。提案由独立Session/CSRF接口、本人显式按钮准备和执行，目标/来源由服务端绑定。生成对客问题/规格不携带Copilot内部聊天或工具正文；复制本人工作稿是明确的人类选择，不覆盖原工作稿。商业准备从当前真实规格/草稿复制，空工时/金额不由模型填充。

所有确认保留Workspace→Project→Requirement→CR（需要时）→Proposal的业务锁序；同事务复用R04/R05命令、写审计与不可变执行回执。有效期边缘或唯一operationId约束失败会全回滚并安全报409。已执行回执不接受第二操作编号或同编号替换参数。

个人提案有效24h，过期不自动删除，100份未执行上限含过期；本人可删除未执行提案。已执行提案/回执完整保留且不可删除；当前没有自动清理周期。未引入完整聊天持久化或外部MCP写权限。

无新增依赖；B记录的既有shadcn链2项low/moderate公告仍待H-17处理，本轮未重新运行依赖审计。真实模型回答仍偏长，包含技术字段/原因码，来源真实不保证解释准确，需人工体验验收。

NOT RUN：D安装授权、E最终全量、开发/生产0005–0007迁移、远程CI、本轮MCP Inspector/Codex Host、独立安全/真实设备/读屏验收。未把普通CI Mock、自动截图自查或原阶段历史结果当成本轮这些项目的PASS。
