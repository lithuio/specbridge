# AI工作流 B — 项目背景资料 SQL审核包

状态：负责人已明确“批准，继续开发”；0006原字节已注册并仅应用5434/specbridge_test，完整B功能已接通并验证。[实际证据](evidence/ai-workflow-b/README.md)。下文候选准备/申请描述保留为审批前的历史材料；不是当前未批准状态。开发/生产仍未授权。

审批依据：[DATA_MODEL §6](../architecture/DATA_MODEL.md)：“先 Schema Review，再通过 `drizzle-kit generate` 生成 SQL；审查 SQL 后 `migrate`”。本次申请目标仅 `127.0.0.1:5434/specbridge_test`、角色 `specbridge_test`；不涉及开发5433或生产。计划总授权允许准备审核材料，不替代具体SQL审查。

## 具体材料与激活边界

- 审批后新声明已并入[生产Schema](../../apps/api/src/database/schema/index.ts)；旧候选文件仅重导出，避免定义分叉。SQL/snapshot原字节保留在此审核包并复制到正式drizzle目录。
- [候选SQL](migrations/ai-workflow-b/0006_project_documents.sql)，SHA-256：`6efe3cd862b3167478ce1be8095a791379eae39852801d7f0616c635516272e4`。
- [0006 snapshot](migrations/ai-workflow-b/0006_snapshot.json)、[待追加journal entry](migrations/ai-workflow-b/journal-entry.json)。当前生效journal仍止于0005，普通测试不会读到此候选SQL。
- 通过临时Drizzle配置复制0005 metadata，离线生成0006，再追加只作用于三个新表的不可变/完整性触发器。没有读取.env、调用数据库、变更旧18表或0000–0005 SQL。
- 审批后先复核SQL哈希和0005 parent snapshot；将新表定义并入正式Schema，将已审SQL和snapshot移入正式drizzle目录，只追加该journal entry，之后才运行隔离迁移/验证。不能把“移动文件”解释成修改已审SQL的授权。

## 数据模型与可见性

| 表 | 作用 | 关键约束/索引 |
|---|---|---|
| project_documents | 项目文档身份、标题、ACTIVE/INACTIVE、独立CAS版本、当前可用版本与明确共享版本 | 项目FK；(projectId,id)唯一；项目/状态/更新时间索引；current/shared复合FK防跨文档/项目指针 |
| project_document_versions | 上传原件元信息、opaque blobId、SHA-256、不可变版本号、解析状态与解析器版本/结果计数 | (documentId,versionNo)唯一、blobId唯一、复合父链FK；文件1–10MiB、四类MIME、固定错误码、状态与时间CHECK；处理中索引 |
| project_document_chunks | 安全文本分段与页/段定位 | (versionId,ordinal)唯一；项目/版本/序号索引；复合父链FK；每段1–2000字符、最多1000序号、PDF页数≤500；终态分段不可变 |

所有FK均RESTRICT。READY/FAILED版本禁止更新/删除；仅PROCESSING可转为终态，文件身份/哈希/作者/版本号从插入起不可改。分段修改先锁父版本，只允许PROCESSING；READY时强制分段字符总数与extractedChars一致且1–1000段，FAILED不得保留分段。当前/共享指针只能引用同项目同文档READY版本。

背景默认内部。Owner明确共享**某个已解析版本**；Client读取sharedVersionId，Owner/显式项目Developer读取currentVersionId。上传替换版本不自动共享它：旧共享版本仍可读，直至Owner显式更换或撤回共享。停用文档或撤回共享立即停止新检索并重新限制历史引用访问；来源ID不是访问凭据。Client列表/详情仅投影共享版本的文件名和来源，不返回内部当前版本、失败原因、内部文件计数或配额占用；授权过滤先于分页。该设计避免共享一份文档时意外暴露旧的内部版本。共享/停用/替换仍需后端项目资格、CAS与事务审计；Schema不能替代RBAC。

## 文件、隐私与成本设计

