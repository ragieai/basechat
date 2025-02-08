ALTER TABLE "tenants" DROP CONSTRAINT "tenants_owner_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "tenants" DROP COLUMN IF EXISTS "owner_id";