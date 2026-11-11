# SpecBridge — Current Project State

> 更新时间：2026-11-12。R07 Phase H 本地最终集成完成；远程 CI 与人工评审 NOT RUN。下方保留历史检查点。

## R07 Phase H — 本地最终集成完成，未提交

`feat/15-web-integration` / 开工 HEAD `92f4a99`；工作区干净。已在线核对 Issue #15，B–G 成果齐备，G 已由负责人提交；前阶段源码/历史截图保留。未 Commit/Push/创建 PR/Merge/部署。

- 真实 Next 生产构建 / 编译 Nest / 5434隔离PostgreSQL / 三个独立Chromium Context，业务写入全由 UI 完成：项目准备、澄清/Revision/Ready、拒绝重提、v2双方顺序批准、D1退回/D2接受、历史/Audit与三角色Dashboard。C–G既有会话/跨项目/409/重复/未知结果风险回归保留。
- 修复正式页面品牌可访问名称、金额定义列表、审批/交付焦点恢复、稳定表单错误描述；适配D旧测试入口。仅Web及验证/CI文档改动，无后端、数据库结构、迁移或契约变化。固定既有axe为直接测试依赖，未升级其他锁定版本。
- [H完整证据与5张截图](ux/evidence/r07-h/README.md)：17状态0 axe自动违规，原始未判定项保留；对层叠/裁剪元素补充实际颜色对比5.94–16.03:1，键盘双向Tab/返回焦点/320px导航与重排通过，最终截图已逐张自检。

| 实际命令 / 检查 | 最终结果 |
|---|---|
| `pnpm run lint` / `pnpm run build` / `pnpm run test` | PASS；构建首轮沙箱端口失败，获准干净构建通过 |
| `pnpm --filter specbridge-api typecheck` / `pnpm --filter web typecheck` | PASS |
| `pnpm run test:integration` / `pnpm run test:e2e` | PASS；90 PostgreSQL / 5基础HTTP |
| `pnpm run test:e2e:db` | PASS；auth/rbac/requirements/changes/deliveries/reads=16/13/9/8/7/9，含真实Next代理 |
| API `openapi:check` / `db:check` | PASS；30 paths无漂移 / 迁移元数据 |
| 浏览器 C–H | 最终15场景PASS，分段运行：C6、D/E/F/G各2、H1（最终20.5s）；根全量入口首轮FAIL及修复后续跑记录见H evidence |
| 最后UI修复后Web `build` / `lint` / `typecheck`、H定向浏览器 | PASS；未重复无关后端检查 |
| `git diff --check` / 本轮文档链接 | PASS |
| 远程CI、独立人工视觉/API集成/安全评审 | NOT RUN；不伪造通过或自动推送 |

已解决：沙箱/离线元数据限制、D旧链接定位、金额文本节点回归、弹窗焦点丢失与表单悬空ARIA引用。最终无未解决FAIL/BLOCKED。CI追加Web类型与Chromium真实浏览器入口，但远程未运行；已有C–G截图不覆盖。测试启动器自建HTTP进程已退出，既有隔离测试DB保持运行，开发/生产库未访问。

后续人工：按H-09评审H截图、可访问性补充和diff并记录结论；远程CI/PR/合并需未来授权。Firefox/WebKit、真实设备/读屏/实际200%zoom、生产HTTPS、性能与备份恢复NOT RUN；本地H完成不代表发布DoD或全部AC-17通过。本轮到H结束，详情见 [最终交接](engineering/R07_PLAN.md)。建议摘要：`fix(r07): complete browser integration and accessible workflow verification`。

---

## R07 Phase G — 历史交接（后续已提交在 92f4a99）

`feat/15-web-integration` / HEAD `55b53df`；开工干净，F 已由负责人提交。已在线核对 Issue #15、F 成果及 R06/读取契约，保留前阶段源码与截图。只执行 G；未 Commit/Push/创建 PR/Merge/部署，未进入 H。

- Delivery 提交、客户退回必填意见、新 D2 重交、接受与终态；独立历史详情/批准规格与审批证据。创建和 Review 不传 expectedVersion，后续需求修订不阻断原批准版本交付；409/未知结果保留输入并禁重放。
- 真实 Dashboard 三bucket/授权统计/状态分布/项目列表、项目交付筛选列表、服务端角色裁剪 Audit；均使用既有 API，筛选分页与深链接刷新可恢复，无静态业务数据或任务分配系统。
- 新增 `features/deliveries/dashboard/audit`、三类项目路由、G定向E2E；补齐 D–F 写后 Dashboard/Audit 缓存失效。复用会话/项目边界和现有UI，无后端、数据库、契约或依赖变更。

| 命令 / 检查 | 实际结果 |
|---|---|
| `pnpm run test:browser:deliveries`（沙箱外） | PASS；最终2场景/10.2s，真实Next/Nest/隔离PostgreSQL/Chromium；退回→重交→接受、终态/403/409、旧批准不失效、无expectedVersion、竞争/未知结果不重放、真实聚合分页/审计裁剪/跨项目404、深链刷新与320px，无pageerror |
| `node scripts/with-env.mjs .env.test pnpm --filter web test:e2e auth.spec.ts --grep 'A→B'`（沙箱外） | PASS；现有缓存隔离1项/3.9s，无历史截图覆盖 |
| `pnpm --filter web build`（沙箱外） | PASS；最终干净生产构建，交付列表/详情/Audit新增路由 |
| `pnpm --filter web typecheck`、`pnpm --filter web lint`、`git diff --check` | PASS；无lint警告 |
| `pnpm run db:test:up`（沙箱外） | PASS；现有5434隔离库，原启动器校验身份与已审迁移 |
| [G 正式截图与复现](ux/evidence/r07-g/README.md) | 2张：真实聚合桌面页、手机接受确认框，最终已查看，C–F截图原样保留 |

已处理：Review联合请求类型、证据字段错误显示、Next Activity成功状态、测试筛选导航/reload竞争、沙箱监听与Turbopack旧CSS缓存。最终干净构建产物与浏览器CSS断言一致；旧缓存保存在 `/tmp/specbridge-r07-g-{build-al24ldtm,final-pdazj6aw}/next`，不作为复现依赖。自建API/Web退出；本轮启动的测试DB保留运行，未清表/down或访问开发库。无未解决测试失败。

H收尾：完整三角色浏览器准备→审批→交付链；集中一次R01–R06/契约/Web/浏览器全量回归；桌面/手机/键盘/对比度与长内容视觉；跨模块缓存/混合角色/会话过期核心负向；最终文档和人工视觉/安全Review。远程CI、生产HTTPS/多浏览器及人工评审未运行，不虚构通过，H-09仍待记录。无新增人工决策阻塞；下一Session按 [G交接](engineering/R07_PLAN.md) 启动H，本轮到G结束。建议摘要：`feat(r07): integrate delivery acceptance, live dashboard and scoped audit`。

---

## R07 Phase F — 历史交接（后续已提交在 55b53df）

`feat/15-web-integration` / HEAD `cef9e44`；开工干净，E 已由负责人提交。已在线核对 Issue #15、R05 精确契约与 E 成果；仅执行 F，保留前阶段源码及截图。未 Commit/Push/创建 PR/Merge/部署，未进入 G。

- 已实现 CR 发现列表/筛选/分页、从 Ready 需求创建商业评估、NULL/部分草稿保存、完整评估正式冻结提交；Owner→Client 同版审批；双方拒绝、仅重开草稿、另行 Submit 产生新版本；APPROVED 终态；冻结规格与审批历史/独立深链接。对应 AC-09～12/16 与需求 Pending 保护的浏览器核心行为。
- lockVersion 初始0；金额安全整数最小单位、工时十进制字符串；无浮点金额换算。Client 无 draft，重开后旧 activeVersion 明确标上一轮，历史状态来自每版 approvals。
- 草稿409保留输入并显式核对；正式提交/审批确认框固定快照，旧决定遇到新版返回409后禁再次提交，须关闭核对再发起；不自动重试。创建结果未知禁重发。写后刷新关联需求capabilities、项目绑定锁定及CR/历史缓存。
- 新增 `features/changes`、三类项目变更路由、定向 `e2e/changes.spec.ts`；复用Session/ProjectBoundary/Query/Base UI/RHF/Zod。无后端/契约/依赖/数据库结构改动。

| 命令 / 检查 | 实际结果 |
|---|---|
| `pnpm run test:browser:changes`（沙箱外） | PASS；最终2场景/16.5s，真实生产Next/Nest/隔离PostgreSQL/Chromium；三角色顺序批准、Client拒绝重提、Owner拒绝重提、新版不继承旧审批、Client无draft/403/404、stale不重放、精度边界、终态409、分页/筛选/深链/320px、未知创建禁重发，无pageerror |
| `pnpm --filter web build`（沙箱外） | PASS；新增列表/详情/冻结历史三类路由生产构建 |
| `pnpm --filter web typecheck`、`pnpm --filter web lint`、`git diff --check` | PASS；无lint警告 |
| `pnpm run db:test:up`（沙箱外） | PASS；仅启动5434隔离测试库，标准端口映射本次可用；原启动器校验身份、沿用已审迁移 |
| [F 正式截图与复现](ux/evidence/r07-f/README.md) | 2张：客户同版审批桌面页、手机确认框；已查看，C/D/E截图保留 |

已处理：TypeScript泛型反馈类型；Turbopack沙箱/失败缓存（保存在 `/tmp/specbridge-r07-f-build-p4q5dmge/next`）；测试DB未运行；Activity隐藏页测试选择器；截图动画/视口。系统Chromium及中文字体可用，本轮不需临时库/下载。自建API/Web退出，本轮启动的测试DB收尾停止；开发DB保持healthy（5433），未访问其数据。无未解决测试失败。

未运行：未受影响R01–R06/C–E全量回归、契约重生成、远程CI、人工视觉/安全Review、生产HTTPS/多浏览器、全量可访问性与交付闭环，按计划留H。无新增人工决策；H-09不标通过。下一新Session按 [F交接](engineering/R07_PLAN.md) 启动G，Delivery创建/Review不传expectedVersion，接真实Dashboard/Audit；本轮不继续。建议摘要：`feat(r07): integrate commercial assessments and versioned sequential approvals`。

