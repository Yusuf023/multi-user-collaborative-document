ALTER TABLE "documents" ADD COLUMN "finalized" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "finalized_by" text;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "finalized_at" timestamp with time zone;