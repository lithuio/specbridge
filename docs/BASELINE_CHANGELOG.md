# SpecBridge v0.1 → v0.2 需求基线修订记录

**日期**：2026-11-01。**范围**：修正需求、权限、API、数据模型、状态机、验收的一致性。未开发任何产品代码。

## 已确认（D-01～D-04）

1. 独立开发者与 2–10 人工作室；不做泛行业软件门户。
2. 每项目一位 Client 审批账号；创建时可缺席，正式提交前必须唯一，提交后锁定账号。
3. Owner→Client 依次批准同一冻结 ChangeRequestVersion。
4. 初始范围固定（非合同签名），后续变更需审批；交付只存 HTTPS URL、文本、证据 URL。

## 从旧文档发现并修复的五处重要不一致

1. **项目 Client “最多 1 人” vs “恰好 1 人”**：按时间点区分；数据库唯一约束 + Submit 强制存在。
2. **API 允许编辑变更草稿，Data Model 没有草稿字段**：补齐 `change_requests.draft_*`，Submit 冻结到 `change_request_versions`。
3. **审批中需求继续产生 Revision 的争议**：有 SUBMITTED/VENDOR_APPROVED 时阻止新 Revision；后续重新提需求必须新 Revision + 新 CR。
4. **交付重试与 Accepted 后再次提交边界**：同一 CRVersion 同时仅一条待审交付，Accepted 后禁止提交。
5. **Client 分配入口含混**：`POST /projects/{id}/members` 仅供开发者；唯一 Client 通过 `PUT /projects/{id}/client` 绑定/早期更正。

## 仍未实现或验证

产品代码、Drizzle Schema 和迁移、NestJS OpenAPI、测试、真实用户访谈、商业效果、部署均未随本次修改生成。
