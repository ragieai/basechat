ALTER TABLE "invites" ALTER COLUMN "role" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "invites" ALTER COLUMN "role" SET NOT NULL;