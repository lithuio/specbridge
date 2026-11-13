# SpecBridge — Human Decision & Action Queue

仅列必须由项目负责人决定或亲自核验的事项；Agent 不得把本表当作自动执行指令。

## 现在
- [ ] H-18：C独立人工体验/安全验收。按[C范例](engineering/AI_WORKFLOW_C_MANUAL.md)核对预览/选择/编辑/确认、Client作者隔离、未知结果回执、409输入保留、24h保留策略及会话撤销并发修复；查看[证据](engineering/evidence/ai-workflow-c/README.md)和桌面/手机截图。模型回答技术字段偏多、真实设备/读屏与自动axe未判定项需人工核对。不阻塞已授权实施，不代表远程CI或上线批准。
- [x] H-16：负责人“批准并继续”已批准[C的0007完整SQL](engineering/AI_WORKFLOW_C_SQL_REVIEW.md)仅在5434/specbridge_test应用，SHA-256 `a5a9788072b5caf6366a83f28197340f7709fb4a5c50fd2c181d21407bc66010`一致；原字节迁移、100数据库测试及C受影响验证完成。当前22表/8迁移；不覆盖开发/生产或D未来SQL。
- [ ] H-17：B人工交互、安全与部署验收，见[证据](engineering/evidence/ai-workflow-b/README.md)、[范例](engineering/AI_WORKFLOW_B_MANUAL.md)、[截图](ux/evidence/ai-workflow-b/README.md)。核对内部/共享版本隔离、公开生成不带内部背景、来源撤权、私有存储、Linux解析资源限制及非完整OS沙箱边界。依赖审计2项开工前shadcn链公告（low deepmerge/moderate minimatch）需安排工具依赖处理与复验；新增解析依赖无本次命中。远程CI/独立设备与读屏NOT RUN，不阻塞已获授权的后续准备工作。
- [x] H-14：负责人“批准，继续开发”已批准0006用于5434/specbridge_test，SHA-256 `6efe3cd862b3167478ce1be8095a791379eae39852801d7f0616c635516272e4`复核一致，原字节迁移及98项数据库回归通过。[审核包](engineering/AI_WORKFLOW_B_SQL_REVIEW.md)。B上传/共享/AI/浏览器与真实Provider已验证；不覆盖开发/生产或0007。
- [ ] H-15：AI工作流A/B/C的人工交互/安全验收与开发启用。审阅[实际证据](engineering/evidence/ai-workflow-a/README.md)和[人工测试范例](engineering/AI_WORKFLOW_A_MANUAL.md)，核对私有草稿、明确发布、409/回执、待确认事实与原审批流程。0005–0007目前仅隔离库已由本轮迁移；如需在5433/specbridge开发库启用新工作台、背景资料与Copilot提案，须明确扩展这三份已审SQL的目标授权，不能据旧0004或5434批准自动应用。远程CI/Commit/PR/部署仍待后续授权。
- [x] H-13：负责人已明确批准0005用于5434/specbridge_test。SHA-256 `3ef341ab762315d265f03ec32ab40813e32eaeec6b308fb7279297c1f0153e7c`复核一致，隔离迁移/95数据库测试及A全套受影响检查通过；[审核包](engineering/AI_WORKFLOW_A_SQL_REVIEW.md)。不覆盖开发5433/生产或B的0006。
- [x] H-12：R08本机完整启用。负责人本轮明确要求修复AI503并“应用0004_project_api_tokens”；已开启本机.env的AI开关，并核对已审哈希后在5433/specbridge开发库应用0004，原表列定义/行数不变。真实开发浏览器/DeepSeek/Token/MCP通过，临时凭据已撤销。[本轮证据](engineering/evidence/r08-local/README.md)与[人工测试范例](engineering/R08_MANUAL_TEST.md)。这次授权不涉及生产迁移、远程Git或部署；独立人工Review仍见H-11。
- [ ] H-11：R08最终人工验收与安全Review。A–F已由负责人本地提交，F本地全量回归、真实DeepSeek浏览器、Inspector与Codex Host/Skill通过，见 [F工程证据](engineering/evidence/r08-f/README.md)、[截图/键盘/axe未判定项](ux/evidence/r08-f/README.md) 与 [PR草案](engineering/R08_PR_DRAFT.md)。请核对人工采用/expectedVersion/不可变历史、Client草稿隔离、工具父链及推理前后授权、Token scope/撤销竞争/摘要与日志、外部Host数据边界；审阅合成回答的准确性与偏长/内部状态码文案。读屏/真实设备及独立视觉签字尚无结论。Issue #17要求的人工安全Review与远程CI不能由Agent自查代替；远程CI NOT RUN，需后续授权推送/PR后执行。本项不授权自动Commit/Push/PR/Merge/部署或迁移；本机开发迁移的独立新增授权及完成结果见H-12，生产迁移仍未授权。本轮文档变更由负责人审阅后自行本地Commit。
- [x] H-10：R08 Phase D SQL 已获负责人“已审批”明确批准。对应 `0004_project_api_tokens.sql` SHA-256：`7133f1d8fc11ef93f84314dede4257cbba23452dec9ca49a2fdb57ce5cc0bd0a`。重新核对哈希后，仅在5434隔离specbridge_test库/账号执行 `pnpm db:migrate:test` 成功。完整Diff见 [审核包](engineering/R08_D_SQL_REVIEW.md)。不授权开发/生产迁移、其他SQL、E或自动Commit/Push/Merge/部署。D最终验证及人工Review项见R08_PLAN/STATE。
- [ ] H-09：R07 最终视觉/API集成/安全评审。A–H本地实现与最终回归已完成，见 [H正式截图与验证](ux/evidence/r07-h/README.md)、[总计划最终交接](engineering/R07_PLAN.md) 与 [STATE](STATE.md)。请核对中文浅色桌面/手机视觉、版本/金额/拒绝重提与验收历史、Client审计裁剪/三类Dashboard口径、会话/项目隔离、409不重放、键盘/读屏及axe未判定项的补充证据。15场景最终浏览器PASS、17状态0自动违规与代理截图自检不等于独立人工签字；720px重排不等于实际200%zoom。状态：人工视觉/API集成/安全结论未记录，远程CI NOT RUN；不是已授权本地H的实施阻塞。后续提交/推送/PR/合并或发布需负责人另行授权，本轮未执行。
- [ ] H-08：R06 人工安全/并发 Review。负责人已批准方案 A 并授权实施；本地 240 项测试、类型/Lint/完整构建已通过。重点核对父链/角色锁后重验、同版本批准证据、Workspace→Project→Requirement→CR→Delivery 锁序、SUBMITTED 条件更新、真实 23505 回滚映射、退回重交/Accepted 终态和审计原子性。原因：Issue #13 DoD 要求人工安全/并发评审。状态：待审核，不阻塞已完成本地实现；不授权提交/推送/合并/部署，远程 CI/PR 需后续授权。无新增 Schema/Migration 或 SQL 审批任务。
- [ ] H-07：R05 人工安全/并发 Review。负责人已批准规划及版本从 0 开始、Client 草稿隔离/正式评论公开的契约；本地 176 项测试、类型/Lint/完整构建已通过。重点：七接口授权、同 Version 双批准、拒绝重提、共享锁与 R03/R04 竞争、审计回滚和金额序列化。原因：Issue #11 DoD 要求人工 Review；不阻塞已完成实现，不授权提交/推送/合并/部署。无新增 Migration；下一步在获授权后运行远程 CI。
- [x] H-05：R04 `apps/api/drizzle/0003_requirement_draft_version.sql` 已获负责人明确回复“已审批”。执行前核对 SHA-256 `73d3b4839fdc64f43a420a4cf4bd15f2923e194a014a86d174a205ddd4695d68` 一致；仅在 5434 隔离测试实例应用并完成存量升级/回归验证。0000–0002 未改，开发库/生产库未操作。
- [ ] H-06：R04 人工安全与并发 Review。重点：8 接口父链授权、作者限制、expectedVersion、Workspace → Project → Requirement → CR 锁序、Ready/Revision 与未来 Submit 竞态、审计回滚。状态：本地验证已完成，待人工 Review 和后续获授权的远程 CI；不阻塞已完成实现，不授权提交/推送/合并/部署。
- [x] R03 范围/契约决策：负责人确认 Client 使用独立项目列表、workspaceId 可选、/me 仅用户、Owner 不额外分配为 Developer、提交前 Client 串行更正/锁定后同账号无副作用重试，以及本阶段不增加 Web 页面。
- [ ] H-04：R03 人工安全与 PR Review。原因：Issue #7 DoD 要求人工评审；重点核对双向角色冲突、列表隔离、锁序、审计原子性和未来 Submit 协议。建议按 STATE 的 87 项本地测试证据审阅 diff。状态：待审核，不阻塞已完成的本地实现；远程 CI、提交/推送/合并需后续授权。R03 无新增 SQL，不新增迁移审批任务。
- [ ] 审核 `docs/product/DECISIONS.md` 与 v0.2 设计文件是否一致。
- [ ] 检查本地 Git 工作区、远程 origin、现有 CI 与测试脚本。
- [ ] 审核根目录 AGENTS.md、文档索引及 GitHub 模板。
- H-01（历史）：Health Check 已有合并提交 `c64eb44`（PR #2）；原“尚未提交”状态过期。本轮未重新核验远程人工评审/CI 证据，不影响 R01 本地工作。

