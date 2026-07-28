ALTER TABLE "users" ADD COLUMN "is_subscribed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "mp_preapproval_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "sentences_used" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "courses_used" integer DEFAULT 0 NOT NULL;