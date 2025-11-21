import { pgTable, text, serial, integer, boolean, timestamp, real, jsonb, varchar, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { sql } from "drizzle-orm";
import { z } from "zod";

// ==================== CORE SaaS MULTI-TENANT SCHEMA ====================

// Session storage table for persistent authentication
export const sessions = pgTable(
  "sessions",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id").notNull(),
    sessionId: varchar("session_id").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    data: jsonb("data").notNull(),
  },
  (table) => [
    index("IDX_session_expire").on(table.expiresAt),
    index("IDX_session_user").on(table.userId),
    index("IDX_session_id").on(table.sessionId)
  ],
);

// Demo Users Table - Users who sign up for demo via Google OAuth or email/password
export const demoUsers = pgTable("demo_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`), // Google sub ID or custom ID
  email: varchar("email").unique(),
  password: text("password"), // Optional - for email/password auth
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  companyName: text("company_name"),
  industry: text("industry"),
  country: text("country"),
  demoStartDate: timestamp("demo_start_date").defaultNow(),
  demoEndDate: timestamp("demo_end_date"), // 15 days from start
  demoKey: text("demo_key").unique(), // Unique demo key for gateway activation
  status: text("status").notNull().default('active'), // 'active', 'expired', 'converted'
  gatewayDownloaded: boolean("gateway_downloaded").default(false),
  gatewayDownloadedAt: timestamp("gateway_downloaded_at"),
  // Access management fields
  accessExpiresAt: timestamp("access_expires_at"), // When the user's access expires
  accessGrantedDays: integer("access_granted_days"), // How many days of access were granted
  isActive: boolean("is_active").default(true), // Whether the user's access is currently active
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// User Dashboards Table - Store custom dashboard configurations per user
export const userDashboards = pgTable("user_dashboards", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => demoUsers.id, { onDelete: 'cascade' }),
  name: varchar("name").notNull().default('My Dashboard'),
  widgets: jsonb("widgets").notNull().default('[]'), // Array of widget configurations
  layouts: jsonb("layouts").notNull().default('{}'), // Layout configuration object
  isDefault: boolean("is_default").default(false), // Whether this is the user's default dashboard
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Gateway Downloads Table - Track gateway download instances
export const gatewayDownloads = pgTable("gateway_downloads", {
  id: serial("id").primaryKey(),
  demoUserId: varchar("demo_user_id").notNull().references(() => demoUsers.id, { onDelete: 'cascade' }),
  downloadToken: text("download_token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  osType: text("os_type"), // 'windows', 'linux', 'macos'
  downloadedAt: timestamp("downloaded_at").defaultNow(),
  gatewayActivated: boolean("gateway_activated").default(false),
  gatewayActivatedAt: timestamp("gateway_activated_at")
});

// Tenants Table - Company accounts (for full version after demo)
export const tenants = pgTable("tenants", {
  id: serial("id").primaryKey(),
  companyName: text("company_name").notNull(),
  companyCode: text("company_code").notNull().unique(), // Used in activation codes
  email: text("email").notNull(),
  industry: text("industry"),
  country: text("country"),
  demoUserId: varchar("demo_user_id").references(() => demoUsers.id), // Link to original demo user
  licenseType: text("license_type").notNull().default('trial'), // 'trial', 'standard', 'enterprise'
  licenseExpiresAt: timestamp("license_expires_at"),
  status: text("status").notNull().default('active'), // 'active', 'suspended', 'expired'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Users Table - User accounts within tenants (for full version)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  tenantId: varchar("tenant_id"), // Changed to varchar for flexibility
  email: varchar("email").unique(),
  googleId: varchar("google_id").unique(), // Google OAuth ID
  passwordHash: text("password_hash"), // Optional for non-OAuth users
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: text("role").notNull().default('operator'), // 'admin', 'operator', 'viewer'
  isActive: boolean("is_active").default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Facilities Table - Physical locations with gateways
export const facilities = pgTable("facilities", {
  id: serial("id").primaryKey(),
  tenantId: varchar("tenant_id").notNull(), // Changed to varchar for Google OAuth IDs
  facilityCode: text("facility_code").notNull(), // Used in activation codes
  name: text("name").notNull(),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  country: text("country"),
  timezone: text("timezone"),
  gatewayStatus: text("gateway_status").default('disconnected'), // 'connected', 'disconnected'
  lastGatewayPing: timestamp("last_gateway_ping"),
  gatewayVersion: text("gateway_version"),
  gatewayOS: text("gateway_os"), // 'windows', 'linux', 'macos'
  gatewayHardware: jsonb("gateway_hardware"), // CPU, RAM, etc.
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Gateway Activation Codes - For linking gateways to facilities
export const activationCodes = pgTable("activation_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(), // DEMO-COMPANY-FAC001-X7K9P
  tenantId: varchar("tenant_id").notNull(), // Changed to varchar for flexibility
  facilityId: integer("facility_id").references(() => facilities.id, { onDelete: 'cascade' }),
  status: text("status").notNull().default('pending'), // 'pending', 'activated', 'expired'
  activatedAt: timestamp("activated_at"),
  expiresAt: timestamp("expires_at").notNull(),
  gatewayInfo: jsonb("gateway_info"), // OS, version, hardware info stored on activation
  ipAddress: text("ip_address"), // Gateway IP when activated
  createdAt: timestamp("created_at").defaultNow()
});

// Gateway Codes for authenticated users - Secure activation codes
export const gatewayCodes = pgTable("gateway_codes", {
  id: serial("id").primaryKey(), // Serial primary key (matches database)
  code: varchar("code").notNull().unique(), // HERC-XXXX-XXXX-XXXX
  userId: varchar("user_id").notNull(), // Links to authenticated user
  gatewayId: varchar("gateway_id"), // Gateway ID after activation
  gatewayToken: text("gateway_token"), // JWT token for gateway
  tenantId: varchar("tenant_id"), // Changed to varchar for Google OAuth IDs
  machineId: varchar("machine_id"), // Hardware fingerprint for binding (NULL until redeemed)
  status: varchar("status").notNull().default('issued'), // issued, redeemed, revoked
  expiresAt: timestamp("expires_at").notNull(), // Expiry date
  activatedAt: timestamp("activated_at"), // When code was activated
  lastSyncAt: timestamp("last_sync_at"), // Last data sync from gateway
  redeemedAt: timestamp("redeemed_at"), // When code was redeemed
  createdAt: timestamp("created_at").notNull().defaultNow(),
  activationIp: varchar("activation_ip"), // IP address where activated
  gatewayInfo: jsonb("gateway_info"), // Gateway hardware/OS info
  syncCount: integer("sync_count").default(0), // Number of data syncs
  scope: jsonb("scope"), // Activation scope/permissions
  redeemedByGatewayId: varchar("redeemed_by_gateway_id"), // Gateway that redeemed this code
  notes: text("notes"), // Optional notes
}, (table) => [
  index("idx_gateway_codes_user").on(table.userId),
  index("idx_gateway_codes_status").on(table.status),
  index("idx_gateway_codes_machine_once").on(table.machineId),
]);

// Gateways Table - Physical gateway instances
export const gateways = pgTable("gateways", {
  id: varchar("id").primaryKey(), // gw_xxx format
  userId: varchar("user_id").notNull(), // User who owns this gateway
  tenantId: varchar("tenant_id"), // Changed to varchar for Google OAuth IDs
  machineId: varchar("machine_id", { length: 255 }).notNull(), // Hardware fingerprint
  os: varchar("os", { length: 50 }), // Windows, Linux, MacOS
  osVersion: varchar("os_version", { length: 50 }),
  cpu: varchar("cpu", { length: 100 }),
  memory: varchar("memory", { length: 50 }),
  lastIp: varchar("last_ip", { length: 45 }), // Last known IP address
  status: varchar("status", { length: 20 }).notNull().default('active'), // active, disabled, deleted
  tokenExpiresAt: timestamp("token_expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_gateways_user").on(table.userId),
  index("idx_gateways_machine").on(table.machineId),
]);

// Gateway Tokens Table - JWT tokens issued to gateways (optional, for tracking)
export const gatewayTokens = pgTable("gateway_tokens", {
  id: serial("id").primaryKey(),
  gatewayId: varchar("gateway_id").notNull().references(() => gateways.id),
  token: text("token").notNull(), // The JWT token (store only if needed for revocation)
  expiresAt: timestamp("expires_at").notNull(),
  revoked: boolean("revoked").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_gateway_tokens_gateway").on(table.gatewayId),
  index("idx_gateway_tokens_expires").on(table.expiresAt),
]);

// ==================== GATEWAY V2 DYNAMIC TABLE MANAGEMENT ====================

// Gateway Schemas - Store schema configurations per user/gateway
export const gatewaySchemas = pgTable("gateway_schemas", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(), // User who owns this schema
  gatewayId: varchar("gateway_id").references(() => gateways.id, { onDelete: 'cascade' }), // Optional gateway association
  version: varchar("version").notNull(), // e.g., "schema_v1", "schema_v2"
  mode: varchar("mode").notNull().default('single_table'), // 'single_table' | 'multi_table' | 'hybrid'
  isActive: boolean("is_active").notNull().default(true), // Current active schema
  configuration: jsonb("configuration").notNull(), // Full schema configuration (tables, columns, indices)
  tagMapping: jsonb("tag_mapping"), // Maps tags to specific tables
  retentionPolicies: jsonb("retention_policies"), // Retention policies per table
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_gateway_schemas_user").on(table.userId),
  index("idx_gateway_schemas_gateway").on(table.gatewayId),
  index("idx_gateway_schemas_active").on(table.userId, table.isActive),
]);

// Gateway Tables - Store table definitions
export const gatewayTables = pgTable("gateway_tables", {
  id: serial("id").primaryKey(),
  schemaId: integer("schema_id").notNull().references(() => gatewaySchemas.id, { onDelete: 'cascade' }),
  tableName: varchar("table_name").notNull(), // e.g., "plc_data_line1", "tag_group_motors"
  tableType: varchar("table_type").notNull(), // 'plc_specific' | 'tag_group' | 'general'
  plcId: integer("plc_id").references(() => plcDevices.id), // Optional PLC association
  columns: jsonb("columns").notNull(), // Column definitions
  indices: jsonb("indices"), // Index definitions
  retentionDays: integer("retention_days").default(30), // Data retention in days
  compressionEnabled: boolean("compression_enabled").default(false),
  partitioningStrategy: varchar("partitioning_strategy"), // 'daily', 'weekly', 'monthly'
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_gateway_tables_schema").on(table.schemaId),
  index("idx_gateway_tables_plc").on(table.plcId),
  index("idx_gateway_tables_name").on(table.schemaId, table.tableName),
]);

// Gateway Table Status - Store table statistics reported by gateways
export const gatewayTableStatus = pgTable("gateway_table_status", {
  id: serial("id").primaryKey(),
  gatewayId: varchar("gateway_id").notNull().references(() => gateways.id, { onDelete: 'cascade' }),
  tableName: varchar("table_name").notNull(),
  rowCount: integer("row_count").notNull(),
  sizeBytes: integer("size_bytes"), // Table size in bytes
  oldestRecord: timestamp("oldest_record"),
  newestRecord: timestamp("newest_record"),
  lastVacuum: timestamp("last_vacuum"),
  lastCleanup: timestamp("last_cleanup"),
  fragmentation: real("fragmentation"), // Percentage
  indexCount: integer("index_count"),
  errorCount: integer("error_count").default(0),
  lastError: text("last_error"),
  reportedAt: timestamp("reported_at").defaultNow(),
}, (table) => [
  index("idx_gateway_table_status_gateway").on(table.gatewayId),
  index("idx_gateway_table_status_table").on(table.gatewayId, table.tableName),
  index("idx_gateway_table_status_reported").on(table.reportedAt),
]);

// Gateway Commands - Track commands sent to gateways
export const gatewayCommands = pgTable("gateway_commands", {
  id: serial("id").primaryKey(),
  gatewayId: varchar("gateway_id").notNull().references(() => gateways.id, { onDelete: 'cascade' }),
  commandType: varchar("command_type").notNull(), // 'create_table' | 'delete_table' | 'cleanup_table' | 'vacuum_table' | 'alter_table'
  commandData: jsonb("command_data").notNull(), // Command parameters
  status: varchar("status").notNull().default('pending'), // 'pending' | 'sent' | 'acknowledged' | 'completed' | 'failed'
  priority: integer("priority").default(5), // 1-10, 1 being highest
  retryCount: integer("retry_count").default(0),
  maxRetries: integer("max_retries").default(3),
  sentAt: timestamp("sent_at"),
  acknowledgedAt: timestamp("acknowledged_at"),
  completedAt: timestamp("completed_at"),
  failedAt: timestamp("failed_at"),
  errorMessage: text("error_message"),
  result: jsonb("result"), // Command execution result
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"), // Command expiration
}, (table) => [
  index("idx_gateway_commands_gateway").on(table.gatewayId),
  index("idx_gateway_commands_status").on(table.status),
  index("idx_gateway_commands_created").on(table.createdAt),
  index("idx_gateway_commands_priority").on(table.priority, table.status),
]);

// Gateway Security Audit Log
export const gatewayAuditLog = pgTable("gateway_audit_log", {
  id: serial("id").primaryKey(),
  gatewayId: varchar("gateway_id"),
  userId: varchar("user_id"),
  action: varchar("action", { length: 50 }).notNull(), // activation_attempt, sync, config_update, error
  success: boolean("success").notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata"), // Additional context data
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_gateway_audit_gateway").on(table.gatewayId),
  index("idx_gateway_audit_user").on(table.userId),
  index("idx_gateway_audit_created").on(table.createdAt),
]);

// Gateway Debug Logs - Comprehensive API activity logging for debugging
export const gatewayDebugLogs = pgTable("gateway_debug_logs", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  gatewayId: varchar("gateway_id"), // From token if available
  userId: varchar("user_id"), // From session/token if available
  endpoint: varchar("endpoint", { length: 255 }).notNull(), // /api/gateway/activate, etc.
  method: varchar("method", { length: 10 }).notNull(), // GET, POST, PUT, DELETE, etc.
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  
  // Request details (sanitized)
  requestHeaders: jsonb("request_headers"), // Sanitized headers (no auth tokens)
  requestBody: jsonb("request_body"), // Sanitized body (no passwords)
  requestSize: integer("request_size"), // Size in bytes
  
  // Response details (sanitized)
  responseStatus: integer("response_status").notNull(),
  responseHeaders: jsonb("response_headers"), // Sanitized headers
  responseBody: jsonb("response_body"), // Sanitized body (limited size)
  responseSize: integer("response_size"), // Size in bytes
  
  // Error tracking
  errorMessage: text("error_message"),
  errorStack: text("error_stack"),
  errorCode: varchar("error_code", { length: 50 }), // Custom error codes
  
  // Performance metrics
  processingDuration: integer("processing_duration"), // Milliseconds
  
  // Additional metadata
  machineId: varchar("machine_id"), // Hardware fingerprint if available
  schemaVersion: varchar("schema_version", { length: 20 }),
  gatewayVersion: varchar("gateway_version", { length: 20 }),
  isRateLimited: boolean("is_rate_limited").default(false),
  rateLimitReason: varchar("rate_limit_reason", { length: 100 }),
  
  // Categorization for filtering
  category: varchar("category", { length: 50 }), // activation, heartbeat, data_sync, config, command, error
  severity: varchar("severity", { length: 20 }), // info, warning, error, critical
}, (table) => [
  index("idx_gateway_debug_logs_gateway").on(table.gatewayId),
  index("idx_gateway_debug_logs_user").on(table.userId),
  index("idx_gateway_debug_logs_timestamp").on(table.timestamp),
  index("idx_gateway_debug_logs_endpoint").on(table.endpoint),
  index("idx_gateway_debug_logs_status").on(table.responseStatus),
  index("idx_gateway_debug_logs_category").on(table.category),
]);

// Rate Limiting Table
export const rateLimits = pgTable("rate_limits", {
  id: serial("id").primaryKey(),
  identifier: varchar("identifier", { length: 255 }).notNull(), // IP address or gateway ID
  endpoint: varchar("endpoint", { length: 100 }).notNull(), // API endpoint
  attemptCount: integer("attempt_count").notNull().default(1),
  windowStart: timestamp("window_start").notNull().defaultNow(),
  blockedUntil: timestamp("blocked_until"),
}, (table) => [
  index("idx_rate_limit_identifier").on(table.identifier, table.endpoint),
]);

// PLC Devices - Industrial controllers configuration
export const plcDevices = pgTable("plc_devices", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id"), // Demo user who owns this PLC configuration
  facilityId: integer("facility_id").references(() => facilities.id, { onDelete: 'cascade' }), // Optional facility link
  gatewayId: varchar("gateway_id"), // Link to gateway that manages this PLC
  name: text("name").notNull(),
  brand: text("brand").notNull(), // 'siemens', 'allen-bradley', 'schneider', 'mitsubishi', 'omron'
  model: text("model").notNull(),
  protocol: text("protocol").notNull(), // 'modbus-tcp', 'ethernet-ip', 's7', 'opc-ua'
  ipAddress: text("ip_address").notNull(),
  port: integer("port").notNull(),
  rackNumber: integer("rack_number"), // For S7
  slotNumber: integer("slot_number"), // For S7
  nodeId: text("node_id"), // For OPC UA
  unitId: integer("unit_id"), // For Modbus
  status: text("status").notNull().default('configured'), // 'configured', 'connected', 'error', 'offline'
  lastSeen: timestamp("last_seen"),
  connectionSettings: jsonb("connection_settings"), // Additional protocol-specific settings
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// PLC Tags - Data points to read from PLCs
export const plcTags = pgTable("plc_tags", {
  id: serial("id").primaryKey(),
  plcId: integer("plc_id").notNull().references(() => plcDevices.id, { onDelete: 'cascade' }),
  name: text("tag_name").notNull(), // Using actual database column name
  description: text("description"),
  address: text("address").notNull(), // Memory address or OPC UA node
  dataType: text("data_type").notNull(), // 'bool', 'int16', 'int32', 'float', 'string'
  unit: text("unit"), // 'psi', 'gpm', '°C', etc.
  
  // Scaling configuration - use actual database columns
  scaleFactor: real("scale_factor"),
  offset: real("offset"),
  
  minValue: real("min_value"),
  maxValue: real("max_value"),
  alarmLow: real("alarm_low"),
  alarmHigh: real("alarm_high"),
  enabled: boolean("is_active").default(true), // Using actual database column name
  scanRate: integer("read_interval").default(1000), // Using actual database column name
  lastValue: real("last_value"),
  lastReadTime: timestamp("last_read_time"),
  quality: text("quality"), // 'good', 'bad', 'uncertain'
  createdAt: timestamp("created_at").defaultNow()
});

// PLC Data - Historical tag values
export const plcData = pgTable("plc_data", {
  id: serial("id").primaryKey(),
  tagId: integer("tag_id").notNull().references(() => plcTags.id, { onDelete: 'cascade' }),
  value: real("value").notNull(),
  quality: text("quality").notNull().default('good'),
  timestamp: timestamp("timestamp").defaultNow()
});

// Metrics Table - Aggregated facility metrics
export const metrics = pgTable("metrics", {
  id: serial("id").primaryKey(),
  facilityId: integer("facility_id").references(() => facilities.id),
  metricType: text("metric_type").notNull(),
  value: real("value").notNull(),
  unit: text("unit").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  createdAt: timestamp("created_at").defaultNow()
});

// Alerts Table - System and threshold alerts
export const alerts = pgTable("alerts", {
  id: serial("id").primaryKey(),
  facilityId: integer("facility_id").references(() => facilities.id),
  plcId: integer("plc_id").references(() => plcDevices.id),
  tagId: integer("tag_id").references(() => plcTags.id),
  severity: text("severity").notNull(), // 'low', 'medium', 'high', 'critical'
  type: text("type").notNull(), // 'threshold', 'connection', 'quality', 'system'
  message: text("message").notNull(),
  details: jsonb("details"),
  isActive: boolean("is_active").default(true),
  acknowledgedBy: integer("acknowledged_by").references(() => users.id),
  acknowledgedAt: timestamp("acknowledged_at"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow()
});

// Reports Configuration - Scheduled reports
export const reportConfigs = pgTable("report_configs", {
  id: serial("id").primaryKey(),
  tenantId: varchar("tenant_id").notNull(), // Changed to varchar for flexibility
  name: text("name").notNull(),
  reportType: text("report_type").notNull(), // 'daily', 'weekly', 'monthly', 'custom'
  facilityIds: jsonb("facility_ids").notNull(), // Array of facility IDs
  tagIds: jsonb("tag_ids"), // Array of tag IDs to include
  schedule: text("schedule"), // Cron expression
  emailRecipients: jsonb("email_recipients"), // Array of email addresses
  format: text("format").notNull().default('pdf'), // 'pdf', 'excel', 'csv'
  isActive: boolean("is_active").default(true),
  lastGenerated: timestamp("last_generated"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Dashboard Configurations - User-specific dashboards
export const dashboardConfigs = pgTable("dashboard_configs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  layout: jsonb("layout").notNull(), // Grid layout configuration
  widgets: jsonb("widgets").notNull(), // Widget configurations
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Create Zod schemas for validation
export const insertSessionSchema = createInsertSchema(sessions).omit({ id: true, createdAt: true });
export const insertDemoUserSchema = createInsertSchema(demoUsers).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUserDashboardSchema = createInsertSchema(userDashboards).omit({ id: true, createdAt: true, updatedAt: true });
export const insertGatewayDownloadSchema = createInsertSchema(gatewayDownloads).omit({ id: true, downloadedAt: true });
export const insertTenantSchema = createInsertSchema(tenants).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertFacilitySchema = createInsertSchema(facilities).omit({ id: true, createdAt: true, updatedAt: true });
export const insertActivationCodeSchema = createInsertSchema(activationCodes).omit({ id: true, createdAt: true });
export const insertGatewayCodeSchema = createInsertSchema(gatewayCodes).omit({ createdAt: true, redeemedAt: true });
export const insertGatewaySchema = createInsertSchema(gateways).omit({ createdAt: true, updatedAt: true });
export const insertGatewayTokenSchema = createInsertSchema(gatewayTokens).omit({ id: true, createdAt: true });
export const insertGatewayAuditLogSchema = createInsertSchema(gatewayAuditLog).omit({ id: true, createdAt: true });
export const insertGatewayDebugLogSchema = createInsertSchema(gatewayDebugLogs).omit({ id: true, timestamp: true });
export const insertRateLimitSchema = createInsertSchema(rateLimits).omit({ id: true });
export const insertPlcDeviceSchema = createInsertSchema(plcDevices).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPlcTagSchema = createInsertSchema(plcTags).omit({ id: true, createdAt: true });
export const insertPlcDataSchema = createInsertSchema(plcData).omit({ id: true, timestamp: true });
export const insertMetricSchema = createInsertSchema(metrics).omit({ id: true, createdAt: true });
export const insertAlertSchema = createInsertSchema(alerts).omit({ id: true, createdAt: true });
export const insertReportConfigSchema = createInsertSchema(reportConfigs).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDashboardConfigSchema = createInsertSchema(dashboardConfigs).omit({ id: true, createdAt: true, updatedAt: true });
export const insertGatewaySchemaSchema = createInsertSchema(gatewaySchemas).omit({ id: true, createdAt: true, updatedAt: true });
export const insertGatewayTableSchema = createInsertSchema(gatewayTables).omit({ id: true, createdAt: true, updatedAt: true });
export const insertGatewayTableStatusSchema = createInsertSchema(gatewayTableStatus).omit({ id: true, reportedAt: true });
export const insertGatewayCommandSchema = createInsertSchema(gatewayCommands).omit({ id: true, createdAt: true });

// Export types for TypeScript
export type Session = typeof sessions.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type DemoUser = typeof demoUsers.$inferSelect;
export type InsertDemoUser = z.infer<typeof insertDemoUserSchema>;
export type UpsertDemoUser = typeof demoUsers.$inferInsert;
export type UserDashboard = typeof userDashboards.$inferSelect;
export type InsertUserDashboard = z.infer<typeof insertUserDashboardSchema>;
export type GatewayDownload = typeof gatewayDownloads.$inferSelect;
export type InsertGatewayDownload = z.infer<typeof insertGatewayDownloadSchema>;
export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = typeof users.$inferInsert;
type FacilityRow = typeof facilities.$inferSelect;
type FacilityExtras = {
  status?: string | null;
  location?: string | null;
  efficiency?: number | null;
  dailyProduction?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  lastUpdated?: Date | string | null;
};
export type Facility = FacilityRow & FacilityExtras;
export type InsertFacility = z.infer<typeof insertFacilitySchema>;
export type ActivationCode = typeof activationCodes.$inferSelect;
export type InsertActivationCode = z.infer<typeof insertActivationCodeSchema>;
export type GatewayCode = typeof gatewayCodes.$inferSelect;
export type InsertGatewayCode = z.infer<typeof insertGatewayCodeSchema>;
export type Gateway = typeof gateways.$inferSelect;
export type InsertGateway = z.infer<typeof insertGatewaySchema>;
export type GatewayToken = typeof gatewayTokens.$inferSelect;
export type InsertGatewayToken = z.infer<typeof insertGatewayTokenSchema>;
export type GatewayAuditLog = typeof gatewayAuditLog.$inferSelect;
export type InsertGatewayAuditLog = z.infer<typeof insertGatewayAuditLogSchema>;
export type GatewayDebugLog = typeof gatewayDebugLogs.$inferSelect;
export type InsertGatewayDebugLog = z.infer<typeof insertGatewayDebugLogSchema>;
export type RateLimit = typeof rateLimits.$inferSelect;
export type InsertRateLimit = z.infer<typeof insertRateLimitSchema>;
export type PlcDevice = typeof plcDevices.$inferSelect;
export type InsertPlcDevice = z.infer<typeof insertPlcDeviceSchema>;
export type PlcTag = typeof plcTags.$inferSelect;
export type InsertPlcTag = z.infer<typeof insertPlcTagSchema>;
export type PlcData = typeof plcData.$inferSelect;
export type InsertPlcData = z.infer<typeof insertPlcDataSchema>;
export type Metric = typeof metrics.$inferSelect;
export type InsertMetric = z.infer<typeof insertMetricSchema>;
export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type ReportConfig = typeof reportConfigs.$inferSelect;
export type InsertReportConfig = z.infer<typeof insertReportConfigSchema>;
export type DashboardConfig = typeof dashboardConfigs.$inferSelect;
export type InsertDashboardConfig = z.infer<typeof insertDashboardConfigSchema>;
export type GatewaySchema = typeof gatewaySchemas.$inferSelect;
export type InsertGatewaySchema = z.infer<typeof insertGatewaySchemaSchema>;
export type GatewayTable = typeof gatewayTables.$inferSelect;
export type InsertGatewayTable = z.infer<typeof insertGatewayTableSchema>;
export type GatewayTableStatus = typeof gatewayTableStatus.$inferSelect;
export type InsertGatewayTableStatus = z.infer<typeof insertGatewayTableStatusSchema>;
export type GatewayCommand = typeof gatewayCommands.$inferSelect;
export type InsertGatewayCommand = z.infer<typeof insertGatewayCommandSchema>;

// Chart data types for dashboard
export type ChartDataPoint = {
  timestamp: string;
  value: number;
  label?: string;
};

// Authentication schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  companyName: z.string().min(1, 'Company name is required'),
  country: z.string().min(1, 'Country is required')
});

export type LoginRequest = z.infer<typeof loginSchema>;
export type RegisterRequest = z.infer<typeof registerSchema>;

// ==================== Admin & Dashboard Models ====================

export interface AdminConfig {
  id: number;
  configType: string;
  displayName: string;
  configValue: string;
  sortOrder?: number | null;
  isEnabled: boolean;
  description?: string | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
  metadata?: Record<string, unknown>;
}

export interface DashboardWidgetThreshold {
  label: string;
  value: number;
  color?: string;
}

export interface DashboardWidget {
  id: number;
  title: string;
  chartType: string;
  metricType: string;
  width: number;
  height: number;
  position?: number | null;
  facilityId?: number | null;
  type?: string;
  description?: string | null;
  dataSource?: string | null;
  color?: string | null;
  thresholds?: DashboardWidgetThreshold[];
  settings?: Record<string, unknown>;
  config?: Record<string, unknown>;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
}

export type InsertDashboardWidget = Omit<DashboardWidget, "id" | "createdAt" | "updatedAt">;

export type FacilityMetrics = {
  flowRate: ChartDataPoint[];
  pressure: ChartDataPoint[];
  energyConsumption: ChartDataPoint[];
  qualityScore: ChartDataPoint[];
};

// ==================== Water System & Logistics Models ====================

const baseMaterialSchema = z.object({
  name: z.string(),
  code: z.string(),
  type: z.string(),
  stock: z.number(),
  unit: z.string(),
  cost: z.number(),
  reorderLevel: z.number().nullable().optional(),
  status: z.string(),
  supplier: z.string().optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  dailyUsage: z.number().optional(),
  safetyStock: z.number().optional(),
  leadTimeDays: z.number().optional(),
});

export const insertMaterialSchema = baseMaterialSchema;
export type InsertMaterial = z.infer<typeof insertMaterialSchema>;
export type UpdateMaterial = Partial<InsertMaterial>;

export interface Material extends InsertMaterial {
  id: number;
  efficiency?: number | null;
  lastUpdated?: Date | string | null;
  expirationDate?: Date | string | null;
  storageConditions?: string | null;
}

export interface BinMaterial {
  id: number;
  binName: string;
  materialName: string;
  materialCode: string;
  hlActive: boolean;
  lockActive: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  [key: string]: unknown;
}

export interface StorageBin {
  id: number;
  name: string;
  zone?: string | null;
  capacity?: number | null;
  currentOccupancy?: number | null;
  materialCode?: string | null;
  temperatureControlled?: boolean;
  status?: string;
  lastInspection?: Date | string | null;
  [key: string]: unknown;
}

export interface Truck {
  id: number;
  licensePlate: string;
  make: string;
  model: string;
  year?: number;
  maxCapacity?: number;
  ownerCompany?: string;
  contactNumber?: string;
  status: string;
  assignedDriverId?: number | null;
  lastInspection?: Date | string | null;
  [key: string]: unknown;
}

export interface Driver {
  id: number;
  driverName: string;
  licenseNumber: string;
  licenseType: string;
  company?: string;
  phoneNumber?: string;
  licenseExpiry?: Date | string;
  status: string;
  [key: string]: unknown;
}

export interface TruckMaintenance {
  id: number;
  truckId: number;
  maintenanceType: string;
  description: string;
  scheduledDate: Date | string;
  status: string;
  cost?: number;
  serviceProvider?: string;
  completedDate?: Date | string | null;
  [key: string]: unknown;
}

export interface TruckAssignment {
  id: number;
  truckId: number;
  driverId: number;
  routeName?: string;
  materialCode?: string;
  status: string;
  scheduledAt?: Date | string;
  [key: string]: unknown;
}

export interface WeighbridgeTransaction {
  id: number;
  ticketNumber: string;
  truckLicensePlate: string;
  driverName: string;
  materialType: string;
  transactionType: string;
  status: string;
  priority?: string;
  grossWeight?: number;
  tareWeight?: number;
  netWeight?: number;
  firstWeighTime?: Date | string | null;
  secondWeighTime?: Date | string | null;
  completedAt?: Date | string | null;
  [key: string]: unknown;
}

export interface WeighbridgeQueue {
  id: number;
  queuePosition: number;
  priority: string;
  status: string;
  truckLicensePlate: string;
  driverName: string;
  materialType: string;
  estimatedWeight?: number | null;
  waitStartTime?: Date | string | null;
  [key: string]: unknown;
}

export interface WeighbridgeScale {
  id: number;
  scaleName: string;
  scaleId?: string;
  status: string;
  location?: string;
  capacity?: number;
  currentWeight?: number;
  isOccupied?: boolean;
  operatorId?: string | null;
  nextCalibration?: Date | string | null;
  [key: string]: unknown;
}