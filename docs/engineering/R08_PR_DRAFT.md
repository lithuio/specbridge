# R08 — 建议提交与最终 PR 文案

仅供负责人审阅；本轮没有执行 Commit、Push、创建 PR、Merge 或部署。F 当前本地验证完成，H-11 和远程 CI 仍待完成。

## F 本地 Commit 建议

`test(ai): verify final provider, browser and agent integration (#17)`

补真实 DeepSeek 浏览器与官方 Inspector 受控联调、CI 付费服务拒绝测试；修正全量回归中的旧 Schema 数量断言和 Copilot 可访问性检查的动画竞态，保存最终证据与交接。不包含开工前已有的 API tracked 构建缓存改动，提交前由负责人检查暂存范围。

## 最终 PR 标题（覆盖 A–F）

`feat(ai): add human-reviewed requirement analysis and project-scoped agents`

## 最终 PR 正文草案

用户在已保存的需求中生成结构化 AI 建议，选择并编辑后由人工确认填入现有表单，再通过 R04 expectedVersion 保存。原始输入和已冻结 Revision 保持不变；生成失败仍可手动工作，AI 不自动标记就绪、提交、审批或验收。

加入项目作用域的全局 Copilot，使用有界只读工具和可追溯业务/版本来源；每次工具读取及推理返回重验会话、角色和项目权限，Client 商业草稿不进入上下文。聊天仅浏览器内存。DeepSeek Key 只在服务端使用，Provider/JSON/Zod/长度/预算/超时与错误策略限制模型输出及日志。

Owner 可创建、列出、撤销带期限的项目 Token，数据库只存摘要，scope 固定为批准规格读取。外部 MCP 为本地 stdio，两个工具通过授权 Nest API 读取，不能直连数据库或执行业务写入；requirement-analyst Skill 区分批准范围、引用背景和提议，不扩展批准范围。本地 Token 方案不是远程 HTTP OAuth MCP 授权。

验证（2026-11-12，本地）：API128/MCP16单元、数据库92、基础HTTP5、业务/授权/Token/MCP HTTP77、AI/Copilot HTTP19、浏览器36、CI防护4均通过；Lint、三包类型、生产Build、36路径OpenAPI及Drizzle检查通过。另行真实验证DeepSeek Provider和浏览器、官方Inspector、Codex Host/Skill，合成项目/临时Token，禁止常规CI使用付费模型。完整失败修复和证据见 `docs/engineering/evidence/r08-f/README.md`，桌面/手机见 `docs/ux/evidence/r08-f/README.md`。

数据库只有已审批的 `0004_project_api_tokens.sql`，SHA-256 `7133f1d8fc11ef93f84314dede4257cbba23452dec9ca49a2fdb57ce5cc0bd0a`，仅在隔离测试库应用；开发/生产迁移须独立批准。F未修改生产逻辑/依赖/迁移。配额是单实例内存，不能作为持久账单上限；外部Host保管的数据不能追溯收回，Skill不是沙箱。

待合并前确认：负责人独立安全/视觉Review（H-11），审阅模型回答与axe未判定项，远程CI通过。多浏览器/真实设备/读屏及备份恢复等发布事项尚未执行；没有部署批准。

关联 Issue #17。仅在上述验收门槛通过、负责人准备合并时采用关闭 Issue 的文案。
