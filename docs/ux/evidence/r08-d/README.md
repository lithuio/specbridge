# R08 D — Project API Token 浏览器证据

2026-11-12，本地 Chromium + Next/Nest 生产构建 + 5434 隔离 PostgreSQL；合成账号/项目，不需要 DeepSeek Key。`pnpm test:browser:tokens` 最终4场景PASS，7.7秒。复现前先构建API/Web，3000/4000需空闲。

- [桌面凭据列表](desktop-tokens.png)：1440×1000视口、整页截图；Owner入口、固定只读权限、期限与列表，明文窗口已关闭。已查看，正文与操作清晰。
- [手机撤销确认](mobile-revoke.png)：390×844，确认内容/取消/关闭/确认按钮完整；等对话框动画结束后取证。已查看，无凭据正文。
- [可访问性原始记录](accessibility.json)：1440/390/320三状态、每状态28项规则通过、自动违规0。手机横向裁剪的项目导航导致4个颜色未判定项，保留原记录；补充实际computed颜色对比为5.94:1或7.44:1，均高于4.5:1。不称作全量人工可访问性验收。

测试包含真实创建、独立Bearer空批准读取、撤销后401、列表不返回明文/摘要、浏览器持久存储无凭据、关闭/后台/切页/刷新清理、迟到响应丢弃、创建响应丢失时核对撤销、Developer/Client直接路由和API拒绝。后台场景通过原生visibilitychange事件模拟；未声称真实移动设备后台测试。键盘验证对话框焦点留在内部，所有场景无pageerror。

不保存明文展示截图、trace、video、HAR或storageState。首轮失败发生在关闭动画中做颜色检测、路由跳转未提交便reload；修正等待可观察状态后最终通过。NOT RUN：Firefox/WebKit、真实设备/读屏、独立人工视觉及安全Review。
