# SpecBridge — Test Strategy

## 层次
- **Unit**：状态转换、表单规则、金额/版本等纯逻辑；跟随仓库现有 Vitest/Jest。
- **Integration**：NestJS API + 测试数据库；事务、并发、约束、租户隔离。
- **E2E**：Playwright，Owner / Developer / Client 的真实浏览器核心链路。

## 优先必测
1. 非成员访问另一项目 → 无权（按 API 契约返回 404/403）。
2. Owner 与 Client 审批顺序、重复审批、过期 `expectedVersion`。
3. 已提交 ChangeRequestVersion 与 RequirementRevision 不可改。
4. 未指定 Client 不可正式提交变更。
5. 非 Approved 版本不可交付；同版本最多一个待审核 Delivery。
6. Client 拒收后新建 Delivery；Accepted 历史不可覆盖。
7. DeepSeek 故障不阻塞 P0 业务；AI 仅产出可审阅建议。

## 测试证据
每个 PR 写清：执行的具体命令、结果、测试数据范围、未执行项目及原因。
CI 本身成功不等于端到端业务全部通过；从未运行的测试不能写成通过。
验收的唯一编号与条款以 `docs/product/ACCEPTANCE.md` 为准。

## R01 数据库测试边界

- 单元测试：`pnpm run test`，包含数据库 URL 安全检查、延迟初始化、首次查询失败及 Nest 关闭连接池；不需要 PostgreSQL。
- 静态检查：`pnpm --filter specbridge-api typecheck` 覆盖 schema、Drizzle/Vitest 配置和测试；`db:check` 仅检查迁移元数据，不能证明 PostgreSQL 接受 SQL。
- 路由回归：`pnpm --filter specbridge-api test:e2e`，保留原有两个路由行为，不加载测试数据库。
- 集成测试：`pnpm run test:integration`，必须显式设置隔离的 `TEST_DATABASE_URL`，会应用已审核的 committed migrations；无配置直接失败。运行前须先完成 SQL 人工审核。
- 覆盖范围：15 表及外键、重复迁移与数据保留、NULL 草稿与冻结必填、复合归属、唯一 Client 并发、唯一审批/Review、部分交付索引、内容 CHECK、四表防回写、baseline 不可变、lock_version 条件更新、Drizzle 事务回滚。
- 并发用例在两个连接的事务均开始后同时提交竞争操作，失败断言 SQLSTATE，成功断言最终记录数量；不是顺序调用模拟并发。
- Fixtures 是结构测试数据，不代表已通过合法业务 Submit/Approve。R01 不实现 HTTP 授权、角色分离、审批顺序或 Approved/Accepted 交付规则，不能把本轮结果标成全部 P0 AC 通过。
- AC-03/08/09/12/14/17/23/26/27 仅能获得相应数据库层证据。完整业务验收、备份恢复和生产迁移另行验证。

当前执行证据与未运行项目见 `../STATE.md`；操作步骤见 `DEVELOPMENT.md`。

## R02 认证测试边界

- 单元：真实 Argon2id、输入规范化/长度、CSRF、Cookie 配置、限流窗口/容量、异常脱敏。
- PostgreSQL 集成：并发重复注册、Token 摘要、绝对/空闲失效、撤销/刷新竞争、登录轮换事务回滚。迁移升级用例在事务内独立 schema 应用 R01 SQL（仅替换 namespace），插入旧 Session 后应用 0002，再整体回滚；不重置 public。
- `test:e2e` 保留两项旧路由回归，并增加三项无数据库的认证安全 HTTP 测试；认证套件独立为 `test:e2e:auth`，先 build API，再运行真实 HTTP + 隔离 DB 测试。
- 认证 E2E 覆盖 AC-01/02、默认保护、同响应登录失败、身份字段注入、CSRF、限流、过期、Cookie 属性和日志哨兵。另启动编译后的 API 与真实 Next.js Rewrite 验证 Cookie/CSRF/logout 往返；占用 3000/4000 时明确失败，不复用用户的已有服务。
- 所有数据库套件必须通过 TEST_DATABASE_URL 和库/角色身份校验，不回退 DATABASE_URL、不加载开发 .env。HTTP 用例以 UUID 用户隔离，仅删除自己创建的 Session/User；R01 历史 fixture 不删除。
- CI PostgreSQL job 顺序执行数据库集成与认证 HTTP/代理 E2E；未审核 SQL 不得运行。普通 quality job 不需要数据库。
- HTTP 客户端验证响应头及手动 Cookie 往返，不等于真实浏览器执行 Secure/SameSite 策略；浏览器/生产 HTTPS/外部 Observe 接收验证仍单列，不声称完成。

