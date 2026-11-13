CREATE TABLE "agent_connection_grants" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"code_hash" char(64) NOT NULL,
	"challenge" char(43) NOT NULL,
	"state_hash" char(64) NOT NULL,
	"callback_port" integer NOT NULL,
	"token_name" text NOT NULL,
	"token_expires_in_days" integer NOT NULL,
	"status" text DEFAULT 'AUTHORIZED' NOT NULL,
	"api_token_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "agent_connection_grants_code_unique" UNIQUE("code_hash"),
	CONSTRAINT "agent_connection_grants_token_unique" UNIQUE("api_token_id"),
	CONSTRAINT "agent_connection_grants_proof_valid" CHECK ("agent_connection_grants"."code_hash" ~ '^[0-9a-f]{64}$' AND "agent_connection_grants"."state_hash" ~ '^[0-9a-f]{64}$' AND "agent_connection_grants"."challenge" ~ '^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$'),
	CONSTRAINT "agent_connection_grants_port_valid" CHECK ("agent_connection_grants"."callback_port" BETWEEN 1024 AND 65535),
	CONSTRAINT "agent_connection_grants_token_settings" CHECK (length(btrim("agent_connection_grants"."token_name")) BETWEEN 1 AND 100 AND "agent_connection_grants"."token_expires_in_days" BETWEEN 1 AND 90),
	CONSTRAINT "agent_connection_grants_state_valid" CHECK (("agent_connection_grants"."status"='AUTHORIZED' AND "agent_connection_grants"."api_token_id" IS NULL AND "agent_connection_grants"."completed_at" IS NULL) OR ("agent_connection_grants"."status"='EXCHANGED' AND "agent_connection_grants"."api_token_id" IS NOT NULL AND "agent_connection_grants"."completed_at" IS NOT NULL) OR ("agent_connection_grants"."status"='CANCELLED' AND "agent_connection_grants"."api_token_id" IS NULL AND "agent_connection_grants"."completed_at" IS NOT NULL)),
	CONSTRAINT "agent_connection_grants_time_valid" CHECK (isfinite("agent_connection_grants"."created_at") AND isfinite("agent_connection_grants"."expires_at") AND "agent_connection_grants"."expires_at">"agent_connection_grants"."created_at" AND "agent_connection_grants"."expires_at"<="agent_connection_grants"."created_at"+interval '5 minutes' AND ("agent_connection_grants"."completed_at" IS NULL OR (isfinite("agent_connection_grants"."completed_at") AND "agent_connection_grants"."completed_at">="agent_connection_grants"."created_at" AND ("agent_connection_grants"."status"<>'EXCHANGED' OR "agent_connection_grants"."completed_at"<"agent_connection_grants"."expires_at"))))
);
--> statement-breakpoint
ALTER TABLE "agent_connection_grants" ADD CONSTRAINT "agent_connection_grants_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_connection_grants" ADD CONSTRAINT "agent_connection_grants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_connection_grants" ADD CONSTRAINT "agent_connection_grants_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_connection_grants" ADD CONSTRAINT "agent_connection_grants_api_token_id_api_tokens_id_fk" FOREIGN KEY ("api_token_id") REFERENCES "public"."api_tokens"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_connection_grants_owner_project_idx" ON "agent_connection_grants" USING btree ("user_id","project_id","created_at");--> statement-breakpoint
CREATE INDEX "agent_connection_grants_expiry_idx" ON "agent_connection_grants" USING btree ("expires_at");
--> statement-breakpoint
-- Only the new table is guarded; existing Token/session/tenant tables are unchanged.
CREATE FUNCTION specbridge_guard_agent_connection_grant() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'AUTHORIZED' OR NEW.api_token_id IS NOT NULL OR NEW.completed_at IS NOT NULL
       OR NEW.created_at > clock_timestamp() OR NEW.expires_at <= clock_timestamp() THEN
      RAISE EXCEPTION 'invalid initial connection grant' USING ERRCODE = '23514';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM sessions s WHERE s.id=NEW.session_id AND s.user_id=NEW.user_id) THEN
      RAISE EXCEPTION 'connection session mismatch' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE' THEN
    -- Used only for expired unused/cancelled metadata cleanup; issued-token receipts remain.
    IF OLD.status = 'EXCHANGED' OR OLD.expires_at > clock_timestamp() - interval '24 hours' THEN
      RAISE EXCEPTION 'connection grant history is retained' USING ERRCODE = '23514';
    END IF;
    RETURN OLD;
  END IF;
  IF OLD.status <> 'AUTHORIZED' OR NEW.status NOT IN ('EXCHANGED','CANCELLED') THEN
    RAISE EXCEPTION 'connection grant is terminal' USING ERRCODE = '23514';
  END IF;
  IF ROW(NEW.id,NEW.project_id,NEW.user_id,NEW.session_id,NEW.code_hash,NEW.challenge,NEW.state_hash,
         NEW.callback_port,NEW.token_name,NEW.token_expires_in_days,NEW.created_at,NEW.expires_at)
     IS DISTINCT FROM
     ROW(OLD.id,OLD.project_id,OLD.user_id,OLD.session_id,OLD.code_hash,OLD.challenge,OLD.state_hash,
         OLD.callback_port,OLD.token_name,OLD.token_expires_in_days,OLD.created_at,OLD.expires_at) THEN
    RAISE EXCEPTION 'connection binding is immutable' USING ERRCODE = '23514';
  END IF;
  IF NEW.completed_at IS NULL OR NEW.completed_at > clock_timestamp() THEN
    RAISE EXCEPTION 'invalid connection completion time' USING ERRCODE = '23514';
  END IF;
  IF NEW.status = 'EXCHANGED' THEN
    IF NEW.expires_at <= clock_timestamp() THEN
      RAISE EXCEPTION 'connection grant expired' USING ERRCODE = '23514';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM api_tokens t WHERE t.id=NEW.api_token_id AND t.project_id=NEW.project_id
        AND t.user_id=NEW.user_id AND t.name=NEW.token_name
        AND t.scopes=ARRAY['approved_specs:read']::text[] AND t.revoked_at IS NULL
        AND t.created_at>=NEW.created_at AND t.created_at<=NEW.completed_at
        AND t.expires_at-t.created_at=NEW.token_expires_in_days * interval '24 hours'
    ) THEN
      RAISE EXCEPTION 'connection token mismatch' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER agent_connection_grants_guard
BEFORE INSERT OR UPDATE OR DELETE ON agent_connection_grants
FOR EACH ROW EXECUTE FUNCTION specbridge_guard_agent_connection_grant();
