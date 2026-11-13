# R08 — 本地 AI 503 修复与开发库启用

2026-11-12，`feat/17-ai-agent-integration` / HEAD `922eef1`，开工工作区干净。负责人本轮明确要求排查真实AI不可用、应用0004并使本地功能完整可用；这是对本机开发库的新增实施授权，不涉及生产或远程Git操作。

## 原因与处理

- 用户日志：Copilot失败时modelCalls=0、toolCalls=0、耗时4ms；服务在推理前返回503。安全检查发现根.env的AI开关未开启，Key存在且仅临时开启开关后配置校验通过。此证据与 `AiConfig.credentials()` 的本地拒绝路径一致；没有把未发生的供应商请求误判为DeepSeek故障。
- 仅将本机.env中的 `DEEPSEEK_ENABLED` 设为true，其他配置逐行保留；没有打印、保存副本或修改Key。文件仍被Git忽略。重启实际Nest开发进程读取配置；Observe禁用日志正常，不是AI故障原因。
- 本机5433/specbridge开发库已有0000–0003，逐项hash/时间戳与仓库一致，仅缺0004。核对审核SHA-256后复用现有 `apps/api/scripts/migrate.mjs --development`，新增api_tokens；没有生成SQL或改变已有迁移。
- [迁移结果](migration.json)：4→5条迁移，0004hash正确；原15表列定义和行数一致。SQL SHA-256仍为 `7133f1d8fc11ef93f84314dede4257cbba23452dec9ca49a2fdb57ce5cc0bd0a`。

## 实际开发环境验证

运行 `pnpm dev:api`、`pnpm dev:web`，标准生产Provider配置，没有Mock transport，没有Smoke脚本强制打开AI。浏览器通过 `http://localhost:3000` 的Next代理访问Nest4000，再访问开发库5433及真实DeepSeek。

临时验证脚本 `test-results/r08-local/verify-runtime.mjs`（Git忽略）使用实际公开注册/登录API建立**一个独立合成账号、工作空间、项目和Draft需求**；没有修改用户已有项目。仅测试分析/Copilot、Token和MCP读取，没有自动创建正式Revision、Ready、Submit、审批或验收。

| 本轮项目 | 实际结果 |
|---|---|
| 浏览器真实需求分析 | PASS，HTTP200、五类结果与来源正确；AiUsage success=true，247输入/283输出tokens、2505ms |
| 浏览器真实Copilot | PASS，HTTP200、3次模型调用/2次只读工具，真实需求来源，9973ms，预留输出8192tokens |
| AI前后业务状态 | PASS，需求快照不变，没有自动业务写入 |
| Owner Token创建/列表/前端 | PASS，实际开发库写入成功，列表与截图无Token明文 |
| MCP实际stdio→本地API→开发库 | PASS，tools/list只有两个读取工具；批准目录为空符合该合成项目尚未批准的事实 |
| 无效版本、撤销后读取 | PASS，get_approved_spec返回安全失败；撤销后重新读取被拒绝 |
| 清理 | PASS，临时Token已撤销、登录会话已退出；未删除审计/业务历史 |
| 浏览器异常 | 0 pageerror |

[安全结果JSON](runtime.json)、[本轮Copilot截图](copilot-desktop.png)、[本轮Token页面截图](token-desktop.png) 已逐项查看。截图来自Next开发模式，开发提示浮层不属于生产页面。测试合成对象保留在独立验证账号下，未清库；密码/Cookie/Token未保存到证据。

本轮没有在用户开发项目中自动批准变更，故未用开发数据制造“批准规格”。成功读取已批准详情、Client/Developer隔离、过期/并发、人工采用与完整状态机的代码未改，其既有完整F证据见 [F记录](../r08-f/README.md)；人工通过双方批准后的实测步骤见 [完整人工手册](../../R08_MANUAL_TEST.md)。不要把空目录说成MCP未实现。

代码/依赖/SQL未变；本轮以实际配置、迁移和目标开发环境验证为主，没有无理由重复完整回归或付费Host Smoke。第一次沙箱本机连接被拒绝，授权执行后完成；过程中原开发服务退出，随后重新启动并验证通过。最终没有未解决FAIL。

收尾保持API4000和Web3000运行供负责人测试，开发库5433及隔离库5434未关闭；后续会话/终端退出后可按手册重新启动。已恢复tracked构建缓存、核对SQL/本地链接/diff；没有Commit/Push/PR/Merge/部署，H-11独立人工验收仍待办。建议提交 `docs(ai): document verified local setup and manual acceptance scenarios`，不提交.env。
