# R07 视觉与交互规格 — Phase A

2026-11-10 · Issue #15 · 中文优先 / 明亮中性 / 靛蓝强调。负责人已批准方向，本轮关键页面等待视觉验收。业务规则见 [R07_READ_MODELS](../architecture/R07_READ_MODELS.md)，实施与验证记录见 [R07_PLAN](../engineering/R07_PLAN.md)。

## 1. 设计主张

**把需求说清，把每一次确认留住。** 产品以规格、版本和下一步为中心，不把自己包装成工时管理或合同签署平台。版式使用有节奏的留白、细线分区、克制的靛蓝色和易读中文。小型桥形标记由两个支点和拱线构成，作为产品识别元素；不是背景插画或装饰图表。

关键页评审原型：[prototype/index.html](prototypes/r07/index.html)。这是离线 HTML/CSS/JS 设计载体，和 apps/web 正式路由完全隔离；所有示例标记“设计评审 · 示例数据”，无网络 API、无真实认证、无数据库。不能用于证明 R07 功能完成。后续 C–H 将按以下映射在 Next/React/Base UI 中实现，静态原型不进入生产构建。

## 2. Design Tokens

正式可执行 Token 源为 [apps/web/src/app/tokens.css](../../apps/web/src/app/tokens.css)，由 A 的 [原型 tokens.css](prototypes/r07/tokens.css) 提升；原型保留历史快照。正式 `--text-muted` 对应表中的 muted，避免与 shadcn 的 muted 背景语义混淆。

| Token | 值 | 使用 |
|---|---|---|
| canvas / surface / subtle | #F7F8FA / #FFFFFF / #F1F3F7 | 页面、内容、分组底色 |
| ink / muted | #182230 / #526175 | 主要与辅助文字；正文不使用低对比浅灰 |
| border / input-border | #E2E6ED / #7C8798 | 分隔线 / 控件边界，语义区分 |
| brand / brand-hover / brand-soft | #4338CA / #3730A3 / #EEF2FF | 主操作、选中态、强调容器 |
| success / success-bg | #166534 / #F0FDF4 | 通过、验收 |
| warning / warning-bg | #92400E / #FFFBEB | 等待和注意 |
| danger / danger-bg | #B42318 / #FEF3F2 | 拒绝、退回、错误 |
| info / info-bg | #1E40AF / #EFF6FF | 澄清中、信息提示 |
| spacing | 4/8/12/16/24/32/48px | 8px 主节奏，4px 微调 |
| radius | 8px 控件 / 12px 容器 / 5px 状态标签 | 不把全部页面做成圆角卡片 |
| font | Inter/Geist（可用时）+ Noto Sans CJK SC/PingFang SC/Microsoft YaHei/system | 原型不加载远程字体；正式实现复用已有字体能力 |
| type | h1 30/40，h2 18/28，body 14/24，longform 16/28，caption 12/20 | 数字使用 tabular-nums，金额右对齐 |
| focus | 2px brand，offset 3px | 所有交互元素 keyboard focus |
| shadow | 轻量分层；内容表格主要靠边界 | Dialog 才使用明显阴影 |
| motion | 150ms；prefers-reduced-motion 关闭 | 仅反馈，不装饰 |

CSS 使用语义变量，未来 .dark 可覆写，但本期不呈现未经验证的暗色开关。状态必须同时具备文字；warning 不代表逾期。金额明确显示币种和正负，不计算跨币种总额。

## 3. App Shell 与响应式

- desktop ≥1200：240px Sidebar、64px Header、主区 32–40px 边距；内容最大 1320px。Sidebar 可折叠为 76px，保留带 accessible name 的图标按钮。
- tablet 768–1199：默认 76px 导航；详情辅助栏移动到主栏下方，不挤压正文。
- mobile <768：Sidebar 变成原生模态 Drawer（生产用 Base UI Dialog），关闭后焦点返回触发按钮；Header 显示项目/页面标题。边距 20px，主要触控目标 ≥44px。
- 页面支持 320px；不要隐藏商业影响、冻结版本号、状态和审批动作。表格小屏用等价条目，不复制两个可聚焦版本。
- 顶层：工作概览、我的项目、Owner 可见的供应方成员。项目层：概览、需求、变更与审批、交付、活动记录、成员。
- Workspace 切换仅供应方空间；Client 从“我的项目”进入。混合角色用户在项目 Header 显示“你在此项目：…”，不用全局 user.role。
- 不存在的全局搜索/通知不放装饰入口。默认 SideBar 底部仅个人菜单和使用说明；没有未开发的计费/设置按钮。

## 4. 三张关键页面

### 登录

左侧大比例留白、品牌主张和简洁业务链（澄清 → 双方确认 → 交付验收），右侧 400px 左右表单。标题“欢迎回来”，明确 email/password Label、密码可见切换、错误区与单一主按钮。没有社交登录、密码找回或邮箱邀请假入口。注册成功引导登录；密码规则在注册页说明，不让登录沿用注册最短长度。

