# AI工作流 C — Copilot 人工确认提案 SQL审核包

> 2026-11-13 当前状态：负责人“批准并继续”已批准本包0007仅用于5434/specbridge_test。已复核哈希，原字节激活并应用；当前22表/8迁移、100数据库测试PASS。C API/Web及受影响验证完成，见[实际证据](evidence/ai-workflow-c/README.md)。开发/生产未迁移，不覆盖D未来SQL。

以下保留审批时的候选设计与完整SQL Diff；其中“未执行/批准后”描述的是审批前历史。

状态：只准备了独立候选Schema/SQL/snapshot/journal-entry，**未导出到运行时、未加入生效journal、未执行迁移**。B的0006批准不覆盖0007。B已完成上传、解析、共享、AI检索及真实模型验证；C的API/UI/事务执行尚未实现。

本次申请仅 `127.0.0.1:5434/specbridge_test`，角色 `specbridge_test`。依据 [DATA_MODEL §5](../architecture/DATA_MODEL.md)：“先 Schema Review，再通过 `drizzle-kit generate` 生成 SQL；审查 SQL 后 `migrate`”。开发5433/生产、D未来SQL和自动Git操作不在申请范围。

## 可审核材料

- [候选Schema](../../apps/api/src/database/candidates/copilot-proposals.schema.ts)
- [完整候选SQL](migrations/ai-workflow-c/0007_copilot_proposals.sql)，SHA-256 `a5a9788072b5caf6366a83f28197340f7709fb4a5c50fd2c181d21407bc66010`
- [snapshot](migrations/ai-workflow-c/0007_snapshot.json)、[候选journal entry](migrations/ai-workflow-c/journal-entry.json)

离线Drizzle生成，只增加 `copilot_proposals`；既有21表、枚举、旧迁移不变，snapshot.prevId绑定0006。追加一个仅保护新表的触发器；不执行任何Requirement/CR写入。生效journal仍为0000–0006，普通测试不会执行0007。

## 表及约束

提案绑定本人 `user_id`、固定 `requirement_id`；Project/Workspace从Requirement推导，不接受模型选择租户。四个kind只有：发布所选问题、创建Revision、创建商业草稿、更新商业草稿。只有最后一种允许非空 `change_request_id/base_change_version`；FK及新表触发器检查变更真实父需求。其余动作没有可变业务URL、HTTP方法或SQL字段。

`version`为提案独立CAS；`base_requirement_version`、可选 `base_change_version`绑定准备时的原业务版本。`payload`对象≤96KiB，`sources`仅服务器来源ID/版本/权限分类等数组≤16KiB，不存完整对话、工具正文或Prompt。具体动作Schema、最多10个问题等边界由C服务Zod继续严格验证。

状态只有DRAFT/EXECUTED。DRAFT不能带结果、operationId、requestHash或执行时间；EXECUTED必须同时具备全部字段。operationId唯一、请求摘要64位小写hex、结果对象≤8KiB（仅ID/业务版本/固定类型）。提案ID/作者/目标/kind/创建与到期时间从创建起不可变；每次更新必须version+1，EXECUTED后不可更新/删除。未执行提案可由本人删除，删除审计仍不含正文。

草稿最多有效24小时，时间必须有限且有序，过期不能确认执行。过期不是自动删除：个人提案正文和执行回执保留策略需在C交付文档明确，不能声称聊天永久记忆或已自动清理。两个普通索引支持作者/需求列表与状态/到期查找，operationId唯一索引防重放；无新扩展或基础设施。

## C实施设计（批准后）

1. Copilot可建议任务和真实目标，显示准备/预览入口；没有模型可调用的执行工具。准备只保存本人提案，不写业务表。首批任务与既有个人工作稿衔接，避免另造公共聊天记录。
2. 发布问题/Revision的准备必须调用A的shared-only生成路径，不能将内部Copilot工具输出或聊天正文自动当成对客生成材料。背景仍是参考而非批准事实。商业草稿准备仅Owner/Developer，估算和金额由人核对，不自动补成确认事实。
3. 预览可编辑、删除、选择问题；更新必须提案CAS，客户端不可修改作者/目标/来源/operationId/结果。人工确认请求固定为提案ID、expectedProposalVersion、原业务expectedVersion与operationId，不透传模型URL或任意服务参数。
4. 确认重新验证Session/当前角色/项目状态/目标父链/来源可见性/来源版本/有效期，再按Workspace→Project→Requirement→CR（如需）→Proposal锁序检查。Client只能自己的问题提案，不能Revision或商业写入；Owner也不能代执行别人的提案。
5. 复用R04内部事务命令；R05 create/patch要提取同等权限/状态校验的内部事务命令，保持外部旧API行为。写业务、审计、提案EXECUTED/回执必须同事务，不能串联多个HTTP请求冒充原子操作。
6. 同operationId同摘要返回既有结果；不同载荷或第二operationId不能再次消费已执行提案。未知网络结果先查本人回执，不能自动新建操作。409保留人工编辑，不自动刷新期望版本重放。
7. 创建商业草稿仍要求真实最新READY Revision；绝不自动Mark Ready、Submit、批准或验收。生成AI失败时原手动页面继续可用。模型只负责准备，真正执行由显式人工按钮触发。