- [x] H-02：审核 `apps/api/drizzle/0000_database_foundation.sql` 与 `0001_immutable_history.sql`。负责人于 2026-11-08 明确回复“已审批，可以继续”；两份 SQL 未改变。已在隔离 PostgreSQL 实例验证迁移与 10 项集成测试，解除迁移审批阻塞。运行证据和网络环境限制见 `STATE.md`；未来新增/修改迁移仍须审查。

- [x] H-03（已解除 R02 数据库验证阻塞）：审核 `apps/api/drizzle/0002_session_activity.sql` 并批准仅在隔离测试实例应用。只增加 last_activity_at、回填 created_at、设 DEFAULT now()/NOT NULL；不修改 R01 SQL。SHA-256：`236ecd64b2a7d1ea437ba48a09077107e8cb789a3cced16f5a7dd080a9839ee3`。Issue #5 DoD 明确要求新增 SQL 人工审核。负责人明确回复“已审核通过，可以继续进行”；已核对 SQL 哈希不变，允许隔离实例迁移/验证，不涉及开发库或生产库。隔离迁移与 R01/R02 数据库/认证 E2E 已通过，证据见 STATE.md。
- [x] R02 范围决策：负责人确认 /me 仅返回用户、重复注册通用 409、单实例内存限流。实现与验证状态见 STATE.md；不代表已通过安全 Review。

## 后续开发
- [ ] 审核后续新增/修改的 ERD 与 Migration SQL，尤其租户/审批约束；R01 初始两份 SQL 见已完成 H-02。
- [ ] 审核 Auth/Session/RBAC 的安全边界。
- [ ] 审核商业状态机、并发冲突和审计实现。
- [ ] 决定 D-05～D-08（见 `docs/product/DECISIONS.md`）。

## 发布前
- [ ] 配置真实部署凭据与 HTTPS，密钥不进入仓库或 Agent 输出。
- [ ] 检查演示账户、隐私数据与安全测试结果。
- [ ] 审核备份恢复测试，批准生产部署与 Release。
- [ ] 完成真实用户反馈并区分实证与假设。