- 仅可提取文本PDF、DOCX、MD/TXT，无OCR/图片/旧DOC。MIME与内容识别均在服务端验证；不解析HTML为可执行页面，不下载文档外链，不执行宏。解析器依赖尚未选定/安装，B实现时核查官方文档、版本和测试夹具。
- 单文件10MiB；项目最多20个文档身份（含停用文档）/100MiB保留原件（含历史READY及在途预留）。这些是跨行聚合限制，由Project锁下检查与并发集成测试保证，**不是现有SQL CHECK已保证**。失败解析删除临时原件并保留最小失败记录；重试产生新版本。
- 原件放API私有存储，以随机blobId定位，路径不取自文件名、不返回给Web/MCP，不放入Next public目录。浏览器默认只展示转义后的文本；原件如提供下载，必须授权且attachment。当前SQL不创建存储目录、不上传任何文件。
- 解析子进程必须具备时间/内存/解压/输出限制；提取上限500000字符、500页、1000段。进程中断标记FAILED/INTERRUPTED，未就绪内容不进入检索。具体解析器隔离测试仍待B实现，不将预设限制称作已验证沙箱。
- 自动检索先筛当前项目有权版本，再做有界关键词/段落匹配；模型只收到少量片段和真实文档/版本/段ID。无需向量库或新增服务。对客问题/规格生成仅使用共享版本；内部背景不通过自动上下文进入对客生成。
- 文件正文、文件名、原始解析异常、完整Prompt、Token/Key不进日志或审计；仅最小ID/版本/类型/字节数/固定错误码。背景是未经批准的资料，不替代商业批准规格。外部MCP仍只有两个approved_specs:read工具，不开放背景读取。
- 保留版本与分段便于追溯，但已返回给用户/模型的内容无法撤回。当前没有定期清理或安全擦除承诺，配额达到后明确拒绝新上传，不能暗中删除旧引用。

## 审批后的集成验证计划

1. 0000–0005升级与重复迁移；原18表列/数据、原五个不可变触发器保持；新21表、FK/unique/CHECK与新三触发器核对。
2. 跨Project/文档的current/shared/chunk复合FK拒绝；重复版本号/段号/blobId、错误摘要、超长文件名/正文/非法状态时间、终态改写删除及伪造READY插入拒绝。
3. PROCESSING→READY/FAILED一致性；真实锁竞争保证解析完成后无法插入/修改分段；新版本失败不改current/shared；指向未就绪或他项目版本拒绝。
4. Owner/Developer内部读取、Client只见明确共享版本、外部Token无权、停用/撤回/成员撤销即时拒绝；两用户并发抢配额、共享CAS冲突、审计失败整笔回滚。
5. PDF/DOCX/MD/TXT真实夹具，空文档/扫描PDF/损坏/压缩炸弹/超页/超时/目录穿越/外链/注入；上传失败不回滚项目创建，手动P0保持可用。
6. AI对客上下文无内部片段，来源定位真实可重新授权；CIMock不读付费Key；桌面/手机创建项目第二步与文件重试。

## 审批前历史检查（当前结果见页首工程证据）

PASS：候选Schema typecheck/lint；离线Drizzle生成；旧18表/enum/sequence等snapshot逐项完全一致；新增仅3表；生效journal仍为0005。首次临时绝对out路径遇到Drizzle路径拼接问题，改为正确相对路径后生成成功。

NOT RUN：0006数据库执行、触发器运行验证、解析依赖/上传/检索/新Web集成。不能把静态检查称作功能完成。C/D/E仍未交付。本轮无Commit/Push/PR/Merge/部署。

## 完整新增SQL Diff