---

## R07 Phase E — 历史交接（后续已提交在 cef9e44）

`feat/15-web-integration` / HEAD `7e5beb4`；开工干净，D 已由负责人提交。已在线核对 Issue #15、R04 实施契约与 D 成果。只执行 E，保留前阶段源码/截图；未 Commit/Push/创建 PR/Merge/部署，未进入 F。

- 已实现 Requirement 列表/创建、仅 DRAFT 作者或 Owner 编辑；Clarification 问答；不可变 Revision 创建/可增删验收标准、分页历史和独立深链接；Mark Ready 显式核对最新版本、问题与标准。对应 AC-06/07/08/16/25 核心浏览器行为，含跨项目父链边界。
- 复用 ProjectBoundary、Session API、生成类型和服务端 capabilities；expectedVersion 固定为表单打开时版本，409/刷新保留输入，核对后手动重提；Pending 禁修订、Client 禁 Revision/Ready、READY 禁问答。未知写结果禁重发并查实际对象。Next Activity 成功创建后返回表单可继续新建，失败输入不清空。
- 新模块 `apps/web/src/features/requirements`、项目下四类需求路由与 `e2e/requirements.spec.ts`；无后端逻辑/依赖/数据库/契约变更。根浏览器入口追加 E，仍按阶段独立 API 进程避免真实登录配额叠加。

| 命令 / 检查 | 实际结果 |
|---|---|
| `env LD_LIBRARY_PATH=/tmp/specbridge-browser-libs/root/usr/lib/x86_64-linux-gnu FONTCONFIG_FILE=/tmp/specbridge-browser-libs/fonts.conf pnpm run test:browser:requirements` | PASS；最终2场景/17.1s，真实 Next/Nest/隔离 PostgreSQL/Chromium，三角色独立 Context，无 pageerror；问答→Revision→Ready、stale保留输入/手动重提、403/404、未答/空标准、Submit及VendorApproved修订阻断、旧版不变、URL父链、两种分页/刷新、未知创建不重放、320px |
| `pnpm --filter web build` | PASS；四类新增路由生产构建 |
| `pnpm --filter web typecheck`、`pnpm --filter web lint`、`git diff --check` | PASS；无 lint 警告 |
| [E 正式截图与复现](ux/evidence/r07-e/README.md) | 2张桌面/手机图已查看；C/D历史截图保留 |

已处理：生成契约 QUESTION/ANSWER union、并发构建路由类型暂态、沙箱端口/缓存、Next Activity 隐藏页面测试定位、vendor-decision 成功码断言；Activity 成功创建表单重置已验证。缓存保存在 `/tmp/specbridge-r07-e-build-813w9xcj/next`；浏览器沿用本机临时库，标准复现见 Web README。启动器只连接5434隔离库并校验身份、复用已审迁移；未访问开发库或重置数据，自建 HTTP 子进程已结束。

未运行：C/D浏览器回归、未受影响 R01–R06全量回归、契约重生成、远程CI、人工视觉/安全Review、生产HTTPS/多浏览器、全量可访问性与完整业务链，按计划留H。无未解决测试失败或新增人工决策；H-09不标通过。下一新Session按 [E交接](engineering/R07_PLAN.md) 执行 F；Submit/决定需刷新需求capabilities，CR lockVersion初始0。本轮结束于E。建议摘要：`feat(r07): integrate requirement clarification, immutable revisions and readiness`。

---

## R07 Phase D — 历史交接（后续已提交在 7e5beb4）

`feat/15-web-integration` / HEAD `200c54f`；开工干净，C 已由负责人提交。已在线核对 Issue #15。本轮只执行 D，前阶段成果保留；未 Commit/Push/创建 PR/Merge/部署，未进入 E。

- 已实现 Workspace 创建/分页选择、Project 创建/分页列表/详情、Owner 供应方成员管理、Developer 项目分配、唯一 Client 绑定/更正及提交后锁定提示；Client 从自己的项目列表进入，权限由当前项目 role/capabilities 决定。
- 复用 Shell、Session API、私有 Query、Base UI/RHF/Zod。初始范围只读；写后刷新相关数据，409 保留输入并核对锁定；创建结果未知先查列表，不自动重试。没有后端、数据库、契约或依赖变更。
- `features/projects` 与项目 layout 为 E 提供项目上下文；根浏览器命令按 C/D 分别启动原 API/Web fixture，避免两个套件累积真实登录限流配额，没有修改服务端限流。

| 命令 / 检查 | 实际结果 |
|---|---|
| `env LD_LIBRARY_PATH=/tmp/specbridge-browser-libs/root/usr/lib/x86_64-linux-gnu FONTCONFIG_FILE=/tmp/specbridge-browser-libs/fonts.conf node scripts/with-env.mjs .env.test pnpm --filter web test:e2e projects.spec.ts` | PASS；D 2场景/6.5s；Owner真实UI准备、两级成员/Client、分页、403/404/422、替换后旧Client失权、Submit竞争409/刷新锁定、未知创建不重放、混合角色及320px |
| 相同环境前缀 `pnpm run test:browser` | PASS；最终 API/Web production build，C 6场景/6.3s + D 2场景/6.6s，真实 Next/Nest/隔离 PostgreSQL/Chromium，无 pageerror |
| `pnpm --filter web typecheck`、`pnpm --filter web lint`、`git diff --check` | PASS；无 lint 警告，最终差异检查 |
| [D 正式截图与复现](ux/evidence/r07-d/README.md) | 3张代表桌面/手机图逐张查看，随机邮箱遮罩；C历史截图原样保留 |

已处理：类型路径参数名、RHF useWatch、沙箱端口限制、测试导航/reload竞争、截图平滑滚动错位。5434 隔离测试库通过原启动器身份校验；Docker socket 状态读取缺权，未操作容器；未读取开发配置/访问开发库、清表或禁触发器。测试 HTTP 子进程已结束，API 生成缓存移至 /tmp。

未运行：未受影响的 R01–R06 全量回归、契约重生成、远程 CI、人工视觉/安全 Review、生产 HTTPS/多浏览器和完整三角色业务链。无新增人工决策阻塞；H-09 等既有人工结论不变。下一 Session 按 [D 交接](engineering/R07_PLAN.md) 启动 E，保留本地修改。建议摘要：`feat(r07): add workspace and project setup with scoped member management`。

---

## R07 Phase C — 历史交接（后续已提交在 200c54f）

`feat/15-web-integration` / HEAD `9499618`；开工工作区干净，B 实际已在 `544e4b8`，环境配置已在 `9499618`。已核对在线 Issue #15 与 B 生成契约；仅执行 C，未进入 D。当前修改全部保留本地，未 Commit/Push/创建 PR/Merge/部署。

- 正式 `/login`、`/register`、`/app`，Next/React/Base UI Tokens、Shell、手机 Drawer；Typed API Client 从 B schema 推导 path/method/参数/body/响应，TanStack Query 会话隔离、RHF/Zod 表单。`/app` 当前展示真实账号和协作说明，没有伪造项目、计数或待办。
- 复用 Cookie/CSRF/Rewrite：注册不自动登录、`GET /me` 恢复、退出撤销、保护请求 401、网络错误与 429。账号边界 abort/cancel/clear 并新建 QueryClient/epoch，旧 200/401 不得污染 B；不持久化私有数据。退出结果未知时隐藏私有 UI 并提供重试。
- 新增 Playwright 最小生产 Web/真实 API/隔离 DB 启动器与 UUID 账号 fixture，后续 D–H 复用；不新增后端业务、表或迁移，不修改服务端认证/授权。DB 仅 5434/specbridge_test，真实角色/库校验后应用已有审阅迁移；原测试容器保持运行。

| 命令 / 检查 | 实际结果 |
|---|---|
| `env LD_LIBRARY_PATH=/tmp/specbridge-browser-libs/root/usr/lib/x86_64-linux-gnu FONTCONFIG_FILE=/tmp/specbridge-browser-libs/fonts.conf pnpm run test:browser` | PASS；先 API/Web build，Next 生产服务器 + Nest + PostgreSQL + Chromium，6 浏览器场景 / 6.2s；认证闭环、CSRF、401/429、延迟旧响应、账号切换、退出网络失败、手机焦点/320px，无未捕获浏览器异常 |
| `node scripts/with-env.mjs .env.test pnpm --filter specbridge-api test:e2e:auth` | PASS；2 文件 / 16 项真实 HTTP 与 Next Rewrite 受影响回归 |
| `pnpm --filter specbridge-api openapi:check` | PASS；B 的 30 paths / 38 operations 与 Web 生成类型无漂移 |
| `pnpm --filter web typecheck`、`pnpm --filter web lint`、`pnpm --filter web build` | PASS；生产路由 `/`、`/app`、`/login`、`/register` 与 icon |
| `node --check scripts/browser-stack.mjs`、`git diff --check` | PASS；最终差异与范围检查 |
| [正式截图与复现](ux/evidence/r07-c/README.md) | 5 张桌面/手机图已查看；业务数据均来自真实 API，随机邮箱遮罩；不是 A 静态原型 |

已处理：沙箱下载/监听限制；完整 Chromium 下载 TLS 错误改用 Headless Shell；系统缺库且 sudo 需密码，获准临时解包 libnspr4/libnss3/libasound2 与中文字体，无系统目录修改；Next announcer 导致测试选择器冲突；截图发现 Drawer 居中动画及控件尺寸，修复后新增视口断言通过。当前 `/tmp/specbridge-browser-libs` 可能随重启丢失，标准安装与临时复现见截图 README。

未运行：R03–R06 全量回归（未改相关后端，留 H）、远程 CI、人工视觉/安全 Review、生产 HTTPS、多浏览器和完整三角色业务链。不虚构 H-09 通过。测试 HTTP 子进程已回收；生成的受跟踪 tsbuildinfo 恢复，开发数据库不受影响。下一 Session 读取 [R07_PLAN C 交接](engineering/R07_PLAN.md) 和 [Web README](../apps/web/README.md)，启动 D；无新增阻塞人工决策。建议摘要：`feat(r07): implement authenticated web shell and isolated session queries`。

