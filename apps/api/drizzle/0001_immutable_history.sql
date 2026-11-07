-- Custom migration: these guards are not represented by Drizzle schema snapshots.
-- Review together with 0000_database_foundation.sql before first application.
CREATE FUNCTION specbridge_reject_history_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Historical records are immutable'
    USING ERRCODE = '23514', CONSTRAINT = 'immutable_history';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER requirement_revisions_immutable
BEFORE UPDATE OR DELETE ON requirement_revisions
FOR EACH ROW EXECUTE FUNCTION specbridge_reject_history_mutation();
--> statement-breakpoint
CREATE TRIGGER change_request_versions_immutable
BEFORE UPDATE OR DELETE ON change_request_versions
FOR EACH ROW EXECUTE FUNCTION specbridge_reject_history_mutation();
--> statement-breakpoint
CREATE TRIGGER approvals_immutable
BEFORE UPDATE OR DELETE ON approvals
FOR EACH ROW EXECUTE FUNCTION specbridge_reject_history_mutation();
--> statement-breakpoint
CREATE TRIGGER delivery_reviews_immutable
BEFORE UPDATE OR DELETE ON delivery_reviews
FOR EACH ROW EXECUTE FUNCTION specbridge_reject_history_mutation();
--> statement-breakpoint
CREATE FUNCTION specbridge_reject_baseline_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Initial project scope is immutable'
    USING ERRCODE = '23514', CONSTRAINT = 'immutable_baseline_scope';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER projects_baseline_scope_immutable
BEFORE UPDATE OF baseline_scope ON projects
FOR EACH ROW WHEN (OLD.baseline_scope IS DISTINCT FROM NEW.baseline_scope)
EXECUTE FUNCTION specbridge_reject_baseline_mutation();
