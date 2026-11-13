# 项目背景资料 — 浏览器证据

2026-11-13，真实 Chromium / Next / Nest / 隔离PG；全部为合成项目。已实际打开检查以下图片：

- [Owner桌面](documents-desktop.png)：共享v1与内部替换v2同屏，操作需人工确认。
- [Owner手机390px](documents-mobile.png)：文件选择、版本及按钮重排，无横向正文溢出。
- [Client手机390px](client-shared-mobile.png)：只显示共享v1，没有内部版本/上传/配额信息。
- [真实DeepSeek澄清](real-background-analysis.png)：只将共享背景用于公开辅助；来源可定位版本/段。

[axe结果](accessibility.json)：桌面24、Client手机21、Owner手机24条规则通过，0自动违规。手机水平滚动项目导航的color-contrast自动检查存在incomplete，补充实际计算值均≥4.5；保留原结果，不冒充完全自动判定。

视觉自检：R07浅色、侧栏、导航和面板保持；文件选择按钮新增边框/焦点。浏览器原生选择控件文案随浏览器语言；长文件名可折行。真实模型回复偏长，仍需人工核对，不代表已批准事实。读屏、真实设备和独立视觉签字NOT RUN。

测试：2个新增Mock浏览器场景、1个真实Provider场景；另有工作台6/Copilot4/Projects2回归。首次Client取证误拍加载态已丢弃重拍，当前图片等待共享内容出现。