手机只保留小型品牌与表单，营销说明后置/简化。原型不收集真实密码，按钮打开设计说明，绝不模拟登录成功。正式登录401显示统一失败文案；429展示等待秒数；会话恢复失败区分网络错误和未登录。

### Dashboard

1. Scope breadcrumb + 当前用户身份。
2. “工作概览”标题，简短说明统计是所选授权项目。
3. 四个平面统计区：参与项目、待我处理、等待他人、已完成交付。无百分比/趋势/收入。
4. 主区待办，三 tab 切换，对应服务端 bucket；行包含类型、需求标题、项目、版本/状态、明确的“查看”链接。
5. 侧区“当前工作空间”及产品内下一步说明，不放假的活动热力图。
6. 下方项目表包含当前项目角色、项目状态和进入项目入口，复用现有 GET /projects。不展示没有聚合契约的逐项目统计。

原型的三项计数与示例列表一致。这里是设计样本，正式 Dashboard 只使用 R07-03，错误时显示错误，不显示“0”。

### 项目详情

1. 标题“青禾 · 会员服务平台”，项目状态和当前项目角色明确。
2. 项目 tab 导航；当前“概览”。
3. 下一步栏突出“待你确认供应方评估”，标明需求、冻结 v2、先供应方后客户；动作是进入版本，不直接一键批准。
4. 主栏“需求与范围”：标题、状态、最新 Revision、最近变化；标题与 UUID 短引用区分，不伪造数据库没有的 R-12 等顺序编号。
5. “初始范围”只读，有“供应方录入的参考快照，不代表双方签署合同”说明。
6. 辅栏成员及唯一 Client，正式提交后说明账号锁定；公开安全姓名，不展示邮箱。
7. 最近活动按审计白名单，可导航到具体对象；拒绝与退回保持不同措辞。

## 5. 其余页面和关键业务交互

### Route / Layout 落点（后续实现）

| 路由 | Layout / 数据来源 |
|---|---|
| `/login`、`/register` | 公开 AuthLayout；既有 auth API，不新增认证系统 |
| `/app` | AuthenticatedShell；`GET /me` 恢复，再查询 Dashboard 与授权项目 |
| `/app/projects`、`/app/projects/new` | 应用 Shell；可选 workspaceId 筛选，Owner 可创建 |
| `/app/workspaces/new` | 应用 Shell；任意已认证用户可创建自己的新空间 |
| `/app/settings/members?workspaceId=…` | 应用 Shell；Workspace Owner 成员管理 |
| `/app/projects/[p]`、`…/members` | ProjectLayout；项目详情/成员，作用域从服务端响应取得 |
| `…/requirements`、`…/requirements/new`、`…/requirements/[r]` | ProjectLayout；列表/表单/问答/当前版本 |
| `…/requirements/[r]/revisions/[rev]` | 只读历史详情，独立 GET 恢复 |
| `…/changes`、`…/changes/[c]`、`…/changes/[c]/versions/[v]` | 列表、草稿/正式审批、只读历史版本 |
| `…/deliveries`、`…/deliveries/[d]` | 列表、单次交付/终审/关联批准版本 |
| `…/audit` | ProjectLayout；角色裁剪后的审计分页 |

Server Components 保持结构和边界，私有数据由认证后 Client Query Provider 通过同源 API 获取。保持 Next 当前 Cache Components 配置，不把 Session/业务响应放进共享缓存。Query Key 统一带 sessionEpoch/userId/项目/资源/筛选/分页；用户切换取消在途请求并丢弃私有 QueryClient，旧响应不得回填新会话。详情响应的真实父 ID 必须与嵌套 URL 一致，否则显示安全 404。

### Feature Components

| 页面/组件 | 信息结构与行为 |
|---|---|
| Workspace / Project 创建 | 窄表单；项目 baselineScope 强调创建后固定；Client 可稍后绑定 |
| 两级成员 | Workspace 已注册邮箱加入 Developer；项目从该空间成员分页选择；Client 独立邮箱绑定区域 |
| Requirement | 原文只在 DRAFT 作者/Owner 可编辑；问答按 QUESTION 分组和 ANSWER 时间排序；READY 禁止追加，解释下一步 |
| Revision | 结构化正文+可增删验收标准；保存为新 Revision，不叫“覆盖”；历史独立路由可刷新 |
| Ready | 显示最新 revisionNo、未答数量、标准数量；预检提示仍以服务器为准；409 不自动重试 |
| CR draft | 需求版本、范围、工时、币种/增量、工期变化、验收标准；保存/正式提交分离；未保存改动退出提醒 |
| CR approval | 冻结快照为主，Owner→Client 两步骤；确认弹窗显示 versionNo/冻结时间/金额/工期；评论说明“双方可见” |
| Rejected | 原版本和拒绝意见不可编辑；“重开评估”后回 DRAFT，再提交形成新 Version；旧审批不继承 |
| Delivery | HTTPS链接+说明+证据，无上传；页头显示 CR短ID / vN / DN；返回修改保留旧记录 |
| Acceptance | ACCEPTED 或 CHANGES_REQUESTED；后者 comment 必填；不使用 expectedVersion；重复决定读取实际终审 |
| History / Audit | 独立链接、分页、日期与操作者；没有审批记录时明确“尚未决定”，不伪造时间 |

