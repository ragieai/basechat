CREATE TYPE "public"."share_access_type" AS ENUM('public', 'organization', 'email');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "shared_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"conversation_id" uuid NOT NULL,
	"share_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"created_by" uuid NOT NULL,
	"access_type" "share_access_type" DEFAULT 'public' NOT NULL,
	"recipient_emails" json DEFAULT '[]'::json,
	"expires_at" timestamp with time zone,
	CONSTRAINT "shared_conversations_share_id_unique" UNIQUE("share_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "shared_conversations" ADD CONSTRAINT "shared_conversations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "shared_conversations" ADD CONSTRAINT "shared_conversations_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "shared_conversations" ADD CONSTRAINT "shared_conversations_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shared_conversations_share_id_idx" ON "shared_conversations" USING btree ("share_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shared_conversations_conversation_id_idx" ON "shared_conversations" USING btree ("conversation_id");