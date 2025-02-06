ALTER TABLE "profiles" ALTER COLUMN "role" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "role" SET NOT NULL;