### 页面状态

- Loading：匹配最终版式的 Skeleton，aria-busy，避免金额位置闪烁成 0。
- Empty：区分没有数据、筛选无结果、没有获授权项目；只有可执行动作才显示创建按钮。
- Error：页面/区块内错误+重试；保留 requestId；无权限不泄露其他项目名称。
- Saving：按钮 pending，防重复点击；浏览器请求结果未知时提示先核对，不当作失败直接重放。
- Conflict：保留当前输入，显示“内容已更新，请核对最新版”；旧审批确认框失效。
- Success：细粒度确认和真实状态，不只弹 toast；焦点返回合理位置。

## 6. 无障碍与组件落点

- WCAG AA：正文 ≥4.5:1；适用的大字/控件 ≥3:1；focus、label、aria-describedby、错误定位、键盘、200% 缩放与 320px 重排。
- Drawer/Dialog 有名称、焦点管理、Escape 关闭与返回焦点。Tabs 有角色、aria-selected、左右键/Home/End；Sidebar 折叠后保留名称。
- Date 使用 time，金额/表格表头语义清晰；状态 icon aria-hidden。尊重 reduced motion。
- 后续 React 组件：AppShell、WorkspaceSwitcher、ProjectHeader、PageHeader、StatusBadge、ActionItem、MetricStrip、DataTable、FormField、VersionHeader、ApprovalTimeline、AuditTimeline、ConflictNotice、AsyncState。
- 基础交互继续使用现有 Base UI/shadcn Button/Input/Dialog/Table；原型的原生 DOM 交互只是设计验证载体，不成为第三套生产组件框架。
- 业务审批不依赖 UI 做授权，capabilities 只用于展示；Query Cache 和 Session 隔离按已批准规划实现。

## 7. Phase A 视觉评审材料

桌面 1440×1000、手机 390×844 的登录/Dashboard/项目详情截图，及可交互原型和验证脚本存放于 `prototypes/r07/`。实际运行结果由该目录 README 记录，未运行项不得标 PASS。人工视觉结论尚未记录。后续阶段入口和精简验证遵循最新 [R07_PLAN](../engineering/R07_PLAN.md)：在新 Session 明确启动 B 即沿用已交付基线，不重复请求例行批准；这不代表人工视觉验收已通过。

## Phase C 正式页面落实

正式路由为 `/login`、`/register`、`/app`，复用浅色 Tokens 与 Base UI。使用本机字体栈，不在构建时下载 Google 字体。工作概览当前显示真实 `/me` 账号与协作流程说明，不显示占位项目、统计、待办或不可用入口；D 增加项目/工作空间上下文，G 接入 Dashboard 聚合。桌面 240px/可折叠 76px、平板 76px、手机 Dialog Drawer，320px 重排与键盘返回焦点由浏览器测试验证。正式证据见 [C 截图](evidence/r07-c/README.md)，不以 A 的静态原型替代本阶段实现。

## Phase D 正式页面落实

已增加工作概览至“我的项目”的真实入口、可分页的供应方空间选择与项目卡片、窄屏创建表单、项目概览/成员导航。详情显示当前项目角色、只读初始范围、真实成员与客户绑定提示；Owner 独立管理供应方成员并从分页名册分配 Developer，Client 无名册入口。绑定更正说明原客户会失去访问权，正式提交后锁定并禁用表单；竞争409保留输入并读取最新状态。正式 [D 截图](evidence/r07-d/README.md) 来自真实 Next/API/DB，覆盖 Owner 成员管理、Client 手机详情和客户锁定；无占位业务数据。后续 E–G 扩展项目导航，G 再接 Dashboard 聚合。


## Phase G 正式交付（2026-11-12）

正式工作概览已使用真实 Dashboard API，提供授权范围选择、三类事项与计数、状态分布和分页项目入口；不使用原型样本作为业务数据。项目新增交付/历史与活动记录，复用浅色Tokens/表单/Dialog；手机接受确认显示批准版本与具体交付。客户活动由服务端白名单裁剪，已完成严格指已验收交付。代表图见 [G evidence](evidence/r07-g/README.md)；已做320px溢出与最终CSS产物检查，全量键盘/对比度/长内容视觉验收仍留H，人工视觉结论未记录。
