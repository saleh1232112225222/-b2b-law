CREATE TABLE "scheduled_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"target_email" text NOT NULL,
	"report_type" text DEFAULT 'users_report',
	"send_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'pending',
	"created_at" timestamp with time zone DEFAULT now()
);
