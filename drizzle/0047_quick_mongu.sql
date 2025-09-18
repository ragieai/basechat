CREATE TYPE "public"."message_retrieval_types" AS ENUM('agentic', 'standard');--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "type" "message_retrieval_types" DEFAULT 'standard' NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "agentic_info" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "agentic_enabled" boolean DEFAULT true;