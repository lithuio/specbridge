# AI工作流 — 视觉与交互统一

2026-11-13。开工分支 `feat/17-ai-agent-integration`，HEAD `184112e`。负责人在完成本地验证后要求统一新增组件的视觉与交互；本轮只调整 Web 呈现、焦点和操作反馈，保留现有 API、业务状态、授权、人工确认、CAS 与未知结果处理。没有新增依赖、Schema、迁移或模型能力，没有自动 Git 写操作。

## 本轮调整

- 背景资料：统一图标刷新、中文文件选择控件、文件大小提示、内部/共享版本层次、解析状态与操作成功反馈。替换文件时滚动并聚焦选择区；共享/撤回/停用复用 Base UI 确认弹窗，保留目标版本、警告、409 与结果未知处理。
- 访问凭据：桌面双栏创建/列表，手机单栏；统一状态标签、只展示一次与撤销弹窗。连接区显示三步操作说明、命令面板和复制成功反馈；修改路径后旧命令与复制反馈立即消失。凭据清理与生命周期逻辑不变。
- Copilot：统一项目上下文、提问卡、消息气泡、阻塞提示、下一步编号路径和真实来源卡片。建议按钮仅填入输入框并聚焦，仍须用户发送；答案按段落渲染为纯文本。下一步视图展示已有建议，没有推导业务进度或新增虚构统计。
- 个人提案/需求工作台：统一展开控件、任务切换、原生选择框、问题选择卡、编辑字段与确认预览。人工选择、保存工作稿、正式发布的原行为保持。
- 样式集中在 `apps/web/src/app/ai-workflow.css`，延续 R07 色彩、字体、44px 点击目标、Base UI/Lucide 与既有 App Shell；手机窄屏重排，尊重减少动画设置。

