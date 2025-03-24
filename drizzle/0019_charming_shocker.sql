CREATE TYPE "public"."llm_provider" AS ENUM('openai', 'google', 'anthropic');--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "provider" "llm_provider" DEFAULT 'openai' NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "model" text DEFAULT 'gpt-4o' NOT NULL;