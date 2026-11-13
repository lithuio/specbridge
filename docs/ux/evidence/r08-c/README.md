# R08 Phase C — Project Copilot 验证证据

2026-11-12，分支 `feat/17-ai-agent-integration`，开工HEAD `642954a`。真实Next生产构建、Nest授权业务API、5434隔离PostgreSQL和Chromium；浏览器场景仅将外部DeepSeek transport替换为合成响应，未使用真实客户资料/Key/会话录制。不是视觉设计重做。

- [桌面1440×1000](desktop-copilot.png)：需求页面右侧Drawer，项目/页面范围、未批准建议标识、澄清阻塞点、人工下一步、需求编辑版本2及Revision 1来源、输入区。
- [手机390×844](mobile-copilot.png)：第二轮对话及真实来源，源链接导航到历史Revision后的页面范围，滚动区域与底部输入区均可见。
- [可访问性原始记录](accessibility.json)：桌面、390与320三状态axe自动违规0；各有2类未判定项，未删除或冒称全面通过。被遮挡/裁剪文字补充计算对比度5.94–16.03:1。320/390/1440无横向溢出，Tab/Shift-Tab限制在Drawer，Escape关闭后焦点回入口。

最终命令 `pnpm test:browser:copilot`：PASS，4场景12.2秒，无自动重试。覆盖多轮及来源、失败/限流/无效链接/权限撤回、保留输入与手动入口、全局选择/空项目/换项目清空、关闭取消及迟到响应丢弃。前端65秒等待上限用缩短原生timer验证，不声称等待真实65秒；后端60秒总期限另由单元fake timers验证。

两张最终截图已逐张查看，确认正文/来源/输入区进入画面。运行失败与修正过程见 [R08_PLAN](../../../engineering/R08_PLAN.md)。独立人工视觉评审、读屏、真实移动设备和Firefox/WebKit NOT RUN。

另行执行真实DeepSeek授权HTTP Smoke：PASS，3次模型请求、2次工具读取、需求/Revision来源与业务不变检查通过；该结果不是这些浏览器截图的模型来源，详见计划交接。
