ALTER TABLE "tenants" ADD COLUMN "is_public" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "slug" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "type" "user_type" DEFAULT 'authenticated' NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_slug_unique" UNIQUE("slug");