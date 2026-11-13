# AI工作流 B — 实际验证证据

2026-11-13，分支 `feat/17-ai-agent-integration` / 开工HEAD `6fb81b8`。保留A未提交改动；未Commit/Push/PR/Merge/部署。负责人“批准，继续开发”覆盖已提供0006的5434隔离目标；未迁移开发5433/生产。

## PASS

| 实际命令 | 结果 |
|---|---|
| `pnpm db:migrate:test` | 0006原字节应用成功，SHA-256仍为 `6efe3cd862b3167478ce1be8095a791379eae39852801d7f0616c635516272e4` |
| `pnpm test:integration` | 11文件/98项；0000–0005升级保留原18表数据，新21表/8触发器；真实PG并发READY与分段插入竞争 |
| `pnpm --filter specbridge-api test` | 最终17文件/155项通过；含真实四格式解析、子进程超时与输出超限 |
| `pnpm test:e2e:documents` | 9项实际HTTP/PG/文件工作进程；四格式、共享替换、Client投影、跨项目/角色/Token拒绝、CAS、配额并发、100MiB、审计回滚、中断、AI隔离及Copilot来源 |
| `pnpm test:e2e:ai` | 33项；原分析、双任务/工作稿和Copilot回归 |
| `node scripts/with-env.mjs .env.test pnpm run test:e2e:db:run` | Auth16、RBAC13、Requirement9、Change8、Delivery7、reads9、Token9、MCP6、documents9通过；Inspector/Codex付费Host2项按设计skip |
| `pnpm test:browser:documents` | 2项真实Web/API/PG浏览器；共享与内部替换/来源、明确确认、409、未知结果、失败后手动需求；AI采用Mock |
| 受影响浏览器 | 工作台6、Copilot4、Projects2通过；命令见下方失败说明 |
| API/Web `typecheck`、`lint`、`build` | PASS；新增解析依赖锁定版本，不修改原有依赖版本 |
| `pnpm --filter specbridge-api openapi:check` / `pnpm db:check` / `git diff --check` | PASS；44路径，multipart仅专用文件路由；现行journal只到0006 |

普通测试从未加载真实付费Key。日志仅ID、状态、计数；上传名称/正文/摘要/blobId不进入审计或日志。浏览器原件目录为每次运行新建的私有临时目录，测试结束清理；原件不写开发资料目录。

## 真实DeepSeek单独记录

`R08_REAL_PROVIDER=1 node scripts/with-env.mjs .env.test pnpm --filter web test:e2e documents-real-ai.spec.ts`：1项通过，13.4s测试/15.8s总计。合成项目上传一份内部及一份共享背景，真实需求澄清只引用共享片段；Owner Copilot实际执行2次只读工具，返回3个文档片段来源和1个需求来源；需求前后完全相同，无自动Revision/Ready/审批。

4次模型请求均200；8192预留输出Tokens，9195输入/1640输出Tokens，usage无缺失。四次2715/869/5154/3539ms。仍使用配置模型 `deepseek-flash`；无自动重试。密钥仅安全API子进程加载，解析子进程只有LANG/TZ环境变量。见 [计数证据](real-provider.json)、[合成回答](real-background-result.json)。回答区分了内部估算、访谈转述和待确认项；准确性及文字偏长仍需人工验收。

## 已修复并重跑的问题

- PDF.js6.5在Node22需legacy入口及loading task销毁API；真实PDF夹具验证后修正，四类解析通过。
- 测试最初错误调用现有 `assertContract` 参数，修正为完整Response；发现nullable enum的OpenAPI表达不接受null，已修正契约并通过AJV。
- 无关键词时SQL `ORDER BY 0`被解释为列序号，改为类型化常量表达式；空查询词的内部/共享检索重新通过。
- Next Activity保留隐藏页面，文件input locator匹配到隐藏副本；限定可见input。Client截图曾在加载中取证，新增可见共享内容断言后重拍，不将初次空画面作为交付证据。
- 将三个浏览器文件放同一worker导致同账号超过真实登录限额；未放宽Auth。该次工作台6项已通过，随后分别执行 `R07_EVIDENCE_ROOT=test-results/evidence pnpm test:browser:copilot` 和 `... pnpm test:browser:projects`，4+2全通过。

## 依赖审计实际发现

`pnpm audit --prod --json` 返回非零：既有 `apps/web > shadcn` 链上2项，deepmerge4.3.1 low原型污染、minimatch10.2.6 moderate潜在DoS。均已核对开工HEAD锁文件存在，不是新增PDF/DOCX解析依赖引入；新增解析依赖无本次审计命中。未做无关升级或将审计称作无漏洞PASS。[脱敏摘要及公告链接](dependency-audit.json)。发布前由负责人安排工具依赖更新/归类及复验；此处不声称不存在未知漏洞。

## 安全审阅与限制

- Node权限只准读解析脚本/依赖，禁止写文件、子进程、worker和原生扩展；文档网络资源不请求，屏蔽网络入口。CPU硬限制10s、父进程墙钟15s、128MiB V8 heap、50ms采样RSS超过256MiB即终止，stdout3MiB。RSS监测不是无瞬时峰值的OS硬内存隔离；Node权限不等同于抵御依赖任意代码漏洞的完整OS沙箱。生产需单独审核隔离与部署权限。
- DOCX懒遍历≤2000 ZIP条目、声明展开总量≤32MiB/单项≤8MiB；流式读取再次计数。无文件解压落盘、宏或外链执行；PDF≤500页，输出≤50万字符/1000段。既有业务不因解析失败回滚。
- 原件以UUID寻址、0700/0600、排他创建/no-follow，拒绝仓库内存储；服务端Project锁计算20身份/100MiB保留历史配额。已解析/失败版本及READY分段不可变。
- 公开辅助始终shared-only，Copilot按角色检索；后续模型请求和最终返回重新检查来源权限。撤回不能收回已发给模型/用户的数据。外部MCP仍两个批准规格工具，背景路由拒绝Bearer。
- 失败原件删除后才释放预留；中断任务由下一上传在两分钟后清理。未实现OCR、原件下载、历史物理删除或自动恢复队列。

NOT RUN：远程CI、独立人工设备/读屏/安全验收、B后的新Inspector/Codex付费Host（MCP真实stdio集成6项已通过）、C/D/E最终全量与开发/生产迁移。C候选SQL静态准备不等于已执行或功能交付。
