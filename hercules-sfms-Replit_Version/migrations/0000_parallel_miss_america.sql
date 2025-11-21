CREATE TABLE "activation_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"tenant_id" varchar NOT NULL,
	"facility_id" integer,
	"status" text DEFAULT 'pending' NOT NULL,
	"activated_at" timestamp,
	"expires_at" timestamp NOT NULL,
	"gateway_info" jsonb,
	"ip_address" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "activation_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"facility_id" integer,
	"plc_id" integer,
	"tag_id" integer,
	"severity" text NOT NULL,
	"type" text NOT NULL,
	"message" text NOT NULL,
	"details" jsonb,
	"is_active" boolean DEFAULT true,
	"acknowledged_by" integer,
	"acknowledged_at" timestamp,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dashboard_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"layout" jsonb NOT NULL,
	"widgets" jsonb NOT NULL,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "demo_users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"password" text,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"company_name" text,
	"industry" text,
	"country" text,
	"demo_start_date" timestamp DEFAULT now(),
	"demo_end_date" timestamp,
	"demo_key" text,
	"status" text DEFAULT 'active' NOT NULL,
	"gateway_downloaded" boolean DEFAULT false,
	"gateway_downloaded_at" timestamp,
	"access_expires_at" timestamp,
	"access_granted_days" integer,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "demo_users_email_unique" UNIQUE("email"),
	CONSTRAINT "demo_users_demo_key_unique" UNIQUE("demo_key")
);
--> statement-breakpoint
CREATE TABLE "facilities" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" varchar NOT NULL,
	"facility_code" text NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"city" text,
	"state" text,
	"country" text,
	"timezone" text,
	"gateway_status" text DEFAULT 'disconnected',
	"last_gateway_ping" timestamp,
	"gateway_version" text,
	"gateway_os" text,
	"gateway_hardware" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "gateway_audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"gateway_id" varchar,
	"user_id" varchar,
	"action" varchar(50) NOT NULL,
	"success" boolean NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"error_message" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "gateway_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"gateway_id" varchar,
	"gateway_token" text,
	"tenant_id" varchar,
	"machine_id" varchar,
	"status" varchar DEFAULT 'issued' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"activated_at" timestamp,
	"last_sync_at" timestamp,
	"redeemed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"activation_ip" varchar,
	"gateway_info" jsonb,
	"sync_count" integer DEFAULT 0,
	"scope" jsonb,
	"redeemed_by_gateway_id" varchar,
	"notes" text,
	CONSTRAINT "gateway_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "gateway_commands" (
	"id" serial PRIMARY KEY NOT NULL,
	"gateway_id" varchar NOT NULL,
	"command_type" varchar NOT NULL,
	"command_data" jsonb NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"priority" integer DEFAULT 5,
	"retry_count" integer DEFAULT 0,
	"max_retries" integer DEFAULT 3,
	"sent_at" timestamp,
	"acknowledged_at" timestamp,
	"completed_at" timestamp,
	"failed_at" timestamp,
	"error_message" text,
	"result" jsonb,
	"created_at" timestamp DEFAULT now(),
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "gateway_debug_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"gateway_id" varchar,
	"user_id" varchar,
	"endpoint" varchar(255) NOT NULL,
	"method" varchar(10) NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"request_headers" jsonb,
	"request_body" jsonb,
	"request_size" integer,
	"response_status" integer NOT NULL,
	"response_headers" jsonb,
	"response_body" jsonb,
	"response_size" integer,
	"error_message" text,
	"error_stack" text,
	"error_code" varchar(50),
	"processing_duration" integer,
	"machine_id" varchar,
	"schema_version" varchar(20),
	"gateway_version" varchar(20),
	"is_rate_limited" boolean DEFAULT false,
	"rate_limit_reason" varchar(100),
	"category" varchar(50),
	"severity" varchar(20)
);
--> statement-breakpoint
CREATE TABLE "gateway_downloads" (
	"id" serial PRIMARY KEY NOT NULL,
	"demo_user_id" varchar NOT NULL,
	"download_token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"os_type" text,
	"downloaded_at" timestamp DEFAULT now(),
	"gateway_activated" boolean DEFAULT false,
	"gateway_activated_at" timestamp,
	CONSTRAINT "gateway_downloads_download_token_unique" UNIQUE("download_token")
);
--> statement-breakpoint
CREATE TABLE "gateway_schemas" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"gateway_id" varchar,
	"version" varchar NOT NULL,
	"mode" varchar DEFAULT 'single_table' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"configuration" jsonb NOT NULL,
	"tag_mapping" jsonb,
	"retention_policies" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "gateway_table_status" (
	"id" serial PRIMARY KEY NOT NULL,
	"gateway_id" varchar NOT NULL,
	"table_name" varchar NOT NULL,
	"row_count" integer NOT NULL,
	"size_bytes" integer,
	"oldest_record" timestamp,
	"newest_record" timestamp,
	"last_vacuum" timestamp,
	"last_cleanup" timestamp,
	"fragmentation" real,
	"index_count" integer,
	"error_count" integer DEFAULT 0,
	"last_error" text,
	"reported_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "gateway_tables" (
	"id" serial PRIMARY KEY NOT NULL,
	"schema_id" integer NOT NULL,
	"table_name" varchar NOT NULL,
	"table_type" varchar NOT NULL,
	"plc_id" integer,
	"columns" jsonb NOT NULL,
	"indices" jsonb,
	"retention_days" integer DEFAULT 30,
	"compression_enabled" boolean DEFAULT false,
	"partitioning_strategy" varchar,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "gateway_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"gateway_id" varchar NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"revoked" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "gateways" (
	"id" varchar PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"tenant_id" varchar,
	"machine_id" varchar(255) NOT NULL,
	"os" varchar(50),
	"os_version" varchar(50),
	"cpu" varchar(100),
	"memory" varchar(50),
	"last_ip" varchar(45),
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"token_expires_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"facility_id" integer,
	"metric_type" text NOT NULL,
	"value" real NOT NULL,
	"unit" text NOT NULL,
	"timestamp" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "plc_data" (
	"id" serial PRIMARY KEY NOT NULL,
	"tag_id" integer NOT NULL,
	"value" real NOT NULL,
	"quality" text DEFAULT 'good' NOT NULL,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "plc_devices" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar,
	"facility_id" integer,
	"gateway_id" varchar,
	"name" text NOT NULL,
	"brand" text NOT NULL,
	"model" text NOT NULL,
	"protocol" text NOT NULL,
	"ip_address" text NOT NULL,
	"port" integer NOT NULL,
	"rack_number" integer,
	"slot_number" integer,
	"node_id" text,
	"unit_id" integer,
	"status" text DEFAULT 'configured' NOT NULL,
	"last_seen" timestamp,
	"connection_settings" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "plc_tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"plc_id" integer NOT NULL,
	"tag_name" text NOT NULL,
	"description" text,
	"address" text NOT NULL,
	"data_type" text NOT NULL,
	"unit" text,
	"scale_factor" real,
	"offset" real,
	"min_value" real,
	"max_value" real,
	"alarm_low" real,
	"alarm_high" real,
	"is_active" boolean DEFAULT true,
	"read_interval" integer DEFAULT 1000,
	"last_value" real,
	"last_read_time" timestamp,
	"quality" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"id" serial PRIMARY KEY NOT NULL,
	"identifier" varchar(255) NOT NULL,
	"endpoint" varchar(100) NOT NULL,
	"attempt_count" integer DEFAULT 1 NOT NULL,
	"window_start" timestamp DEFAULT now() NOT NULL,
	"blocked_until" timestamp
);
--> statement-breakpoint
CREATE TABLE "report_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" varchar NOT NULL,
	"name" text NOT NULL,
	"report_type" text NOT NULL,
	"facility_ids" jsonb NOT NULL,
	"tag_ids" jsonb,
	"schedule" text,
	"email_recipients" jsonb,
	"format" text DEFAULT 'pdf' NOT NULL,
	"is_active" boolean DEFAULT true,
	"last_generated" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"session_id" varchar NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"data" jsonb NOT NULL,
	CONSTRAINT "sessions_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_name" text NOT NULL,
	"company_code" text NOT NULL,
	"email" text NOT NULL,
	"industry" text,
	"country" text,
	"demo_user_id" varchar,
	"license_type" text DEFAULT 'trial' NOT NULL,
	"license_expires_at" timestamp,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "tenants_company_code_unique" UNIQUE("company_code")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" varchar,
	"email" varchar,
	"google_id" varchar,
	"password_hash" text,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"role" text DEFAULT 'operator' NOT NULL,
	"is_active" boolean DEFAULT true,
	"last_login" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_google_id_unique" UNIQUE("google_id")
);
--> statement-breakpoint
ALTER TABLE "activation_codes" ADD CONSTRAINT "activation_codes_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_plc_id_plc_devices_id_fk" FOREIGN KEY ("plc_id") REFERENCES "public"."plc_devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_tag_id_plc_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."plc_tags"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_acknowledged_by_users_id_fk" FOREIGN KEY ("acknowledged_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard_configs" ADD CONSTRAINT "dashboard_configs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gateway_commands" ADD CONSTRAINT "gateway_commands_gateway_id_gateways_id_fk" FOREIGN KEY ("gateway_id") REFERENCES "public"."gateways"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gateway_downloads" ADD CONSTRAINT "gateway_downloads_demo_user_id_demo_users_id_fk" FOREIGN KEY ("demo_user_id") REFERENCES "public"."demo_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gateway_schemas" ADD CONSTRAINT "gateway_schemas_gateway_id_gateways_id_fk" FOREIGN KEY ("gateway_id") REFERENCES "public"."gateways"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gateway_table_status" ADD CONSTRAINT "gateway_table_status_gateway_id_gateways_id_fk" FOREIGN KEY ("gateway_id") REFERENCES "public"."gateways"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gateway_tables" ADD CONSTRAINT "gateway_tables_schema_id_gateway_schemas_id_fk" FOREIGN KEY ("schema_id") REFERENCES "public"."gateway_schemas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gateway_tables" ADD CONSTRAINT "gateway_tables_plc_id_plc_devices_id_fk" FOREIGN KEY ("plc_id") REFERENCES "public"."plc_devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gateway_tokens" ADD CONSTRAINT "gateway_tokens_gateway_id_gateways_id_fk" FOREIGN KEY ("gateway_id") REFERENCES "public"."gateways"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metrics" ADD CONSTRAINT "metrics_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plc_data" ADD CONSTRAINT "plc_data_tag_id_plc_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."plc_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plc_devices" ADD CONSTRAINT "plc_devices_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plc_tags" ADD CONSTRAINT "plc_tags_plc_id_plc_devices_id_fk" FOREIGN KEY ("plc_id") REFERENCES "public"."plc_devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_demo_user_id_demo_users_id_fk" FOREIGN KEY ("demo_user_id") REFERENCES "public"."demo_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_gateway_audit_gateway" ON "gateway_audit_log" USING btree ("gateway_id");--> statement-breakpoint
CREATE INDEX "idx_gateway_audit_user" ON "gateway_audit_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_gateway_audit_created" ON "gateway_audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_gateway_codes_user" ON "gateway_codes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_gateway_codes_status" ON "gateway_codes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_gateway_codes_machine_once" ON "gateway_codes" USING btree ("machine_id");--> statement-breakpoint
CREATE INDEX "idx_gateway_commands_gateway" ON "gateway_commands" USING btree ("gateway_id");--> statement-breakpoint
CREATE INDEX "idx_gateway_commands_status" ON "gateway_commands" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_gateway_commands_created" ON "gateway_commands" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_gateway_commands_priority" ON "gateway_commands" USING btree ("priority","status");--> statement-breakpoint
CREATE INDEX "idx_gateway_debug_logs_gateway" ON "gateway_debug_logs" USING btree ("gateway_id");--> statement-breakpoint
CREATE INDEX "idx_gateway_debug_logs_user" ON "gateway_debug_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_gateway_debug_logs_timestamp" ON "gateway_debug_logs" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "idx_gateway_debug_logs_endpoint" ON "gateway_debug_logs" USING btree ("endpoint");--> statement-breakpoint
CREATE INDEX "idx_gateway_debug_logs_status" ON "gateway_debug_logs" USING btree ("response_status");--> statement-breakpoint
CREATE INDEX "idx_gateway_debug_logs_category" ON "gateway_debug_logs" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_gateway_schemas_user" ON "gateway_schemas" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_gateway_schemas_gateway" ON "gateway_schemas" USING btree ("gateway_id");--> statement-breakpoint
CREATE INDEX "idx_gateway_schemas_active" ON "gateway_schemas" USING btree ("user_id","is_active");--> statement-breakpoint
CREATE INDEX "idx_gateway_table_status_gateway" ON "gateway_table_status" USING btree ("gateway_id");--> statement-breakpoint
CREATE INDEX "idx_gateway_table_status_table" ON "gateway_table_status" USING btree ("gateway_id","table_name");--> statement-breakpoint
CREATE INDEX "idx_gateway_table_status_reported" ON "gateway_table_status" USING btree ("reported_at");--> statement-breakpoint
CREATE INDEX "idx_gateway_tables_schema" ON "gateway_tables" USING btree ("schema_id");--> statement-breakpoint
CREATE INDEX "idx_gateway_tables_plc" ON "gateway_tables" USING btree ("plc_id");--> statement-breakpoint
CREATE INDEX "idx_gateway_tables_name" ON "gateway_tables" USING btree ("schema_id","table_name");--> statement-breakpoint
CREATE INDEX "idx_gateway_tokens_gateway" ON "gateway_tokens" USING btree ("gateway_id");--> statement-breakpoint
CREATE INDEX "idx_gateway_tokens_expires" ON "gateway_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_gateways_user" ON "gateways" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_gateways_machine" ON "gateways" USING btree ("machine_id");--> statement-breakpoint
CREATE INDEX "idx_rate_limit_identifier" ON "rate_limits" USING btree ("identifier","endpoint");--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "IDX_session_user" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "IDX_session_id" ON "sessions" USING btree ("session_id");