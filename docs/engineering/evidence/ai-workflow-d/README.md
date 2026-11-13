# AI工作流 D — 实际验证与交接

2026-11-13。分支`feat/17-ai-agent-integration`，HEAD`c0960b0`保持；A/B/C已由负责人提交，本轮保留上次D准备改动并完成已授权实现。0008哈希复核后原字节仅应用127.0.0.1:5434/specbridge_test / specbridge_test；没有读取真实Key、修改.env、实际用户Codex配置、开发/生产迁移或自动Git写操作。

## PASS

| 实际命令 / 范围 | 结果 |
|---|---|
| `pnpm db:migrate:test` | 已审0008应用；23表/9迁移/10个自定义触发器；SHA-256 `2fa26bd9bee6c4f420d9cdd3f8adb9b231fa2c2a2ad5ab77f1edfb087364d74b` |
| `pnpm test:integration` | 13文件/102项；新授权表/父链/终态/保留、真实事务约束；0000–0007旧22表列定义和业务数据升级保持 |
| `node scripts/with-env.mjs .env.test pnpm --filter specbridge-api exec vitest run --config vitest.config.integration.ts test/database/connections-migration.integration-spec.ts` | 2项重跑通过；测试快照单PG Client并行查询告警改串行后无该告警 |
| `pnpm --filter specbridge-api test` | 19文件/161项，包括3项新严格授权/PKCE契约；没有真实AI依赖 |
| `pnpm test:e2e:connections` | 10项真实HTTP/PG；Owner/角色/项目隔离、原Session/项目状态变化、注销锁等待、并发兑换/取消、审计失败全回滚、真过期、证明/混合认证/限流/日志秘密拒绝 |
| `node scripts/with-env.mjs .env.test pnpm --filter specbridge-api test:e2e:auth` / `test:e2e:rbac`；`pnpm test:e2e:tokens` | Auth16/RBAC13/Token9，现有登录代理/权限/Token生命周期保持 |
| `pnpm --filter specbridge-mcp test` | 4文件/28项；原16+连接6+安装6，实际loopback、stdio SDK/launcher、私有凭据、TOML保留/卸载/冲突/并发、原生HTTP无浏览器头/中断超时 |
| `R08_MCP_HOST_SMOKE=1 R08_MCP_EVIDENCE_DIR=../../docs/engineering/evidence/ai-workflow-d node scripts/with-env.mjs .env.test pnpm --filter specbridge-api test:e2e:mcp` | 7通过/1跳过Inspector：原6项真实MCP→Nest→PG，另1项真实Codex Host；[独立证据](host-smoke.json) |
| `pnpm test:browser:connections` | Chromium真实2场景；Owner网页→PKCE→CLI→私有文件→MCP→Next Rewrite→API→PG；重复不重发、撤销拒绝、卸载保留、未知查询/取消、刷新不重放；最终重跑2PASS |
| `pnpm test:browser:tokens` | 原4场景回归，Client/Developer无入口，明文清除/晚到响应/未知创建仍正常 |
| API/Web/MCP `typecheck`、`lint`、`build` | 全部PASS；API构建在契约检查复验，Web生产构建用于真实浏览器，MCP构建用于CLI/Host |
| `pnpm --filter specbridge-api openapi:check` / `db:check` | 51路径OpenAPI及生成Web类型无漂移；迁移元数据通过 |
| `pnpm test:e2e` | 原公共路由/默认授权保护5项PASS |
| `pnpm test:smoke-guards` | 4项CI禁止真实付费/外部服务检查通过；新CI连接HTTP、浏览器和默认MCP用例无需Key |
| `pnpm install --frozen-lockfile --ignore-scripts` | 锁文件一致；新增smol-toml1.9.1、原SDK Client2.4.0转运行依赖，未升级其他依赖 |
| Skill quick_validate、SQL/snapshot逐字节对照、`git diff --check` | PASS；Skill复制后仅补绑定项目/服务器标识，原权限/批准边界保持 |

## 真实Host证据与限制

