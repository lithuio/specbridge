# AI 工作流 Phase A — 0005 SQL 审核包

状态：**负责人已明确批准0005用于5434/specbridge_test；隔离迁移与95项数据库回归PASS。开发5433/生产未应用。** 2026-11-13，分支 `feat/17-ai-agent-integration`，开工HEAD `6fb81b8`、工作区干净。负责人已批准总方案并要求实施；既有0004授权不覆盖本SQL。

审批依据：[DATA_MODEL迁移策略](../architecture/DATA_MODEL.md)要求“先 Schema Review，再通过 `drizzle-kit generate` 生成 SQL；审查 SQL 后 `migrate`”。本轮实施授权覆盖候选Schema和SQL审核材料，不替代具体SQL的迁移批准。下述生成使用离线Drizzle配置，不读取.env、不连接数据库。

## SQL 与哈希

文件：[0005_requirement_working_drafts.sql](../../apps/api/drizzle/0005_requirement_working_drafts.sql)

SHA-256（生成器原始字节，含换行格式）：

```text
3ef341ab762315d265f03ec32ab40813e32eaeec6b308fb7279297c1f0153e7c
```

生成命令：`pnpm --filter specbridge-api exec drizzle-kit generate --name=requirement_working_drafts`。

只创建两张表、各一个辅助索引及RESTRICT外键；不修改旧表列、触发器、数据或0000–0004 SQL。新增0005_snapshot，journal追加一项。审批后已使用既有安全runner执行隔离迁移；重复运行不改变旧表。批准不覆盖开发库、生产或后续SQL。

## 实际 SQL Diff

```diff
diff --git a/apps/api/drizzle/0005_requirement_working_drafts.sql b/apps/api/drizzle/0005_requirement_working_drafts.sql
new file mode 100644
index 0000000..b658e1c
--- /dev/null
+++ b/apps/api/drizzle/0005_requirement_working_drafts.sql
@@ -0,0 +1,43 @@
+CREATE TABLE "requirement_publish_receipts" (
+	"id" uuid PRIMARY KEY NOT NULL,
+	"requirement_id" uuid NOT NULL,
+	"user_id" uuid NOT NULL,
+	"draft_id" uuid NOT NULL,
+	"draft_version" integer NOT NULL,
+	"kind" text NOT NULL,
+	"request_hash" char(64) NOT NULL,
+	"result" jsonb NOT NULL,
+	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
+	CONSTRAINT "requirement_publish_receipts_draft_version_unique" UNIQUE("draft_id","draft_version"),
+	CONSTRAINT "requirement_publish_receipts_kind_valid" CHECK ("requirement_publish_receipts"."kind" IN ('clarify', 'specification')),
+	CONSTRAINT "requirement_publish_receipts_version_positive" CHECK ("requirement_publish_receipts"."draft_version" > 0),
+	CONSTRAINT "requirement_publish_receipts_hash_format" CHECK ("requirement_publish_receipts"."request_hash" ~ '^[0-9a-f]{64}$'),
+	CONSTRAINT "requirement_publish_receipts_result_object" CHECK (jsonb_typeof("requirement_publish_receipts"."result") = 'object' AND octet_length("requirement_publish_receipts"."result"::text) <= 8192),
+	CONSTRAINT "requirement_publish_receipts_time_finite" CHECK (isfinite("requirement_publish_receipts"."created_at"))
+);
+--> statement-breakpoint
+CREATE TABLE "requirement_working_drafts" (
+	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
+	"requirement_id" uuid NOT NULL,
+	"user_id" uuid NOT NULL,
+	"kind" text NOT NULL,
+	"version" integer DEFAULT 1 NOT NULL,
+	"base_requirement_version" integer NOT NULL,
+	"body" jsonb NOT NULL,
+	"publication" jsonb DEFAULT '{}'::jsonb NOT NULL,
+	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
+	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
+	CONSTRAINT "requirement_working_drafts_author_kind_unique" UNIQUE("requirement_id","user_id","kind"),
+	CONSTRAINT "requirement_working_drafts_kind_valid" CHECK ("requirement_working_drafts"."kind" IN ('clarify', 'specification')),
+	CONSTRAINT "requirement_working_drafts_versions_positive" CHECK ("requirement_working_drafts"."version" > 0 AND "requirement_working_drafts"."base_requirement_version" > 0),
+	CONSTRAINT "requirement_working_drafts_body_object" CHECK (jsonb_typeof("requirement_working_drafts"."body") = 'object' AND octet_length("requirement_working_drafts"."body"::text) <= 102400),
+	CONSTRAINT "requirement_working_drafts_publication_object" CHECK (jsonb_typeof("requirement_working_drafts"."publication") = 'object' AND octet_length("requirement_working_drafts"."publication"::text) <= 16384),
+	CONSTRAINT "requirement_working_drafts_times_valid" CHECK (isfinite("requirement_working_drafts"."created_at") AND isfinite("requirement_working_drafts"."updated_at") AND "requirement_working_drafts"."updated_at" >= "requirement_working_drafts"."created_at")
+);
+--> statement-breakpoint
+ALTER TABLE "requirement_publish_receipts" ADD CONSTRAINT "requirement_publish_receipts_requirement_id_requirements_id_fk" FOREIGN KEY ("requirement_id") REFERENCES "public"."requirements"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
+ALTER TABLE "requirement_publish_receipts" ADD CONSTRAINT "requirement_publish_receipts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
+ALTER TABLE "requirement_working_drafts" ADD CONSTRAINT "requirement_working_drafts_requirement_id_requirements_id_fk" FOREIGN KEY ("requirement_id") REFERENCES "public"."requirements"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
+ALTER TABLE "requirement_working_drafts" ADD CONSTRAINT "requirement_working_drafts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
+CREATE INDEX "requirement_publish_receipts_author_requirement_idx" ON "requirement_publish_receipts" USING btree ("user_id","requirement_id","created_at" DESC NULLS LAST);--> statement-breakpoint
+CREATE INDEX "requirement_working_drafts_author_updated_idx" ON "requirement_working_drafts" USING btree ("user_id","updated_at" DESC NULLS LAST,"id" DESC NULLS LAST);
\ No newline at end of file
```

