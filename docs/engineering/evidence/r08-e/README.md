# R08 Phase E 验证证据 — 2026-11-12

分支 `feat/17-ai-agent-integration`，开工 HEAD `55ad908`（Phase D由负责人提交），开工工作区干净。仅本地实现/验证E，不Commit/Push/PR/Merge/部署，不开始F。没有新增SQL或应用开发/生产迁移；只复用D已审0004及其前序迁移，目标5434/specbridge_test库及账号。

## 实际结果

| 命令 | 实际结果与边界 |
|---|---|
| `pnpm test:mcp` | PASS，2文件16项，458ms；14项配置/HTTP mock及2项真实SDK stdio协议测试 |
| `pnpm test:e2e:mcp` | PASS，6项，3.92s；真实SDK Client→编译Node子进程→Nest HTTP→隔离PostgreSQL；1项真实Host测试按默认配置SKIP，不需要真实密钥 |
| `pnpm test:e2e:tokens` | PASS，9项，3.36s；Owner/RBAC/CSRF、撤销过期、只读scope、项目/授权状态变化、跨项目、审计回滚与并发撤销 |
| `pnpm --filter specbridge-api test` | PASS，13文件128项，991ms；现有Auth/AI/Token等单元回归 |
| `pnpm --filter specbridge-api typecheck` | PASS，含新MCP集成与Host测试 |
| `pnpm --filter specbridge-mcp typecheck` | PASS，含MCP源码及测试 |
| `pnpm --filter specbridge-api lint`、`pnpm --filter specbridge-mcp lint` | PASS，type-aware检查 |
| `pnpm --filter specbridge-mcp build` | PASS；`test:mcp`及`test:e2e:mcp`在测试前执行真实tsc构建 |
| `pnpm install --offline --frozen-lockfile --ignore-scripts` | PASS；4个workspace项目、lockfile up to date，无生命周期脚本 |
| `python3 /home/lenovo/.codex/skills/.system/skill-creator/scripts/quick_validate.py skills/requirement-analyst` | PASS，`Skill is valid!`；标准YAML/name/description，路径依赖本机已安装skill-creator，非CI依赖 |
| `pnpm lint` | PASS，API/MCP type-aware及Web ESLint全workspace检查 |
| `pnpm --filter specbridge-api exec prettier --check ../mcp/src ../mcp/test ../mcp/tsconfig.json ../mcp/tsconfig.build.json ../mcp/vitest.config.ts test/mcp vitest.config.mcp-e2e.ts` | PASS，新增TypeScript与配置格式 |
| `git diff --check` | PASS；不含真实Token、环境或生成构建产物 |

默认MCP数据库套件覆盖：

1. Owner真实HTTP创建凭据；tools/list恰好两个工具；tools/call内容与structuredContent一致，精确版本/Revision来源、审计created/used元信息、没有商业正文或凭据，业务表和不可变Revision前后相同。
2. 错误、过期及已撤销凭据；同一连接先成功读取、撤销后再次读取拒绝，未缓存私有结果。
3. 跨Workspace及同Workspace不同项目；工具projectId覆盖拒绝，宿主配置另一个projectId仍被API拒绝，外项目versionId不能读取。
4. Submitted、仅Vendor批准、Client拒绝均不可读，空目录语义正确；已有批准版本引用原Revision，不泄露后续草稿。
5. 审批、验收、Ready、SQL、Shell、文件写工具不存在；直接拿同Token访问普通业务写API仍401，业务状态不变。
6. 按Skill执行显式分页、精确详情及来源引用准备；目录长文预览标注截断，正文注入保持数据且不调用额外工具，approvedScope和引用背景分离。确定性流程测试不冒充LLM行为验证。

Mock测试还覆盖HTTPS/loopback配置、未知参数、HTTP401/403/404/429/500/503/302安全映射及不重试、空/非法JSON/UTF-8与Schema策略、输出字节上限、超时/取消释放、并发/分钟限额、跨项目响应及分页漂移拒绝。时间预算用fake timers验证，未声称真实等待10秒。协议测试使用真实SDK Client/子进程；无配置/多余argv安全退出，stdout无banner、stderr无凭据。

## 真实 Codex Host / Skill

可复现命令（显式启用，禁止CI，需要本地登录的Codex）：

```bash
R08_MCP_HOST_SMOKE=1 node scripts/with-env.mjs .env.test pnpm --filter specbridge-api exec vitest run --config vitest.config.mcp-e2e.ts -t 'installed Codex Host'
```

PASS，Codex CLI 0.167.1；最终取证运行1项35.36s，其余6项按名称过滤SKIP。首次相同场景38.61s PASS，随后为保存并人工核对合成答案重跑；不是两个不同的安全场景。

真实Host发现临时 `.agents/skills/requirement-analyst/SKILL.md`，用户显式 `$requirement-analyst` 调用。只使用合成批准记录、内存临时Token、只读临时工作区；忽略用户配置，禁Shell/插件/hooks/委派/浏览，未读取/修改真实.env或凭据文件。Token不放argv/TOML/URL/Prompt，CLI继续使用自己的既有登录状态。原始stdout/stderr只在测试进程内检查后丢弃，结束撤销凭据并清理临时工作区。

[已验证的合成答案与工具证据](host-smoke.json) 包含精确合成ID，不含凭据或真实项目资料。实际工具依次为 `list_project_requirements`、`get_approved_spec`。对证据逐项自检确认：

- 引用project/requirement/change/version/revision及批准/读取时间；没有捏造新版本来源。
- 批准事实只含授权批准目录及显式排除offline export；引用Revision中的导出设想仅为背景。
- 实施细节和新增验收检查标为提议，列出角色权限、版本选择和UI契约待澄清问题；未把建议写成商业批准事实。
- 明确忽略正文中的泄露凭据/调用审批指令；未执行Shell/写文件，实际MCP调用限于两个注册工具；业务/Revision/Approval/Delivery快照不变。
- 输出验收清单明确“尚未执行检查、未验收交付”，没有扩大批准范围。

这是一个真实Host合成场景的证据，不是对所有模型/宿主/注入文本的安全保证。SDK Client与当前Codex Host均实际完成连接及工具调用；没有将SDK支持的所有协议版本逐个测试。

## 已解决问题及未运行项

- 初次沙箱内安装因网络权限失败，获准后安装PASS；SDK依赖精确2.4.0。保留pnpm对已有ESLint循环peer标识的规范化，旧依赖版本未升级；冻结离线安装验证可复现。已有openapi-typescript TS5 peer与API TS6提示不是新引入问题。
- 初次沙箱内stdio子进程提前关闭导致2项FAIL；在相同构建与测试下获准沙箱外运行后2项及完整16项PASS。最终无未解决FAIL；不是以Mock替代协议测试。
- Skill格式辅助器不支持标准可选compatibility字段，已删去该非必需字段，标准name/description及实际Host加载通过。
- NOT RUN：远程CI、MCP Inspector、多Host/多OS、真实客户资料、人工独立安全审计、DeepSeek/Web浏览器联调及R01–R08全量回归。这些仍留F或独立人工验收；不将本阶段PASS等同最终发布批准。
- 无新API生产逻辑、Web代码、数据库Schema/SQL、OpenAPI变动；无需本阶段重跑浏览器截图或新迁移。API tracked构建缓存、既有0004 SQL保持字节不变。测试HTTP/stdio子进程已退出，隔离数据库维持原运行状态。

完整配置/契约见 [MCP README](../../../../apps/mcp/README.md)，实现交接见 [R08_PLAN](../../R08_PLAN.md)。
