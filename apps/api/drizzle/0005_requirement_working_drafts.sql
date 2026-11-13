CREATE TABLE "requirement_publish_receipts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"requirement_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"draft_id" uuid NOT NULL,
	"draft_version" integer NOT NULL,
	"kind" text NOT NULL,
	"request_hash" char(64) NOT NULL,
	"result" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "requirement_publish_receipts_draft_version_unique" UNIQUE("draft_id","draft_version"),
	CONSTRAINT "requirement_publish_receipts_kind_valid" CHECK ("requirement_publish_receipts"."kind" IN ('clarify', 'specification')),
	CONSTRAINT "requirement_publish_receipts_version_positive" CHECK ("requirement_publish_receipts"."draft_version" > 0),
	CONSTRAINT "requirement_publish_receipts_hash_format" CHECK ("requirement_publish_receipts"."request_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "requirement_publish_receipts_result_object" CHECK (jsonb_typeof("requirement_publish_receipts"."result") = 'object' AND octet_length("requirement_publish_receipts"."result"::text) <= 8192),
	CONSTRAINT "requirement_publish_receipts_time_finite" CHECK (isfinite("requirement_publish_receipts"."created_at"))
);
--> statement-breakpoint
CREATE TABLE "requirement_working_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requirement_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"base_requirement_version" integer NOT NULL,
	"body" jsonb NOT NULL,
	"publication" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "requirement_working_drafts_author_kind_unique" UNIQUE("requirement_id","user_id","kind"),
	CONSTRAINT "requirement_working_drafts_kind_valid" CHECK ("requirement_working_drafts"."kind" IN ('clarify', 'specification')),
	CONSTRAINT "requirement_working_drafts_versions_positive" CHECK ("requirement_working_drafts"."version" > 0 AND "requirement_working_drafts"."base_requirement_version" > 0),
	CONSTRAINT "requirement_working_drafts_body_object" CHECK (jsonb_typeof("requirement_working_drafts"."body") = 'object' AND octet_length("requirement_working_drafts"."body"::text) <= 102400),
	CONSTRAINT "requirement_working_drafts_publication_object" CHECK (jsonb_typeof("requirement_working_drafts"."publication") = 'object' AND octet_length("requirement_working_drafts"."publication"::text) <= 16384),
	CONSTRAINT "requirement_working_drafts_times_valid" CHECK (isfinite("requirement_working_drafts"."created_at") AND isfinite("requirement_working_drafts"."updated_at") AND "requirement_working_drafts"."updated_at" >= "requirement_working_drafts"."created_at")
);
--> statement-breakpoint
ALTER TABLE "requirement_publish_receipts" ADD CONSTRAINT "requirement_publish_receipts_requirement_id_requirements_id_fk" FOREIGN KEY ("requirement_id") REFERENCES "public"."requirements"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirement_publish_receipts" ADD CONSTRAINT "requirement_publish_receipts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirement_working_drafts" ADD CONSTRAINT "requirement_working_drafts_requirement_id_requirements_id_fk" FOREIGN KEY ("requirement_id") REFERENCES "public"."requirements"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirement_working_drafts" ADD CONSTRAINT "requirement_working_drafts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "requirement_publish_receipts_author_requirement_idx" ON "requirement_publish_receipts" USING btree ("user_id","requirement_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "requirement_working_drafts_author_updated_idx" ON "requirement_working_drafts" USING btree ("user_id","updated_at" DESC NULLS LAST,"id" DESC NULLS LAST);