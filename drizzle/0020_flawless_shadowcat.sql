CREATE TYPE "public"."user_type" AS ENUM('authenticated', 'anonymous');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "type" "user_type" DEFAULT 'authenticated' NOT NULL;