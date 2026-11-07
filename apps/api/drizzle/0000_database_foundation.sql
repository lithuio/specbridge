CREATE TYPE "public"."approval_decision" AS ENUM('APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."approval_step" AS ENUM('VENDOR', 'CLIENT');--> statement-breakpoint
CREATE TYPE "public"."change_request_status" AS ENUM('DRAFT', 'SUBMITTED', 'VENDOR_APPROVED', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."clarification_kind" AS ENUM('QUESTION', 'ANSWER');--> statement-breakpoint
CREATE TYPE "public"."delivery_decision" AS ENUM('ACCEPTED', 'CHANGES_REQUESTED');--> statement-breakpoint
CREATE TYPE "public"."delivery_status" AS ENUM('SUBMITTED', 'CHANGES_REQUESTED', 'ACCEPTED');--> statement-breakpoint
CREATE TYPE "public"."project_role" AS ENUM('DEVELOPER', 'CLIENT');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('ACTIVE', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."requirement_status" AS ENUM('DRAFT', 'CLARIFYING', 'READY');--> statement-breakpoint
CREATE TYPE "public"."workspace_role" AS ENUM('OWNER', 'DEVELOPER');--> statement-breakpoint
CREATE TABLE "approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"change_request_version_id" uuid NOT NULL,
	"step" "approval_step" NOT NULL,
	"actor_id" uuid NOT NULL,
	"decision" "approval_decision" NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "approvals_version_step_unique" UNIQUE("change_request_version_id","step")
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid,
	"actor_id" uuid,
	"event_type" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"entity_version" integer,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audit_events_metadata_object" CHECK (jsonb_typeof("audit_events"."metadata") = 'object')
);
--> statement-breakpoint
CREATE TABLE "change_request_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"change_request_id" uuid NOT NULL,
	"version_no" integer NOT NULL,
	"requirement_revision_id" uuid NOT NULL,
	"scope_snapshot" text NOT NULL,
	"estimate_hours" numeric(8, 2) NOT NULL,
	"cost_delta_minor" bigint NOT NULL,
	"currency" char(3) NOT NULL,
	"schedule_delta_days" integer NOT NULL,
	"acceptance_criteria" jsonb NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"submitted_by" uuid NOT NULL,
	CONSTRAINT "change_request_versions_number_unique" UNIQUE("change_request_id","version_no"),
	CONSTRAINT "change_request_versions_request_id_unique" UNIQUE("change_request_id","id"),
	CONSTRAINT "change_request_versions_number_positive" CHECK ("change_request_versions"."version_no" > 0),
	CONSTRAINT "change_request_versions_hours_valid" CHECK ("change_request_versions"."estimate_hours" >= 0 AND "change_request_versions"."estimate_hours" <> 'NaN'::numeric),
	CONSTRAINT "change_request_versions_currency_format" CHECK ("change_request_versions"."currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "change_request_versions_scope_nonempty" CHECK ("change_request_versions"."scope_snapshot" ~ '[^[:space:]]'),
	CONSTRAINT "change_request_versions_criteria_array" CHECK (CASE WHEN jsonb_typeof("change_request_versions"."acceptance_criteria") = 'array' THEN jsonb_array_length("change_request_versions"."acceptance_criteria") > 0 AND NOT jsonb_path_exists("change_request_versions"."acceptance_criteria", '$[*] ? (@.type() != "string")') ELSE false END)
);
--> statement-breakpoint
CREATE TABLE "change_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requirement_id" uuid NOT NULL,
	"status" "change_request_status" DEFAULT 'DRAFT' NOT NULL,
	"lock_version" integer DEFAULT 0 NOT NULL,
	"active_version_id" uuid,
	"draft_requirement_revision_id" uuid NOT NULL,
	"draft_scope_summary" text,
	"draft_estimate_hours" numeric(8, 2),
	"draft_cost_delta_minor" bigint,
	"draft_currency" char(3),
	"draft_schedule_delta_days" integer,
	"draft_acceptance_criteria" jsonb,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "change_requests_lock_nonnegative" CHECK ("change_requests"."lock_version" >= 0),
	CONSTRAINT "change_requests_hours_valid" CHECK ("change_requests"."draft_estimate_hours" >= 0 AND "change_requests"."draft_estimate_hours" <> 'NaN'::numeric),
	CONSTRAINT "change_requests_currency_format" CHECK ("change_requests"."draft_currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "change_requests_criteria_array" CHECK (jsonb_typeof("change_requests"."draft_acceptance_criteria") = 'array' AND NOT jsonb_path_exists("change_requests"."draft_acceptance_criteria", '$[*] ? (@.type() != "string")'))
);
--> statement-breakpoint
CREATE TABLE "clarifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requirement_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"parent_id" uuid,
	"kind" "clarification_kind" NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clarifications_requirement_id_unique" UNIQUE("requirement_id","id")
);
--> statement-breakpoint
CREATE TABLE "deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"change_request_version_id" uuid NOT NULL,
	"delivery_no" integer NOT NULL,
	"artifact_url" text NOT NULL,
	"summary" text NOT NULL,
	"evidence_links" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "delivery_status" DEFAULT 'SUBMITTED' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "deliveries_version_number_unique" UNIQUE("change_request_version_id","delivery_no"),
	CONSTRAINT "deliveries_number_positive" CHECK ("deliveries"."delivery_no" > 0),
	CONSTRAINT "deliveries_artifact_https" CHECK ("deliveries"."artifact_url" ~ '^https://[^/[:space:]]+' AND "deliveries"."artifact_url" !~ '[[:space:]]'),
	CONSTRAINT "deliveries_evidence_https_array" CHECK (jsonb_typeof("deliveries"."evidence_links") = 'array' AND NOT jsonb_path_exists("deliveries"."evidence_links", '$[*] ? (@.type() != "string" || !(@ like_regex "^https://[^/[:space:]]+[^[:space:]]*$"))'))
);
--> statement-breakpoint
CREATE TABLE "delivery_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"delivery_id" uuid NOT NULL,
	"reviewer_id" uuid NOT NULL,
	"decision" "delivery_decision" NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "delivery_reviews_delivery_unique" UNIQUE("delivery_id"),
	CONSTRAINT "delivery_reviews_changes_comment" CHECK ("delivery_reviews"."decision" <> 'CHANGES_REQUESTED' OR ("delivery_reviews"."comment" IS NOT NULL AND "delivery_reviews"."comment" ~ '[^[:space:]]'))
);
--> statement-breakpoint
CREATE TABLE "project_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "project_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_members_user_unique" UNIQUE("project_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"baseline_scope" text NOT NULL,
	"status" "project_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_workspace_id_unique" UNIQUE("workspace_id","id"),
	CONSTRAINT "projects_baseline_scope_nonempty" CHECK ("projects"."baseline_scope" ~ '[^[:space:]]')
);
--> statement-breakpoint
CREATE TABLE "requirement_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requirement_id" uuid NOT NULL,
	"revision_no" integer NOT NULL,
	"content" text NOT NULL,
	"acceptance_criteria" jsonb NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "requirement_revisions_number_unique" UNIQUE("requirement_id","revision_no"),
	CONSTRAINT "requirement_revisions_requirement_id_unique" UNIQUE("requirement_id","id"),
	CONSTRAINT "requirement_revisions_number_positive" CHECK ("requirement_revisions"."revision_no" > 0),
	CONSTRAINT "requirement_revisions_criteria_array" CHECK (jsonb_typeof("requirement_revisions"."acceptance_criteria") = 'array' AND NOT jsonb_path_exists("requirement_revisions"."acceptance_criteria", '$[*] ? (@.type() != "string")'))
);
--> statement-breakpoint
CREATE TABLE "requirements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"title" text NOT NULL,
	"original_text" text NOT NULL,
	"status" "requirement_status" DEFAULT 'DRAFT' NOT NULL,
	"latest_revision_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" char(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "sessions_token_hash_format" CHECK ("sessions"."token_hash" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"display_name" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "workspace_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_members_user_unique" UNIQUE("workspace_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"owner_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_change_request_version_id_change_request_versions_id_fk" FOREIGN KEY ("change_request_version_id") REFERENCES "public"."change_request_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_workspace_project_fk" FOREIGN KEY ("workspace_id","project_id") REFERENCES "public"."projects"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_request_versions" ADD CONSTRAINT "change_request_versions_change_request_id_change_requests_id_fk" FOREIGN KEY ("change_request_id") REFERENCES "public"."change_requests"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_request_versions" ADD CONSTRAINT "change_request_versions_requirement_revision_id_requirement_revisions_id_fk" FOREIGN KEY ("requirement_revision_id") REFERENCES "public"."requirement_revisions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_request_versions" ADD CONSTRAINT "change_request_versions_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_requests" ADD CONSTRAINT "change_requests_requirement_id_requirements_id_fk" FOREIGN KEY ("requirement_id") REFERENCES "public"."requirements"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_requests" ADD CONSTRAINT "change_requests_draft_requirement_revision_id_requirement_revisions_id_fk" FOREIGN KEY ("draft_requirement_revision_id") REFERENCES "public"."requirement_revisions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_requests" ADD CONSTRAINT "change_requests_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_requests" ADD CONSTRAINT "change_requests_active_version_fk" FOREIGN KEY ("id","active_version_id") REFERENCES "public"."change_request_versions"("change_request_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clarifications" ADD CONSTRAINT "clarifications_requirement_id_requirements_id_fk" FOREIGN KEY ("requirement_id") REFERENCES "public"."requirements"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clarifications" ADD CONSTRAINT "clarifications_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clarifications" ADD CONSTRAINT "clarifications_parent_fk" FOREIGN KEY ("requirement_id","parent_id") REFERENCES "public"."clarifications"("requirement_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_change_request_version_id_change_request_versions_id_fk" FOREIGN KEY ("change_request_version_id") REFERENCES "public"."change_request_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_reviews" ADD CONSTRAINT "delivery_reviews_delivery_id_deliveries_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."deliveries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_reviews" ADD CONSTRAINT "delivery_reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirement_revisions" ADD CONSTRAINT "requirement_revisions_requirement_id_requirements_id_fk" FOREIGN KEY ("requirement_id") REFERENCES "public"."requirements"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirement_revisions" ADD CONSTRAINT "requirement_revisions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirements" ADD CONSTRAINT "requirements_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirements" ADD CONSTRAINT "requirements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirements" ADD CONSTRAINT "requirements_latest_revision_fk" FOREIGN KEY ("id","latest_revision_id") REFERENCES "public"."requirement_revisions"("requirement_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_events_project_created_idx" ON "audit_events" USING btree ("project_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "change_requests_requirement_status_idx" ON "change_requests" USING btree ("requirement_id","status");--> statement-breakpoint
CREATE INDEX "clarifications_requirement_created_idx" ON "clarifications" USING btree ("requirement_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "deliveries_one_submitted" ON "deliveries" USING btree ("change_request_version_id") WHERE "deliveries"."status" = 'SUBMITTED';--> statement-breakpoint
CREATE UNIQUE INDEX "project_members_one_client" ON "project_members" USING btree ("project_id") WHERE "project_members"."role" = 'CLIENT';--> statement-breakpoint
CREATE INDEX "projects_workspace_status_idx" ON "projects" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "requirements_project_status_idx" ON "requirements" USING btree ("project_id","status");--> statement-breakpoint
CREATE INDEX "sessions_user_expiry_idx" ON "sessions" USING btree ("user_id","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_lower_unique" ON "users" USING btree (lower("email"));--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_members_one_owner" ON "workspace_members" USING btree ("workspace_id") WHERE "workspace_members"."role" = 'OWNER';