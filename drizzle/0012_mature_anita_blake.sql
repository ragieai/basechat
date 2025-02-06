CREATE TYPE "public"."roles" AS ENUM('admin', 'user');--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "role" "roles" DEFAULT 'admin';