参考 [Linear 官方 UI 更新](https://linear.app/changelog/2026-03-12-ui-refresh)的层次与信息密度，以及 [Vercel AI Elements](https://elements.ai-sdk.dev/)对消息、建议和来源的组织方式；只作设计参考，没有安装这些组件或替换现有框架。

## 可复现验证

所有命令在仓库根目录运行。真实 Chromium + Next 生产构建 + Nest API + 已批准的5434隔离 PostgreSQL；账号、文件和业务对象均为合成测试数据。用户停止占用3000/4000的开发服务后运行测试栈。浏览器脚本只在隔离库沿用已批准迁移，不访问开发库或生成新SQL。

每条浏览器命令使用前缀：

```sh
R07_EVIDENCE_ROOT=../../docs/ux/evidence/ai-workflow-polish
```

例如：

```sh
pnpm --filter web build
R07_EVIDENCE_ROOT=../../docs/ux/evidence/ai-workflow-polish pnpm test:browser:documents
```

构建与浏览器套件串行执行，避免覆盖运行中的 `.next`；历史阶段证据不覆盖。

| 实际命令 | 最终结果 |
|---|---|
| `pnpm --filter web typecheck` | PASS |
| `pnpm --filter web lint` | PASS，0警告 |
| `pnpm --filter web build` | PASS |
| `pnpm test:browser:documents` | PASS，2场景 |
| `pnpm test:browser:copilot` | PASS，4场景 |
| `pnpm test:browser:tokens` | PASS，4场景 |
| `pnpm test:browser:connections` | PASS，2场景，含脚本内MCP构建 |
| `pnpm test:browser:proposals` | PASS，4场景 |
| `pnpm test:browser:ai` | PASS，6场景 |
| `pnpm test:browser:forms` | PASS，6场景 |
| `pnpm test:browser:projects` | PASS，2场景 |
| `pnpm test:browser:presentation` | PASS，1场景 |
| `git diff --check` | PASS |

九套件共31场景通过，重跑不重复计数。测试栈已退出，3000/4000已释放；原有API构建缓存与开工备份逐字节一致。

新增断言覆盖：建议按钮不发送模型请求、填入内容与输入焦点、共享弹窗有名称与初始焦点、Escape取消并返回原按钮、320px模态检查、共享成功反馈、替换文件焦点、实际剪贴板复制不包含Token、路径变化清除旧命令反馈。原套件继续验证Client资料隔离、409保留、未知结果不重放、AI失败后的手动流程、Token只展示一次/撤销和本地CLI→授权→私有凭据→真实stdio MCP链路。

## 截图

| 场景 | 证据 |
|---|---|
| 背景资料与版本 | [桌面](ai-workflow-b/documents-desktop.png)、[手机](ai-workflow-b/documents-mobile.png) |
| 共享确认 | [桌面](ai-workflow-b/share-confirm-desktop.png)、[320px](ai-workflow-b/share-confirm-mobile.png) |
| Client共享资料 | [手机](ai-workflow-b/client-shared-mobile.png) |
| 凭据列表/撤销 | [桌面](r08-d/desktop-tokens.png)、[手机弹窗](r08-d/mobile-revoke.png) |
| 本地连接与复制反馈 | [320px](ai-workflow-d/mobile-manager.png) |
| Owner授权确认 | [桌面](ai-workflow-d/desktop-confirm.png)、[手机](ai-workflow-d/mobile-confirm.png) |
| Copilot欢迎与回答 | [建议入口](r08-c/welcome-desktop.png)、[回答](r08-c/desktop-copilot.png)、[手机来源](r08-c/mobile-copilot.png) |
| 个人提案 | [桌面](ai-workflow-c/proposal-desktop.png)、[手机](ai-workflow-c/proposal-mobile.png) |
| 需求工作台 | [澄清](ai-workflow-a/clarification-desktop.png)、[规格320px](ai-workflow-a/specification-320.png) |

已打开复查背景桌面/手机、共享弹窗、凭据桌面/手机、连接管理320px、Copilot欢迎/回答/手机来源、提案桌面与规格320px等代表性图片，未发现主要内容遮挡或页面横向溢出。

图片只含合成资料；不保存真实Token、模型密钥、浏览器trace、HAR或会话存储。凭据明文弹窗仅自动断言，不截图。长表单与提案保留原滚动方式，窄屏项目导航可横向滚动；未新增折叠隐藏业务字段。

## 验证过程与限制

- 首轮截图捕获弹窗动画中间帧，已改为等待完整可见后截图，禁用截图过程动画。
- 中文文件选择区初版把辅助文案纳入了标签匹配，造成背景用例超时；现使用唯一 `aria-labelledby` 指向“背景文件”，保留原生文件输入和键盘操作，原严格标签断言通过。
- 根目录没有 Prettier 命令，格式化改用仓库已有API开发依赖；没有安装工具或修改锁文件。
- 截图复查修正了提案复选框/文字分行，以及新表单叠加旧外边距导致的过大间距。
- [自动可访问性汇总](accessibility-summary.json)：28个界面状态、0自动违规、18个状态有未判定项。各子目录 `accessibility.json` 保留原始 incomplete 与补充计算对比度；不将未判定项当成通过。桌面、320/390px、弹窗/Drawer键盘和原项目导航回归通过。
- 本轮不涉及Provider/业务/数据库修改，真实付费DeepSeek、全量API/数据库回归、真实Codex模型Host与远程CI为 NOT RUN；相关历史结果见 [E工程证据](../../../engineering/evidence/ai-workflow-e/README.md)。没有使用截图声称模型或业务准确性提升。
- 独立人工视觉、真实手机/读屏与多浏览器验收仍需负责人完成。当前需要人工查看背景资料、凭据与Copilot新版式是否符合使用习惯。

建议本地Commit：`style(web): unify AI workflow surfaces and copilot interactions`。PR摘要：统一背景资料、访问凭据和AI工作台/Copilot的布局、图标与操作反馈，保留授权及人工确认业务流程；附真实浏览器、键盘、窄屏与剪贴板回归证据。
