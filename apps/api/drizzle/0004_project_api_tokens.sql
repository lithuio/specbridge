CREATE TABLE "api_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"token_hash" char(64) NOT NULL,
	"scopes" text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "api_tokens_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "api_tokens_name_valid" CHECK (char_length("api_tokens"."name") BETWEEN 1 AND 100 AND "api_tokens"."name" ~ '[^[:space:]]'),
	CONSTRAINT "api_tokens_token_hash_format" CHECK ("api_tokens"."token_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "api_tokens_scopes_read_only" CHECK ("api_tokens"."scopes" = ARRAY['approved_specs:read']::text[]),
	CONSTRAINT "api_tokens_expiry_window" CHECK (isfinite("api_tokens"."created_at") AND isfinite("api_tokens"."expires_at") AND "api_tokens"."expires_at" - "api_tokens"."created_at" BETWEEN interval '24 hours' AND interval '2160 hours'),
	CONSTRAINT "api_tokens_revocation_time_valid" CHECK ("api_tokens"."revoked_at" IS NULL OR (isfinite("api_tokens"."revoked_at") AND "api_tokens"."revoked_at" >= "api_tokens"."created_at"))
);
--> statement-breakpoint
ALTER TABLE "api_tokens" ADD CONSTRAINT "api_tokens_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_tokens" ADD CONSTRAINT "api_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "api_tokens_project_created_idx" ON "api_tokens" USING btree ("project_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);