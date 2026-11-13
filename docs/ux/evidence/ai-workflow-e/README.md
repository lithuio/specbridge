# AI工作流 E — 浏览器与视觉证据

2026-11-13。使用真实Chromium、Next生产构建、Nest API与已批准5434隔离PostgreSQL，测试账号/资料均为合成数据。完整Mock浏览器14套件44场景通过；三种真实DeepSeek场景均已有成功记录，过程失败与复验见[工程证据](../../../engineering/evidence/ai-workflow-e/README.md)。未改App Shell或视觉方案，没有浏览器trace/HAR/Token截图。

## 已打开检查的代表性截图

| 场景 | 图像 |
|---|---|
| 只问问题、保存本人稿、明确发布 | [桌面](mock/ai-workflow-a/clarification-desktop.png) |
| 整理规格、人工Revision确认 | [320px](mock/ai-workflow-a/specification-320.png)；[390px](mock/ai-workflow-a/specification-mobile.png) |
| Client只见明确共享资料 | [手机](mock/ai-workflow-b/client-shared-mobile.png) |
| Copilot个人提案 | [桌面](mock/ai-workflow-c/proposal-desktop.png)、[手机](mock/ai-workflow-c/proposal-mobile.png) |
| Owner本地连接确认 | [桌面](mock/ai-workflow-d/desktop-confirm.png)、[手机](mock/ai-workflow-d/mobile-confirm.png) |
| 真实DeepSeek答复与业务来源 | [桌面](real/ai-workflow-a/copilot-desktop.png)、[手机来源与键盘焦点](real/ai-workflow-a/copilot-mobile.png) |
| 真实共享背景分析 | [分析与来源](real/ai-workflow-b/real-background-analysis.png) |
| 真实提案选择、预览再确认 | [确认前](real/ai-workflow-c/real-proposal-preview.png) |

已打开抽查以上主要桌面/手机图像；没有发现新增遮挡、正文裁切或页面横向溢出。窄屏项目导航本身可横向滚动；长提案在Drawer内部滚动，确认按钮位于内容末端。全页截图的固定导航位置反映截图时滚动位置，不等于独立设备视觉验收。其余原业务回归图像在`mock/r07-*`、`mock/ui-polish`及Token/Copilot目录。

## 键盘与可访问性

[自动检查摘要](accessibility-summary.json)：48个状态、0自动违规，26个状态仍含`aria-hidden-focus`或`color-contrast`未判定项。各场景原始JSON保留incomplete和补充计算对比度，不能将其消去后声称无障碍全通过。44场景中包含焦点约束/恢复、Tab/Space/Enter明确确认、Drawer关闭、手机320/390px和原桌面重排；真实AI场景另覆盖键盘到来源和输入区。

本轮未新增UI阻断问题。仍需负责人核对：真实Copilot答复偏长，出现DRAFT、clarifications、markReady等技术词；模型对“持久化个人预览”和“正式业务写入”的描述未必精确，应按UI提示、真实来源及人工确认判断，不能只凭模型措辞认定业务事实。长工作台/提案的阅读和滚动成本、实际手机、读屏及人工200%缩放未由截图替代，见H-18/H-20/H-21。

采用`R07_EVIDENCE_ROOT=../../docs/ux/evidence/ai-workflow-e/mock`保存本轮全量截图，真实AI使用`.../real`。历史A–D截图保持。截图只含合成业务对象与无秘密连接指纹，真实Token与密钥未进入图像。
