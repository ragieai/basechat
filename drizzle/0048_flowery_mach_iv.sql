CREATE TABLE IF NOT EXISTS "jwkss" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"public_key" text NOT NULL,
	"private_key" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "model" SET DEFAULT 'claude-sonnet-4-5-20250929';--> statement-breakpoint
ALTER TABLE "tenants" ALTER COLUMN "default_model" SET DEFAULT 'claude-sonnet-4-5-20250929';