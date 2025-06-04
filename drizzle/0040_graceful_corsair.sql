ALTER TABLE "conversations" ADD COLUMN "slack_thread_id" text;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "slack_event" json;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "slack_event" json;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "slack_enabled" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "slack_channels" text[] DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "slack_bot_token" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "slack_team_id" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "slack_team_name" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "slack_response_mode" text DEFAULT 'mentions';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "slack_user_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "slack_user" json;--> statement-breakpoint
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_slack_team_id_unique" UNIQUE("slack_team_id");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_slack_user_id_unique" UNIQUE("slack_user_id");