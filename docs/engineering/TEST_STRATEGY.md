# SpecBridge — Test Strategy

## 层次
- **Unit**：状态转换、表单规则、金额/版本等纯逻辑；跟随仓库现有 Vitest/Jest。
- **Integration**：NestJS API + 测试数据库；事务、并发、约束、租户隔离。
- **E2E**：Playwright，Owner / Developer / Client 的真实浏览器核心链路。

## 优先必测
1. 非成员访问另一项目 → 无权（按 API 契约返回 404/403）。
2. Owner 与 Client 审批顺序、重复审批、过期 `expectedVersion`。
3. 已提交 ChangeRequestVersion 与 RequirementRevision 不可改。
4. 未指定 Client 不可正式提交变更。
5. 非 Approved 版本不可交付；同版本最多一个待审核 Delivery。
6. Client 拒收后新建 Delivery；Accepted 历史不可覆盖。
7. DeepSeek 故障不阻塞 P0 业务；AI 仅产出可审阅建议。

## 测试证据
每个 PR 写清：执行的具体命令、结果、测试数据范围、未执行项目及原因。
CI 本身成功不等于端到端业务全部通过；从未运行的测试不能写成通过。
验收的唯一编号与条款以 `docs/product/ACCEPTANCE.md` 为准。

## R01 数据库测试边界

- 单元测试：`pnpm run test`，包含数据库 URL 安全检查、延迟初始化、首次查询失败及 Nest 关闭连接池；不需要 PostgreSQL。
- 静态检查：`pnpm --filter specbridge-api typecheck` 覆盖 schema、Drizzle/Vitest 配置和测试；`db:check` 仅检查迁移元数据，不能证明 PostgreSQL 接受 SQL。
- 路由回归：`pnpm --filter specbridge-api test:e2e`，保留原有两个路由行为，不加载测试数据库。
- 集成测试：`pnpm run test:integration`，必须显式设置隔离的 `TEST_DATABASE_URL`，会应用已审核的 committed migrations；无配置直接失败。运行前须先完成 SQL 人工审核。
- 覆盖范围：15 表及外键、重复迁移与数据保留、NULL 草稿与冻结必填、复合归属、唯一 Client 并发、唯一审批/Review、部分交付索引、内容 CHECK、四表防回写、baseline 不可变、lock_version 条件更新、Drizzle 事务回滚。
- 并发用例在两个连接的事务均开始后同时提交竞争操作，失败断言 SQLSTATE，成功断言最终记录数量；不是顺序调用模拟并发。
- Fixtures 是结构测试数据，不代表已通过合法业务 Submit/Approve。R01 不实现 HTTP 授权、角色分离、审批顺序或 Approved/Accepted 交付规则，不能把本轮结果标成全部 P0 AC 通过。
- AC-03/08/09/12/14/17/23/26/27 仅能获得相应数据库层证据。完整业务验收、备份恢复和生产迁移另行验证。

当前执行证据与未运行项目见 `../STATE.md`；操作步骤见 `DEVELOPMENT.md`。
