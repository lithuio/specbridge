# R07 Phase C — 正式应用浏览器证据

2026-11-11，本地完成。以下来自正式 Next 生产构建 + 编译 Nest API + 5434 隔离 PostgreSQL，使用真实 UUID 测试账号；不是 Phase A 静态原型。图片已逐张检查，随机邮箱用灰色遮罩隐藏，无密码、Cookie 或数据库凭据。人工视觉结论尚未记录。

| 页面 | 截图 | 视口 |
|---|---|---|
| 登录 | [桌面](login-desktop.png) | 1440×1000 |
| App Shell / 工作概览基础布局 | [桌面](shell-desktop.png) | 1440×1000 |
| 登录 | [手机](login-mobile.png) | 390×844 |
| App Shell / 当前账号 / 使用说明 | [手机整页](shell-mobile.png) | 390×844，整页截图 |
| Base UI 导航 Drawer | [手机](drawer-mobile.png) | 390×844 |

`/app` 仅展示真实 `/me` 账号与协作说明。D 的项目设置、G 的 Dashboard 统计/待办尚未实现，图片不宣称这些功能完成。

## 实际验证

最终 `pnpm run test:browser`（附下方临时环境变量）PASS：6 场景 / 6.2 秒浏览器阶段；命令先构建 API 与 Web，再启动 Next production server。无未捕获浏览器异常。

1. 真实注册、注册密码输入校验、不自动登录、错误密码 401、注册账号登录、Cookie HttpOnly/SameSite、刷新 `/me` 恢复、伪造 Origin 403、UI 退出及旧 Cookie 401、返回历史不露私有数据。
2. 同一个 Provider 内 A→退出→B；延迟 A 的真实 200，释放后仍仅显示 B；不持久化 A 信息。
3. 服务端撤销后保护请求 401；私有内容清除、转登录；`/me` 网络失败不当作匿名，保留可重试界面。
4. 手机登录/退出、Drawer 真实边界和内容可见、Escape 关闭并返回焦点、320px 无横向溢出。
5. 用共享 Cookie 的真实 API 登录模拟其他标签切换身份，focus 重新确认；退出网络失败时隐藏私有内容，人工重试成功。未单独宣称 BroadcastChannel 多标签压力测试通过。
6. 延迟 A 的真实 401，B 登录后释放不会将 B 退出；真实服务端 429 显示 Retry-After 秒数。

仅延迟/中断 transport，不伪造成功业务数据。无 trace/HAR/video/storageState 持久文件。数据库保留本轮一次性测试账号；不清空 public、不禁用历史触发器，不访问开发库。测试启动器已结束自己的 API/Web。

## 复现

常规：按 [Web README](../../../../apps/web/README.md) 安装 Playwright Chromium 与系统依赖，`pnpm run db:test:up` 后运行 `pnpm run test:browser`。

本机标准 `playwright install-deps chromium` 因 sudo 要求密码未完成；已获准将 Ubuntu 22.04 的 libnspr4/libnss3/libasound2/fonts-noto-cjk 下载并解包到 `/tmp/specbridge-browser-libs/root`，不修改系统库。当前会话实际命令：

```bash
env LD_LIBRARY_PATH=/tmp/specbridge-browser-libs/root/usr/lib/x86_64-linux-gnu FONTCONFIG_FILE=/tmp/specbridge-browser-libs/fonts.conf pnpm run test:browser
```

临时目录可能随重启丢失；新环境优先在有 sudo 权限的终端执行标准 `pnpm --filter web exec playwright install-deps chromium`，并安装中文字体。Chromium 使用 `pnpm --filter web exec playwright install --only-shell chromium` 下载的 149.0.7827.55 / revision 1228，Playwright 固定 1.61.1。

若当前机器仍无 sudo，可在临时目录 `apt-get download libnspr4 libnss3 libasound2 fonts-noto-cjk`，逐个 `dpkg-deb -x <包> /tmp/specbridge-browser-libs/root`；`fonts.conf` 包含 `/etc/fonts/fonts.conf`，额外 font dir 为 `/tmp/specbridge-browser-libs/root/usr/share/fonts/opentype/noto`、cache dir 为 `/tmp/specbridge-browser-libs/font-cache`。不改测试代码或应用依赖来绕过系统安装。

## 已处理失败 / 范围限制

- 沙箱 npm、Turbopack 端口、数据库/HTTP 启动受限，获准后重跑；完整 Chromium 下载多次 TLS 错误，改下载所需 Headless Shell 成功；缺系统库采用上述临时方式解决。
- 首次业务测试的 alert 选择器碰到 Next route announcer，改为有名称的错误区域；应用标题改为登录/注册的主标题。
- 截图发现输入框被基础高度覆盖、手机触发器在桌面显示、Drawer 继承居中动画。修复为 46px 输入、至少 44px 按钮、专用 Dialog drawer 变体，增加视口边界断言后通过。
- 最终截图来自生产 Web，已排除开发工具浮层；不将本地检查称为人工视觉验收、生产 HTTPS、跨浏览器或全 R07 验收。
