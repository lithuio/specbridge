CREATE TABLE "copilot_proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requirement_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"change_request_id" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"base_requirement_version" integer NOT NULL,
	"base_change_version" integer,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"payload" jsonb NOT NULL,
	"sources" jsonb NOT NULL,
	"operation_id" uuid,
	"request_hash" char(64),
	"result" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"executed_at" timestamp with time zone,
	CONSTRAINT "copilot_proposals_operation_unique" UNIQUE("operation_id"),
	CONSTRAINT "copilot_proposals_kind_valid" CHECK ("copilot_proposals"."kind" IN ('publish_questions','create_revision','create_change_draft','update_change_draft')),
	CONSTRAINT "copilot_proposals_versions_valid" CHECK ("copilot_proposals"."version">0 AND "copilot_proposals"."base_requirement_version">0 AND ("copilot_proposals"."base_change_version" IS NULL OR "copilot_proposals"."base_change_version">=0)),
	CONSTRAINT "copilot_proposals_target_valid" CHECK (("copilot_proposals"."kind"='update_change_draft' AND "copilot_proposals"."change_request_id" IS NOT NULL AND "copilot_proposals"."base_change_version" IS NOT NULL) OR ("copilot_proposals"."kind"<>'update_change_draft' AND "copilot_proposals"."change_request_id" IS NULL AND "copilot_proposals"."base_change_version" IS NULL)),
	CONSTRAINT "copilot_proposals_payload_valid" CHECK (jsonb_typeof("copilot_proposals"."payload")='object' AND octet_length("copilot_proposals"."payload"::text)<=98304),
	CONSTRAINT "copilot_proposals_sources_valid" CHECK (jsonb_typeof("copilot_proposals"."sources")='array' AND octet_length("copilot_proposals"."sources"::text)<=16384),
	CONSTRAINT "copilot_proposals_hash_valid" CHECK ("copilot_proposals"."request_hash" IS NULL OR "copilot_proposals"."request_hash"~'^[0-9a-f]{64}$'),
	CONSTRAINT "copilot_proposals_result_valid" CHECK ("copilot_proposals"."result" IS NULL OR (jsonb_typeof("copilot_proposals"."result")='object' AND octet_length("copilot_proposals"."result"::text)<=8192)),
	CONSTRAINT "copilot_proposals_state_valid" CHECK (("copilot_proposals"."status"='DRAFT' AND "copilot_proposals"."operation_id" IS NULL AND "copilot_proposals"."request_hash" IS NULL AND "copilot_proposals"."result" IS NULL AND "copilot_proposals"."executed_at" IS NULL) OR ("copilot_proposals"."status"='EXECUTED' AND "copilot_proposals"."operation_id" IS NOT NULL AND "copilot_proposals"."request_hash" IS NOT NULL AND "copilot_proposals"."result" IS NOT NULL AND "copilot_proposals"."executed_at" IS NOT NULL)),
	CONSTRAINT "copilot_proposals_time_valid" CHECK (isfinite("copilot_proposals"."created_at") AND isfinite("copilot_proposals"."updated_at") AND isfinite("copilot_proposals"."expires_at") AND "copilot_proposals"."updated_at">="copilot_proposals"."created_at" AND "copilot_proposals"."expires_at">"copilot_proposals"."created_at" AND "copilot_proposals"."expires_at"<="copilot_proposals"."created_at"+interval '24 hours' AND ("copilot_proposals"."executed_at" IS NULL OR (isfinite("copilot_proposals"."executed_at") AND "copilot_proposals"."executed_at">="copilot_proposals"."created_at" AND "copilot_proposals"."executed_at"<="copilot_proposals"."expires_at" AND "copilot_proposals"."updated_at">="copilot_proposals"."executed_at")))
);
--> statement-breakpoint
ALTER TABLE "copilot_proposals" ADD CONSTRAINT "copilot_proposals_requirement_id_requirements_id_fk" FOREIGN KEY ("requirement_id") REFERENCES "public"."requirements"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copilot_proposals" ADD CONSTRAINT "copilot_proposals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copilot_proposals" ADD CONSTRAINT "copilot_proposals_change_request_id_change_requests_id_fk" FOREIGN KEY ("change_request_id") REFERENCES "public"."change_requests"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "copilot_proposals_author_requirement_idx" ON "copilot_proposals" USING btree ("user_id","requirement_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "copilot_proposals_expiry_idx" ON "copilot_proposals" USING btree ("status","expires_at");

--> statement-breakpoint
-- Custom guard: only this new table is affected. No business transition is performed here.
CREATE FUNCTION specbridge_copilot_proposal_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status = 'EXECUTED' THEN
      RAISE EXCEPTION 'Executed proposal receipt is immutable' USING ERRCODE = '23514';
    END IF;
    RETURN OLD;
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'DRAFT' OR NEW.version <> 1 THEN
      RAISE EXCEPTION 'Proposal must start as a draft' USING ERRCODE = '23514';
    END IF;
  ELSE
    IF OLD.status = 'EXECUTED' THEN
      RAISE EXCEPTION 'Executed proposal receipt is immutable' USING ERRCODE = '23514';
    END IF;
    IF ROW(NEW.id, NEW.requirement_id, NEW.user_id, NEW.kind, NEW.change_request_id, NEW.created_at, NEW.expires_at)
      IS DISTINCT FROM ROW(OLD.id, OLD.requirement_id, OLD.user_id, OLD.kind, OLD.change_request_id, OLD.created_at, OLD.expires_at)
      OR NEW.version <> OLD.version + 1 THEN
      RAISE EXCEPTION 'Proposal identity or version is invalid' USING ERRCODE = '23514';
    END IF;
  END IF;
  IF NEW.change_request_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM change_requests WHERE id = NEW.change_request_id AND requirement_id = NEW.requirement_id
  ) THEN
    RAISE EXCEPTION 'Proposal target has another requirement' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER copilot_proposals_guard BEFORE INSERT OR UPDATE OR DELETE ON copilot_proposals
  FOR EACH ROW EXECUTE FUNCTION specbridge_copilot_proposal_guard();
