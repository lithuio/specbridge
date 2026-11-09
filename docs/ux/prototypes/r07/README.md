# R07 Phase A — 视觉评审包

这是**独立设计原型**，不属于正式 apps/web 路由。所有人物、项目、计数和历史时间都是明确标注的设计样本。未连接真实 API/PostgreSQL，没有认证、审批或业务写入能力；不得把这些截图视为真实 Dashboard 或 R07 业务 E2E 已完成。

## 查看原型与截图

可直接用浏览器打开 [index.html](index.html)，页面顶端切换登录/Dashboard/项目详情，右上角切换评审角色。支持待办分类、桌面/平板侧栏折叠、手机导航和密码可见性；业务按钮显示原型边界说明。

如果本地浏览器限制 file URL，可从仓库根目录启动仅本机静态服务：

```bash
python3 -m http.server 4177 --bind 127.0.0.1 --directory docs/ux/prototypes/r07
```

然后打开 `http://127.0.0.1:4177/?page=dashboard`。这是复现指令，不表示当前留有运行中的服务。

| 页面 | 桌面（1440px） | 手机（390px） |
|---|---|---|
| 登录 | [截图](evidence/login-desktop.png) | [截图](evidence/login-mobile.png) |
| Dashboard | [截图](evidence/dashboard-desktop.png) | [截图](evidence/dashboard-mobile.png) |
| 项目详情 | [截图](evidence/project-desktop.png) | [截图](evidence/project-mobile.png) |

补充：[Developer Dashboard](evidence/dashboard-developer.png)、[Client Dashboard](evidence/dashboard-client.png)、[手机导航与键盘焦点](evidence/mobile-navigation.png)。除导航为视口截图外，其余为 full-page 截图；源视口桌面 1440×1000、手机 390×844，长页面图片高度会更大。

## 复现浏览器验证

Phase A 不改项目依赖，临时工具安装在 `/tmp`。本次使用 Playwright 1.65.0、@axe-core/playwright 4.14.0、Chromium 158.0.8127.18。中文字体使用系统 Noto Sans CJK SC，不依赖外部字体请求。

```bash
npm install --prefix /tmp/specbridge-r07-browser --cache /tmp/specbridge-r07-npm-cache --no-audit --no-fund --package-lock=false playwright@1.65.0 @axe-core/playwright@4.14.0
PLAYWRIGHT_BROWSERS_PATH=/tmp/specbridge-r07-browsers /tmp/specbridge-r07-browser/node_modules/.bin/playwright install chromium
R07_BROWSER_TOOLS=/tmp/specbridge-r07-browser PLAYWRIGHT_BROWSERS_PATH=/tmp/specbridge-r07-browsers node docs/ux/prototypes/r07/verify.mjs
```

`verify.mjs` 只在 127.0.0.1 临时端口提供四个原型资源，并在结束时关闭自己的服务/浏览器。结果写入 `evidence/verification.json`，截图覆盖相应文件；不触碰已有 API/Web 进程，不读取 .env。若运行在受限沙箱，网络下载、本地监听和浏览器启动可能需要沙箱外授权。

## 实际验证范围

最终执行：**PASS，40 项检查、0 axe A/AA 规则违规、9 张截图**。对应结果限定为本设计原型。

最终机器结果见 [verification.json](evidence/verification.json)，初轮缺陷证据见 [verification-initial.json](evidence/verification-initial.json)。完整检查包含：

- 三张页面 × 五个宽度（1440/1024/768/390/320）的页面横向溢出与 axe WCAG A/AA 规则扫描。
- Tab 左右键/Home/End 与三分类示例计数一致。
- 桌面折叠及平板初始紧凑/展开/折叠，保留 accessible name。
- Developer/Client 示例视图无供应方成员管理导航；这不属于真实权限验证。
- 手机 Dialog 连续 Tab 循环、Escape 关闭与焦点返回。
- 登录密码可见性和业务按钮的原型说明，没有模拟成功写入。
- 十组语义 Token 对比度；无页面脚本错误、外部资源或 API 请求。

已处理失败：首次下载因沙箱网络 EPERM 失败，获准仅在 /tmp 下载；首次执行因本地监听 EPERM 被阻止；版本信息读取遇到 package exports 限制后改为显式读取临时工具 manifest。初轮实际浏览器测试发现手机 Drawer 的 Tab 末尾离开模态内容，已补显式焦点循环后重跑。同轮人工查看截图后，将桌面 Sidebar 固定到视口，并移除 Dashboard 契约未包含的工时/问题正文样例。

人工图像检查范围：中文无缺字，页头/表格/侧栏/正文无重叠截断，手机按单栏重排，版本和下一步操作清晰。此为工程自检，不替代负责人视觉验收。

**NOT RUN**：真实 API/DB 浏览器流程、R01–R06 回归、生产构建、Firefox/WebKit、屏幕阅读器、原生 200% 浏览器缩放和生产 HTTPS/Cookie。axe 无违规不等于完整 WCAG 合规；真实业务权限不能由静态角色视图证明。

## 文件职责

- [tokens.css](tokens.css)：可执行 Design Tokens。
- [prototype.css](prototype.css)：独立布局/响应式样式；后续映射为 Tailwind/组件，不把整份 CSS 原样注入正式应用。
- [prototype.js](prototype.js)：本地样例和设计交互；后续由 React、Base UI、真实 Query 数据替换。
- [verify.mjs](verify.mjs)：原型专用检查，不是正式浏览器 E2E 套件。
- 设计说明：[R07_DESIGN](../../R07_DESIGN.md)；接口定义：[R07_READ_MODELS](../../../architecture/R07_READ_MODELS.md)；后续步骤：[R07_PLAN](../../../engineering/R07_PLAN.md)。

当前停点：Phase A 已交付，人工视觉结论未记录；按最新 [R07_PLAN](../../../engineering/R07_PLAN.md) 在新 Session 明确启动 Phase B 后继续。本轮不进入 B。没有 Commit、Push、PR 或部署。
