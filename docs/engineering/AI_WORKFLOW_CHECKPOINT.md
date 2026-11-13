# AI工作流升级 — D完成交接

2026-11-13，负责人“批准，继续任务”后延续D，分支`feat/17-ai-agent-integration`、HEAD`c0960b0`保持。保留A/B/C提交及上轮D未提交准备，新增实现/测试/文档均未提交。没有Commit/Push/PR/Merge/部署，停在D，不自动进入E。

## 已授权迁移及实现

0008 SHA-256 `2fa26bd9bee6c4f420d9cdd3f8adb9b231fa2c2a2ad5ab77f1edfb087364d74b`，仅127.0.0.1:5434/specbridge_test / specbridge_test。SQL/snapshot原字节激活，journal9项，23表/10触发器；旧22表/数据保持。H-19已完成，不重复询问同一SQL。0005–0008仍未应用开发5433/生产，H-15目标授权未扩展。

后端Owner确认/本人列表查询取消/专用PKCE兑换、锁后Session和权限复核、Token+grant+audit事务已完成。CLI预检/loopback/原生HTTP/私有文件/真实MCP诊断/TOML保留/Skill/检查/卸载已完成；Web无秘密命令、明确核对/确认、未知状态查询/取消已完成。原MCP两工具/scope不变。

## 真实验证与尚未代表的结论

[工程证据](evidence/ai-workflow-d/README.md)列精确命令；PASS102数据库、161单元、HTTP10、Auth16/RBAC13/Token9、MCP28、真实MCP6+Codex Host1、浏览器2+4。API/Web/MCP类型/Lint/Build、51路径契约、迁移元数据、锁文件、Skill检查通过。Host证据只包含合成分析/安全断言，专用Token已撤销。

Codex0.167.1的--ignore-user-config不通过临时trust CLI覆盖激活项目层；隔离Host因此解析生成TOML并以同一非秘密MCP表CLI覆盖运行真实launcher/Skill。不能将其标为实际用户交互式信任自动加载已验收，H-20仍待人工。首次原生fetch的Sec-Fetch-Mode导致安装失败已修，Guard没有放宽；最终浏览器通过。

依赖审计FAIL：27条（8high/13moderate/6low），与开工HEAD隔离审计同一批、无新增ID；[对照JSON](evidence/ai-workflow-d/dependency-audit.json)。H-17待专项修复，不擅自升级无关依赖。没有未解决功能测试FAIL。

NOT RUN：实际用户Codex信任、独立安全/设备/读屏、Inspector本次、DeepSeek本次、E全量、远程CI和开发/生产迁移。不借本次D验证把A–E整体标记完成。

## 下一步

负责人按[安装/恢复范例](AI_WORKFLOW_D_MANUAL.md)和[截图](../ux/evidence/ai-workflow-d/README.md)验收D，审阅diff后自行本地Commit。E需要下一Session明确继续；开发启用需要明确0005–0008目标批准。无需为已授权普通修复再次申请许可。

限制：私有文件不防同UID/root，单实例配额重启清零，每目录仅一托管连接，冲突拒绝；多文件安装崩溃不保证整体事务，未知/残留先网页撤销，再安全恢复自身文件。真实Codex用户配置/.env未修改。

辅助日志`/tmp/specbridge-d-*.log`；初始tracked API构建缓存备份`/tmp/specbridge-d-approved-initial.tsbuildinfo`，最终恢复原字节，不夹带缓存。临时浏览器/Host目录已清理，历史合成对象仅保留隔离PG用于审计；未停止原开发服务或清空数据库。

建议D Commit：`feat(agent): add owner-authorized local Codex connection installer`。PR摘要见[人工草案](AI_WORKFLOW_PR_DRAFT.md)，最终E之后再按全部实际结果定稿。
