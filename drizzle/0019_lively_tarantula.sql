ALTER TABLE "tenants" ADD COLUMN "slug" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_slug_unique" UNIQUE("slug");
UPDATE "tenants" SET "slug" = "id";