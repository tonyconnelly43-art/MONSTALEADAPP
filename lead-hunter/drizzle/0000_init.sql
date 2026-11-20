CREATE TABLE "api_usage" (
	"day" date NOT NULL,
	"provider" text NOT NULL,
	"requests" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "api_usage_day_provider_pk" PRIMARY KEY("day","provider")
);
--> statement-breakpoint
CREATE TABLE "prospects" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"source_id" text NOT NULL,
	"is_fictional" boolean DEFAULT false NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"city" text,
	"state" text,
	"phone" text,
	"website" text,
	"category" text,
	"rating" real,
	"review_count" integer,
	"source_url" text,
	"retrieved_at" timestamp with time zone NOT NULL,
	"content_expires_at" timestamp with time zone,
	"content_expired" boolean DEFAULT false NOT NULL,
	"industry" text NOT NULL,
	"chain_suspected" boolean,
	"analysis" jsonb,
	"status" text DEFAULT 'New' NOT NULL,
	"status_history" jsonb NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "prospects_provider_source_idx" ON "prospects" USING btree ("provider","source_id");--> statement-breakpoint
CREATE INDEX "prospects_status_idx" ON "prospects" USING btree ("status");--> statement-breakpoint
CREATE INDEX "prospects_content_expires_idx" ON "prospects" USING btree ("content_expires_at");