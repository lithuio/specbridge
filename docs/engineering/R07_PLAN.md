# R07 总规划与跨 Session 交接

> 核心交接入口。新 Session 先读本文件，再按阶段读取必要源码/契约；不依赖聊天历史。  
> 更新：2026-11-11。负责人批准总体规划后追加：**B–H 分别在新的 Session 实施，精简过程与重复验证，保留核心质量测试**。Phase D 已完成本地实施与验证；下一新 Session 执行 E。

## 1. 任务、范围和授权

- 项目 SpecBridge：面向小型软件团队的需求澄清、版本确认、商业审批与交付验收 SaaS。
- 主任务 [Issue #15 — R07 Web Integration & Dashboard](https://github.com/lithuio/specbridge/issues/15)。当前功能分支 `feat/15-web-integration`；Phase A 起始 HEAD `63d81aa`（包含 R06）。新 Session 必须核对实际分支/HEAD/diff，不能假定未变。
- **最终目标**：高质量中文 SaaS Web；Owner、Developer、Client 通过浏览器完成 R01–R06 P0 主链路，包含拒绝重提、退回重交、Dashboard/待办/历史/Audit；不需要 Postman，不用 Mock Dashboard 代替真实数据。
- 已批准技术栈：Next App Router、React/TypeScript、Tailwind、shadcn/Base UI、TanStack Query、React Hook Form/Zod、Playwright；Nest 模块化单体/PostgreSQL/Drizzle 保持。
- 已批准七项 GET、必要详情 capabilities、保守 Audit、状态推导 Dashboard、OpenAPI/前端生成类型；不新增业务写能力、表、Migration。
- 已批准视觉：中文、浅色中性、克制靛蓝、精致排版、响应式与基本 WCAG AA；深色非 P0。Phase A 原型为设计参考，不原样当作生产应用。
- 不做 AI/MCP P1、支付、文件上传、通知/任务分配系统、生产部署。无项目删除、成员移除、Owner 转移、Client 解绑、密码找回或邮件邀请等新增写范围。
- **禁止自动 Commit、Push、创建 PR、Merge、部署或破坏性数据库操作**。可实现当前被启动阶段的代码、依赖和必要测试；安装/监听等仍遵守运行环境权限。
- 用户发送第 9 节某阶段提示词，即授权按已批准基线执行该阶段；不重复询问总体范围或例行实施许可。阶段完成后写交接并结束 Session，不自动开始下一阶段。
- Phase A 已交付，未记录单独的人工视觉验收通过。用户后续明确启动 B 时可继续，不必重复要求 A 审批；这不等于虚构人工验收记录。安全/产品新歧义、必须新增数据库变更或与批准基线冲突时才停下报告。

## 2. 当前真实进度（每个 Session 必须更新）

| 阶段 | 当前状态 | 已有成果 / 下一步 |
|---|---|---|
| A 契约与视觉 | 已交付；人工视觉结论未记录 | 三份规格/计划、独立原型、9 张截图、40 项原型检查通过 |
| B 只读 API / 能力 / 契约 | COMPLETE（本地） | 七 GET、四类详情 capabilities、OpenAPI/生成类型/CI 漂移检查；真实 DB/HTTP 已验证 |
| C Web 基础 / 认证 | COMPLETE（本地） | 正式 Tokens/Shell、Typed Client、Query 隔离、认证；生产 Web/真实 API/隔离 DB 浏览器 6 场景通过 |
| D 项目 / 成员 | COMPLETE（本地） | Workspace/Project、两级成员、唯一 Client；真实浏览器准备与权限/锁定分支通过 |
| E 需求 / Revision | NOT STARTED | D 后实现问答、冻结规格、Ready |
| F 变更 / 审批 | NOT STARTED | E 后实现商业评估、顺序决定、拒绝重提 |
| G 交付 / Dashboard / Audit | NOT STARTED | F 后接通交付闭环和真实聚合 |
| H 最终集成 | NOT STARTED | G 后统一浏览器主流程、全量回归与视觉收尾 |

**实际代码状态**：R01–R06 后端源码已存在；apps/web 已有正式 `/login`、`/register`、`/app`，含 Tokens/Shell、Typed Client、会话生命周期与 Query 缓存隔离。当前 `/app` 展示真实账号信息、协作说明与项目入口；D 已有 `/app/projects`、空间/项目创建、项目详情/成员及供应方成员管理。业务聚合仍留 G。packages 为空。API 已实现七项读取与必要 capabilities；离线 Swagger 导出在 `apps/api/src/openapi`，契约为 `docs/architecture/openapi.json`，前端类型为 `apps/web/src/lib/api/generated/schema.d.ts`。现有 Vitest/HTTP/Next Rewrite 测试不是浏览器 E2E。

**依赖审计基线**：Web 本地 Next 16.4.3、React 19.3.0、TS 5.9.3、Tailwind 4.3.3、Base UI 1.9.0、shadcn 4.23.0、Query 5.105.0、Zod 4.6.7、RHF 7.91.0。这些是 Phase A 观察值，新 Session 用 package.json/根 lockfile 核对，不升级无关依赖。Web package name 为 `web`，API 为 `specbridge-api`。Web 子目录另有 lockfile/workspace 配置，优先沿用根工作区约定，不顺手清理。

**工作区连续性**：D 开工实际分支 `feat/15-web-integration`、HEAD `200c54f`、工作区干净。C 已由负责人提交在 `200c54f`；B 在 `544e4b8`，本地环境在 `9499618`。历史交接的“未提交”只描述当时。D 成果保留未提交；前阶段源码及 C 历史截图保留，不 stash/reset/clean，不自动 Commit/Push/PR。

**证据**：A 的 [verification.json](../ux/prototypes/r07/evidence/verification.json) 仅证明独立原型。B 的精确命令/结果见下方交接与 STATE：93 单元、90 DB 集成、9 R07 HTTP 契约场景，以及受影响 R03–R06 HTTP/代理回归通过；UTC 日期小修后另重跑 R03 12 项 DB 回归。C 新增证据：Web 生产构建、真实 Chromium/编译 API/隔离 DB 的 6 场景、R02 HTTP/Rewrite 16 项通过，B 契约漂移仍通过。截图见 [C evidence](../ux/evidence/r07-c/README.md)。D 新增 2 个真实浏览器场景，根入口分别启动 C 6/D 2 场景均通过；Web lint/typecheck、API/Web build 通过，3 张代表截图见 [D evidence](../ux/evidence/r07-d/README.md)。远程 CI/人工评审未运行。

**下个 Session 的第一步**：执行 E；先读本文件最新 D 交接、STATE、`apps/web/README.md`、`features/projects/{queries,project-detail,shared}.tsx/ts`、生成契约及 R04 API。核对 Git，保留 D 未提交成果；在已有 ProjectBoundary 下实现需求/Revision，复用 Session API、私有 keys、分页/表单与浏览器 fixture。当前机器临时浏览器库见 D evidence；本 Session 到 D 结束，不进入 E。

## 3. 最少必要阅读与权威来源

| 资料 | 何时读 / 内容 |
|---|---|
| 根及目标目录 AGENTS.md | 每次开始；安全、编码和 Next 本地文档要求 |
| 本文件 + STATE 最新 R07 段 + HUMAN_TASKS | 每次开始；不要默认重读 STATE 的全部历史 |
| 当前 Issue #15 | 核对当前范围；若网络不可达记录限制，不把缓存当最新远程事实 |
| [R07_READ_MODELS](../architecture/R07_READ_MODELS.md) | B 全读；C–G 只读相关接口。七 GET/Audit/Dashboard/capabilities 的唯一详细定义 |
| [API.md](../architecture/API.md) | 相关 R02–R06 实施章节优先；上方设计示例不覆盖后面的精确实施契约 |
| [R07_DESIGN](../ux/R07_DESIGN.md)、[原型与截图](../ux/prototypes/r07/README.md) | C 首次通读；D–G 读取目标页面设计和参考截图，复用 Tokens |
| [AC](../product/ACCEPTANCE.md)、[状态机](../architecture/STATE_MACHINES.md) | 当前功能对应验收/状态，不默认全量扩读 |
| [安全](../architecture/SECURITY.md)、[开发](DEVELOPMENT.md)、[测试](TEST_STRATEGY.md) | 授权/Session/数据库或测试环境受影响时 |
| [PRD](../product/PRD.md)、[决策](../product/DECISIONS.md) | 产品范围不清时；不自行更改已批准基线 |

本文管总进度、阶段和验证强度；接口字段以 READ_MODELS/API 为准，视觉以 DESIGN 为准，STATE 保留验证证据，HUMAN_TASKS 只保留真正人工事项。避免复制同一契约到多处。旧材料的“每阶段全量回归/全视口截图/重新审批”等过程要求由本次精简约定替代；**不替代业务、安全或最终验收要求**。

## 4. 必须保持的业务与安全事实

1. Session 来自 R02 HttpOnly Cookie；`GET /me` 只返回 user、无全局 role。注册不自动登录。所有写请求（含登录注册）复用可信 Origin、JSON 和 `X-CSRF-Protection: 1`；不增加认证框架/直连 DB。
2. 同源 `/api/v1/*` 经现有 Next Rewrite 转 API；不重写代理信任逻辑、不用 XFF 提供身份。新 Controller 默认认证。用户切换必须取消请求、重建私有 QueryClient/会话 epoch，旧响应不可污染新账号；不持久化商业缓存。
3. Owner 是 Workspace Owner；Developer 须有 Workspace + Project 分配；Client 只绑定项目、不加入供应方 Workspace。同账号可在不同 Workspace 有不同角色。按钮依据当前项目/状态/capabilities，服务端最终授权；不可见404，可见无动作权403，未认证401。
4. Project baselineScope 创建后固定，仅参考不是合同签名。每项目至多一个已注册 Client，首个 Submit 前必须存在；有任何正式提交历史后不可换人。成员管理不等于邮件邀请。
5. Requirement `draftVersion` 初始1，PATCH/问答/Revision/Ready 带正整数 expectedVersion；只有 DRAFT 作者/Owner 可编辑；三角色可问答，Client 不可创建 Revision/Ready；READY 禁问答；Pending CR 禁新 Revision；最新有效 Revision、非空标准、全部问题已答才 Ready。
6. CR `lockVersion` 初始0；PATCH/Submit/决定/重开均带 expectedVersion。Client 响应完全不含 draft。先 Owner 后 Client 批准同一冻结 Version；评论双方可见；任何拒绝终止该版本。resubmit 只重开 DRAFT，下一次 submit 才产生新版本且不继承审批；APPROVED 不可重开，新增范围走新 Revision/新 CR。
7. Delivery 只关联合法双方批准版本；HTTPS URL+纯文本+可选证据。创建及 Review 都**不传 expectedVersion**。退回评论必填，下一次新建 Delivery；一次终审、已 ACCEPTED 不得继续交付；后续需求修订不使旧批准交付失效。
8. 409 STALE_VERSION 保留表单、刷新核对，不自动重放旧审批；所有 mutation 禁自动重试。创建未保证 Idempotency-Key，请求结果未知先查实际对象。
9. Audit Client 只读本项目需求/正式审批/交付/验收白名单，内部商业草稿/成员事件隐藏，未知事件默认不向 Client 暴露。权限/可见性过滤先于分页/计数，metadata 白名单，不返回敏感正文/凭据。
10. Dashboard 全部来自真实查询，分 mine/waiting/completed；问题无 assignee，协作提示不能伪造指派；completed 是已验收交付，无虚构逾期/收益/完成率。历史对象通过独立 GET 和稳定路由刷新恢复。

## 5. 总体架构与阶段实施范围

推荐 Web 结构：`src/app` 路由/Layout；`components/ui` 复用 Base UI；`components/layout/shared` 统一 Shell/状态/时间线；`features/{auth,projects,requirements,changes,deliveries,audit}` 管领域；`lib/api` 管客户端/生成类型/错误；`lib/query` 管 QueryClient/keys/失效。

关键路由：`/login`、`/register`、`/app`、`/app/projects`、`/app/settings/members?workspaceId=…`，项目下 `/requirements/[r]`、`/changes/[c]`、`/deliveries/[d]`、`/audit`，Revision/CRVersion 有独立历史详情。完整路由和页面设计见 DESIGN。不新增全局状态框架；Server Components 管结构，私有数据通过受认证的同源 API 查询，避免共享 Next Cache 存私有数据。

| Session / 阶段 | 必须交付 | 主要文件 | 最小阶段出口 |
|---|---|---|---|
| A 已完成 | 精确读取契约、设计、原型、截图 | docs/architecture、docs/ux/prototypes/r07 | 保留成果，不重做原型验证 |
| B | 七 GET、必要 capabilities、OpenAPI/生成类型/漂移检查 | API相关领域、audit、dashboard、openapi/scripts、Web generated types、对应测试/CI | 真实权限/字段裁剪/分页/聚合和HTTP契约验证 |
| C | 正式 Tokens/Shell、Typed Client、Query、登录注册退出、会话恢复/隔离；最小可复用 Playwright 启动/账号 fixture | Web app/components/lib/features/auth，测试工具/脚本 | 真实登录/刷新/退出、401及账号切换隔离；桌面/手机截图 |
| D | Workspace/Project 创建和列表、详情、两级成员与唯一 Client 绑定 | features/projects/workspaces/members、路由 | 浏览器完成项目准备；Client 独立入口；权限/锁定提示 |
| E | Requirement 创建/编辑、问答、Revision/Ready、分页历史和深链接 | features/requirements、路由 | 一条真实澄清→Ready流程；stale、Pending/作者限制核心验证 |
| F | 商业草稿、提交、双方决定、拒绝重开再提交、版本/审批历史 | features/changes、路由 | 同版顺序批准；拒绝重提；Client无draft；stale不重放 |
| G | 交付/退回/重交/接受、历史；真实 Dashboard/三bucket/Audit | features/deliveries/dashboard/audit、路由 | 真实退回→新交付→接受；真实聚合/裁剪；刷新恢复 |
| H | 三角色贯通、风险负向、最终视觉/响应式与全量回归、文档清理 | 跨模块集成/E2E/CI/相关缺陷 | 本地最终验收证据；远程/人审未执行项如实保留 |

阶段只解决对应范围和阻塞它的必要小修复。前置阶段有缺陷可最小修复并跑受影响检查，记录偏离；不得借机扩充产品。技术任务过大无法在一个 Session 安全完成时，记录具体 CHECKPOINT，下一 Session 继续**同一阶段**，不能草率标 COMPLETE 或启动下一阶段。

### B 的具体顺序

1. 对照已有 Controller/DTO/Service/Repository，复用安全投影和授权。capabilities 必要时局部抽取无副作用 eligibility helper；不重建授权体系，写锁/错误优先级不变。
2. 三历史详情：`GET /requirements/{r}/revisions/{rev}`、`GET /change-requests/{c}/versions/{v}`、`GET /deliveries/{d}`；真实父链校验和只读一致快照。
3. 项目列表：`GET /projects/{p}/change-requests`、`GET /projects/{p}/deliveries`；参数化查询、授权先过滤、limit+1、稳定排序、显式投影。
4. `GET /projects/{p}/audit-events`：集中事件/字段白名单、角色过滤、target父链；复用 AuditWriter，不改变写审计。
5. `GET /dashboard`：批量授权事实、同快照聚合 summary/items、bucket规则/去重，不前端逐页扫描所有对象。
6. 给必要详情增加 capabilities；不改变 /me 和既有写请求。Client 不得到草稿资格细节。
7. Swagger 显式 HTTP schema、离线不连DB/Observe导出、前端生成类型、确定性 CI 漂移检查；只覆盖 R07 使用接口，不大规模迁移 DTO。JSON 日期/金额/工时/null/optional/Client无draft 必须准确。
8. 跑第6节最低验证，更新API/安全文档及本文件状态；结束 B Session。

B 预计文件：API `requirements/changes/deliveries/projects` 的 controller/service/repository 和小型 helper；`audit` 查询层；新增 `dashboard` 读取模块；必要 module 注册；`src/openapi`/导出脚本、`apps/web/src/lib/api/generated`；API unit/integration/HTTP测试、脚本/CI。禁止改历史 Migration/Schema；发现新增索引需求也先报告。

## 6. 精简开发与测试约定（取代逐阶段大规模验收）

**原则：验证风险和用户行为，不按测试数量或截图数量交差。** 复用现有测试与 Phase A 设计，不写镜像实现的测试，不重复全仓扫描，不另造多套框架/大型测试平台。

| 改动类型 | 必做 | 默认省略 / 延后 |
|---|---|---|
| 纯文档/视觉微调 | diff检查；视觉改动查看受影响页面 | 业务回归、重新生成全套原型截图 |
| 普通 Web 功能 C–G | 受影响代码lint/typecheck；关键输入/错误分支的少量自动测试；当前主流程真实API smoke；代表性截图 | 未影响后端时不重跑R01–R06；不每页五视口、不全组件覆盖、不强制引入MSW/Storybook |
| B 或后端变动 | API lint/typecheck；新增GET真实DB/HTTP权限、裁剪、分页、聚合测试；被改动领域的既有回归；契约检查 | 不要求新增接口全部重复底层已测并发组合；无Schema变更不反复做迁移升级实验 |
| 认证/授权/状态机/共享写逻辑改动 | 立即扩大到受影响R02–R06套件和必要负向/并发测试 | 不能以节省token延期安全验证 |
| H 最终 | 一次完整R01–R06回归、Web检查/构建、真实三角色浏览器闭环、核心负向与最终视觉 | 不做无业务价值的排列组合；远程CI未授权/未运行明确NOT RUN |

### 核心检查不可削减

- B：七GET合法访问/401/跨项目404；父子ID拼接；Client响应无draft/内部事件/敏感metadata；分页先过滤、hasMore不泄露；Dashboard计数不受当前页影响且bucket正确；capabilities不能改变正式写权限；真实HTTP符合生成契约。可用参数化矩阵和共享fixtures覆盖，不为每个组合复制测试文件。
- C：Cookie/CSRF复用、会话恢复/401、退出及A→B账号缓存隔离（含旧响应）；登录表单错误；无真实凭据写日志。
- D：Owner设置流程与Developer/Client入口；Client锁定/角色冲突；UI隐藏不能替代API权限。
- E：问答→Revision→Ready；stale保留输入；只读历史；Pending修订阻断与草稿编辑限制（已有后端规则不重写）。
- F：同版Owner→Client；至少一个浏览器拒绝重提流程，另一方拒绝路径保留自动覆盖；旧批准不继承；重复/过期操作不自动重试；Client无草稿。
- G：退回→新Delivery→接受；Review无expectedVersion；已验收终态；Dashboard/Audit真实且不越权；历史深链接刷新可找回。
- H：Owner/Developer/Client独立浏览器Context完成全链路；跨项目/混合角色/会话过期/409/重复决定等核心负向；R01–R06完整回归，至少桌面与手机关键页、键盘与对比度自检。

### 运行方式与证据

- C–G 默认每阶段 **1条代表性真实浏览器流程 + 必要风险分支 + 1–2张关键截图**，可复用/增量扩展同一流程；实际失败或新风险才扩展。C 安装和维护最小 Playwright/测试启动工具供后续复用，不每 Session 重建工具链。
- 普通组件/表单可用当前测试栈做精简单元/页面测试；可控错误测试允许Mock，但浏览器业务验收必须真实API与隔离PostgreSQL。不以A的静态原型替代正式Web截图。
- B的API构建用于现有HTTP测试；C及H跑完整Web构建。D–G改动依赖、配置、路由/Server Components边界或遇到集成风险时跑构建；不能仅为省时跳过本次受影响的必要构建。
- H集中最终回归；中途已通过且没有相关新改动的检查不反复跑。禁止删改测试以掩盖失败，禁止把NOT RUN写成PASS。
- 数据库：只用已核验 `TEST_DATABASE_URL` 和现有 `openTestDatabase`，不读开发.env、不回退开发库；不清空public/禁用触发器。临时进程自行清理，不接管用户服务。
- 已知环境：原代理测试使用3000/4000、隔离DB5434；历史本机Docker端口问题有/tmp host覆盖，这些文件可能不存在。按 DEVELOPMENT复现，仅复用事实，不猜已修复。/tmp不是交接依赖。
- 证据用简表记录：精确命令、PASS/FAIL/BLOCKED/NOT RUN、关键结果、截图相对路径、环境限制。通常一段即可，不复制大段日志进计划。测试数据/配置可复现且不含真实凭据。
- 同阶段仅报告一次简洁交付，负责人有需要再细看截图；不为例行UI操作设置额外批准环节。新Session按阶段提示词继续。

### H最终命令清单（现在不执行）

```text
pnpm run lint
pnpm run build
pnpm run test
pnpm --filter specbridge-api typecheck
pnpm --filter specbridge-api test:integration
pnpm --filter specbridge-api test:e2e
pnpm --filter specbridge-api test:e2e:auth
pnpm --filter specbridge-api test:e2e:rbac
pnpm --filter specbridge-api test:e2e:requirements
pnpm --filter specbridge-api test:e2e:changes
pnpm --filter specbridge-api test:e2e:deliveries
pnpm --filter specbridge-api db:check
git diff --check
```

另执行B/C新增的读取测试、契约检查、Web typecheck和Playwright脚本，具体名称由实现Session在下方交接记录填写。现有CI需要的完整检查不得删除；本地精简频率不等于降低CI门槛。远程CI、人工Review和合并DoD仍需独立证据，未获授权不触发远程操作。

## 7. Session 工作方式与交接格式

开始：读第2节 → 查看Git状态和本阶段相关源码 → 确认前置成果实际存在 → 简短计划 → 直接实施。不要反复让负责人确认已批准内容。遵守作用域AGENTS；读取本地Next文档中实际涉及的API，勿凭旧版本记忆重建框架。

结束前必须：

1. 更新第2节进度及“下个Session第一步”；未完成写CHECKPOINT/BLOCKED与精确下一动作。
2. 在第8节追加一条简洁交接：修改入口、行为/契约差异、精确验证命令/结果、遗留问题和下阶段动作。保留现有用户/前阶段未提交修改，不自动提交。
3. 更新STATE最新R07摘要；有真正人工决策才改HUMAN_TASKS，例行开发不要新增人工任务。
4. 契约或视觉有批准范围内细化时更新对应权威文件，不让实现与文档静默漂移。
5. 最终回复只说完成内容、验证、风险/未跑项、下阶段建议和建议提交摘要；结束当前Session。

交接模板（每阶段约10–20行，按复杂度调整）：

```text
### Session <日期> — Phase <X> — COMPLETE / CHECKPOINT / BLOCKED
分支/HEAD；开工已有修改：
实际完成与关键文件：
契约/设计差异：无 / …
验证：命令 → 状态/关键结果；截图：仓库相对路径
未运行及原因：
已处理失败 / 未解决风险：
新增脚本及复现环境（不记录密钥）：
下一Session：Phase X；先做1、2；需要读取的具体文件
人工事项：无 / 必须决定的内容与原因
建议提交摘要（不执行）：
```

## 8. 已有交接记录

### 2026-11-10 — Phase A — 已交付

- 文档：READ_MODELS（七GET、Audit、Dashboard、能力）；DESIGN（Tokens/布局/页面）；原型 `docs/ux/prototypes/r07/`。
- 生产apps/项目依赖/DB未改，尚无正式业务Web。
- 原型 `verify.mjs`：40项检查PASS、0 axe A/AA违规、9截图；JS语法及diff检查PASS。证据在原型evidence/，精确命令见原型README。首次手机焦点失败已修复并保留记录。
- 业务API/DB E2E、R01–R06回归、生产构建NOT RUN；A证据不替代这些测试。
- 临时Playwright在/tmp，不保证新Session存在；C应建立项目内可复现的最小浏览器工具，不继续依赖A临时安装。
- 人工视觉结论未记录；用户已要求以完成的A为基础，改为分Session精简实施。

### 2026-11-10 — 跨 Session 规划调整 — 完成

- 将本文件升级为总规划/实时进度/会话操作入口，保留A–H功能范围。
- B–H一阶段一个新Session；C–G验证按受影响范围，H统一全量回归。安全/权限/版本/审批核心测试不削减。
- 当前只改文档，不开始B；下次用户发送B提示词后直接实施B。例行阶段检查不另设审批门槛；不虚构既有人工Review已通过。
- 验证：`git diff --check` PASS；Python pathlib/re 检查本轮7份文档的48个本地Markdown链接，全部存在。业务测试/构建/浏览器 NOT RUN（纯文档调整，无生产代码变更）。
- 同步 STATE、HUMAN_TASKS、文档索引与设计/原型/契约的阶段入口说明。建议提交摘要（不执行）：`docs(r07): streamline phase execution and session handoffs`。

### Session 2026-11-10 — Phase B — COMPLETE（本地）

- 分支/HEAD：`feat/15-web-integration` / `c472d78`；开工工作区干净，A 成果已存在；本轮未提交、推送、建 PR、合并或部署。
- 完成：七 GET；Project/Requirement/CR/Delivery 详情 capabilities；Audit 事件/metadata 白名单和真实父链 target；Dashboard 授权 CTE、全范围去重计数、三 bucket 与稳定分页。
- 入口：`apps/api/src/{requirements,changes,deliveries,projects,audit,dashboard}`；局部共用 `requirements.eligibility.ts`、`delivery-eligibility.ts`、CR 决策/评估校验，写锁与错误优先级保留；无新增表、Schema、Migration、写业务或认证重构。
- 契约：`src/openapi/{document,schemas}.ts`、`scripts/openapi.mjs`；30 paths / 38 operations；离线不连接 DB、不加载 .env/Observe、不监听；生成 `docs/architecture/openapi.json` 与 Web `schema.d.ts`；CI 在临时目录重生成比较。
- 必要小修：严格 UTC 测试发现 R03 原生 SQL 日期文本未规范化，修复 Workspace 列表/成员及 Project 列表/详情的日期序列化（含已有成员重复加入返回值）；无权限/状态语义变更。
- 测试环境：仅 `127.0.0.1:5434/specbridge_test`、公开一次性测试账号，沿用 `infra/compose.test.yml` + `/tmp/specbridge-r01-test-host.yml`；未访问开发/生产库。测试 SQL 仅应用既有已批准迁移。
- PASS：`pnpm --filter specbridge-api test` 93；`test:integration` 90；`test:e2e:reads` 9（七 GET、角色/跨项目/父子拼接、裁剪、分页、聚合、capabilities、真实 HTTP Schema 与 UTC 日期）；DB 命令均前置 `env TEST_DATABASE_URL=postgresql://specbridge_test:local_test_only@127.0.0.1:5434/specbridge_test`。
- PASS：同环境 `test:e2e:requirements` 9、`test:e2e:changes` 8、`test:e2e:deliveries` 7、`test:e2e:rbac` 13，均包含编译 API/Next Rewrite；日期修复后另 `exec vitest run --config vitest.config.integration.ts test/database/rbac.integration-spec.ts` 12。
- PASS：API `typecheck`、`lint`、`openapi:generate`、`openapi:check`（含 API build）、`db:check`；Web `exec tsc --noEmit --incremental false`、`lint`；`git diff --check`。数据库 Schema/历史迁移/Auth 目录未改。
- 已处理失败：沙箱连接/下载限制后获准运行；Swagger 子路径导出改为公开入口；Dashboard asOf 与 R03 日期规范化；Audit 同 tx 改为顺序查询；异常指针 fixture 先断言数据库 FK 拒绝，再验证可表示的缺失指针。审计回归中的安全 500 为预期故障注入。
- 限制：`openapi-typescript 7.10.1` 声明 TS5 peer，API 当前 TS6，安装有 peer warning；实际生成/漂移/Web 类型验证通过，未调整现有编译器。Dashboard 当前按授权全集 CTE 聚合，未做大数据量性能基准；未新增索引。
- NOT RUN：远程 CI、正式浏览器 E2E、Web 生产构建、人工视觉/安全评审；未改认证生产逻辑，未重复完整 auth/base HTTP 套件；新增 HTTP 已覆盖登录/注册/me/退出响应契约。
- 清理：`docker compose -f infra/compose.test.yml -f /tmp/specbridge-r01-test-host.yml down` PASS，仅本轮测试容器已关闭移除；构建生成的已跟踪 tsbuildinfo 恢复开工值。
- 下一 Session：C，先读取生成契约与 `R07_DESIGN`，建立真实 Web Shell/认证/Query 隔离及可复用浏览器 fixture；不重做 A 原型。无需新增人工决策，H-09 等现有人工状态不变。
- 建议提交摘要（不执行）：`feat(r07): add scoped read APIs, capabilities and generated HTTP contracts`。

### Session 2026-11-11 — Phase C — COMPLETE（本地）

- 分支/HEAD：`feat/15-web-integration` / `9499618`；开工干净。已在线核对 Issue #15；B 已在 `544e4b8`，原“未提交”交接已更正为历史状态。C 不提交/推送/建 PR/合并/部署。
- 完成：正式 Next/React/Base UI `/login`、`/register`、`/app`；Tokens、品牌、响应式 Shell、手机 Dialog Drawer、RHF/Zod 表单与统一加载/错误。`/app` 仅真实账号/流程说明，未进入项目准备或 Dashboard 聚合。
- 入口：`apps/web/src/{app,components/layout,components/shared,features/auth,lib/api/client.ts,lib/query}`；现有 Button 最小触控尺寸、Dialog 新增 drawer 变体；生成 schema 原样复用。
- 会话：注册不自动登录；登录/退出、`/me` 恢复、保护请求 401；每个 epoch 新 QueryClient，abort/cancel/clear、私有子树卸载，旧 200/401 不污染新账号；不持久化私有数据。焦点/可见性/其他标签通知重新确认身份，退出未知结果保留重试界面。
- 契约/范围：无新增 API/业务写、Schema/Migration；服务端 Auth、Cookie/CSRF/Rewrite 未改。API.md 顶部过时的“B 未实现”状态已纠正；设计源提升到正式 tokens.css，原型保留历史。
- 可复用浏览器：固定 Playwright 1.61.1；根 `test:browser` 构建 API/Web，`scripts/browser-stack.mjs` 运行 Next 生产服务器/Nest + 5434 隔离库；只加载 `.env.test`，验证库/角色、沿用已审迁移；3000/4000 占用即失败，关闭自建 HTTP 进程。UUID 账号 fixture 不清库/不禁 trigger。
- PASS：`env LD_LIBRARY_PATH=/tmp/specbridge-browser-libs/root/usr/lib/x86_64-linux-gnu FONTCONFIG_FILE=/tmp/specbridge-browser-libs/fonts.conf pnpm run test:browser` → API/Web build + 6 浏览器场景通过（最终浏览器 6.2s）；包含真实注册/登录/刷新/退出、旧 Cookie 撤销、CSRF、延迟旧 200/401、共享 Cookie 切换、网络失败、429、手机焦点与320px；无未捕获浏览器异常。
- PASS：`node scripts/with-env.mjs .env.test pnpm --filter specbridge-api test:e2e:auth` → 2 文件/16 项，真实 HTTP/Next Rewrite；`pnpm --filter specbridge-api openapi:check` → 30 paths 无漂移。
- PASS：`pnpm --filter web typecheck`、`pnpm --filter web lint`、`pnpm --filter web build`、`node --check scripts/browser-stack.mjs`、`git diff --check`；精确环境和截图见 [C evidence](../ux/evidence/r07-c/README.md)。5 张正式桌面/手机截图已逐张检查。
- 已处理失败：沙箱网络/监听限制；Chromium 完整包 TLS 下载失败后 Headless Shell 下载成功；sudo 缺密码后获准在 /tmp 解包缺失系统库及 Noto CJK；alert 选择器撞 Next announcer；截图发现 Drawer 继承居中动画/输入高度/桌面手机按钮，修正并增加边界断言后全部通过。
- 环境限制：本机临时 libs/fonts 不保证重启后保留；标准安装依赖命令与当前测试前缀见 Web README / C evidence。测试容器原已运行，保持其状态，未访问开发库；构建产生的受跟踪 tsbuildinfo 恢复开工值。
- NOT RUN：未受影响的 R03–R06 全量回归留 H；远程 CI、人工视觉/安全 Review、生产 HTTPS、多浏览器与完整三角色业务链未运行；不据本阶段宣称全 R07 DoD。
- 下一 Session：D；复用当前 Shell/typed client/Query keys/fixture，先 Workspace/Project/成员与唯一 Client 准备流程；详情权限继续以 API/capabilities 为准，不创建全局 role。
- 人工事项：无新增实施阻塞；负责人可审阅本阶段正式截图，既有 H-09 状态保持未记录；本 Session 到 C 结束。
- 建议提交摘要（不执行）：`feat(r07): implement authenticated web shell and isolated session queries`。

### Session 2026-11-11 — Phase D — COMPLETE（本地）

- 分支/HEAD：`feat/15-web-integration` / `200c54f`；开工干净，C 已由负责人提交。在线核对 Issue #15；保留前阶段成果，本轮未 Commit/Push/创建 PR/Merge/部署。
- 完成：Workspace 创建/分页选择；Project 创建/分页列表/详情；Owner 供应方已注册邮箱添加 Developer、项目分页分配、唯一 Client 绑定/更正与正式提交锁定提示。Client 从不带空间筛选的“我的项目”进入，不要求加入供应方空间。
- 权限：每个项目使用服务端 `projectRole/capabilities`；供应方名册只由管理页面/Owner 分配面板读取，非 Owner 项目页不请求名册。服务端最终 403/404 与角色冲突沿用 R03。初始范围只读并明确不是客户签署。
- 入口：`apps/web/src/features/projects/{queries,shared,workspace-picker,create-forms,project-list,project-detail,members}`；新增 `/app/projects`、`/app/projects/new`、`/app/workspaces/new`、`/app/settings/members?workspaceId=…`、`/app/projects/[projectId]`、`…/members`。ProjectBoundary/useCurrentProject 为 E 后续页面提供真实项目上下文。
- Query 按 epoch/userId/资源/空间或项目/分页隔离；切换项目卸载旧表单；写后失效相关列表/详情。创建未知结果禁重发并先查列表；绑定 409 保留输入、重新获取锁定能力并禁提交；所有写操作不自动重试。
- 契约/设计差异：无新增 API、后端逻辑、表、迁移、依赖或生成类型变更。只补 Web 错误文案与响应式页面。需求/CR API 仅在锁定测试中建立真实前置状态，未实现 E/F UI。
- PASS：`env LD_LIBRARY_PATH=/tmp/specbridge-browser-libs/root/usr/lib/x86_64-linux-gnu FONTCONFIG_FILE=/tmp/specbridge-browser-libs/fonts.conf node scripts/with-env.mjs .env.test pnpm --filter web test:e2e projects.spec.ts` → D 两场景 / 6.5s；真实 Owner UI 准备、Developer 分配前404/分配后200、Client 独立入口、403/404、未注册/角色冲突、同账号跨项目角色、13项目分页/切换筛选、Client 更正后旧账号失权、Submit 竞争409/刷新锁定、创建响应丢失不重放、320px。
- PASS：最终相同环境前缀 `pnpm run test:browser` → API/Web build + C 6场景/6.3s + D 2场景/6.6s，均无 pageerror。C/D 复用原启动器/fixture，但分两次 Playwright 调用启动 API，避免真实登录配额叠加；未改限流或重建测试工具。新增根 `test:browser:auth` / `test:browser:projects` 用于已有构建的定向验证。
- PASS：最终 `pnpm --filter web typecheck`、`pnpm --filter web lint`（无警告）、`git diff --check`；3 张截图见 [D evidence](../ux/evidence/r07-d/README.md)，已逐张查看；C 历史截图恢复原值。
- 已处理失败：首轮 typecheck 的生成路由参数名应为 `{id}`；RHF watch 改 useWatch 消除编译器 warning；沙箱内部端口/启动限制后获准重跑；首次测试点击项目后立即 reload 抢在导航前，增加目标就绪断言后通过；整页截图用即时滚到顶部避免平滑滚动中的 fixed 导航错位。
- 环境：原 5434/specbridge_test 已可用，启动器校验真实库/角色并沿用已审迁移；不访问开发库，不清表/删历史。Docker ps 即使沙箱外仍缺 socket 访问权，未依赖它启动或更改容器；实际 DB/HTTP 由已通过的启动器验证。无新依赖下载，自建 API/Web 已退出，生成 API tsbuildinfo 移至 /tmp。
- NOT RUN：未改后端，未重复 R01–R06 全量回归或契约生成；完整业务链留 H。远程 CI、人工视觉/安全评审、生产 HTTPS/多浏览器未运行，H-09 不标通过。
- 下一 Session：E；先读本交接、Web README、ProjectBoundary/queries/shared、R04 精确契约与生成类型。在项目 layout 内接需求、问答、Revision/Ready，注意 expectedVersion。只运行新增定向浏览器流程，最终全量回归仍留 H。
- 人工事项：无新增阻塞；负责人可审阅 D 截图。建议摘要（不执行）：`feat(r07): add workspace and project setup with scoped member management`。

## 9. 每个新 Session 的提示词（可单独复制）

### Session B

```text
继续 SpecBridge R07，执行 Phase B。先读 AGENTS.md、docs/engineering/R07_PLAN.md，以及其中指定的最新状态/本阶段材料；核对实际分支和未提交成果并保留它们。
我授权沿用已交付 Phase A 作为实施基线，开始七项只读 API、必要 capabilities、OpenAPI 与前端生成类型；不新增写业务、表或 Migration，不重构认证。
按总计划的精简策略开发，但真实DB权限/字段裁剪/分页/聚合和HTTP契约测试必须保留；改到已有资格或写逻辑则跑受影响回归。不要重复做Phase A原型或要求例行批准。
完成后更新 R07_PLAN 的进度及交接、STATE和必要契约，报告实际命令/结果与遗留项，然后结束本Session，不进入C。不Commit/Push/创建PR/Merge/部署。
```

### Session C

```text
继续 SpecBridge R07，执行 Phase C。先读 AGENTS.md、docs/engineering/R07_PLAN.md 和最新交接，核对B的真实完成状态及生成契约，保留已有未提交修改。
实现正式Next/React/Base UI应用Shell与Design Tokens、Typed API Client、TanStack Query、登录注册退出、GET /me恢复、401与用户切换缓存隔离；复用既有Cookie/CSRF/Rewrite。建立供后续复用的最小Playwright真实API/隔离DB启动与账号fixtures。
采用总计划的精简测试策略，重点验证真实登录/刷新/退出和跨账号缓存隔离，提供关键桌面/手机截图，不用静态原型代替业务实现。
完成后更新R07_PLAN进度/交接、STATE和必要文档，报告实际验证并结束，不进入D。不Commit/Push/创建PR/Merge/部署。
```

### Session D

```text
继续 SpecBridge R07，执行 Phase D。先读 AGENTS.md、docs/engineering/R07_PLAN.md 和最新交接；检查C的可运行入口，保留前阶段修改。
复用Shell/API Client/Query/表单组件，实现Workspace创建选择、Project创建列表详情、Owner供应方成员管理、Developer项目分配、唯一Client绑定及锁定提示；Client从自己的项目列表进入，权限按当前项目确定。
按总计划精简验证：一条真实浏览器项目准备流程、关键权限/绑定错误分支、受影响lint/typecheck及代表截图；未改后端不重复全量回归，不重建测试工具。
完成后更新R07_PLAN进度/交接与STATE，报告实际结果并结束，不进入E。不Commit/Push/创建PR/Merge/部署。
```

### Session E

```text
继续 SpecBridge R07，执行 Phase E。先读 AGENTS.md、docs/engineering/R07_PLAN.md 和最新交接，核对D成果并保留未提交修改。
实现Requirement创建/限定草稿编辑、Clarification问答、不可变Revision创建与历史详情、Mark Ready；复用现有R04请求及expectedVersion，处理409保留输入、Pending禁止修订、Client权限及深链接刷新。
按总计划精简验证：真实问答→Revision→Ready流程、核心冲突/权限分支、受影响检查和少量截图；不要重复无关后端回归或扩大功能。
完成后更新R07_PLAN进度/交接、STATE和必要文档，报告实际结果并结束，不进入F。不Commit/Push/创建PR/Merge/部署。
```

### Session F

```text
继续 SpecBridge R07，执行 Phase F。先读 AGENTS.md、docs/engineering/R07_PLAN.md 和最新交接，核对E成果并保留已有修改。
实现CR发现列表、商业评估草稿/保存/提交、Owner→Client同版审批、拒绝重开再提交、冻结版本及审批历史。遵守lockVersion从0开始、Client响应无draft、resubmit只重开、APPROVED终态及409不得自动重放；金额/工时精确处理。
按总计划精简验证：真实顺序审批和拒绝重提、Client草稿隔离与stale核心分支、受影响检查、关键审批页截图；复用已有工具。
完成后更新R07_PLAN进度/交接与STATE，报告实际结果并结束，不进入G。不Commit/Push/创建PR/Merge/部署。
```

### Session G

```text
继续 SpecBridge R07，执行 Phase G。先读 AGENTS.md、docs/engineering/R07_PLAN.md 和最新交接，核对F成果并保留已有修改。
实现Delivery提交/退回/新交付/接受及历史详情，R06创建和Review不传expectedVersion；接入真实Dashboard三类待办、统计、项目交付列表和角色裁剪Audit。不得使用静态数据充当正式Dashboard，不新增任务分配系统。
按总计划精简验证：真实退回→重交→接受流程、已验收终态、真实聚合/审计隔离、深链接刷新、受影响检查和代表截图；不重复全量回归。
完成后更新R07_PLAN进度/交接与STATE，列出H需要收尾的问题并结束，不进入H。不Commit/Push/创建PR/Merge/部署。
```

### Session H

```text
继续 SpecBridge R07，执行 Phase H 最终集成。先读 AGENTS.md、docs/engineering/R07_PLAN.md 和最新交接，核对B–G实际成果与遗留问题，保留已有修改。
修复阻断并完成真实Next/API/隔离PostgreSQL的Owner、Developer、Client浏览器全链路，涵盖拒绝重提、退回重交、历史/Audit/Dashboard、会话隔离/跨项目/409/重复操作核心负向。统一检查桌面/手机、键盘、对比度和主要视觉，保持Phase A质量。
按总计划集中执行一次R01–R06全量回归、Web检查/构建、契约漂移和浏览器E2E；复用已有证据，不做无价值组合测试。不将未运行远程CI/人工评审写成通过，也不因它们未授权而擅自推送。
更新R07_PLAN最终进度/交接、STATE和必要交付文档，给出真实PASS/FAIL/BLOCKED/NOT RUN、截图、剩余人工事项与建议提交摘要，然后结束。不Commit/Push/创建PR/Merge/部署。
```
## R07 跨 Session 执行补充规则

### 1. Git 保存点

Codex 不得自动 Commit、Push、创建 PR 或 Merge。

但负责人可在每个 Phase 验收后，手动执行本地 Commit，作为阶段性代码恢复点。

所有阶段保持同一个 R07 功能分支，最终通过一个 PR 合并。

### 2. Context 与阶段续接

原则上每个 Phase 使用新的 Codex Session。

如果一个 Phase 无法在当前 Session 安全完成：

- 保存当前代码，不清理工作区。
- 更新 R07_PLAN 的 CHECKPOINT。
- 说明实际完成内容、剩余任务和测试结果。
- 新 Session 继续同一个 Phase。
- 不将部分完成状态错误标记为 COMPLETE。

不为了满足“一个 Phase 一个 Session”而牺牲代码质量。

### 3. 累积式集成验证

C–G 每阶段验证当前功能及与真实系统的连接。

优先扩展已有 Playwright 测试基础和可复用测试 Fixtures。

Phase H 再运行完整三角色 E2E 和全量回归。

不重复执行没有受影响的测试，但保留授权、字段隔离、状态冲突和核心事务检查。

### 4. 视觉验收

Phase C 完成后，负责人审核真实登录页、App Shell 和 Dashboard 基础布局。

后续复用已确认的 Design System。

普通页面不要求重新制作独立原型。

Phase H 进行最终视觉、响应式和可访问性验收。

### 5. 测试与范围纪律

每个 Phase 必须有相关测试和真实验证证据。

不以测试数量、截图数量或文档长度作为开发成果指标。

安全不变量、数据正确性和最终业务闭环不得因节省时间而削减。

任何阶段发现新的架构风险，应先实施最小必要修复，不扩大产品范围。