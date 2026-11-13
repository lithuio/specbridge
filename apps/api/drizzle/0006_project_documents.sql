CREATE TABLE "project_document_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"version_id" uuid NOT NULL,
	"ordinal" integer NOT NULL,
	"locator_kind" text NOT NULL,
	"locator_start" integer NOT NULL,
	"locator_end" integer NOT NULL,
	"content" text NOT NULL,
	CONSTRAINT "project_document_chunks_ordinal_unique" UNIQUE("version_id","ordinal"),
	CONSTRAINT "project_document_chunks_ordinal_valid" CHECK ("project_document_chunks"."ordinal" BETWEEN 1 AND 1000),
	CONSTRAINT "project_document_chunks_locator_valid" CHECK ("project_document_chunks"."locator_kind" IN ('page', 'paragraph') AND "project_document_chunks"."locator_start" >= 1 AND "project_document_chunks"."locator_end" >= "project_document_chunks"."locator_start" AND "project_document_chunks"."locator_end" <= CASE WHEN "project_document_chunks"."locator_kind" = 'page' THEN 500 ELSE 500000 END),
	CONSTRAINT "project_document_chunks_text_valid" CHECK (char_length("project_document_chunks"."content") BETWEEN 1 AND 2000 AND "project_document_chunks"."content" ~ '[^[:space:]]')
);
--> statement-breakpoint
CREATE TABLE "project_document_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"version_no" integer NOT NULL,
	"original_name" text NOT NULL,
	"media_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"blob_id" uuid NOT NULL,
	"sha256" char(64) NOT NULL,
	"status" text DEFAULT 'PROCESSING' NOT NULL,
	"parser_version" text,
	"extracted_chars" integer DEFAULT 0 NOT NULL,
	"error_code" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "project_document_versions_number_unique" UNIQUE("document_id","version_no"),
	CONSTRAINT "project_document_versions_parent_id_unique" UNIQUE("project_id","document_id","id"),
	CONSTRAINT "project_document_versions_blob_unique" UNIQUE("blob_id"),
	CONSTRAINT "project_document_versions_number_positive" CHECK ("project_document_versions"."version_no" > 0),
	CONSTRAINT "project_document_versions_name_valid" CHECK (char_length("project_document_versions"."original_name") BETWEEN 1 AND 255 AND "project_document_versions"."original_name" ~ '[^[:space:]]' AND "project_document_versions"."original_name" !~ '[[:cntrl:]]'),
	CONSTRAINT "project_document_versions_media_valid" CHECK ("project_document_versions"."media_type" IN ('application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/markdown', 'text/plain')),
	CONSTRAINT "project_document_versions_size_valid" CHECK ("project_document_versions"."size_bytes" BETWEEN 1 AND 10485760),
	CONSTRAINT "project_document_versions_sha256_valid" CHECK ("project_document_versions"."sha256" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "project_document_versions_status_valid" CHECK ("project_document_versions"."status" IN ('PROCESSING', 'READY', 'FAILED')),
	CONSTRAINT "project_document_versions_parser_valid" CHECK ("project_document_versions"."parser_version" IS NULL OR char_length("project_document_versions"."parser_version") BETWEEN 1 AND 80),
	CONSTRAINT "project_document_versions_chars_valid" CHECK ("project_document_versions"."extracted_chars" BETWEEN 0 AND 500000),
	CONSTRAINT "project_document_versions_error_valid" CHECK ("project_document_versions"."error_code" IS NULL OR "project_document_versions"."error_code" IN ('UNSUPPORTED_FILE', 'INVALID_FILE', 'NO_TEXT', 'PARSE_LIMIT', 'PARSE_TIMEOUT', 'PARSE_FAILED', 'INTERRUPTED')),
	CONSTRAINT "project_document_versions_result_valid" CHECK (("project_document_versions"."status" = 'PROCESSING' AND "project_document_versions"."completed_at" IS NULL AND "project_document_versions"."error_code" IS NULL AND "project_document_versions"."extracted_chars" = 0) OR ("project_document_versions"."status" = 'READY' AND "project_document_versions"."completed_at" IS NOT NULL AND "project_document_versions"."parser_version" IS NOT NULL AND "project_document_versions"."error_code" IS NULL AND "project_document_versions"."extracted_chars" > 0) OR ("project_document_versions"."status" = 'FAILED' AND "project_document_versions"."completed_at" IS NOT NULL AND "project_document_versions"."error_code" IS NOT NULL AND "project_document_versions"."extracted_chars" = 0)),
	CONSTRAINT "project_document_versions_times_valid" CHECK (isfinite("project_document_versions"."created_at") AND ("project_document_versions"."completed_at" IS NULL OR (isfinite("project_document_versions"."completed_at") AND "project_document_versions"."completed_at" >= "project_document_versions"."created_at")))
);
--> statement-breakpoint
CREATE TABLE "project_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"title" text NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"current_version_id" uuid,
	"shared_version_id" uuid,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_documents_project_id_unique" UNIQUE("project_id","id"),
	CONSTRAINT "project_documents_title_valid" CHECK (char_length("project_documents"."title") BETWEEN 1 AND 200 AND "project_documents"."title" ~ '[^[:space:]]'),
	CONSTRAINT "project_documents_status_valid" CHECK ("project_documents"."status" IN ('ACTIVE', 'INACTIVE')),
	CONSTRAINT "project_documents_version_positive" CHECK ("project_documents"."version" > 0),
	CONSTRAINT "project_documents_times_valid" CHECK (isfinite("project_documents"."created_at") AND isfinite("project_documents"."updated_at") AND "project_documents"."updated_at" >= "project_documents"."created_at")
);
--> statement-breakpoint
ALTER TABLE "project_document_chunks" ADD CONSTRAINT "project_document_chunks_version_fk" FOREIGN KEY ("project_id","document_id","version_id") REFERENCES "public"."project_document_versions"("project_id","document_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_document_versions" ADD CONSTRAINT "project_document_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_document_versions" ADD CONSTRAINT "project_document_versions_project_document_fk" FOREIGN KEY ("project_id","document_id") REFERENCES "public"."project_documents"("project_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_documents" ADD CONSTRAINT "project_documents_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_documents" ADD CONSTRAINT "project_documents_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_documents" ADD CONSTRAINT "project_documents_current_version_fk" FOREIGN KEY ("project_id","id","current_version_id") REFERENCES "public"."project_document_versions"("project_id","document_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_documents" ADD CONSTRAINT "project_documents_shared_version_fk" FOREIGN KEY ("project_id","id","shared_version_id") REFERENCES "public"."project_document_versions"("project_id","document_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_document_chunks_project_version_idx" ON "project_document_chunks" USING btree ("project_id","version_id","ordinal");--> statement-breakpoint
CREATE INDEX "project_document_versions_processing_idx" ON "project_document_versions" USING btree ("project_id","status","created_at","id");--> statement-breakpoint
CREATE INDEX "project_documents_project_updated_idx" ON "project_documents" USING btree ("project_id","status","updated_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
-- Custom guards supplement Drizzle metadata: finalized source text must stay citable.
CREATE FUNCTION "specbridge_document_version_guard"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE chunk_count integer; text_chars integer;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'PROCESSING' THEN
      RAISE EXCEPTION 'Document versions must start in processing' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE' OR OLD.status <> 'PROCESSING' THEN
    RAISE EXCEPTION 'Finalized document versions are immutable' USING ERRCODE = '23514';
  END IF;
  IF ROW(NEW.id, NEW.project_id, NEW.document_id, NEW.version_no, NEW.original_name,
         NEW.media_type, NEW.size_bytes, NEW.blob_id, NEW.sha256, NEW.created_by, NEW.created_at)
     IS DISTINCT FROM
     ROW(OLD.id, OLD.project_id, OLD.document_id, OLD.version_no, OLD.original_name,
         OLD.media_type, OLD.size_bytes, OLD.blob_id, OLD.sha256, OLD.created_by, OLD.created_at) THEN
    RAISE EXCEPTION 'Document source identity is immutable' USING ERRCODE = '23514';
  END IF;
  SELECT count(*)::integer, coalesce(sum(char_length(content)), 0)::integer
    INTO chunk_count, text_chars FROM project_document_chunks WHERE version_id = OLD.id;
  IF NEW.status = 'READY' AND (chunk_count < 1 OR chunk_count > 1000 OR text_chars <> NEW.extracted_chars) THEN
    RAISE EXCEPTION 'Document extraction totals do not match' USING ERRCODE = '23514';
  END IF;
  IF NEW.status = 'FAILED' AND chunk_count <> 0 THEN
    RAISE EXCEPTION 'Failed document extraction must not retain chunks' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "project_document_versions_guard" BEFORE INSERT OR UPDATE OR DELETE
  ON "project_document_versions" FOR EACH ROW EXECUTE FUNCTION "specbridge_document_version_guard"();
--> statement-breakpoint
CREATE FUNCTION "specbridge_document_chunk_guard"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE parent_status text; parent_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN parent_id := OLD.version_id;
  ELSE parent_id := NEW.version_id;
  END IF;
  IF TG_OP = 'UPDATE' AND ROW(NEW.id, NEW.project_id, NEW.document_id, NEW.version_id, NEW.ordinal)
    IS DISTINCT FROM ROW(OLD.id, OLD.project_id, OLD.document_id, OLD.version_id, OLD.ordinal) THEN
    RAISE EXCEPTION 'Document chunk identity is immutable' USING ERRCODE = '23514';
  END IF;
  SELECT status INTO parent_status FROM project_document_versions WHERE id = parent_id FOR UPDATE;
  IF parent_status IS DISTINCT FROM 'PROCESSING' THEN
    RAISE EXCEPTION 'Finalized document chunks are immutable' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "project_document_chunks_guard" BEFORE INSERT OR UPDATE OR DELETE
  ON "project_document_chunks" FOR EACH ROW EXECUTE FUNCTION "specbridge_document_chunk_guard"();
--> statement-breakpoint
CREATE FUNCTION "specbridge_document_pointer_guard"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.current_version_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM project_document_versions WHERE id = NEW.current_version_id
      AND project_id = NEW.project_id AND document_id = NEW.id AND status = 'READY'
  ) THEN
    RAISE EXCEPTION 'Current document version must be ready and belong to this document' USING ERRCODE = '23514';
  END IF;
  IF NEW.shared_version_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM project_document_versions WHERE id = NEW.shared_version_id
      AND project_id = NEW.project_id AND document_id = NEW.id AND status = 'READY'
  ) THEN
    RAISE EXCEPTION 'Shared document version must be ready and belong to this document' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "project_documents_pointer_guard" BEFORE INSERT OR UPDATE
  ON "project_documents" FOR EACH ROW EXECUTE FUNCTION "specbridge_document_pointer_guard"();