### R02 P1 转发头限流回归

`test:e2e:auth` 内的 compiled-proxy 套件保持 `AUTH_TRUSTED_PROXIES=loopback`，使用实际编译 API 和 Next Rewrite。每个场景启动独立进程获得新的内存限流窗口，不修改阈值或 mock 限流器。对 Next 入口和 API 直连各覆盖注册第 6 次、同邮箱登录第 6 次、变化邮箱登录第 31 次，全部轮换伪造 XFF/X-Real-IP/Forwarded；断言 429、RATE_LIMITED、Retry-After，注册被阻止时无新增用户，同邮箱限流不误判为总 IP 桶耗尽。原 Cookie/CSRF/login/logout smoke 保留。

修复前 HEAD `44d371c` 上先增加测试，实际结果 6 FAIL / 10 PASS；注册超限收到 201，两个登录超限收到 401，证实原限流被绕过。再将两个限流入口改为 Socket IP；最终结果和命令见 STATE.md。

## R03 Workspace / Project RBAC 验证

- 单元新增 DTO 规范化/长度/分页/身份注入边界及错误码状态白名单；沿用全部认证单元测试。
- `test:integration` 新增 9 项领域数据库测试：Owner 原子创建/唯一性，业务与审计失败回滚，双向角色分配竞态，同/异 Client 并发，历史锁定及未来 Submit 锁协议，异常关系默认拒绝与 baseline 防回写。
- 并发关键用例用独立真实连接、事务屏障和 pg_blocking_pids 确认发生行锁等待；两条角色竞争顺序均测试，不用顺序调用假装并发。
- 新增 `TEST_DATABASE_URL=<隔离测试库> pnpm --filter specbridge-api test:e2e:rbac`：先编译 API，再运行 8 项真实 HTTP 矩阵测试及 1 项编译 API + Next dev Rewrite 测试。覆盖所有 9 个端点、列表先过滤后分页、403/404 分离、Client 更正与锁定、未知邮箱、同账号不同空间角色、并发重复分配、输入/CSRF/Session 回归。
- HTTP 大矩阵以真实数据库 Session fixture 隔离身份，不 mock Guard/授权；代理用例通过真实注册/登录取得 Cookie。R02 的 16 项 HTTP/代理测试独立保留，包括 6 项转发头限流回归。
- 用例仅操作 5434 测试库，结构历史 fixture 明确不代表真实 Submit 工作流；不禁用 immutable trigger、不清空 public、不影响开发库。R03 fixture 随专用 tmpfs 测试容器回收。
- CI PostgreSQL job 顺序执行集成、认证 E2E、RBAC E2E；代理测试端口 3000/4000 被占用时明确失败，不接管既有服务。子进程不继承开发 DB/Observe 凭据。
- AC-03/04/05/16/23/24/26 获得本阶段 API/DB 证据；AC-15 只覆盖审计写入/原子性，审计查询待后续；AC-22 Submit 前 Client 必填及完整审批流程不在 R03。无浏览器、生产 HTTPS、外部安全审计或远程 CI 通过声明。

实际命令、数量、环境故障及修复结果见 STATE.md。


