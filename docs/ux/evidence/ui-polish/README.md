# 本地使用反馈 — UI 细化验证

2026-11-12。仅 Web 呈现与导航交互调整；复用既有 API、查询权限、会话隔离和审批/交付写入行为。无依赖、后端、数据库或迁移改动；未 commit/push/部署。人工视觉评审由负责人完成。

## 界面调整

- 登录/注册主按钮文字居中，品牌小幅放大；创建工作空间/项目入口更明显。
- 刷新图标统一为44px点击目标，保留名称/title、原事件、禁用状态和弹窗焦点返回 ref，忙碌动画尊重 reduced motion。
- 桌面264px侧栏展示最多12个授权项目，原生 details 展开分区；更多项目通过完整列表查看。手机 Drawer 支持同样的项目入口、独立滚动和关闭导航。折叠/平板窄栏仍保留顶层导航。
- 项目 ID 映射六色装饰标记，跨页面/刷新稳定；分区图标固定配色。颜色不代表状态、权限或唯一项目身份，不新增手工配色配置。
- 首页突出真实统计/待办，状态分布收紧，项目名称强化；账号区可折叠且默认以紧凑布局显示，页头账号可跳转此区域。

## 可复现命令与结果

所有命令在仓库根目录执行。测试使用 `.env.test`、5434隔离 PostgreSQL；真实代理/浏览器运行前释放3000/4000。沿用已审核迁移，保留历史数据与触发器。数据库/监听/浏览器命令在获准的沙箱外运行。

| 命令 | 结果 |
|---|---|
| `pnpm run lint` | PASS，API/Web；最终检查无警告 |
| `pnpm run test` | PASS，现有单元测试 |
| `pnpm run build` | PASS，API/Web生产构建 |
| `pnpm --filter specbridge-api typecheck` | PASS |
| `pnpm --filter web typecheck` | PASS，最终检查 |
| `pnpm run db:check` | PASS，迁移元数据 |
| `pnpm --filter specbridge-api openapi:check` | PASS，30 paths，无契约漂移 |
| `pnpm run test:integration` | PASS，8文件/90项 |
| `pnpm run test:e2e` | PASS，3文件/5项 |
| `node scripts/with-env.mjs .env.test pnpm --filter specbridge-api test:e2e:reads` | PASS，9项，等待端口期间先行验证 |
| `pnpm run test:e2e:db` | PASS，全量62项：auth16/rbac13/requirements9/changes8/deliveries7/reads9，含真实Next代理 |
| `pnpm run test:browser:presentation` | 最终PASS，1场景/6.3s（场景3.8s） |
| `pnpm run test:browser` | PASS，生产构建与七套件连续成功，共16场景：6/2/2/2/2/1/1；最终presentation场景4.8s |
| `git diff --check` | PASS |

原有浏览器套件继续覆盖401/403/404/409/422/429、跨项目和会话切换、不可变版本、拒绝重提、顺序审批、交付退回重交、未知写入结果不重放及弹窗返回焦点。新增场景通过真实 API 创建13个项目，验证侧栏12项上限/更多入口、键盘展开/桌面折叠/手机链接关闭、配色跨页面和刷新一致、图标刷新触发真实请求、加载失败隐藏旧列表、B无法访问A项目且侧栏无残留。

## 本轮评审截图

均来自真实隔离测试栈；样本账号/项目为测试 fixture，随机邮箱遮罩。项目配色根据随机 ID 分配，因此每次重跑样本颜色可能不同，同一项目始终一致。已逐张查看，无主要内容遮挡。

| 图片 | 内容 |
|---|---|
| [登录桌面](login-desktop.png) | 居中文字、品牌字号与主按钮 |
| [首页桌面](dashboard-desktop.png) | 多项目侧栏、真实统计、待办及状态分布 |
| [首页手机](dashboard-mobile.png) | 390px布局、创建与刷新入口 |
| [项目详情](project-desktop.png) | 展开的侧栏、项目主题与彩色分区导航 |
| [手机项目导航](projects-drawer.png) | 390px Drawer、项目展开与底部账号 |
| [账号区](account-panel.png) | 紧凑账号布局与图标刷新，邮箱已遮罩 |

[界面可访问性报告](accessibility.json)含10个状态；[完整业务链可访问性报告](workflow-accessibility.json)含17个状态。共27状态，axe自动违规0；原始 incomplete 保留（界面4项、业务链7项），层叠/离屏导致的颜色未判定使用既有 computed contrast 补查。界面补充对比度5.94–16.03:1。覆盖320/390/720/768/900/1440 CSS px及真实键盘操作；不等于独立WCAG认证或真实辅助技术验收。

## 遇到的问题与修正

1. 数据库集成首轮因沙箱网络限制 EPERM，90项未执行；获准在沙箱外重跑通过。
2. 开发服务占用3000/4000，未终止用户进程；用户停止后继续完成验证。
3. 新增界面用例首次在重新打开的Drawer内直接寻找已收起链接超时；修正为先展开再进入。第二次误以为B登录必回首页，实际沿用项目return path并正确拒绝未授权访问；用例现核对404/空侧栏，再经主导航回首页。未修改业务行为以适配测试。
4. 长页面截图先滚回顶部，手机/Drawer用视口截图；新增账号局部图并遮罩邮箱。Playwright默认清理test-results会删除前套件截图，改为运行产物 `test-results/runs`、评审图片 `test-results/evidence` 分离；H沿用同一证据根目录。历史C–H证据保持原样。

完整入口自动将重跑图写到忽略目录 `apps/web/test-results/evidence`；本目录是最终人工可评审快照。无需反复重跑已通过检查。远程CI、多浏览器、真实设备/读屏、生产HTTPS和独立人工评审未执行；开发数据库未访问，测试子服务自动退出，既有隔离库保持运行。

建议提交：`style(web): refine workspace navigation and visual hierarchy`。
