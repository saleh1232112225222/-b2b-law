CREATE TYPE "public"."payment_status" AS ENUM('pending', 'completed', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."plan_interval" AS ENUM('trial', 'month', 'year', 'lifetime');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('trial', 'active', 'past_due', 'canceled', 'expired', 'lifetime');--> statement-breakpoint

-- Alter plans.interval
ALTER TABLE "plans" ALTER COLUMN "interval" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "plans" ALTER COLUMN "interval" TYPE "public"."plan_interval" USING "interval"::"public"."plan_interval";--> statement-breakpoint
ALTER TABLE "plans" ALTER COLUMN "interval" SET DEFAULT 'month';--> statement-breakpoint

-- Alter subscriptions.status
ALTER TABLE "subscriptions" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "status" TYPE "public"."subscription_status" USING "status"::"public"."subscription_status";--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "status" SET DEFAULT 'trial';--> statement-breakpoint

-- Alter payments.status
ALTER TABLE "payments" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "status" TYPE "public"."payment_status" USING "status"::"public"."payment_status";--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "status" SET DEFAULT 'pending';--> statement-breakpoint

-- Fix case_parties.defendant_id foreign key constraint
ALTER TABLE "case_parties" DROP CONSTRAINT IF EXISTS "case_parties_defendant_id_clients_id_fk";--> statement-breakpoint
ALTER TABLE "case_parties" ADD CONSTRAINT "case_parties_defendant_id_defendants_id_fk" FOREIGN KEY ("defendant_id") REFERENCES "public"."defendants"("id") ON DELETE set null ON UPDATE no action;