## R04 本地验证范围

- Unit：DTO/版本边界、合法状态、Ready 资格、错误码白名单与 UUID。PostgreSQL：聚合更新、Revision 编号、不可变历史、审批中阻断、审计注入失败回滚；HTTP：8 接口三角色矩阵、作者限制、跨项目/Workspace、非法父问题、CSRF/Session、完整响应及真实 Next Rewrite smoke。
- 并发使用独立连接、事务屏障和 pg_blocking_pids：同版本 PATCH/Revision 一成功一 stale；Ready/Revision、Ready/问答双顺序；Client 更正后的重新授权；模拟未来 Submit 的双顺序协议测试明确标注 fixture，不宣称 R05 完成。
- 迁移测试：旧 0000–0002 存量升级、draft_version 默认值/CHECK、旧内容与历史保留、迁移器重复运行及旧 SQL 哈希。保留 R01/R02/R03 全部回归。
- 已新增 test:e2e:requirements 及独立配置，接入现有 database CI job。0003 经人工批准后才执行数据库套件；openTestDatabase 会自动应用 migrations，未来新增 SQL 仍须先批准，不得以运行测试绕过审核。
- R04 新增 3 项 DTO 单元、18 项领域 PostgreSQL 集成、1 项升级迁移、8 项 HTTP 矩阵与 1 项真实 Next Rewrite smoke；扩展现有异常过滤白名单测试。包含回归共 125 项本地测试通过，具体命令和已处理失败见 STATE。并发协议 fixture 不等于真实 R05 Submit；HTTP 测试不等于浏览器/生产验收。

## R05 ChangeRequest / Approval

- DTO 单元：非负 CR 版本、精确工时、金额安全边界、币种、NULL 清空、未知字段/身份注入。
- `test/database/changes.integration-spec.ts` 使用真实领域服务和 PostgreSQL：不可变版本、顺序审批、双拒绝路径、新版重审、六类审计失败回滚、版本耗尽、异常 active pointer、多个 Pending、金额边界、UUID、Client 换绑时读取快照。
- 并发测试通过 AuditWriter/Repository 屏障和 pg_blocking_pids 观察真实锁等待，覆盖 Submit/Client 更换、Submit/Revision 两种顺序，双 Submit、双阶段决定竞争及 Owner/Client 双顺序；原 R03/R04 fixture 保留其结构协议定位。
- `test:e2e:changes` 执行真实 PostgreSQL + HTTP 七接口权限/输入/并发/回滚矩阵及编译 API + Next Rewrite 主链路；CI database job 在既有套件后顺序运行，避免共享测试端口冲突。
- `TEST_DATABASE_URL` 必须指向隔离库，不回退开发配置；openTestDatabase 会应用既有已审 SQL，新迁移如未批准须在运行套件前暂停。具体命令和 PASS/FAIL/NOT RUN 见 STATE。

## R06 Delivery / Acceptance

- DTO：HTTPS 完整解析/无凭据或控制字符、长度和数组边界、退回必填评论、未知字段与 expectedVersion 注入。
- PostgreSQL：真实 R05 服务建立批准数据；创建/退回/重新交付/接受、完整分页历史、非法阶段与批准证据、角色/项目隔离、编号耗尽和父项保持不变。
- 并发沿用 AuditWriter/Repository 屏障及 pg_blocking_pids 验证真实等待：双创建、同/异决定双 Review、Review/创建、批准/创建、Revision/交付双顺序、持锁方审计失败后等待方继续。不是仅靠 Mock 或顺序调用。
- 审计失败分别覆盖创建/接受/退回，快照包含父对象、Delivery、Review、Audit；包括先写审计再抛错、条件 UPDATE 零行、真实 23505 与 Drizzle cause 映射。Review 触发器拒绝 UPDATE/DELETE；Delivery 无公开改删接口，旧内容保留；历史读取验证 Review 提交期间的一致快照。
- `test:e2e:deliveries`：三个接口 HTTP 权限/输入/并发/回滚；编译 API+Next Rewrite 从审批到退回重交再接受。CI database job 在 R05 后顺序运行；沿用 3000/4000 空闲检查及自建进程清理。
- 完整保留 R01～R05 回归、类型检查/Lint/Build/迁移元数据检查。无新增 SQL；不得将 HTTP/代理证据称为完整浏览器或生产验证。

