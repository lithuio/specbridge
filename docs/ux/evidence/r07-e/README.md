# R07 Phase E — 需求与 Revision 浏览器证据

2026-11-11，本地完成。正式 Next production / 既有编译 Nest API / 5434 隔离 PostgreSQL / Chromium；复用 C/D 启动器、账号 fixture 与已审核迁移，无 Mock 业务数据、无新增依赖。人工视觉评审未记录。

| 页面 | 截图 | 视口 |
|---|---|---|
| Developer 已就绪需求、真实问答、最新 Revision 与历史 | [桌面整页](requirement-ready-desktop.png) | 1440×1000 |
| Client 独立访问并刷新不可变旧 Revision | [手机整页](revision-history-mobile.png) | 390×844 |

两张图已查看；截图不含邮箱、密码或 Cookie。关闭 trace/HAR/video/storageState。原文中的 `<script>` 测试字符串以普通文本展示，无执行。320px 无横向溢出。

## 实际验证

最终 `requirements.spec.ts` 两个真实场景通过（17.1s），三角色独立浏览器 Context，无 pageerror。Web typecheck、lint、production build、`git diff --check` 通过。

1. Given 已分配 Developer 与 Client 的项目：Client 浏览器创建需求、必填校验、成功后返回创建页可继续新建；Owner 并发修改后 Client 保存得到真实 409，输入保留、核对最新版后手动重提，PATCH 次数为 1→2。Owner 可编辑他人 DRAFT，非作者 Developer 无按钮且 API 403；Client 无 Revision/Ready 按钮且对应 API 403。Developer 发问→Client 回答→Developer 保存 Revision 1（无标准不能 Ready）→Revision 2（两条标准）→Ready；原文不可再编辑、Ready 禁问答。旧 Revision 正文/标准不变，历史独立 GET 与刷新恢复。Owner 可见的两个项目仍不能拼接父子 URL；跨 Requirement 的 Revision 404；Client 读取其他项目需求404。覆盖 AC-06/07/08/16 与 AC-05 的核心边界，不声明全部 P0 验收。
2. Given 有有效 Revision：打开 Ready 确认后并发生成新 Revision，旧请求 409，绝不自动确认新规格；有未答问题时继续禁 Ready，回答并核对后手动确认。打开修订表单后通过既有 R05 API Submit，真实 409 REVIEW_IN_PROGRESS，正文保留、刷新 capability 后禁提交；VENDOR_APPROVED 继续阻断、刷新仍禁修订，旧指针不变（AC-25）。13个真实 Revision / 13条需求验证12条分页及 URL 刷新；Revision 1 深链接恢复。需求创建成功但响应丢失时保留输入、禁重发、列表可查实际对象，POST 仅一次。R05 仅用于 Pending 前置，不实现 F UI、不直接写 SQL。

## 精确命令与复现

```bash
pnpm --filter web build
pnpm --filter web typecheck
pnpm --filter web lint
env LD_LIBRARY_PATH=/tmp/specbridge-browser-libs/root/usr/lib/x86_64-linux-gnu FONTCONFIG_FILE=/tmp/specbridge-browser-libs/fonts.conf pnpm run test:browser:requirements
git diff --check
```

已有 API 构建与 D 源码一致，本轮未改后端，未重新编译或回归无关后端。若从干净 checkout 复现，先 `pnpm --filter specbridge-api build`；本机临时浏览器库/字体与标准安装方式见 [C 环境说明](../r07-c/README.md) 和 [Web README](../../../../apps/web/README.md)。临时库不保证重启后保留，不是项目新增依赖。`test:browser:requirements` 仅加载 `.env.test`，端口3000/4000不得被占用；沿用启动器的隔离库身份检查，未访问开发库、清表或关闭不可变触发器。

根 `test:browser` 已追加 E，仍分别启动每个套件的 API 避免叠加真实登录限流配额；本轮只执行 E 定向命令，未执行根全量命令。

## 已处理失败与未运行项

- 初次 typecheck 的 QUESTION/ANSWER union 按生成契约收窄；一次与构建并发的 typecheck 读到未完成的 Next 路由类型，改为构建后顺序检查。最终检查通过。
- 沙箱 Turbopack 端口限制与失败缓存：缓存保留到 `/tmp/specbridge-r07-e-build-813w9xcj/next`，获准沙箱外新缓存构建通过；浏览器启动器同样获准沙箱外运行。
- 首轮 Playwright `getByLabel` 同时命中 Next Activity 隐藏创建页，改用可见的 `getByRole`；另一断言误将 vendor-decision 成功码写成201，依 R05 修正为200。保留完整风险断言，最终通过。
- Next Activity 成功表单状态保留问题已修复：仅成功后隐藏时清空；未提交输入及未知结果不清空，新增返回/前进验证通过。
- 未运行：C/D 浏览器回归、R01–R06 全量回归、契约重生成（后端/契约未改）、远程 CI、人工视觉/安全 Review、生产 HTTPS、多浏览器、完整审批交付链与全量可访问性审查。集中验收仍留 H，不据此声称全 R07 DoD。
- 自建 API/Web 由原启动器退出时回收；已有隔离数据库保持运行。本轮没有 Commit/Push/创建 PR/Merge/部署。
