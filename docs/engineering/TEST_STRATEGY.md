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