## R07 Phase B 读取与 HTTP 契约

`test:e2e:reads` 在真实隔离 PostgreSQL 与 Nest HTTP 上执行：七 GET 的角色/跨项目/父子 ID 拼接；Client 商业字段与 Audit 裁剪；过滤先于分页/hasMore；Dashboard 工作项、独立计数与稳定顺序；capabilities 与原写路径一致；业务快照无读取副作用。复用 R03–R06 fixtures，不使用 Mock Dashboard。

响应使用 Ajv 校验已生成 OpenAPI，并严格检查 UTC JSON 日期；覆盖 R07 使用的既有认证、项目准备、需求、顺序审批/拒绝重提、交付验收路径。`openapi:check` 在临时目录重生成并比较机器契约与前端类型，CI 保留所有旧检查并追加该步骤及读取测试。已跑命令/结果与未跑项以 STATE 和 R07_PLAN 交接为准。

## R07 Phase C Web 认证与缓存

根 `pnpm run test:browser` 构建 API/Web，使用 `scripts/browser-stack.mjs` 启动真实 Next 生产服务器与 Nest API；只读 `.env.test`，复用 `testDatabaseUrl` 和已批准迁移的库/角色校验。先 `pnpm run db:test:up`；3000/4000 必须空闲，不复用开发进程。测试不清库、不关闭测试 DB，只回收自建 HTTP 进程；账号 fixtures 是 UUID 注册用户，后续角色关系通过正式 API 建立。

`apps/web/e2e/auth.spec.ts` 六个风险场景覆盖 AC-01/02、R07 Cookie/CSRF、错误输入、刷新/401/网络恢复、A→B 和旧 200/401 隔离、共享 Cookie 变化重新确认、退出失败、真实 429、手机 Drawer/焦点/320px。延迟载荷由真实 API 取得；禁止用 mock 成功认证或静态页面替代。认证 trace/HAR/video/storageState 关闭，截图仅保留非敏感 UI。

C 未改服务端认证、授权、业务状态机、Schema 或 Rewrite；扩大验证到 R02 `test:e2e:auth`，不重复无关 R03–R06 全量回归。H 再做完整三角色业务链与全量检查。精确结果、截图和本机临时浏览器依赖见 [C evidence](../ux/evidence/r07-c/README.md) 和 STATE。

## R07 Phase H 最终验收边界

在C–G定向风险测试基础上新增一条纯UI业务写入的三角色全链路，覆盖准备、澄清、不可变规格、拒绝重提、退回重交、历史/Audit/真实Dashboard。根 `test:browser` 构建后调用 `test:browser:run`，按文件独立启动API以保持真实认证限流；已有最新构建时直接用后者。C–G重跑图进入忽略目录，H正式图与脱敏可访问性JSON在 `docs/ux/evidence/r07-h/`。

H集中R01–R06/七读取/契约/Web回归已实际执行；失败保留并从失败点继续，只有实际修复或未判定风险才定向重跑。最终各浏览器套件合计15场景通过。17正式状态扫描不替代读屏、真实设备或人工视觉/安全评审；axe未判定项和计算颜色/键盘补充结果均保留。[H evidence](../ux/evidence/r07-h/README.md) 是本轮精确命令与PASS/FAIL/BLOCKED/NOT RUN来源。

CI保留原有检查并追加Web类型、Chromium、生产Web和浏览器入口；没有远程运行证据，不标CI通过。无开发库回退、测试表清空、触发器禁用或新迁移。