---

## 本地开发环境 — 2026-11-11 已验证

按负责人本轮“配置本地开发、specbridge 数据库、.env、迁移和测试数据库”的请求实施；参考 [Issue #3](https://github.com/lithuio/specbridge/issues/3) 的新库迁移/测试隔离要求，对应 AC-17 的迁移可重复与持久存储部分，不代表备份恢复或全部 AC-17 验收完成。开始工作区干净。

- 本机 `/home/lenovo/projects/specbriage`，Node 22.23.4、pnpm 10.34.9；根锁文件离线安装校验通过，未更换依赖。Compose 沿用 `postgres:17-alpine`，实际下载版本 PostgreSQL 17.11。
- 新建开发实例 `127.0.0.1:5433/specbridge`，用户 `specbridge`，持久卷 `specbridge-dev_pgdata`；测试实例 `127.0.0.1:5434/specbridge_test`，用户 `specbridge_test`，tmpfs；另有同实例独立库 `specbridge_dev_verify`。
- 创建本机 `.env`（随机开发密码）与 `.env.test`（公开一次性测试配置），权限 600、Git 忽略；未输出秘密。模板拆分开发/测试配置。根 `dev:api` 显式注入 `.env`；根测试命令只加载 `.env.test`，保留 API/CI 显式环境和原测试 URL/数据库身份校验。
- 根脚本补齐 `db:migrate:test`、`db:migrate:verify`、`test:e2e`、`test:e2e:db`，`db:up` 等待健康。启动/迁移/测试/版本变更操作见 [DEVELOPMENT](engineering/DEVELOPMENT.md)。
- 沿用已审阅的 0000～0003，SHA-256 与 H-02/H-03/H-05 历史记录一致；按本轮开发环境配置授权应用至新建本机开发库及隔离测试库。开发库核对身份正确，4 条迁移、15 张业务表、0 个用户；重启后迁移与表仍保留。未创建演示账号。

| 实际命令 / 检查 | 结果 |
|---|---|
| `pnpm install --frozen-lockfile --offline` | PASS；锁文件未改。提示忽略部分依赖构建脚本，现有 Argon2 单元/真实认证测试通过 |
| `sg docker -c 'pnpm run db:up && pnpm run db:test:up'` | PASS；两个数据库健康，标准端口转发可用，无需旧 host 网络覆盖 |
| `pnpm run db:migrate:test` | PASS；隔离测试库迁移 |
| `pnpm run db:migrate:verify` ×2、`pnpm run db:migrate` ×2 | PASS；新库迁移和重复执行 |
| `pnpm run test`、`pnpm run lint`、`pnpm --filter specbridge-api typecheck`、`pnpm run db:check` | PASS |
| `pnpm run test:integration` | PASS；8 文件 / 90 PostgreSQL 用例 |
| `pnpm run test:e2e` | PASS；3 文件 / 5 基础 HTTP 用例 |
| `pnpm run test:e2e:db` | PASS；auth/rbac/requirements/changes/deliveries/reads 分别 16/13/9/8/7/9 项，包含 API 构建及真实 Next 代理 |
| `python3 /tmp/specbridge-local-smoke.py` | PASS；实际根 dev:api/dev:web 启动，4000/3000 健康检查与 Web 首页 200；未知账号代理登录返回预期 401/UNAUTHENTICATED，验证开发 DB 访问；脚本关闭自己的 HTTP 进程 |
| `node --check scripts/with-env.mjs`、环境值断言、子进程退出码检查、`git check-ignore .env .env.test`、`git diff --check` | PASS；开发密码/URL 一致，测试不加载开发文件，进程环境优先，子进程退出码 7 正确透传 |

已处理问题：账号已加入 docker 组但当前会话未生效，使用 `sg docker`；沙箱内 DB 连接失败后在沙箱外通过。首次临时 smoke 的错误码断言与现有契约不符，重试端口预检又遇 TIME_WAIT；修正验证脚本后完整通过，未修改业务代码。HTTP 套件中的安全 500 为既有审计失败注入的预期日志。

交接：开发库和测试库保持运行；API/Web 验证进程已关闭。用户重新登录终端或 `newgrp docker` 后使用普通 Docker 命令，也可继续用 `sg docker -c`。测试 tmpfs 在停止/重建时不保证保留；开发 `db:down` 保留卷，禁止用 `down -v` 作为常规操作。历史 SQL、业务代码和锁文件未改，构建产生的受跟踪缓存已恢复。未运行 Web 生产构建、浏览器验收、备份恢复或远程 CI；未提交/推送/部署。建议提交：`chore(dev): configure local environments and database workflows`。

---

## R07 Phase B — 历史检查点（后于 544e4b8 提交）

分支 `feat/15-web-integration`，开工/当前 HEAD `c472d78`；开工工作区干净，A 成果已在基线中。已在线读取 Issue #15，按用户授权只实施 B，未进入 C。

- 七项 GET、项目/需求/CR/Delivery 详情 capabilities 完成；授权与多查询读取使用同一只读 REPEATABLE READ。列表先授权/可见性过滤再分页；Audit 丢弃未知事件及敏感 metadata，target 校验真实父链；Dashboard 由授权数据库事实推导，summary 独立于当前 bucket/页。
- 复用既有资格校验，保留写锁/顺序审批/不可变历史；无新写业务、表、Schema、Migration 或认证重构。必要小修将 R03 原生 SQL 日期文本统一为 UTC ISO，已有成员重复加入响应同样规范化。
- Swagger 离线导出 30 paths / 38 operations；[OpenAPI](architecture/openapi.json)、前端 `apps/web/src/lib/api/generated/schema.d.ts` 已生成；固定生成器、临时目录漂移检查和 CI 步骤已增加。未启动生产 Swagger UI。
- 测试仅访问 5434 隔离 PostgreSQL；复现环境、精确命令及失败修正记录见 [R07_PLAN B 交接](engineering/R07_PLAN.md)。未访问开发/生产数据。

| 状态 | 实际命令（API 均 `pnpm --filter specbridge-api`） | 结果 |
|---|---|---|
| PASS | `test` | 10 文件 / 93 单元测试 |
| PASS | `test:integration` | 8 文件 / 90 真实 DB 集成测试 |
| PASS | `test:e2e:reads` | 9 场景；七 GET 权限、字段裁剪、分页、Dashboard 状态/计数、capabilities；真实 HTTP 对生成 Schema 校验及严格 UTC 日期 |
| PASS | `test:e2e:requirements` / `test:e2e:changes` / `test:e2e:deliveries` / `test:e2e:rbac` | 分别 9 / 8 / 7 / 13，含真实 Next Rewrite；日期修复后 RBAC 重新通过 |
| PASS | `exec vitest run --config vitest.config.integration.ts test/database/rbac.integration-spec.ts` | 日期修复后 12 项受影响 DB 回归 |
| PASS | `typecheck`、`lint`、`openapi:generate`、`openapi:check`、`db:check` | 类型/静态检查、API build、生成与确定性漂移检查、迁移元数据 |
| PASS | `pnpm --filter web exec tsc --noEmit --incremental false`、`pnpm --filter web lint`、`git diff --check` | Web 类型/Lint、diff 空白检查 |
| NOT RUN | 远程 CI、正式浏览器 E2E、Web 生产构建、人工评审；完整 auth/base HTTP 套件 | B 按受影响范围验证；不宣称 R07 全部 DoD 完成 |

已处理失败：初次沙箱连接被拒；Dashboard `asOf`/R03 原生 SQL 日期不符合 UTC；Swagger 私有子路径导出不可用；异常跨 CR 指针被现有复合 FK 拒绝（测试改为断言该保护并验证缺失指针）。均保留真实失败说明，最终相关测试通过。Audit 单事务查询已顺序执行；既有写审计故障注入的安全 500 为预期。

遗留限制：生成器 `openapi-typescript 7.10.1` 的 TS5 peer 与 API TS6 有安装警告，实际生成/漂移/Web 类型检查通过；未做大型 Dashboard 数据集性能基准，未新增索引。H-09 等人工评审状态未改变，无新增阻塞人工事项。

本轮隔离测试容器已关闭并移除，未操作开发卷；已跟踪的构建缓存恢复开工值。

下一步为新 Session 的 **Phase C**，复用生成契约实现真实 Shell、Typed Client、Query 会话隔离和认证。保留所有 B 未提交文件；本 Session 不 Commit/Push/创建 PR/Merge/部署。建议摘要：`feat(r07): add scoped read APIs, capabilities and generated HTTP contracts`。

---

## R07 Phase A — 历史检查点

分支 `feat/15-web-integration`，起始 HEAD `63d81aa`，主任务 [Issue #15](https://github.com/lithuio/specbridge/issues/15)。负责人已批准总体工程规划、七项只读 API、capabilities、保守 Audit 白名单、真实 Dashboard、OpenAPI/生成类型和中文浅色视觉；最新要求改为 **B–H 各在新 Session 实施，精简重复验证，保留核心测试**。本轮只调整文档，不启动 B；后续明确启动 B 即沿用 A 基线，不重复请求例行批准。人工视觉结论尚未记录。

### 实际成果

- [增量读取契约](architecture/R07_READ_MODELS.md)：七 API 的权限、字段、筛选/排序/分页、历史定位；Audit 事件与 metadata 白名单；Dashboard 三类工作项和精确计数口径；必要详情能力与既有资格复用方案。
- [视觉规范](ux/R07_DESIGN.md)：语义 Tokens、App Shell、路由/布局、组件、响应式和关键交互。登录/Dashboard/项目详情的独立 HTML/CSS/JS 原型，明确标记示例，**不接入生产路由、不代表真实业务实现**。
- [评审材料与证据](ux/prototypes/r07/README.md)：实际 Chromium 渲染 9 张截图；桌面/手机三页、Developer/Client Dashboard、手机导航。提供可重现验证脚本与初轮失败记录。
- [R07 总规划与核心交接](engineering/R07_PLAN.md)：A–H 范围、实时进度、最少阅读、核心安全事实、精简验证、交接模板及七份独立 Session 提示词；B–H 尚未执行。
- 文档索引、API/线框入口已更新。没有修改 apps 生产代码、项目依赖、Schema、Migration、认证、Rewrite 或数据库。没有 Commit/Push/PR/Merge/部署。

### 实际验证

| 状态 | 命令/检查 | 结果与边界 |
|---|---|---|
| PASS | `node --check docs/ux/prototypes/r07/prototype.js` | 设计交互脚本语法有效 |
| PASS | `node --check docs/ux/prototypes/r07/verify.mjs` | 原型验证脚本语法有效 |
| PASS | `R07_BROWSER_TOOLS=/tmp/specbridge-r07-browser PLAYWRIGHT_BROWSERS_PATH=/tmp/specbridge-r07-browsers node docs/ux/prototypes/r07/verify.mjs` | 沙箱外；40 项原型检查、0 axe A/AA 规则违规、9 张实际截图；三页×五宽度、Tab/Drawer 焦点、桌面/平板折叠、角色样例、十组 Token 对比度；无 API/外网请求 |
| PASS | 截图图像自检 | 中文、留白、表格/状态/下一步层级、手机重排无明显重叠截断；不代替负责人主观视觉验收 |
| PASS | `git diff --check`、本轮文档链接及原型文本空白检查 | 引用可解析、无 diff 空白问题；生产目录和依赖保持未改 |
| NOT RUN | R01–R06 回归、真实 API/DB 浏览器 E2E、生产构建、远程 CI | 本阶段只改文档及独立原型，未启动 API、Next 或数据库；不继承宣称本轮通过 |
| NOT RUN | Firefox/WebKit、屏幕阅读器、原生200%缩放、生产 HTTPS/Cookie | 留后续真实 Web 验收，不声称完整 WCAG 合规 |

失败与修正：工具下载/本地监听被沙箱 EPERM 阻止，获授权使用 /tmp 工具和本机临时端口；修正 axe package exports 的版本读取。初轮浏览器检查发现手机 Drawer 连续 Tab 末尾逃出模态内容，保留 `verification-initial.json`；补焦点循环后通过。图像检查后修正 Sidebar 视口位置、平板展开行为，并移除 Dashboard 契约没有的工时/问题正文样例。最终机器证据见 `ux/prototypes/r07/evidence/verification.json`。临时浏览器和验证服务已由脚本关闭。

### 停点与下一步

- 下一步：在新 Session 使用 R07_PLAN 第9节的 B 提示词，执行只读 API、capabilities 与契约生成。本轮不开始 B。H-09 保留人工视觉结论未记录，不作为重复实施审批门槛。
- 本轮规划调整仅修改文档；C–G 按受影响范围做检查、代表性真实浏览器流程和少量截图，H 集中全量回归；权限/隔离/并发核心检查保持。实际文档验证见 R07_PLAN 的本轮交接。
- 已在 Git 历史确认 R06 合并提交；下方“未提交”等为历史检查点。H-04/06/07/08 仍保留原人工审核状态，不根据 Git 合并推断评审完成。
- R07 授权明确本阶段的中文/浅色和 P1 边界；既有 D-07/D-08 等不在本次解决范围，未静默更改。
- 建议提交摘要（仅建议）：`docs(r07): define read contracts and visual review prototypes (#15)`。

---

## R06 Delivery & Acceptance — 历史检查点

分支 `feat/13-delivery-acceptance`，基线 HEAD `ad7c37d`，[Issue #13](https://github.com/lithuio/specbridge/issues/13)。负责人已批准只读规划并明确要求实施；开始时工作区干净。Git 历史已包含 R01～R05，下方 R05“未提交”仅为当时检查点。

**状态：API-28～30、方案 A、完整交付历史、权限与事务审计、本地验证完成；共 240 项测试通过。待 H-08 人工安全/并发 Review 及获授权后的远程 CI/PR。未提交、推送、合并或部署。**

### 已完成

- 新增 Deliveries 模块及三接口：Owner/项目 Developer 提交，Client 一次终审，退回新建下一编号，Accepted 后禁止继续交付。分页返回全部 Version 的 Delivery 和对应 Review；读取使用只读 REPEATABLE READ。
- 资格检查当前 APPROVED CR、active/最高 Version、Revision 归属及同版双方合法 APPROVED；不因后续 Requirement 修订使旧批准交付失效。输入限制 HTTPS/文本/证据数组、拒绝身份/Version/expectedVersion 注入，复用 Session/CSRF/Project Policy。
- 方案 A 无 Delivery lockVersion/expectedVersion。共享 Workspace→Project→Requirement→CR→Delivery 行锁，锁后验证父链与角色；Review INSERT、SUBMITTED 条件 UPDATE、AuditWriter 同 tx。实际 23505 只在回滚后安全映射；审计失败无残留，创建失败不消耗 deliveryNo；CR/Requirement 版本不变。
- 新增 33 项单元、24 项真实 PostgreSQL 集成、6 项 HTTP 矩阵与 1 项编译 API/Next Rewrite 测试；保留全部 R01～R05 回归。CI database job 顺序增加 test:e2e:deliveries。
- 同步 API/数据/状态机/安全/ADR/验收/测试和开发文档。无新增依赖、Schema 或 Migration；既有 SQL/snapshot 与 HEAD 逐字节一致。Auth、既有领域生产逻辑和 Web/Next Rewrite 未改（ChangesModule 仅导出 Repository）；受跟踪构建缓存已恢复。

### 实际验证

所有数据库测试仅使用 5434 `specbridge_test` 隔离库/角色，沿用 `/tmp/specbridge-r01-test-host.yml`。openTestDatabase 校验身份并应用既有已审核迁移；未读取开发 .env、未访问开发/生产数据。

| 状态 | 实际命令/检查 | 结果 |
|---|---|---|
| PASS | `pnpm --filter specbridge-api test` | 9 文件、92 单元测试 |
| PASS | `TEST_DATABASE_URL=<隔离库> pnpm --filter specbridge-api test:integration` | 8 文件、90 PostgreSQL 测试，包含真实并发及 R01～R05；沙箱外 |
| PASS | `TEST_DATABASE_URL=<隔离库> pnpm --filter specbridge-api test:e2e` | 3 文件、5 基础 HTTP 回归 |
| PASS | `TEST_DATABASE_URL=<隔离库> pnpm --filter specbridge-api test:e2e:auth` | 2 文件、16 认证/转发头/代理回归 |
| PASS | `TEST_DATABASE_URL=<隔离库> pnpm --filter specbridge-api test:e2e:rbac` | 2 文件、13 权限/UUID/代理回归 |
| PASS | `TEST_DATABASE_URL=<隔离库> pnpm --filter specbridge-api test:e2e:requirements` | 2 文件、9 需求/代理回归 |
| PASS | `TEST_DATABASE_URL=<隔离库> pnpm --filter specbridge-api test:e2e:changes` | 2 文件、8 审批/代理回归 |
| PASS | `TEST_DATABASE_URL=<隔离库> pnpm --filter specbridge-api test:e2e:deliveries` | 2 文件、7 交付 HTTP/代理测试 |
| PASS | `pnpm --filter specbridge-api typecheck`、`pnpm run lint` | 类型检查、API/Web lint，无警告 |
| PASS | `pnpm run build` | 干净缓存 API/Web 完整构建；沙箱外 |
| PASS | `pnpm --filter specbridge-api db:check`、`git diff --check`、历史文件逐字节比较 | 迁移元数据、空白、历史 Schema/SQL/snapshot 保持 |
| PASS | 测试 Compose down | 本轮创建的临时测试容器已停止并移除，不删除开发卷 |
| NOT RUN | 远程 CI、人工安全/并发 Review、完整浏览器/生产验收 | 不据此宣称 Issue 全部 DoD 或全部 P0 完成 |

已处理失败：首次数据库套件因沙箱 connect EPERM 未执行用例，获准沙箱外重跑通过。完整 Web 构建因 Turbopack 内部端口权限失败，首次沙箱外重跑仍复用失败缓存；保留缓存至 `/tmp/specbridge-r06-build-cache-n4nqw1iu/next` 后完整构建通过，未修改 Web。两条输入校验 lint 警告通过等价的逐字符控制码检查解决，单元、类型和 lint 重新通过。HTTP 中安全 500 日志为故意注入 AuditWriter 失败，回滚断言通过。

本地日志：`/tmp/specbridge-r06-integration-final.log`、`/tmp/specbridge-r06-e2e-final.log`、`/tmp/specbridge-r06-e2e-{auth,rbac,requirements,changes,deliveries}-final.log`、`/tmp/specbridge-r06-build-clean.log`。日志只作本机证据，不保证跨机器持久化。

### 边界与下一步

- AC-13/14/27 及三个端点 AC-05/16 有本地 API/数据库证据；AC-15 仍仅审计写入，无完整前端或审计查询。
- DeliveryReview 有数据库不可变触发器；Delivery 内容保护依赖无公开改删入口及受限 Repository，不承诺任意直接 SQL 防篡改。继续保留 Workspace 级写串行化限制。
- H-08：负责人审查锁序、父链授权、批准证据、唯一冲突处理、并发和审计回滚；无新增 SQL 审批任务。后续提交/推送/远程 CI/PR/合并须按授权流程，不自动执行。
- 建议提交/PR：`feat(deliveries): add approved-version delivery and client acceptance (#13)`。

---

## R05 ChangeRequest & Approval — 历史检查点

分支 `feat/11-change-request-approval`，基线 HEAD `06ce706`，[Issue #11](https://github.com/lithuio/specbridge/issues/11)。负责人批准完整规划并要求实施；初始工作区干净。R04 已出现在 Git 合并历史，下方 R04 的“未提交”只代表当时检查点。

**状态：API-21～27、共享锁/授权、不可变快照、顺序审批、事务审计及本地验证完成；176 项测试通过。待人工安全/并发 Review 和获授权后的远程 CI。未提交、推送、合并或部署。**

### 已完成

- 创建最新 Ready Revision 的 NULL 商业草稿、严格输入校验和精确金额/工时转换、详情与历史分页、Draft PATCH、Submit、Owner/Client 决策、Rejected 重开再提交新 Version；Approved 为终态。
- 负责人确认 CR lockVersion 初始 0 / expectedVersion 非负，Requirement 保持初始 1。每次成功 CR 写恰好推进一次，stale/错误状态/业务失败无副作用。所有身份/时间/父链/active Version 来自 Session 或数据库。
- 复用 Workspace → Project → Requirement → CR FOR UPDATE 协议和锁后授权；条件 UPDATE 匹配父项/状态/版本/active pointer。真实 Submit 与 Client 更换、Revision 创建双顺序竞争已验证；不增加每需求单 CR 限制。
- Client 不返回任何商业 draft；全部正式快照及双方审批评论可见。详情在只读 REPEATABLE READ 中授权与投影；引用旧 Revision 的冻结内容保持可查。
- Approval/Version 仅 INSERT；重开保留旧 active pointer，但 DRAFT 禁止审批。新提交使用 MAX(versionNo)+1，不继承旧决定。六类审计同 tx，任何失败整体回滚；metadata 不写商业正文、金额或评论。
- 新增 24 个 DTO 单元用例、19 个真实 PostgreSQL 集成用例、7 个 HTTP 矩阵与 1 个编译 API/Next Rewrite 用例；CI database job 顺序增加 test:e2e:changes。API/数据/状态机/安全/ADR/验收/测试文档同步。
- 无新增依赖/Schema/Migration。0000～0003 SQL/snapshot、Auth、R03/R04 生产模块和 Web/Next Rewrite 未改；构建产生的 tracked tsbuildinfo 已恢复。

### 实际验证

数据库命令显式使用 5434 `specbridge_test` 隔离库/角色；沿用 `/tmp/specbridge-r01-test-host.yml`，未访问开发/生产库，未改变标准 Compose。

| 状态 | 实际命令/检查 | 结果 |
|---|---|---|
| PASS | `pnpm --filter specbridge-api test` | 8 文件、59 单元测试 |
| PASS | `TEST_DATABASE_URL=<隔离库> pnpm --filter specbridge-api test:integration` | 7 文件、66 PostgreSQL 测试，含 R01～R04 回归；沙箱外 |
| PASS | `TEST_DATABASE_URL=<隔离库> pnpm --filter specbridge-api test:e2e` | 3 文件、5 基础 HTTP 回归；沙箱外 |
| PASS | `TEST_DATABASE_URL=<隔离库> pnpm --filter specbridge-api test:e2e:auth` | 2 文件、16 认证/转发头/代理回归；沙箱外 |
| PASS | `TEST_DATABASE_URL=<隔离库> pnpm --filter specbridge-api test:e2e:rbac` | 2 文件、13 权限/UUID/代理回归；沙箱外 |
| PASS | `TEST_DATABASE_URL=<隔离库> pnpm --filter specbridge-api test:e2e:requirements` | 2 文件、9 Requirement/代理回归；沙箱外 |
| PASS | `TEST_DATABASE_URL=<隔离库> pnpm --filter specbridge-api test:e2e:changes` | 2 文件、8 R05 HTTP/代理测试；沙箱外 |
| PASS | `pnpm --filter specbridge-api typecheck`、`pnpm run lint` | 含测试的类型检查、API/Web lint，无警告 |
| PASS | `pnpm run build` | 干净缓存 API/Web 完整构建；沙箱外 |
| PASS | `pnpm --filter specbridge-api db:check`、`git diff --check`、历史 SQL 哈希/Schema diff | 迁移元数据、空白及历史文件保持检查 |
| PASS | 测试 Compose down、docker ps | 本轮临时测试容器已移除；5433 开发容器仍 healthy，未访问开发数据 |
| NOT RUN | 远程 CI、人工 Review、完整浏览器/生产验证 | 未推送/部署，不据此完成 Issue 全部 DoD |

已处理失败：数据库沙箱 connect EPERM 导致首轮集成和 R05 HTTP 套件未执行，获准沙箱外通过。最终新增读取一致性测试曾有 TS2345：把返回 Drizzle 查询对象的方法 mock 为 Promise；改为在异步授权方法设置屏障，类型检查与完整 66 项集成重新通过，未改生产逻辑。两条测试排序 lint 警告已补数值比较器。Web 沙箱构建因内部端口 EPERM 失败，首次沙箱外重跑复用失败缓存；缓存保留于 `/tmp/specbridge-r05-build-cache-z4xu4nj3`，干净缓存完整构建成功。

可用本地日志：`/tmp/specbridge-r05-integration-final.log`、`/tmp/specbridge-r05-{base,auth,rbac,requirements,changes}-e2e.log`、`/tmp/specbridge-r05-build-clean.log`。日志属于本地验证证据，不保证跨机器持久化。R05 E2E 中一条安全 500 日志来自故意注入 AuditWriter 失败，用例断言回滚成功。

### 边界和下一步

- 同 Workspace 写串行化是既有吞吐量限制；无 RLS，任意直接 SQL 不属于完整领域授权保证。HTTP 金额仅安全整数，异常超界存量安全失败、不自动修复。
- AC-09～12/22～25 和七接口权限有本地证据；AC-15 仍仅审计写入，未实现审计查询、Delivery、完整前端、AI 或 MCP。
- H-07：负责人安全/并发 Review；后续远程 CI/提交/PR 需独立授权，无新增 SQL 审批任务。
- 建议提交/PR：`feat(changes): add immutable submissions and sequential approvals (#11)`。

---

## R04 Requirement & Revision — 历史检查点

分支 `feat/9-requirement-revision`，基线 HEAD `e80e657`，[Issue #9](https://github.com/lithuio/specbridge/issues/9)。负责人明确回复“已审批”，H-05 解除；执行前复核 0003 SHA-256 `73d3b4839fdc64f43a420a4cf4bd15f2923e194a014a86d174a205ddd4695d68` 一致。

**状态：8 个 API、事务授权/审计、并发控制及本地验证完成；125 项测试通过，等待人工安全/并发 Review 和后续获授权的远程 CI。未提交、推送、合并或部署。**

### 已完成

- API-13～20：需求创建/项目列表/详情/DRAFT 作者或 Owner 编辑；项目成员问答；Owner/Developer 不可变 Revision 和 Ready；历史分页。输入边界、未知字段、Session/CSRF、no-store、安全错误及 UUID 规范化延续现有约定。
- draft_version 持久化并映射 draftVersion；4 个已有需求写接口统一 expectedVersion，每次成功只加 1。行锁和条件 UPDATE 配合，stale/非法状态/业务失败无副作用。版本耗尽返回 422，不溢出。
- 所有问题必答；ANSWER 只引用同需求 QUESTION。READY 禁止问答；新 Revision 使状态回到 CLARIFYING。Ready 检查最高编号与最新指针、非空正文/验收标准、全部问题已答。
- AuthorizationRepository 增加共享 projectWrite，复用 R03 Policy，Workspace → Project → Requirement 锁后重新授权。读取用只读 REPEATABLE READ 快照。所有领域写入与 AuditWriter 共用 tx；事件只记录 ID、版本、字段名和状态，不记录正文。
- 新 Revision 在锁内分配编号、检查本需求全部 Pending CR，原子更新指针/状态/聚合版本。未来 Submit 锁协议双顺序验证采用明确标注的 SQL fixture，不宣称 R05 已实现。
- 已批准 0003 在 5434 隔离 PostgreSQL 应用；存量升级、历史不可变、重复迁移、旧数据保留验证通过。无新增依赖，无 Auth/Next Rewrite 修改，0000–0002 SQL/snapshot 未变。
- 新增 3 单元、18 领域集成、1 升级迁移、8 HTTP 矩阵与 1 代理 smoke；异常码测试扩展。新增 requirements E2E script/config，CI database job 增加顺序执行项。架构/API/安全/验收/测试文档同步。

### 实际验证

数据库命令显式设置 `TEST_DATABASE_URL` 为 5434 专用 specbridge_test 角色/库，不回退开发配置；沿用 `/tmp/specbridge-r01-test-host.yml`，未修改仓库 Compose 或修复宿主端口转发问题。

| 状态 | 实际命令/检查 | 结果 |
|---|---|---|
| PASS | `pnpm --filter specbridge-api test` | 7 文件、35 项单元测试 |
| PASS | `TEST_DATABASE_URL=<隔离库> pnpm --filter specbridge-api test:integration` | 6 文件、47 项 PostgreSQL 测试，含 R01–R03 回归；沙箱外 |
| PASS | `pnpm --filter specbridge-api test:e2e` | 3 文件、5 项基础 HTTP 回归；沙箱外 |
| PASS | `TEST_DATABASE_URL=<隔离库> pnpm --filter specbridge-api test:e2e:requirements` | 2 文件、9 项真实 HTTP/编译 API + Next Rewrite；沙箱外 |
| PASS | `TEST_DATABASE_URL=<隔离库> pnpm --filter specbridge-api test:e2e:auth` | 2 文件、16 项，保留全部转发头限流回归；沙箱外 |
| PASS | `TEST_DATABASE_URL=<隔离库> pnpm --filter specbridge-api test:e2e:rbac` | 2 文件、13 项，含 R03 UUID 回归；沙箱外 |
| PASS | `pnpm --filter specbridge-api typecheck`、`pnpm run lint` | API 类型与 API/Web lint |
| PASS | `pnpm run build` | API/Web 完整构建，保留失败缓存后沙箱外通过 |
| PASS | `pnpm --filter specbridge-api db:check`、`git diff --check`、SQL 哈希及旧 snapshot 比较 | 迁移元数据/空白/历史文件检查 |
| PASS | 隔离库只读核对 | PostgreSQL 17.11、specbridge_test 库/角色、4 条迁移；draft_version DEFAULT 1 NOT NULL |
| PASS | 测试 Compose down、docker ps | 已移除本轮测试容器；5433 开发容器仍 healthy，未访问开发数据 |
| NOT RUN | 远程 CI、人工安全/并发 Review、浏览器/生产验证 | 未推送/部署，不能据此宣称 Issue 全部 DoD 完成 |

已处理失败：沙箱数据库 connect EPERM，集成 47 项和 R04 HTTP 9 项当次未执行，获准沙箱外重跑；首次真实集成 45 PASS / 2 FAIL 为新测试的 text/uuid 审计查询比较错误，补显式 text cast 后 47 PASS，未改生产逻辑掩盖失败。Web 构建沙箱端口权限失败，首次沙箱外重跑仍复用失败缓存；缓存保留于 `/tmp/specbridge-r04-build-cache-688nmga3/next` 后完整构建通过，未修改 Web 代码。构建产生的 tracked tsbuildinfo 已恢复。

### 边界与交接

- H-05 完成；H-06 人工安全/并发 Review 待完成。未来 R05 必须共享 Workspace → Project → Requirement → CR 锁序，否则无法依赖当前 Pending 检查防竞态。
- 同 Workspace 写入串行，适合当前小团队范围；无 RLS，任意直接 SQL 不属于 API 授权保证。Clarification 无公开改删入口；Revision 数据库触发器保留。
- AC-06/07/08/25 及新端点 AC-05/16 获得本地 API/DB 证据；AC-15 仅审计写入，AC-09 仅 Ready 前置。无审计查询、R05 审批、前端页面或全 P0 完成声明。
- 建议提交/PR：`feat(requirements): add clarification and immutable revisions (#9)`。下一步为负责人 Review 与后续授权的提交/远程 CI，不自动执行。

---

## R04 Requirement & Revision — SQL 审阅检查点（历史，H-05 已解除）

分支 `feat/9-requirement-revision`，基线 HEAD `e80e657`（已含 R03 合并），[Issue #9](https://github.com/lithuio/specbridge/issues/9)。开始时工作区干净。负责人批准实施计划；本轮完成契约落地和迁移生成，按“生成 SQL 后先暂停供人工审核”停在 H-05，**R04 业务 API 尚未实现**。

- 已确认并记录：PATCH/问答/Revision/Ready 统一 expectedVersion；每次成功写入推进 draftVersion；READY 禁止问答，先由 Owner/Developer 创建 Revision 重开澄清；所有问题必答，合法 Answer 存在即已答。细节见 API、STATE_MACHINES、DATA_MODEL、ADR-003；安全/验收/测试文档同步标明待实现。
- Schema 新增 requirements.draftVersion；生成 `0003_requirement_draft_version.sql` 和 snapshot/journal。SQL 只有新增 integer NOT NULL DEFAULT 1 列和正数 CHECK。旧行从 1 开始，不重写历史内容或推算旧版本。
- 新 SQL SHA-256：`73d3b4839fdc64f43a420a4cf4bd15f2923e194a014a86d174a205ddd4695d68`。0000–0002 SQL 哈希与原批准记录一致；旧 snapshot 与 HEAD 逐字节一致。新 snapshot 与旧版规范化比较仅多该列及 CHECK，prevId 正确。

| 状态 | 实际命令/检查 | 结果 |
|---|---|---|
| PASS | `pnpm --filter specbridge-api exec drizzle-kit generate --name=requirement_draft_version` | 离线生成 0003；不连接数据库 |
| PASS | `pnpm --filter specbridge-api db:check` | 迁移元数据有效，不代表 SQL 已执行 |
| PASS | `pnpm --filter specbridge-api typecheck` | Schema 及现有代码/测试类型检查 |
| PASS | `pnpm --filter specbridge-api test` | 6 文件、32 项现有单元测试；不是 R04 功能验收 |
| PASS | `pnpm --filter specbridge-api lint` | API 类型感知 lint |
| PASS | snapshot 结构差异与历史 SQL/snapshot 比较、`git diff --check` | 无额外 Schema 改动或空白错误 |
| BLOCKED | H-05 新 SQL 人工审核 | 未获批准，不执行迁移 |
| NOT RUN | PostgreSQL 集成、HTTP/代理 E2E、完整构建、远程 CI | 数据库测试初始化会自动应用迁移，必须等 H-05；本轮无业务/前端改动，未运行完整构建 |

下一步：负责人审核 H-05；批准后核对 SQL 哈希，继续共享项目写锁/授权、AuditWriter/错误码扩展、Requirements 模块与 8 接口，再在隔离 PostgreSQL 验证迁移、领域并发/回滚、HTTP 权限矩阵及 R01–R03 回归。统一锁序 Workspace → Project → Requirement → CR；未来 Submit 必须共享 Requirement 锁，协议 fixture 不代表 R05 已实现。

本轮未安装依赖、连接/迁移数据库、提交、推送、合并或部署。无新增业务测试文件；迁移批准前保留明确停止点。建议本检查点提交摘要：`feat(requirements): define R04 contract and add draft version migration`（未执行提交）。

---

## R03 P2 UUID 修复（历史检查点）

基线 HEAD `c32b43a`，分支 `feat/7-workspace-project-rbac`，Issue #7。开始时工作区干净。本轮仅修复 Review 指出的 Developer 分配响应缺失问题，无 Commit/Push/Merge。

- 根因：IsUUID 接受合法的大写/混合大小写 UUID，PostgreSQL 按 UUID 查询并返回小写；Service 将原始 targetId 与返回 userId 严格比较，导致已写入成员/审计却返回 undefined data。非空断言不会进行运行时检查。
- 最小修复：ProjectsService.add 入口将 targetId 转为小写，查询、写入、审计 metadata、响应查找统一身份表示；HTTP 和内部 Service 调用均覆盖。没有修改权限、Workspace → Project 锁序、事务、Schema、SQL 或 R02。
- 相关路径审计：Workspace/Client 的字符串身份比较使用数据库规范 ID，授权 userId 来自 Session；Project/Workspace 请求 ID 在 SQL UUID 比较中处理。没有发现同类外部 UUID 导致响应缺失路径，未扩大重构。
- 新增 3 个真实 PostgreSQL 参数化用例与 4 个 HTTP 用例：大写/小写/混合首次分配，再以小写、混合、大写重试；断言完整 data、首次 201/重试 200、单成员/单审计；不存在用户/未加入 Workspace 的用户 422、无管理权 403、不可见 404、非法 UUID 400 均保留。固定 ab 前缀确保实际覆盖大小写，不依赖随机 UUID 是否带字母。

| 阶段/状态 | 实际命令 | 结果 |
|---|---|---|
| RED / FAIL（预期） | `TEST_DATABASE_URL=<隔离库> pnpm --filter specbridge-api test:integration` | 3 FAIL / 25 PASS；生产代码尚未修复，失败为缺失 data |
| RED / FAIL（预期） | `TEST_DATABASE_URL=<隔离库> pnpm --filter specbridge-api test:e2e:rbac` | 3 FAIL / 10 PASS；响应状态成功但 data undefined，数据库成员/审计计数断言通过 |
| GREEN / PASS | 上述相同集成命令 | 28/28 |
| GREEN / PASS | 上述相同 RBAC HTTP/代理命令 | 13/13 |
| PASS | `pnpm --filter specbridge-api test` | 32/32 单元测试 |
| PASS | `TEST_DATABASE_URL=<隔离库> pnpm --filter specbridge-api test:e2e:auth` | 16/16，含 R02 转发头限流回归 |
| PASS | `pnpm --filter specbridge-api typecheck` | 类型检查 |
| PASS | `pnpm run lint` | API/Web，无警告 |
| PASS | `pnpm run build` | API/Web 完整构建；沙箱外，无需清缓存 |
| PASS | `pnpm --filter specbridge-api db:check`、`git diff --check` | 元数据和 diff 空白检查；未新增 SQL |
| NOT RUN | 远程 CI、人工复审、生产验证 | 本轮未推送或部署 |

共 89 项测试通过。生产修复前后新增回归测试保持一致；RED 阶段 fixture 曾先改用独立随机 UUID 后缀避免与已有 fixture ID 碰撞，再重新运行集成 RED。原始输出保留于 `/tmp/specbridge-r03-uuid-{integration,http}-{red,green}.log`，R02 输出 `/tmp/specbridge-r03-uuid-auth-green.log`，构建 `/tmp/specbridge-r03-uuid-build.log`。

数据库/HTTP 测试仅在 5434 专用 PostgreSQL 17 测试实例运行，沿用已批准的现有迁移和已记录 host 网络覆盖；没有访问开发库。无已知待修复失败；仍需负责人复审和后续授权的远程 CI。建议提交：`fix(rbac): normalize developer UUID before member assignment response`。

- PASS：本轮 specbridge-test 临时容器已关闭并移除；随后核对 5433 开发数据库仍 healthy。构建产生的 tracked tsbuildinfo 已恢复，最终仅 4 个修复相关文件有 diff。

---

## R03 初始实现记录（历史）

[Issue #7](https://github.com/lithuio/specbridge/issues/7)，分支 `feat/7-workspace-project-rbac`，基线 HEAD `8b89880`（R02 合并提交）。开始时工作区干净，当前实现和文档改动未提交；本轮无 Commit/Push/Merge/部署。

**状态：后端实现及本地验证完成，87 项测试通过；等待人工安全/PR Review 与后续授权的远程 CI。未新增迁移，未改开发库。**

### 已完成

- 9 个 Workspace/Project API；Workspace + 唯一 Owner + 审计原子创建；Developer 成员管理/项目分配；Client 唯一绑定及提交前更正。
- 服务端按真实父链和 membership 授权；Owner 全空间项目，Developer 双 membership，Client 仅绑定项目。跨资源 404、可见对象无管理权 403；列表 SQL 先授权再分页。
- Workspace → Project 行锁协调正反双向角色冲突和并发分配；历史 Version 决定 Client 锁定；同账号重试无副作用；业务写入和审计同事务。
- baselineScope 非空输入检查并沿用 R01 不可变触发器；错误码白名单及安全响应字段；/me 仅用户。
- 新 RBAC HTTP/Next Rewrite E2E、集成/单元测试及 CI PostgreSQL job；API、ADR、安全/数据/架构、测试策略同步已确认契约。
- 无新增依赖、Schema、SQL、认证体系或 Web 页面；Auth、configure-app、Web Rewrite 与 schema 无 diff。0000/0001/0002 SHA-256 与此前审批记录一致。

### 本轮验证证据

数据库命令显式使用隔离 `TEST_DATABASE_URL`，不回退开发 DATABASE_URL；真实 PostgreSQL 17 临时实例位于 5434，测试库/角色双重校验。沿用已记录的 `/tmp/specbridge-r01-test-host.yml`，未重新宣称本机标准 Docker 端口转发问题已解决。

| 状态 | 实际命令 | 结果 |
|---|---|---|
| PASS | `pnpm --filter specbridge-api test` | 6 文件、32 单元测试 |
| PASS | `TEST_DATABASE_URL=<隔离库> pnpm --filter specbridge-api test:integration` | 4 文件、25 项，含 R01/R02 和新增 9 项 RBAC；沙箱外 |
| PASS | `pnpm --filter specbridge-api test:e2e` | 3 文件、5 项基础 HTTP 回归；沙箱外 |
| PASS | `TEST_DATABASE_URL=<隔离库> pnpm --filter specbridge-api test:e2e:auth` | 2 文件、16 项；完整保留 6 项伪造转发头限流回归；沙箱外 |
| PASS | `TEST_DATABASE_URL=<隔离库> pnpm --filter specbridge-api test:e2e:rbac` | 2 文件、9 项；真实 HTTP 与编译 API + Next Rewrite；沙箱外 |
| PASS | `pnpm --filter specbridge-api typecheck` | 生产代码和测试类型检查 |
| PASS | `pnpm run lint` | API/Web，无警告；已修正新测试的数值排序警告 |
| PASS | `pnpm run build` | 完整 API/Web 构建；干净缓存、沙箱外 |
| PASS | `pnpm --filter specbridge-api db:check` | 迁移元数据检查，无新增迁移 |
| PASS | `git diff --check`、旧迁移哈希检查 | 空白检查；历史 SQL 哈希不变 |
| NOT RUN | 远程 CI、人工安全/PR Review、真实浏览器/生产验证 | 本轮未推送或部署；不宣称 Issue 全部 DoD 完成 |

处理过的失败：首轮 typecheck 发现 Drizzle 只读参数应为 accessMode、Supertest body 类型不能为 unknown，修复后通过。沙箱内数据库测试 connect EPERM（25 项未运行）、基础 HTTP listen EPERM（5 项失败）；获准沙箱外重跑通过。Web 首次构建受 Turbopack 内部端口权限限制，沙箱外首次重跑仍复用失败缓存；将旧 .next 保留至 `/tmp/specbridge-r03-build-cache-f35gjbrt/next` 后重新构建通过。未修改 Web 代码解决环境问题。

- PASS：`docker compose -f infra/compose.test.yml -f /tmp/specbridge-r01-test-host.yml down` 已关闭并移除本轮临时测试实例；随后 `docker ps` 确认 `specbridge-dev-db-1` 仍 healthy，端口 5433。代理子进程已由测试 teardown 关闭。
- PASS：最终 diff 核对 Auth、configure-app、Web、Schema、旧 SQL 和已跟踪 tsbuildinfo 无变化；构建产物已恢复，仅保留 R03 源码/测试/文档改动。

### 边界、风险和下一步

- 本轮不是完整 P0 验收：R03 历史 fixture/受控事务仅验证 Client 锁协议，不代表 Submit/审批执行；后续 Submit 必须先锁 Project，再校验 Client 并创建不可变 Version。
- 无 RLS，跨表职责分离由统一领域事务保证；任意直接 SQL 不在 API RBAC 保证内。成员配置写在同 Workspace 串行，适合当前小团队范围。
- 同一 Next Socket 出口共享认证限流配额的 R02 既有限制不变；不得重新信任可伪造转发头。
- H-04：负责人安全/PR Review 待完成；无新增 Migration 审批。建议提交/PR：`feat(rbac): add workspace and project scoped authorization (#7)`。

---

## R02 历史任务快照（以下保留原记录，非当前状态）

R02 — Authentication & Session，[Issue #5](https://github.com/lithuio/specbridge/issues/5)。R01 已有合并提交 `43343d3`，Issue #3 已关闭；之前“R01 尚未提交”是过期状态。本轮未重新核验远程 CI/Review。

**状态：R02 P1 转发头限流绕过已完成最小修复与本地验证。修复前 6 项回归真实失败；修复后全部 64 项测试及质量检查通过。当前分支 feat/5-auth-session，改动保留供审核，本轮未 Commit/Push/Merge。**

## R02 已实现内容

- 注册/登录/登出/me、Argon2id、SHA-256 摘要 Session、事务轮换、7 天绝对与 24 小时空闲期限。
- 默认认证 Guard、Public 路由、Origin/自定义头/Fetch Metadata CSRF、环境 Cookie、有界单实例限流、共享启动配置、统一错误和敏感日志保护。
- /me 仅用户；重复注册通用 409；单实例内存限流均已由负责人确认。Workspace/Project RBAC、邮箱验证和密码重置不在范围内。
- 新增 `0002_session_activity.sql`：last_activity_at 回填 created_at，再设默认值与 NOT NULL。R01 两份 SQL/snapshot 未改；DatabaseModule 与 Web Rewrite 未改。
- 真实 PostgreSQL 集成、R01→R02 升级、真实 HTTP 和编译 API + Next Rewrite E2E 已执行通过；CI PostgreSQL job 已配置认证测试，远程结果尚未验证。

## R02 P1 修复检查点

- 基线 HEAD：`44d371c`，开始时工作区干净。当前 Next base-server 使用 `x-forwarded-for ??=` 保留已有头；两个认证限流入口优先使用 req.ip，loopback 代理信任使攻击者可改变桶身份。
- RED 已执行：`TEST_DATABASE_URL=<隔离测试库> pnpm --filter specbridge-api test:e2e:auth`，仅新增测试、尚未改生产代码时 6 FAIL / 10 PASS。Next 与 API 直连三种限流均可绕过（期望 429，注册实际 201、登录实际 401）。原始测试输出：`/tmp/specbridge-r02-xff-red.log`。
- 修复：只将 configure-app 与 AuthController 两处限流 IP 改为 socket.remoteAddress；保留现有 trust proxy、限流阈值、Cookie/CSRF/Guard。同一 Next 出口的用户共享 IP 配额；真实客户端 IP 不用于限流。
- GREEN 已执行：相同 `test:e2e:auth` 命令，16/16 PASS，包含全部 6 项新增回归及原有 10 项。输出保存在 `/tmp/specbridge-r02-xff-green.log`；修复前后测试未修改。

| 状态 | 本轮命令 / 范围 | 实际结果 |
|---|---|---|
| FAIL（修复前，预期复现） | `TEST_DATABASE_URL=<隔离测试库> pnpm --filter specbridge-api test:e2e:auth` | 6 项新增回归失败、原有 10 项通过；生产代码未修改时执行 |
| PASS（修复后） | 同一 `test:e2e:auth` 命令 | 16/16，含 Next Rewrite + trust loopback、直连、Cookie/CSRF/login/logout |
| PASS | `pnpm --filter specbridge-api test` | 27/27 单元测试 |
| PASS | `TEST_DATABASE_URL=<隔离测试库> pnpm --filter specbridge-api test:integration` | 16/16，含认证与 R01 数据库回归 |
| PASS | `pnpm --filter specbridge-api test:e2e` | 5/5 基础真实 HTTP 测试 |
| PASS | `pnpm --filter specbridge-api typecheck` | 类型检查 |
| PASS | `pnpm run lint` | API + Web，无警告 |
| PASS | `pnpm run build` | API + Web 完整构建（沙箱外运行，未再发生缓存失败） |
| PASS | `pnpm --filter specbridge-api db:check` | 迁移元数据检查；SQL/snapshot/schema 本轮无 diff，0000/0001/0002 哈希不变 |
| PASS | `git diff --check` | diff 空白检查，生成的 tracked tsbuildinfo 恢复 |
| NOT RUN | 远程 CI、安全渗透测试、生产验证 | 本轮未提交、推送或部署，不宣称远程验证通过 |

- 检查覆盖：注册第 6 次、同邮箱登录第 6 次、变化邮箱登录第 31 次在伪造不同转发头时均被限流，返回 429/RATE_LIMITED/Retry-After；阈值以内请求照常处理。数据库只使用 5434 专用临时实例及既有已批准迁移；开发库/生产环境未访问。
- 已知限制：同一代理 Socket 出口用户共用注册 5 次/小时、登录 30 次/15 分钟配额，存在相互限流/耗尽配额风险；IP+邮箱维度仍按邮箱分开。没有从未经验证的头恢复真实用户 IP。保留全局 trust proxy 的元信息语义，但认证安全判断不依赖它；将来增加依赖该元信息的安全功能需另行验证入口。
- PASS：已关闭并移除本轮 specbridge-test 临时容器，核对 specbridge-dev-db-1 仍 healthy（5433）。修复代码已完成，无待修复测试失败。下一步为负责人审阅本轮 diff；本轮未 Commit/Push/Merge。
- 建议修复提交：`fix(auth): key rate limits by socket peer to block spoofed forwarding headers`。

## R02 基础实现验证证据（P1 修复前）

| 状态 | 命令 / 范围 | 结果 |
|---|---|---|
| PASS | `pnpm --filter specbridge-api test` | 最终 5 文件、27 项单元测试，含真实 Argon2id 和错误脱敏 |
| PASS | `pnpm --filter specbridge-api test:e2e` | 3 文件、5 项真实 HTTP 测试；原 health/root + 默认保护/CSRF/DB 故障拒绝；无数据库连接 |
| PASS | `pnpm --filter specbridge-api typecheck` | 生产代码、测试和配置类型检查 |
| PASS | `pnpm run lint` | API/Web，无警告 |
| PASS | `pnpm run build` | API/Web 完整构建；沙箱/失败缓存问题处理后在沙箱外通过 |
| PASS | `pnpm --filter specbridge-api db:check` | 迁移元数据有效；不表示 SQL 已在数据库执行 |
| PASS | `git diff --check`、原 SQL SHA-256 | 空白检查；0000/0001 与审批记录一致 |
| PASS | `TEST_DATABASE_URL=<隔离测试库> pnpm --filter specbridge-api db:migrate:test` | 已批准的三份 SQL 在隔离 5434 实例应用成功；沙箱连接失败后获准在沙箱外运行 |
| PASS | `TEST_DATABASE_URL=<隔离测试库> pnpm --filter specbridge-api test:integration` | 3 文件、16 项通过，含全部 R01 回归与 R02 升级/Session 验证 |
| PASS | `TEST_DATABASE_URL=<隔离测试库> pnpm --filter specbridge-api test:e2e:auth` | 2 文件、10 项通过；真实 HTTP + 编译 API/Next Rewrite，Cookie/CSRF/logout 往返 |
| PASS | `TEST_DATABASE_URL=<隔离验证库> pnpm --filter specbridge-api db:migrate:verify` | 空库应用及重复迁移通过；中断后重新运行确认成功 |
| PASS | 隔离库只读核对 | PostgreSQL 17.11、specbridge_test 专用角色/库、3 条迁移；last_activity_at NOT NULL DEFAULT now() |
| NOT RUN | 真实浏览器/生产 HTTPS、外部 Observe 接收 | HTTP 响应与配置测试不能代替这些验收 |
| NOT RUN | 远程 CI / PR Review | 尚未提交、推送或创建 PR |

已处理失败：初次 typecheck 发现 Drizzle 不接受 expression index 作为 onConflict target，改为只捕获指定邮箱 unique constraint；修复测试类型后通过。HTTP E2E 在沙箱内因 listen EPERM 失败，获准在沙箱外重跑通过。完整构建首次因 Turbopack 本地端口权限失败，沙箱外复用了失败缓存；旧缓存已保存在 `/tmp/specbridge-r02-build-cache-thxifq8w/next`，新缓存构建通过。跨文件系统首次 rename 缓存失败，随后 move 成功。构建生成的已跟踪 tsbuildinfo 恢复，避免夹带缓存。

## 人工审核与下一步

- H-03：审核 `apps/api/drizzle/0002_session_activity.sql`，SHA-256 `236ecd64b2a7d1ea437ba48a09077107e8cb789a3cced16f5a7dd080a9839ee3`。负责人明确回复“已审核通过，可以继续进行”；SQL 哈希复核一致，H-03 审核阻塞已解除。
- 已完成全部本地验证，无待修复的测试失败。所有数据库命令仅操作 5434 的 specbridge_test / specbridge_dev_verify；开发库和生产库未访问。
- 本轮沿用已记录的隔离 host 网络覆盖 `/tmp/specbridge-r01-test-host.yml`，仅绑定 127.0.0.1:5434；未重新宣称标准 Docker 端口映射故障已修复。测试容器清理结果见下文。
- 下一步为获授权的提交/PR/远程 CI 与人工安全 Review；本轮未提交、推送、合并、生产迁移或部署。建议提交/PR 标题：`feat(auth): add database-backed authentication and session security (#5)`。
- 已知范围限制：限流为单实例内存、重启清零；/me 仅用户；注册 409 存在已接受的有限邮箱枚举风险；真实浏览器/生产 HTTPS/外部 Observe 接收仍待后续验收。
- PASS：`docker compose -f infra/compose.test.yml -f /tmp/specbridge-r01-test-host.yml down` 已关闭并移除本次测试容器；随后核对开发容器 specbridge-dev-db-1 仍 healthy，端口 5433。认证 E2E 已在 teardown 关闭其 API/Next 子进程。

## R01 历史验证记录（当时的执行快照）

以下保留 R01 实施时的证据与限制；其中“未提交/远程未运行/下一步”描述当时状态，当前合并状态以上方为准。

### 已有基线

- v0.2 产品/架构文档、AGENTS.md 和 GitHub 模板已在仓库中。
- Health Check & API Proxy 已出现在 Git 历史：`c64eb44 feat(api): add healthcheck and web proxy verification (#2)`。先前“尚未提交”的记录已过期；本轮未重新核验远程 PR Review/CI 结果。
- 保留无 DB/AI 依赖的 `/api/v1/health` 和原 `/`。Web 代理本轮未改；之前的手工代理验证记录及复现方法见 `engineering/DEVELOPMENT.md`。

### R01 已编写内容

- 15 表 Drizzle schema：UUID、外键/复合归属、唯一键、部分唯一 Client/Owner/待验收交付索引及 CHECK。
- `apps/api/drizzle/0000_database_foundation.sql`、`0001_immutable_history.sql` 和迁移元数据；四张历史表与初始范围触发器。已在两个隔离库应用；已审批 SQL 未修改。
- Nest DatabaseModule：延迟连接、事务入口、连接池关闭；不在应用启动时迁移。
- 独立 PostgreSQL 17 测试 Compose、端口 5434、tmpfs、目标校验、10 项集成用例；CI 增加 PostgreSQL job 和路由 E2E。实际 PostgreSQL 17.11 验证通过；本机 Docker 发布端口异常使用临时 host 网络覆盖绕行，详见下文。
- 文档记录约束责任和操作步骤。无新增依赖、无生产操作、未提交或推送。

### 本轮验证证据

| 状态 | 命令 / 范围 | 结果 |
|---|---|---|
| PASS | `pnpm --filter specbridge-api db:generate` | 初始 15 表迁移生成；再次生成报告无 schema 变化 |
| PASS | `pnpm --filter specbridge-api db:check` | 迁移元数据有效；不等于 SQL 已被 PostgreSQL 验证 |
| PASS | `pnpm run test`；后续 `pnpm --filter specbridge-api test` | 最终 3 文件、15 单元测试通过 |
| PASS | `pnpm --filter specbridge-api typecheck` | schema、配置、测试类型检查 |
| PASS | `pnpm --filter specbridge-api test:e2e` | 原有 2 项路由测试通过；沙箱 EPERM 后获准在沙箱外运行 |
| PASS | `pnpm run lint` | API + Web；已修复排序比较器警告 |
| PASS | `pnpm run build` | API + Web；沙箱失败及失败缓存问题处理后，在沙箱外成功 |
| PASS | `docker compose -f infra/compose.test.yml config --quiet` | 测试 Compose 配置语法；容器健康，标准端口映射的主机握手超时（见下文） |
| PASS | `node --check apps/api/scripts/migrate.mjs`、`git diff --check` | 脚本语法和 diff 空白检查 |
| PASS | `TEST_DATABASE_URL=<隔离测试库> pnpm --filter specbridge-api db:migrate:test` | 2026-11-08，已审查的两份 SQL 应用成功 |
| PASS | `TEST_DATABASE_URL=<隔离测试库> pnpm --filter specbridge-api test:integration` | 2026-11-08，1 文件、10 项通过，包括重复迁移保留数据、并发、触发器和事务回滚 |
| PASS | `TEST_DATABASE_URL=<隔离验证库> pnpm --filter specbridge-api db:migrate:verify`（执行两次） | 空库建立与重复运行通过；psql 核对 PostgreSQL 17.11、15 核心表、2 条迁移记录 |
| NOT RUN | 现有开发库/生产库迁移 | 本轮仅使用隔离实例，没有连接或修改现有开发库 |
| NOT RUN | 远程 CI / PR Review | 本轮未提交、推送或创建 PR |

首轮单元测试曾因测试构造 URL 时误替换用户名失败，已修正并重跑通过。Web 首次构建因沙箱端口限制失败，沙箱外重跑仍复用失败缓存；旧 `.next` 保留在 `/tmp/specbridge-r01-build-cache-0ee9_m9b/next`，新缓存构建通过。构建生成的已跟踪 tsbuildinfo 已恢复，避免夹带无关缓存修改。

2026-11-08：重新运行 `pnpm run test`、`typecheck`、`db:check`、`pnpm run lint`、`git diff --check` 通过。生产代码未改变，因此沿用上一轮 E2E/完整构建通过证据，未无意义重复构建。

### 本机数据库网络故障与实际验证环境

- FAIL（已定位）：标准 `db:test:up` 容器健康，但宿主 `127.0.0.1:5434` PostgreSQL 握手超时；容器内及容器 IP `172.19.0.2:5432` 可响应。首次迁移失败、集成套件初始化失败且 10 项未执行，不能把该次视为通过。
- 隔离实例采用 `/tmp/specbridge-r01-test-host.yml` 临时覆盖：移除 published ports、`network_mode: host`，PostgreSQL 仅监听 `127.0.0.1:5434`。未修改仓库标准 Compose、开发实例或系统防火墙。相同已审核 SQL 与相同测试随后全部通过。
- PASS：验证后执行 `pnpm run db:test:down`，已移除本次测试容器和测试网络；开发持久卷未操作。
- 精确覆盖配置和启动命令见 `engineering/DEVELOPMENT.md`。标准 Docker 端口转发在此机器上的问题仍存在，远程 CI service 网络尚未验证。
- 审批 SQL SHA-256：`0000` = `6d889c530d70c1544aa5755164a49683f2e54a7e9cd5f346da9f3b2a9c96f996`；`0001` = `8d225e656539733de64267a58b14b68b82c9c6198f167ac58a25d7bbc758f98f`。本轮未改 SQL。

### 已确认决定与剩余边界

- 商业评估 draft_* 可为 NULL，draft_requirement_revision_id 必填；冻结 Version 必填。
- 使用数据库触发器保护四张历史表和 baseline_scope；数据库管理员权限不在防篡改保证内。
- Requirement expectedVersion 缺少对应字段、Session 空闲失效活动时间设计：负责人确认延至对应功能任务处理。
- 跨表角色分离、Client 绑定锁定、Pending 禁止修订、审批顺序、Approved/Accepted 交付规则仍需后续领域事务与授权测试。本轮不是完整 P0 AC 验收。
- 约束责任见 `architecture/DATA_MODEL.md` 第 9 节；测试范围见 `engineering/TEST_STRATEGY.md`。

### 下一步

1. H-02 SQL 审批与本地数据库验证已完成。
2. 后续进入获授权的提交/PR/CI 流程；远程 CI 和人工 PR Review 通过后再完成 Issue DoD。
3. 本机 Docker 标准端口转发问题可单独排查；本轮不扩大到系统网络修改。禁止清空现有开发库或执行生产迁移。