```diff
--- /dev/null
+++ candidate/0006_project_documents.sql
+CREATE TABLE "project_document_chunks" (
+	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
+	"project_id" uuid NOT NULL,
+	"document_id" uuid NOT NULL,
+	"version_id" uuid NOT NULL,
+	"ordinal" integer NOT NULL,
+	"locator_kind" text NOT NULL,
+	"locator_start" integer NOT NULL,
+	"locator_end" integer NOT NULL,
+	"content" text NOT NULL,
+	CONSTRAINT "project_document_chunks_ordinal_unique" UNIQUE("version_id","ordinal"),
+	CONSTRAINT "project_document_chunks_ordinal_valid" CHECK ("project_document_chunks"."ordinal" BETWEEN 1 AND 1000),
+	CONSTRAINT "project_document_chunks_locator_valid" CHECK ("project_document_chunks"."locator_kind" IN ('page', 'paragraph') AND "project_document_chunks"."locator_start" >= 1 AND "project_document_chunks"."locator_end" >= "project_document_chunks"."locator_start" AND "project_document_chunks"."locator_end" <= CASE WHEN "project_document_chunks"."locator_kind" = 'page' THEN 500 ELSE 500000 END),
+	CONSTRAINT "project_document_chunks_text_valid" CHECK (char_length("project_document_chunks"."content") BETWEEN 1 AND 2000 AND "project_document_chunks"."content" ~ '[^[:space:]]')
+);
+--> statement-breakpoint
+CREATE TABLE "project_document_versions" (
+	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
+	"project_id" uuid NOT NULL,
+	"document_id" uuid NOT NULL,
+	"version_no" integer NOT NULL,
+	"original_name" text NOT NULL,
+	"media_type" text NOT NULL,
+	"size_bytes" integer NOT NULL,
+	"blob_id" uuid NOT NULL,
+	"sha256" char(64) NOT NULL,
+	"status" text DEFAULT 'PROCESSING' NOT NULL,
+	"parser_version" text,
+	"extracted_chars" integer DEFAULT 0 NOT NULL,
+	"error_code" text,
+	"created_by" uuid NOT NULL,
+	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
+	"completed_at" timestamp with time zone,
+	CONSTRAINT "project_document_versions_number_unique" UNIQUE("document_id","version_no"),
+	CONSTRAINT "project_document_versions_parent_id_unique" UNIQUE("project_id","document_id","id"),
+	CONSTRAINT "project_document_versions_blob_unique" UNIQUE("blob_id"),
+	CONSTRAINT "project_document_versions_number_positive" CHECK ("project_document_versions"."version_no" > 0),
+	CONSTRAINT "project_document_versions_name_valid" CHECK (char_length("project_document_versions"."original_name") BETWEEN 1 AND 255 AND "project_document_versions"."original_name" ~ '[^[:space:]]' AND "project_document_versions"."original_name" !~ '[[:cntrl:]]'),
+	CONSTRAINT "project_document_versions_media_valid" CHECK ("project_document_versions"."media_type" IN ('application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/markdown', 'text/plain')),
+	CONSTRAINT "project_document_versions_size_valid" CHECK ("project_document_versions"."size_bytes" BETWEEN 1 AND 10485760),
+	CONSTRAINT "project_document_versions_sha256_valid" CHECK ("project_document_versions"."sha256" ~ '^[0-9a-f]{64}$'),
+	CONSTRAINT "project_document_versions_status_valid" CHECK ("project_document_versions"."status" IN ('PROCESSING', 'READY', 'FAILED')),
+	CONSTRAINT "project_document_versions_parser_valid" CHECK ("project_document_versions"."parser_version" IS NULL OR char_length("project_document_versions"."parser_version") BETWEEN 1 AND 80),
+	CONSTRAINT "project_document_versions_chars_valid" CHECK ("project_document_versions"."extracted_chars" BETWEEN 0 AND 500000),
+	CONSTRAINT "project_document_versions_error_valid" CHECK ("project_document_versions"."error_code" IS NULL OR "project_document_versions"."error_code" IN ('UNSUPPORTED_FILE', 'INVALID_FILE', 'NO_TEXT', 'PARSE_LIMIT', 'PARSE_TIMEOUT', 'PARSE_FAILED', 'INTERRUPTED')),
+	CONSTRAINT "project_document_versions_result_valid" CHECK (("project_document_versions"."status" = 'PROCESSING' AND "project_document_versions"."completed_at" IS NULL AND "project_document_versions"."error_code" IS NULL AND "project_document_versions"."extracted_chars" = 0) OR ("project_document_versions"."status" = 'READY' AND "project_document_versions"."completed_at" IS NOT NULL AND "project_document_versions"."parser_version" IS NOT NULL AND "project_document_versions"."error_code" IS NULL AND "project_document_versions"."extracted_chars" > 0) OR ("project_document_versions"."status" = 'FAILED' AND "project_document_versions"."completed_at" IS NOT NULL AND "project_document_versions"."error_code" IS NOT NULL AND "project_document_versions"."extracted_chars" = 0)),
+	CONSTRAINT "project_document_versions_times_valid" CHECK (isfinite("project_document_versions"."created_at") AND ("project_document_versions"."completed_at" IS NULL OR (isfinite("project_document_versions"."completed_at") AND "project_document_versions"."completed_at" >= "project_document_versions"."created_at")))
+);
+--> statement-breakpoint
+CREATE TABLE "project_documents" (
+	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
+	"project_id" uuid NOT NULL,
+	"title" text NOT NULL,
+	"status" text DEFAULT 'ACTIVE' NOT NULL,
+	"version" integer DEFAULT 1 NOT NULL,
+	"current_version_id" uuid,
+	"shared_version_id" uuid,
+	"created_by" uuid NOT NULL,
+	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
+	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
+	CONSTRAINT "project_documents_project_id_unique" UNIQUE("project_id","id"),
+	CONSTRAINT "project_documents_title_valid" CHECK (char_length("project_documents"."title") BETWEEN 1 AND 200 AND "project_documents"."title" ~ '[^[:space:]]'),
+	CONSTRAINT "project_documents_status_valid" CHECK ("project_documents"."status" IN ('ACTIVE', 'INACTIVE')),
+	CONSTRAINT "project_documents_version_positive" CHECK ("project_documents"."version" > 0),
+	CONSTRAINT "project_documents_times_valid" CHECK (isfinite("project_documents"."created_at") AND isfinite("project_documents"."updated_at") AND "project_documents"."updated_at" >= "project_documents"."created_at")
+);
+--> statement-breakpoint
+ALTER TABLE "project_document_chunks" ADD CONSTRAINT "project_document_chunks_version_fk" FOREIGN KEY ("project_id","document_id","version_id") REFERENCES "public"."project_document_versions"("project_id","document_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
+ALTER TABLE "project_document_versions" ADD CONSTRAINT "project_document_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
+ALTER TABLE "project_document_versions" ADD CONSTRAINT "project_document_versions_project_document_fk" FOREIGN KEY ("project_id","document_id") REFERENCES "public"."project_documents"("project_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
+ALTER TABLE "project_documents" ADD CONSTRAINT "project_documents_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
+ALTER TABLE "project_documents" ADD CONSTRAINT "project_documents_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
+ALTER TABLE "project_documents" ADD CONSTRAINT "project_documents_current_version_fk" FOREIGN KEY ("project_id","id","current_version_id") REFERENCES "public"."project_document_versions"("project_id","document_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
+ALTER TABLE "project_documents" ADD CONSTRAINT "project_documents_shared_version_fk" FOREIGN KEY ("project_id","id","shared_version_id") REFERENCES "public"."project_document_versions"("project_id","document_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
+CREATE INDEX "project_document_chunks_project_version_idx" ON "project_document_chunks" USING btree ("project_id","version_id","ordinal");--> statement-breakpoint
+CREATE INDEX "project_document_versions_processing_idx" ON "project_document_versions" USING btree ("project_id","status","created_at","id");--> statement-breakpoint
+CREATE INDEX "project_documents_project_updated_idx" ON "project_documents" USING btree ("project_id","status","updated_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
+-- Custom guards supplement Drizzle metadata: finalized source text must stay citable.
+CREATE FUNCTION "specbridge_document_version_guard"() RETURNS trigger LANGUAGE plpgsql AS $$
+DECLARE chunk_count integer; text_chars integer;
+BEGIN
+  IF TG_OP = 'INSERT' THEN
+    IF NEW.status <> 'PROCESSING' THEN
+      RAISE EXCEPTION 'Document versions must start in processing' USING ERRCODE = '23514';
+    END IF;
+    RETURN NEW;
+  END IF;
+  IF TG_OP = 'DELETE' OR OLD.status <> 'PROCESSING' THEN
+    RAISE EXCEPTION 'Finalized document versions are immutable' USING ERRCODE = '23514';
+  END IF;
+  IF ROW(NEW.id, NEW.project_id, NEW.document_id, NEW.version_no, NEW.original_name,
+         NEW.media_type, NEW.size_bytes, NEW.blob_id, NEW.sha256, NEW.created_by, NEW.created_at)
+     IS DISTINCT FROM
+     ROW(OLD.id, OLD.project_id, OLD.document_id, OLD.version_no, OLD.original_name,
+         OLD.media_type, OLD.size_bytes, OLD.blob_id, OLD.sha256, OLD.created_by, OLD.created_at) THEN
+    RAISE EXCEPTION 'Document source identity is immutable' USING ERRCODE = '23514';
+  END IF;
+  SELECT count(*)::integer, coalesce(sum(char_length(content)), 0)::integer
+    INTO chunk_count, text_chars FROM project_document_chunks WHERE version_id = OLD.id;
+  IF NEW.status = 'READY' AND (chunk_count < 1 OR chunk_count > 1000 OR text_chars <> NEW.extracted_chars) THEN
+    RAISE EXCEPTION 'Document extraction totals do not match' USING ERRCODE = '23514';
+  END IF;
+  IF NEW.status = 'FAILED' AND chunk_count <> 0 THEN
+    RAISE EXCEPTION 'Failed document extraction must not retain chunks' USING ERRCODE = '23514';
+  END IF;
+  RETURN NEW;
+END;
+$$;
+--> statement-breakpoint
+CREATE TRIGGER "project_document_versions_guard" BEFORE INSERT OR UPDATE OR DELETE
+  ON "project_document_versions" FOR EACH ROW EXECUTE FUNCTION "specbridge_document_version_guard"();
+--> statement-breakpoint
+CREATE FUNCTION "specbridge_document_chunk_guard"() RETURNS trigger LANGUAGE plpgsql AS $$
+DECLARE parent_status text; parent_id uuid;
+BEGIN
+  IF TG_OP = 'DELETE' THEN parent_id := OLD.version_id;
+  ELSE parent_id := NEW.version_id;
+  END IF;
+  IF TG_OP = 'UPDATE' AND ROW(NEW.id, NEW.project_id, NEW.document_id, NEW.version_id, NEW.ordinal)
+    IS DISTINCT FROM ROW(OLD.id, OLD.project_id, OLD.document_id, OLD.version_id, OLD.ordinal) THEN
+    RAISE EXCEPTION 'Document chunk identity is immutable' USING ERRCODE = '23514';
+  END IF;
+  SELECT status INTO parent_status FROM project_document_versions WHERE id = parent_id FOR UPDATE;
+  IF parent_status IS DISTINCT FROM 'PROCESSING' THEN
+    RAISE EXCEPTION 'Finalized document chunks are immutable' USING ERRCODE = '23514';
+  END IF;
+  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
+  RETURN NEW;
+END;
+$$;
+--> statement-breakpoint
+CREATE TRIGGER "project_document_chunks_guard" BEFORE INSERT OR UPDATE OR DELETE
+  ON "project_document_chunks" FOR EACH ROW EXECUTE FUNCTION "specbridge_document_chunk_guard"();
+--> statement-breakpoint
+CREATE FUNCTION "specbridge_document_pointer_guard"() RETURNS trigger LANGUAGE plpgsql AS $$
+BEGIN
+  IF NEW.current_version_id IS NOT NULL AND NOT EXISTS (
+    SELECT 1 FROM project_document_versions WHERE id = NEW.current_version_id
+      AND project_id = NEW.project_id AND document_id = NEW.id AND status = 'READY'
+  ) THEN
+    RAISE EXCEPTION 'Current document version must be ready and belong to this document' USING ERRCODE = '23514';
+  END IF;
+  IF NEW.shared_version_id IS NOT NULL AND NOT EXISTS (
+    SELECT 1 FROM project_document_versions WHERE id = NEW.shared_version_id
+      AND project_id = NEW.project_id AND document_id = NEW.id AND status = 'READY'
+  ) THEN
+    RAISE EXCEPTION 'Shared document version must be ready and belong to this document' USING ERRCODE = '23514';
+  END IF;
+  RETURN NEW;
+END;
+$$;
+--> statement-breakpoint
+CREATE TRIGGER "project_documents_pointer_guard" BEFORE INSERT OR UPDATE
+  ON "project_documents" FOR EACH ROW EXECUTE FUNCTION "specbridge_document_pointer_guard"();
```
