# Copilot 人工确认提案 — 浏览器证据

2026-11-13，真实Next生产构建/API/隔离PostgreSQL；本目录仅合成项目与需求，无账号密码、Token、Prompt请求或浏览器存储状态。

- `proposal-desktop.png`：1440×1000，编辑一个问题并取消另一个；预览独立滚动，任务展开时收起聊天输入，沿用R07 Drawer。
- `proposal-mobile.png`：390×844，同一预览布局，无横向溢出。
- `real-proposal-preview.png`：真实DeepSeek生成5个问题后，用户选择1个并编辑，进入明确业务确认；这张记录在最终收起聊天输入的微调之前，作为真实功能证据保留。
- `real-proposal-result.json`：真实工具来源、合成回答、确认前业务不变与确认后只新增1个问题的断言摘要。
- `accessibility.json`：桌面/手机各26规则通过、0自动违规；`aria-hidden-focus`/`color-contrast`有未判定项。测试另验证12次Tab始终在Drawer内、颜色计算补充及390px无横向溢出，不代表完整读屏/真实设备人工验收。

最终新增Mock浏览器4项PASS，原Copilot4项PASS，独立真实DeepSeek1项PASS。已实际查看桌面/手机与真实预览图片。任务内容长时需要纵向滚动；模型回答仍偏长且可能暴露产品内部状态字段文案，需独立产品Review。执行按钮不会由聊天文字触发。