Codex0.167.1实际调用`list_project_requirements`及`get_approved_spec`，来源含真实项目、需求、变更版本、Revision与readAt；识别离线导出不在批准范围，区分背景/建议/事实，忽略“泄露凭据/审批”注入指令；未调用Shell/文件写入/业务写工具，业务快照保持，Token未进入输出。结束撤销专用Token，删除临时配置/Skill/私有凭据。浏览器测试临时Token同样撤销；普通HTTP测试的合成审计/对象只留在隔离库。

Host测试读取并解析安装器实际生成的项目TOML，将同一无秘密服务器表作为CLI覆盖传给隔离Host，使用真实launcher和安装的Skill。**它不验证实际用户交互式信任后项目配置自动加载**：在--ignore-user-config下临时projects.trust_level覆盖没有激活项目层，这是实测差异。没有改真实用户信任来强行通过；人工加载步骤保留H-20。常规CI不运行Host；浏览器CI仅Codex版本预检使用fixture，其余CLI/MCP/API/PG都真实，不能把该fixture称为真实Codex Host。

## 过程失败与修复

1. 审批前离线Drizzle绝对out失败，改相对out并核对23表/父链后通过；保留原静态审核快照，不作为执行SQL证据。
2. 类型检查修正Pagination属性、UUID模板类型、stream API和跨包测试类型边界，最终通过。
3. 首次浏览器安装失败：Node fetch自动添加Sec-Fetch-Mode，被专用exchange Guard拒绝。改为原生http/https请求，保持Guard限制，新增真实请求头/中断测试；最终浏览器2场景通过。
4. `codex mcp get`不支持--ignore-user-config，移除这项不成立的常规单元测试。Host先超时，再修正--no-daemon必须位于exec之前的参数位置；随后发现隔离模式不加载未持久信任的项目层。用严格生成配置CLI覆盖验证实际Host，最终7PASS/1SKIP；不隐瞒项目自动加载仍需人工核验。

## FAIL / NOT RUN / 已知风险

- **FAIL：当前依赖审计非零**。`pnpm audit --json`报告27条（8high/13moderate/6low）；使用HEAD c0960b0的package/lock在独立临时目录同次审计，完全相同、无新增公告ID，[对照](dependency-audit.json)。新增smol-toml不在命中路径。此前B记录2条是历史快照，当前不能称依赖安全PASS；H-17安排既有依赖链专项修复，未擅自扩范围升级。
- **NOT RUN**：实际用户Codex信任后的项目自动发现、WSL浏览器转发/其他OS、独立设备/读屏/安全签字、Inspector本次重跑、真实DeepSeek本次重跑、E最终全量、远程CI、开发5433/生产新增迁移。
- **无未解决功能测试FAIL**；不把上述审计FAIL/人工NOT RUN吞并成全绿。
- 单实例限流重启清零；私有文件不防同UID/root/恶意宿主。每文件原子替换/普通失败回滚不保证多文件崩溃一致性，失败回执缺失须先网页撤销再人工恢复。每目录一个连接，配置/Skill冲突拒绝，移动构建路径需重连。没有新MCP写工具或远程OAuth服务。

## 视觉证据与人工后续

[桌面/手机截图](../../../ux/evidence/ai-workflow-d/README.md)已经打开检查，无新增遮挡/横向页面溢出；23/23/27项axe规则通过、0自动违规，手机导航颜色1项incomplete附补充计算；Space/Tab/Enter确认通过，不替代读屏和人工设备验收。[人工范例](../../AI_WORKFLOW_D_MANUAL.md)包含无密钥命令、首次连接、Skill请求、撤销/卸载与未知结果恢复。

日志`/tmp/specbridge-d-*.log`仅是本次机器上的辅助记录；持久证据为本目录安全断言、合成Host结果和截图，不保存原始Host日志、配置内容、Token或浏览器trace/HAR。完成后停在D，E另Session；不Commit/Push/PR/Merge/部署。

重复执行与--status会校验安装回执、自有TOML块及Skill摘要，再诊断MCP；配置或Skill已被改动时拒绝，保留用户改动，不把“凭据仍可用”误报成安装配置正常。
