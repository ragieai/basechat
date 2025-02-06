ALTER TABLE "invites" ADD COLUMN "role" "roles" DEFAULT 'admin';--> statement-breakpoint
ALTER TABLE "public"."invites" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "public"."invites" ALTER COLUMN "role" SET DATA TYPE "public"."roles" USING "role"::"public"."roles";--> statement-breakpoint
