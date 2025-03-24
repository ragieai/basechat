ALTER TYPE "public"."llm_model" RENAME TO "llm_provider";--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "model" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "model" SET DEFAULT 'gpt-4o';--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "provider" "llm_provider" DEFAULT 'openai' NOT NULL;--> statement-breakpoint
ALTER TABLE "public"."messages" ALTER COLUMN "provider" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."llm_provider";--> statement-breakpoint
CREATE TYPE "public"."llm_provider" AS ENUM('openai', 'google', 'anthropic');--> statement-breakpoint
ALTER TABLE "public"."messages" ALTER COLUMN "provider" SET DATA TYPE "public"."llm_provider" USING "provider"::"public"."llm_provider";