## 批准后的验证

- 原21表/数据保持、新表FK/check/唯一索引及终态不可变、无伪造EXECUTED插入、跨需求变更目标拒绝。
- 同用户CAS、其他作者与跨项目/角色、撤权/归档、过期、共享撤回/版本改变，事务失败全回滚。
- 同operationId重放和并发双操作只落一次；未知结果查询；批量问题全部成功或回滚；R04 Pending/不可变和R05 READY/商业规则保持。
- Prompt Injection、伪造来源/目标、超限和模型故障；真实浏览器预览/编辑/键盘/手机、人工确认与原API回归。普通CI无付费Key。

当前PASS仅离线生成、旧21表snapshot逐项一致及候选静态检查；数据库运行、C API/UI/执行/真实模型均NOT RUN。审批后必须复核哈希，将新声明并入生产Schema、原字节复制SQL/snapshot并只追加entry，再仅在隔离目标应用。不得在任何测试事务提前执行候选SQL。

## 完整新增SQL Diff

```diff
--- /dev/null
+++ candidate/0007_copilot_proposals.sql
+CREATE TABLE "copilot_proposals" (
+	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
+	"requirement_id" uuid NOT NULL,
+	"user_id" uuid NOT NULL,
+	"kind" text NOT NULL,
+	"change_request_id" uuid,
+	"version" integer DEFAULT 1 NOT NULL,
+	"base_requirement_version" integer NOT NULL,
+	"base_change_version" integer,
+	"status" text DEFAULT 'DRAFT' NOT NULL,
+	"payload" jsonb NOT NULL,
+	"sources" jsonb NOT NULL,
+	"operation_id" uuid,
+	"request_hash" char(64),
+	"result" jsonb,
+	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
+	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
+	"expires_at" timestamp with time zone NOT NULL,
+	"executed_at" timestamp with time zone,
+	CONSTRAINT "copilot_proposals_operation_unique" UNIQUE("operation_id"),
+	CONSTRAINT "copilot_proposals_kind_valid" CHECK ("copilot_proposals"."kind" IN ('publish_questions','create_revision','create_change_draft','update_change_draft')),
+	CONSTRAINT "copilot_proposals_versions_valid" CHECK ("copilot_proposals"."version">0 AND "copilot_proposals"."base_requirement_version">0 AND ("copilot_proposals"."base_change_version" IS NULL OR "copilot_proposals"."base_change_version">=0)),
+	CONSTRAINT "copilot_proposals_target_valid" CHECK (("copilot_proposals"."kind"='update_change_draft' AND "copilot_proposals"."change_request_id" IS NOT NULL AND "copilot_proposals"."base_change_version" IS NOT NULL) OR ("copilot_proposals"."kind"<>'update_change_draft' AND "copilot_proposals"."change_request_id" IS NULL AND "copilot_proposals"."base_change_version" IS NULL)),
+	CONSTRAINT "copilot_proposals_payload_valid" CHECK (jsonb_typeof("copilot_proposals"."payload")='object' AND octet_length("copilot_proposals"."payload"::text)<=98304),
+	CONSTRAINT "copilot_proposals_sources_valid" CHECK (jsonb_typeof("copilot_proposals"."sources")='array' AND octet_length("copilot_proposals"."sources"::text)<=16384),
+	CONSTRAINT "copilot_proposals_hash_valid" CHECK ("copilot_proposals"."request_hash" IS NULL OR "copilot_proposals"."request_hash"~'^[0-9a-f]{64}$'),
+	CONSTRAINT "copilot_proposals_result_valid" CHECK ("copilot_proposals"."result" IS NULL OR (jsonb_typeof("copilot_proposals"."result")='object' AND octet_length("copilot_proposals"."result"::text)<=8192)),
+	CONSTRAINT "copilot_proposals_state_valid" CHECK (("copilot_proposals"."status"='DRAFT' AND "copilot_proposals"."operation_id" IS NULL AND "copilot_proposals"."request_hash" IS NULL AND "copilot_proposals"."result" IS NULL AND "copilot_proposals"."executed_at" IS NULL) OR ("copilot_proposals"."status"='EXECUTED' AND "copilot_proposals"."operation_id" IS NOT NULL AND "copilot_proposals"."request_hash" IS NOT NULL AND "copilot_proposals"."result" IS NOT NULL AND "copilot_proposals"."executed_at" IS NOT NULL)),
+	CONSTRAINT "copilot_proposals_time_valid" CHECK (isfinite("copilot_proposals"."created_at") AND isfinite("copilot_proposals"."updated_at") AND isfinite("copilot_proposals"."expires_at") AND "copilot_proposals"."updated_at">="copilot_proposals"."created_at" AND "copilot_proposals"."expires_at">"copilot_proposals"."created_at" AND "copilot_proposals"."expires_at"<="copilot_proposals"."created_at"+interval '24 hours' AND ("copilot_proposals"."executed_at" IS NULL OR (isfinite("copilot_proposals"."executed_at") AND "copilot_proposals"."executed_at">="copilot_proposals"."created_at" AND "copilot_proposals"."executed_at"<="copilot_proposals"."expires_at" AND "copilot_proposals"."updated_at">="copilot_proposals"."executed_at")))
+);
+--> statement-breakpoint
+ALTER TABLE "copilot_proposals" ADD CONSTRAINT "copilot_proposals_requirement_id_requirements_id_fk" FOREIGN KEY ("requirement_id") REFERENCES "public"."requirements"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
+ALTER TABLE "copilot_proposals" ADD CONSTRAINT "copilot_proposals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
+ALTER TABLE "copilot_proposals" ADD CONSTRAINT "copilot_proposals_change_request_id_change_requests_id_fk" FOREIGN KEY ("change_request_id") REFERENCES "public"."change_requests"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
+CREATE INDEX "copilot_proposals_author_requirement_idx" ON "copilot_proposals" USING btree ("user_id","requirement_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
+CREATE INDEX "copilot_proposals_expiry_idx" ON "copilot_proposals" USING btree ("status","expires_at");
+
+--> statement-breakpoint
+-- Custom guard: only this new table is affected. No business transition is performed here.
+CREATE FUNCTION specbridge_copilot_proposal_guard() RETURNS trigger LANGUAGE plpgsql AS $$
+BEGIN
+  IF TG_OP = 'DELETE' THEN
+    IF OLD.status = 'EXECUTED' THEN
+      RAISE EXCEPTION 'Executed proposal receipt is immutable' USING ERRCODE = '23514';
+    END IF;
+    RETURN OLD;
+  END IF;
+  IF TG_OP = 'INSERT' THEN
+    IF NEW.status <> 'DRAFT' OR NEW.version <> 1 THEN
+      RAISE EXCEPTION 'Proposal must start as a draft' USING ERRCODE = '23514';
+    END IF;
+  ELSE
+    IF OLD.status = 'EXECUTED' THEN
+      RAISE EXCEPTION 'Executed proposal receipt is immutable' USING ERRCODE = '23514';
+    END IF;
+    IF ROW(NEW.id, NEW.requirement_id, NEW.user_id, NEW.kind, NEW.change_request_id, NEW.created_at, NEW.expires_at)
+      IS DISTINCT FROM ROW(OLD.id, OLD.requirement_id, OLD.user_id, OLD.kind, OLD.change_request_id, OLD.created_at, OLD.expires_at)
+      OR NEW.version <> OLD.version + 1 THEN
+      RAISE EXCEPTION 'Proposal identity or version is invalid' USING ERRCODE = '23514';
+    END IF;
+  END IF;
+  IF NEW.change_request_id IS NOT NULL AND NOT EXISTS (
+    SELECT 1 FROM change_requests WHERE id = NEW.change_request_id AND requirement_id = NEW.requirement_id
+  ) THEN
+    RAISE EXCEPTION 'Proposal target has another requirement' USING ERRCODE = '23514';
+  END IF;
+  RETURN NEW;
+END;
+$$;
+--> statement-breakpoint
+CREATE TRIGGER copilot_proposals_guard BEFORE INSERT OR UPDATE OR DELETE ON copilot_proposals
+  FOR EACH ROW EXECUTE FUNCTION specbridge_copilot_proposal_guard();
```
