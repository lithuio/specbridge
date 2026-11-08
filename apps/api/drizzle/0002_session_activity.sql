-- R02: preserve existing session age; never refresh old sessions during migration.
ALTER TABLE "sessions" ADD COLUMN "last_activity_at" timestamp with time zone;
--> statement-breakpoint
UPDATE "sessions" SET "last_activity_at" = "created_at";
--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "last_activity_at" SET DEFAULT now();
--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "last_activity_at" SET NOT NULL;