## 设计与安全分析

| 实体/约束 | 目的与边界 |
|---|---|
| requirement_working_drafts | 仅个人可编辑工作产物。requirement_id推导Project/Workspace，user_id绑定作者；kind为clarify/specification。unique(requirement_id,user_id,kind)保持两个流程独立且每人每类一份。Owner不得代读别人草稿。 |
| version / base_requirement_version | version用于工作稿自身CAS，base为作者整理时参考的业务版本；保存工作稿不推进Requirement版本。正式发布仍核验R04 expectedVersion。两列正整数；不存在草稿用请求expectedDraftVersion=0创建、落库version=1。 |
| body / publication | body为经严格Zod校验的两类JSON正文；数据库校验对象及100 KiB上限，应用请求总96 KiB。publication由服务端维护采用状态，不接受客户端写入；对象且≤16 KiB，仅保留当前工作稿必要标记，完整发布历史看回执与正式对象。不是聊天/AI运行记录。 |
| FK / timestamps / index | 作者与需求外键RESTRICT；项目归属与当前角色必须服务端重验，FK不提供租户授权。有限时间、updated>=created；作者/更新时间/ID索引用于本人工作稿检索。 |
| requirement_publish_receipts | 请求operationId作为UUID主键，无数据库自动默认，避免服务端悄悄更换重试身份。绑定需求、作者、工作稿ID与消费版本；固定kind、64位SHA-256 request_hash；result仅业务/工作稿版本和结果对象ID，≤8 KiB，不存完整提示词或发布正文。 |
| unique(draft_id,draft_version) | 防止换operationId重复消费同一工作稿快照。正常部分发布会推进工作稿版本，剩余内容仍可另行预览发布。配合事务锁与CAS，不替代业务权限、内容和Pending检查。 |
| 回执与删除 | 故意不设draft_id外键，允许本人删除个人工作稿，回执及正式问题/Revision继续存在。draftId由服务端锁定记录取得；不可接受客户端任意draftId。回执仅追加，不提供更新/删除接口。现阶段不宣称数据库能抵抗任意管理员SQL篡改回执。 |
| 数据安全 | 私有工作稿含业务正文，仅在明确保存后持久化；不入日志、审计正文、浏览器持久缓存或MCP。用户撤权后不可读取。回执重放前仍重验当前授权、actor、requirement和request hash；不能借幂等查询读取别人的结果。 |

同事务完成原业务命令/审计、工作稿采用状态和回执。审计或回执冲突导致整体回滚。问题批量发布为一个原子动作；不允许在循环中调用多个独立事务的现有HTTP API。Client只处理问题工作稿，不能生成或发布规格Revision。

没有加入背景文件、Copilot执行提案或本地授权表，避免在A提前固化B–D数据设计；后续阶段各自审核增量SQL。

## 获批后的验证

仅申请先在 `127.0.0.1:5434/specbridge_test` 隔离实例、specbridge_test账号验证。执行前重新核对上述哈希和目标身份；开发5433及生产不在本次待批范围。

- 从0000–0004升级：原16表数据及列定义保持，新增两表；重复迁移幂等。
- UUID/FK、作者/需求/类型唯一、正版本、JSON对象/大小、hash、有限时间约束与回执唯一性。
- 删除个人草稿不删除回执/正式历史，跨项目与跨作者API拒绝，Client无法获取规格工作稿。
- 批量全部提交/回滚、审计失败、同时保存/发布、同operationId重试、不同参数复用ID、同draftVersion重复消费。
- 既有R04/Auth/RBAC/Pending/Ready及不可变历史回归，Web独立流程、跨刷新、部分采用、409保留、模型失败手动编辑。

准备的数据库测试不等于已通过。当前只验证无DB单元/类型/静态检查；精确结果与剩余工作见 [执行计划](AI_WORKFLOW_PLAN.md) 和STATE。

## 批准后续作位置

继续A的授权服务/REST/OpenAPI、个人工作稿与双入口Web；新增Provider模式已有Mock覆盖，但还未暴露HTTP。本次不改变运行中的旧R08入口，不自动开启未经验证的页面。A完成后继续B–E，不自动Commit/Push/PR/Merge/部署。

