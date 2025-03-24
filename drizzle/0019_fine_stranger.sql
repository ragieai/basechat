CREATE TYPE "public"."llm_model" AS ENUM('GPT-4o', 'Gemini 2.0 Flash', 'Claude Sonnet 3.7');--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "model" "llm_model" DEFAULT 'GPT-4o' NOT NULL;