CREATE TABLE IF NOT EXISTS "invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"invited_by_id" uuid NOT NULL,
	"email" text
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "invites" ADD CONSTRAINT "invites_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "invites" ADD CONSTRAINT "invites_invited_by_id_profiles_id_fk" FOREIGN KEY ("invited_by_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
