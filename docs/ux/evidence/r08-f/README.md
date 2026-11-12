# R08 F — 真实 AI 浏览器与最终视觉检查

2026-11-12，Chromium 149.0.7827.55 / Playwright 1.61.1，现有 Next 生产构建→Nest→隔离 PostgreSQL。所有账号和业务内容均为合成资料。真实模型运行 `pnpm test:browser:real-ai`，1 场景 PASS（16.4s）；普通 36 场景浏览器回归最终全部 PASS。完整命令与失败修复见 [工程证据](../../../engineering/evidence/r08-f/README.md)。

| 截图 | 实际内容 |
|---|---|
| [分析桌面全页](analysis-desktop.png) | 1440×1000 视口，全页：真实 DeepSeek 五类建议、原始输入、AI 提示和未选择状态 |
| [人工确认手机](human-review-mobile.png) | 390×844：编辑并选择建议后，原 R04 Revision 表单；正文/验收标准和保存按钮可见，尚未自动保存 |
| [Copilot 桌面](copilot-desktop.png) | 1440×1000：真实工具读取后的状态/阻塞点建议，独立滚动区与底部输入 |
| [Copilot 手机](copilot-mobile.png) | 390×844：实际 Requirement/Revision 来源链接、下一步建议与输入区；长文滚动到底部 |
| [Token 桌面](r08-d-desktop-tokens.png) | 本轮真实创建后的安全列表，无明文 Token；1440px 全页 |
| [Token 手机撤销](r08-d-mobile-revoke.png) | 390×844：人工撤销确认，Token 不进入截图 |

六张图均已逐张查看。沿用 R07 浅色 Shell、紫色动作和卡片；未发现水平溢出、控件遮挡、中文缺字或手机保存按钮不可达等阻断问题。长模型结果需要纵向滚动，Copilot 输入区仍可见；结果偏长和偶有内部状态码属于待人工确认的文案质量问题，未在 F 重新设计 UI。

真实模型场景断言：[业务与来源结果](result.json)。原文保持、明确人工保存使用 expectedVersion、新 Revision 后为 CLARIFYING，AI/Copilot 不自动 Ready/Submit/审批/验收；Copilot 后原 Revision 和业务/审计快照不变。其他确定性场景覆盖选择/编辑/删除、stale/409、未知写入结果、Client 限制、失败后手动流程、多轮对话、项目切换与撤权。

键盘验证：抽屉 Tab/Shift+Tab 焦点包含、Escape 关闭和入口焦点恢复；手机/320px 重排；Token Dialog 焦点与撤销操作。这里使用桌面 Chromium 模拟视口，不等同真实触屏或读屏器。

可访问性原始安全结果：

- [真实模型 5 状态](accessibility.json)：0 自动违规；手机导航/叠层颜色无法由 axe 唯一判定，保留 incomplete，补充实际计算对比度最低 5.94:1。Drawer 的 aria-hidden-focus 守卫仍有未判定项，已有键盘验证，但需人工读屏核验。
- [AI Mock 审阅](r08-b-accessibility.json)、[Copilot 多轮](r08-c-accessibility.json)、[Token 生命周期](r08-d-accessibility.json)：最终 0 自动违规，未判定项原样保留。
- [按钮动画取证](r08-c-button-transition.json)：首次 Copilot 颜色检查采样到 opacity=0.5 / running；等待同一按钮实际启用且 opacity=1 后，同样 axe 检查通过。测试没有禁用动画或忽略对比度规则。

NOT RUN：独立人工视觉签字、Firefox/WebKit、多 OS、真实手机、屏幕阅读器、实际 200% 缩放。该记录是 Agent 自查，负责人验收见 H-11。
