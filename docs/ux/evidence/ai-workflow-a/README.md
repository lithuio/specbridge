# AI工作流 A — 浏览器视觉与键盘证据

2026-11-13，真实Chromium/Web/API/隔离PostgreSQL。工作台为双任务入口，沿用R07 App Shell、表单、状态及按钮；未重设计壳层。

- [桌面：部分问题发布预览](clarification-desktop.png)，1440px。
- [手机：规格发布确认](specification-mobile.png)，390px。
- [窄屏：工作稿与原业务入口](specification-320.png)，320px，无横向溢出；验收条目删除按钮在窄屏下改为纵向排布。
- [真实DeepSeek建议](real-analysis-desktop.png)、[人工确认手机页](real-human-review-mobile.png)。
- [真实Copilot桌面](real-copilot-desktop.png)、[真实Copilot手机](real-copilot-mobile.png)。
- [Mock工作台axe结果](accessibility.json)、[真实Provider流程axe结果](real-accessibility.json)：自动违规0，未判定项保留原结果；窄屏滚动导航的补充对比度通过。

键盘实际覆盖Enter打开发布预览、焦点移到确认标题；Copilot既有Tab/Shift+Tab/Escape回归通过。六个工作台场景以及R04/表单/Copilot回归无浏览器pageerror。

截图仅含合成数据，不含会话或密钥。全页截图会压缩展示，人工审阅可打开原图。代理已查看桌面与手机代表性图片；这不代替负责人视觉签字、读屏、真实设备或200%实际缩放验证。
