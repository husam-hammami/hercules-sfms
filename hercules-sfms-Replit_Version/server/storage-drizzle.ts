import { eq, desc, and, inArray, sql, gte, lte, asc } from "drizzle-orm";
import { db, schema } from "./db";
import type {
  Facility, InsertFacility, 
  Metric, InsertMetric, 
  Alert, InsertAlert,
  Tenant, InsertTenant,
  User, InsertUser,
  PlcDevice, InsertPlcDevice,
  PlcTag, InsertPlcTag,
  PlcData, InsertPlcData,
  DashboardConfig, InsertDashboardConfig,
  ReportConfig, InsertReportConfig,
  DemoUser, UpsertDemoUser, 
  GatewayDownload, InsertGatewayDownload,
  GatewaySchema, InsertGatewaySchema,
  GatewayTable, InsertGatewayTable,
  GatewayTableStatus, InsertGatewayTableStatus,
  GatewayCommand, InsertGatewayCommand,
  UserDashboard, InsertUserDashboard
} from "@shared/schema";
import type { IStorage } from "./storage";

export class DrizzleStorage implements IStorage {
  // Facilities
  async getAllFacilities(): Promise<Facility[]> {
    return await db.select().from(schema.facilities);
  }

  async getFacility(id: number): Promise<Facility | undefined> {
    const results = await db.select().from(schema.facilities).where(eq(schema.facilities.id, id));
    return results[0];
  }

  async createFacility(facility: InsertFacility): Promise<Facility> {
    const results = await db.insert(schema.facilities).values(facility).returning();
    return results[0];
  }

  // Metrics
  async getFacilityMetrics(facilityId: number): Promise<Metric[]> {
    return await db.select().from(schema.metrics)
      .where(eq(schema.metrics.facilityId, facilityId))
      .orderBy(desc(schema.metrics.timestamp));
  }

  async createMetric(metric: InsertMetric): Promise<Metric> {
    const results = await db.insert(schema.metrics).values(metric).returning();
    return results[0];
  }

  // Alerts
  async getAllAlerts(): Promise<Alert[]> {
    return await db.select().from(schema.alerts).orderBy(desc(schema.alerts.createdAt));
  }

  async getFacilityAlerts(facilityId: number): Promise<Alert[]> {
    return await db.select().from(schema.alerts)
      .where(eq(schema.alerts.facilityId, facilityId))
      .orderBy(desc(schema.alerts.createdAt));
  }

  async createAlert(alert: InsertAlert): Promise<Alert> {
    const results = await db.insert(schema.alerts).values(alert).returning();
    return results[0];
  }

  async updateAlert(id: number, updates: Partial<Alert>): Promise<Alert | undefined> {
    const results = await db.update(schema.alerts)
      .set(updates)
      .where(eq(schema.alerts.id, id))
      .returning();
    return results[0];
  }

  // ==================== HERCULES V2 - MULTI-TENANT AUTHENTICATION ====================

  // Tenants
  async getTenantById(id: number): Promise<Tenant | undefined> {
    const results = await db.select().from(schema.tenants).where(eq(schema.tenants.id, id));
    return results[0];
  }

  async getTenantBySlug(slug: string): Promise<Tenant | undefined> {
    const results = await db.select().from(schema.tenants).where(eq(schema.tenants.companyCode, slug));
    return results[0];
  }

  async createTenant(tenant: InsertTenant): Promise<Tenant> {
    const results = await db.insert(schema.tenants).values(tenant).returning();
    return results[0];
  }

  async updateTenant(id: number, updates: Partial<Tenant>): Promise<Tenant | undefined> {
    const results = await db.update(schema.tenants)
      .set(updates)
      .where(eq(schema.tenants.id, id))
      .returning();
    return results[0];
  }

  // Users
  async getUserById(id: number): Promise<User | undefined> {
    const results = await db.select().from(schema.users).where(eq(schema.users.id, id));
    return results[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const results = await db.select().from(schema.users).where(eq(schema.users.email, email));
    return results[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const results = await db.insert(schema.users).values(user).returning();
    return results[0];
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const results = await db.update(schema.users)
      .set(updates)
      .where(eq(schema.users.id, id))
      .returning();
    return results[0];
  }

  async getUsersByTenant(tenantId: string): Promise<User[]> {
    return await db.select().from(schema.users).where(eq(schema.users.tenantId, tenantId));
  }

  // PLC Devices
  async getPlcDeviceById(id: number): Promise<PlcDevice | undefined> {
    const results = await db.select().from(schema.plcDevices).where(eq(schema.plcDevices.id, id));
    return results[0];
  }

  async getPlcDevicesByTenant(tenantId: string): Promise<PlcDevice[]> {
    return await db.select({
      id: schema.plcDevices.id,
      userId: schema.plcDevices.userId,
      facilityId: schema.plcDevices.facilityId,
      gatewayId: schema.plcDevices.gatewayId,
      name: schema.plcDevices.name,
      brand: schema.plcDevices.brand,
      model: schema.plcDevices.model,
      protocol: schema.plcDevices.protocol,
      ipAddress: schema.plcDevices.ipAddress,
      port: schema.plcDevices.port,
      rackNumber: schema.plcDevices.rackNumber,
      slotNumber: schema.plcDevices.slotNumber,
      nodeId: schema.plcDevices.nodeId,
      unitId: schema.plcDevices.unitId,
      status: schema.plcDevices.status,
      lastSeen: schema.plcDevices.lastSeen,
      connectionSettings: schema.plcDevices.connectionSettings,
      createdAt: schema.plcDevices.createdAt,
      updatedAt: schema.plcDevices.updatedAt
    })
      .from(schema.plcDevices)
      .leftJoin(schema.facilities, eq(schema.plcDevices.facilityId, schema.facilities.id))
      .where(eq(schema.facilities.tenantId, tenantId));
  }

  async createPlcDevice(config: InsertPlcDevice): Promise<PlcDevice> {
    const results = await db.insert(schema.plcDevices).values(config).returning();
    return results[0];
  }

  async updatePlcDevice(id: number, updates: Partial<PlcDevice>): Promise<PlcDevice | undefined> {
    const results = await db.update(schema.plcDevices)
      .set(updates)
      .where(eq(schema.plcDevices.id, id))
      .returning();
    return results[0];
  }

  async deletePlcDevice(id: number): Promise<boolean> {
    const results = await db.delete(schema.plcDevices)
      .where(eq(schema.plcDevices.id, id))
      .returning();
    return results.length > 0;
  }

  async getAllPlcDevices(userId: string): Promise<PlcDevice[]> {
    console.log('[STORAGE] getAllPlcDevices called');
    console.log('[STORAGE]   userId:', userId);
    console.log('[STORAGE]   userId type:', typeof userId);
    
    try {
      console.log('[STORAGE] Executing query: SELECT * FROM plcDevices WHERE userId =', userId);
      const result = await db.select().from(schema.plcDevices).where(eq(schema.plcDevices.userId, userId));
      console.log('[STORAGE] Query successful');
      console.log('[STORAGE]   Result count:', result ? result.length : 0);
      console.log('[STORAGE]   Result:', JSON.stringify(result, null, 2));
      return result;
    } catch (error: any) {
      console.error('[STORAGE] getAllPlcDevices ERROR:', error?.message);
      console.error('[STORAGE] Error stack:', error?.stack);
      throw error;
    }
  }

  async getPlcDevice(id: number): Promise<PlcDevice | undefined> {
    return this.getPlcDeviceById(id);
  }

  async upsertPlcDevice(device: Partial<PlcDevice> & { userId: string }): Promise<PlcDevice> {
    // Try to find existing device by userId and name
    const existing = await db.select()
      .from(schema.plcDevices)
      .where(and(
        eq(schema.plcDevices.userId, device.userId),
        eq(schema.plcDevices.name, device.name!)
      ));

    if (existing.length > 0) {
      // Update existing
      const results = await db.update(schema.plcDevices)
        .set(device)
        .where(eq(schema.plcDevices.id, existing[0].id))
        .returning();
      return results[0];
    } else {
      // Create new
      return this.createPlcDevice(device as InsertPlcDevice);
    }
  }

  // PLC Tags
  async getPlcTagById(id: number): Promise<PlcTag | undefined> {
    const results = await db.select().from(schema.plcTags).where(eq(schema.plcTags.id, id));
    return results[0];
  }

  async getPlcTagsByTenant(tenantId: string, configId?: number): Promise<PlcTag[]> {
    const conditions = [eq(schema.facilities.tenantId, tenantId)];
    if (configId) {
      conditions.push(eq(schema.plcDevices.id, configId));
    }

    return await db.select({
      id: schema.plcTags.id,
      plcId: schema.plcTags.plcId,
      name: schema.plcTags.name,
      description: schema.plcTags.description,
      address: schema.plcTags.address,
      dataType: schema.plcTags.dataType,
      unit: schema.plcTags.unit,
      scaleFactor: schema.plcTags.scaleFactor,
      offset: schema.plcTags.offset,
      minValue: schema.plcTags.minValue,
      maxValue: schema.plcTags.maxValue,
      alarmLow: schema.plcTags.alarmLow,
      alarmHigh: schema.plcTags.alarmHigh,
      enabled: schema.plcTags.enabled,
      scanRate: schema.plcTags.scanRate,
      lastValue: schema.plcTags.lastValue,
      lastReadTime: schema.plcTags.lastReadTime,
      quality: schema.plcTags.quality,
      createdAt: schema.plcTags.createdAt
    })
      .from(schema.plcTags)
      .innerJoin(schema.plcDevices, eq(schema.plcTags.plcId, schema.plcDevices.id))
      .leftJoin(schema.facilities, eq(schema.plcDevices.facilityId, schema.facilities.id))
      .where(and(...conditions));
  }

  async getPlcTagsByUser(userId: string, plcId?: string): Promise<PlcTag[]> {
    const conditions = [eq(schema.plcDevices.userId, userId)];
    if (plcId) {
      conditions.push(eq(schema.plcDevices.id, parseInt(plcId)));
    }

    return await db.select({
      id: schema.plcTags.id,
      plcId: schema.plcTags.plcId,
      name: schema.plcTags.name,
      description: schema.plcTags.description,
      address: schema.plcTags.address,
      dataType: schema.plcTags.dataType,
      unit: schema.plcTags.unit,
      scaleFactor: schema.plcTags.scaleFactor,
      offset: schema.plcTags.offset,
      minValue: schema.plcTags.minValue,
      maxValue: schema.plcTags.maxValue,
      alarmLow: schema.plcTags.alarmLow,
      alarmHigh: schema.plcTags.alarmHigh,
      enabled: schema.plcTags.enabled,
      scanRate: schema.plcTags.scanRate,
      lastValue: schema.plcTags.lastValue,
      lastReadTime: schema.plcTags.lastReadTime,
      quality: schema.plcTags.quality,
      createdAt: schema.plcTags.createdAt
    })
      .from(schema.plcTags)
      .innerJoin(schema.plcDevices, eq(schema.plcTags.plcId, schema.plcDevices.id))
      .where(and(...conditions));
  }

  async getPlcTagsByPlcId(plcId: number): Promise<PlcTag[]> {
    console.log('[STORAGE] getPlcTagsByPlcId called');
    console.log('[STORAGE]   plcId:', plcId);
    console.log('[STORAGE]   plcId type:', typeof plcId);
    
    try {
      console.log('[STORAGE] Executing query: SELECT * FROM plcTags WHERE plcId =', plcId);
      const result = await db.select().from(schema.plcTags).where(eq(schema.plcTags.plcId, plcId));
      console.log('[STORAGE] Query successful');
      console.log('[STORAGE]   Result count:', result ? result.length : 0);
      console.log('[STORAGE]   Result:', JSON.stringify(result, null, 2));
      return result;
    } catch (error: any) {
      console.error('[STORAGE] getPlcTagsByPlcId ERROR:', error?.message);
      console.error('[STORAGE] Error stack:', error?.stack);
      throw error;
    }
  }

  async createPlcTag(tag: InsertPlcTag): Promise<PlcTag> {
    const results = await db.insert(schema.plcTags).values(tag).returning();
    return results[0];
  }

  async updatePlcTag(id: number, updates: Partial<PlcTag>): Promise<PlcTag | undefined> {
    const results = await db.update(schema.plcTags)
      .set(updates)
      .where(eq(schema.plcTags.id, id))
      .returning();
    return results[0];
  }

  async deletePlcTag(id: number): Promise<boolean> {
    const results = await db.delete(schema.plcTags)
      .where(eq(schema.plcTags.id, id))
      .returning();
    return results.length > 0;
  }

  // PLC Data (Real-time data)
  async createPlcData(data: InsertPlcData): Promise<PlcData> {
    const results = await db.insert(schema.plcData).values(data).returning();
    return results[0];
  }

  // Batch insert historical PLC data
  async batchInsertPlcData(dataPoints: InsertPlcData[]): Promise<{ 
    acceptedCount: number; 
    rejectedCount: number; 
    errors?: string[] 
  }> {
    let acceptedCount = 0;
    let rejectedCount = 0;
    const errors: string[] = [];

    if (!dataPoints || dataPoints.length === 0) {
      return { acceptedCount: 0, rejectedCount: 0 };
    }

    try {
      // Insert data points in batches of 100 for better performance
      const batchSize = 100;
      for (let i = 0; i < dataPoints.length; i += batchSize) {
        const batch = dataPoints.slice(i, Math.min(i + batchSize, dataPoints.length));
        try {
          await db.insert(schema.plcData).values(batch);
          acceptedCount += batch.length;
        } catch (error: any) {
          rejectedCount += batch.length;
          errors.push(`Batch ${i / batchSize + 1} failed: ${error.message}`);
          console.error(`[STORAGE] Batch insert error for batch ${i / batchSize + 1}:`, error);
        }
      }
    } catch (error: any) {
      console.error('[STORAGE] batchInsertPlcData ERROR:', error);
      errors.push(`General error: ${error.message}`);
      rejectedCount = dataPoints.length - acceptedCount;
    }

    return { acceptedCount, rejectedCount, errors: errors.length > 0 ? errors : undefined };
  }

  async getLatestPlcData(tenantId: string, tagIds?: number[]): Promise<PlcData[]> {
    const conditions = [eq(schema.facilities.tenantId, tenantId)];
    if (tagIds && tagIds.length > 0) {
      conditions.push(inArray(schema.plcData.tagId, tagIds));
    }

    return await db.select({
      id: schema.plcData.id,
      tagId: schema.plcData.tagId,
      value: schema.plcData.value,
      quality: schema.plcData.quality,
      timestamp: schema.plcData.timestamp
    })
      .from(schema.plcData)
      .innerJoin(schema.plcTags, eq(schema.plcData.tagId, schema.plcTags.id))
      .innerJoin(schema.plcDevices, eq(schema.plcTags.plcId, schema.plcDevices.id))
      .leftJoin(schema.facilities, eq(schema.plcDevices.facilityId, schema.facilities.id))
      .where(and(...conditions))
      .orderBy(desc(schema.plcData.timestamp));
  }

  // Get historical PLC data within date range
  async getHistoricalPlcData(userId: string, tagIds: number[], startDate: Date, endDate: Date): Promise<PlcData[]> {
    try {
      // Build query conditions
      const conditions = [
        eq(schema.plcDevices.userId, userId),
        gte(schema.plcData.timestamp, startDate),
        lte(schema.plcData.timestamp, endDate)
      ];
      
      if (tagIds && tagIds.length > 0) {
        conditions.push(inArray(schema.plcData.tagId, tagIds));
      }
      
      // Query historical data
      const results = await db.select({
        id: schema.plcData.id,
        tagId: schema.plcData.tagId,
        value: schema.plcData.value,
        quality: schema.plcData.quality,
        timestamp: schema.plcData.timestamp
      })
        .from(schema.plcData)
        .innerJoin(schema.plcTags, eq(schema.plcData.tagId, schema.plcTags.id))
        .innerJoin(schema.plcDevices, eq(schema.plcTags.plcId, schema.plcDevices.id))
        .where(and(...conditions))
        .orderBy(asc(schema.plcData.timestamp))
        .limit(10000); // Limit to prevent overwhelming responses
      
      console.log(`[STORAGE] getHistoricalPlcData: Found ${results.length} records for date range ${startDate.toISOString()} to ${endDate.toISOString()}`);
      return results;
    } catch (error: any) {
      console.error('[STORAGE] getHistoricalPlcData ERROR:', error);
      throw error;
    }
  }

  async getLatestPlcDataByUser(userId: string, tagIds?: number[]): Promise<PlcData[]> {
    // For demo users who don't have facilities, filter by userId on plcDevices
    const conditions = [eq(schema.plcDevices.userId, userId)];
    if (tagIds && tagIds.length > 0) {
      conditions.push(inArray(schema.plcData.tagId, tagIds));
    }

    return await db.select({
      id: schema.plcData.id,
      tagId: schema.plcData.tagId,
      value: schema.plcData.value,
      quality: schema.plcData.quality,
      timestamp: schema.plcData.timestamp
    })
      .from(schema.plcData)
      .innerJoin(schema.plcTags, eq(schema.plcData.tagId, schema.plcTags.id))
      .innerJoin(schema.plcDevices, eq(schema.plcTags.plcId, schema.plcDevices.id))
      .where(and(...conditions))
      .orderBy(desc(schema.plcData.timestamp));
  }

  async getPlcDataHistory(tagId: number, from?: Date, to?: Date, limit?: number): Promise<PlcData[]> {
    const conditions = [eq(schema.plcData.tagId, tagId)];
    if (from) conditions.push(sql`${schema.plcData.timestamp} >= ${from}`);
    if (to) conditions.push(sql`${schema.plcData.timestamp} <= ${to}`);

    const baseQuery = db.select()
      .from(schema.plcData)
      .where(and(...conditions))
      .orderBy(desc(schema.plcData.timestamp));

    if (limit) {
      return await baseQuery.limit(limit);
    }

    return await baseQuery;
  }

  // Dashboard Configurations
  async getDashboardConfigsByUser(userId: number): Promise<DashboardConfig[]> {
    return await db.select().from(schema.dashboardConfigs).where(eq(schema.dashboardConfigs.userId, userId));
  }

  async getDashboardConfigsByTenant(tenantId: string): Promise<DashboardConfig[]> {
    return await db.select({
      id: schema.dashboardConfigs.id,
      userId: schema.dashboardConfigs.userId,
      name: schema.dashboardConfigs.name,
      layout: schema.dashboardConfigs.layout,
      widgets: schema.dashboardConfigs.widgets,
      isDefault: schema.dashboardConfigs.isDefault,
      createdAt: schema.dashboardConfigs.createdAt,
      updatedAt: schema.dashboardConfigs.updatedAt
    })
      .from(schema.dashboardConfigs)
      .innerJoin(schema.users, eq(schema.dashboardConfigs.userId, schema.users.id))
      .where(eq(schema.users.tenantId, tenantId));
  }

  async createDashboardConfig(config: InsertDashboardConfig): Promise<DashboardConfig> {
    const results = await db.insert(schema.dashboardConfigs).values(config).returning();
    return results[0];
  }

  async updateDashboardConfig(id: number, updates: Partial<DashboardConfig>): Promise<DashboardConfig | undefined> {
    const results = await db.update(schema.dashboardConfigs)
      .set(updates)
      .where(eq(schema.dashboardConfigs.id, id))
      .returning();
    return results[0];
  }

  async deleteDashboardConfig(id: number): Promise<boolean> {
    const results = await db.delete(schema.dashboardConfigs)
      .where(eq(schema.dashboardConfigs.id, id))
      .returning();
    return results.length > 0;
  }

  // User Dashboards (Custom Tag Dashboards)
  async getUserDashboards(userId: string): Promise<UserDashboard[]> {
    return await db.select().from(schema.userDashboards)
      .where(eq(schema.userDashboards.userId, userId))
      .orderBy(desc(schema.userDashboards.createdAt));
  }

  async getUserDashboard(id: number): Promise<UserDashboard | undefined> {
    const results = await db.select().from(schema.userDashboards).where(eq(schema.userDashboards.id, id));
    return results[0];
  }

  async createUserDashboard(dashboard: InsertUserDashboard): Promise<UserDashboard> {
    const results = await db.insert(schema.userDashboards).values(dashboard).returning();
    return results[0];
  }

  async updateUserDashboard(id: number, updates: Partial<UserDashboard>): Promise<UserDashboard | undefined> {
    const results = await db.update(schema.userDashboards)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(schema.userDashboards.id, id))
      .returning();
    return results[0];
  }

  async deleteUserDashboard(id: number): Promise<boolean> {
    const results = await db.delete(schema.userDashboards)
      .where(eq(schema.userDashboards.id, id))
      .returning();
    return results.length > 0;
  }

  // Report Configs
  async getReportConfigsByTenant(tenantId: string): Promise<ReportConfig[]> {
    return await db.select().from(schema.reportConfigs).where(eq(schema.reportConfigs.tenantId, tenantId));
  }

  async createReportConfig(template: InsertReportConfig): Promise<ReportConfig> {
    const results = await db.insert(schema.reportConfigs).values(template).returning();
    return results[0];
  }

  async updateReportConfig(id: number, updates: Partial<ReportConfig>): Promise<ReportConfig | undefined> {
    const results = await db.update(schema.reportConfigs)
      .set(updates)
      .where(eq(schema.reportConfigs.id, id))
      .returning();
    return results[0];
  }

  async deleteReportConfig(id: number): Promise<boolean> {
    const results = await db.delete(schema.reportConfigs)
      .where(eq(schema.reportConfigs.id, id))
      .returning();
    return results.length > 0;
  }

  // ==================== DEMO USER MANAGEMENT ====================

  // Demo Users (Google OAuth)
  async getDemoUser(id: string): Promise<DemoUser | undefined> {
    const results = await db.select().from(schema.demoUsers).where(eq(schema.demoUsers.id, id));
    return results[0];
  }

  async getDemoUserByEmail(email: string): Promise<DemoUser | undefined> {
    const results = await db.select().from(schema.demoUsers).where(eq(schema.demoUsers.email, email));
    return results[0];
  }

  async getDemoUserByDemoKey(demoKey: string): Promise<DemoUser | undefined> {
    const results = await db.select().from(schema.demoUsers).where(eq(schema.demoUsers.demoKey, demoKey));
    return results[0];
  }

  async upsertDemoUser(user: UpsertDemoUser): Promise<DemoUser> {
    if (user.id) {
      // Try to update existing user
      const existingResults = await db.select().from(schema.demoUsers).where(eq(schema.demoUsers.id, user.id));
      
      if (existingResults.length > 0) {
        const results = await db.update(schema.demoUsers)
          .set(user)
          .where(eq(schema.demoUsers.id, user.id))
          .returning();
        return results[0];
      }
    }

    // Create new user
    const newUser = {
      ...user,
      id: user.id || crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const results = await db.insert(schema.demoUsers).values(newUser).returning();
    return results[0];
  }

  async updateDemoUser(id: string, updates: Partial<DemoUser>): Promise<DemoUser | undefined> {
    const results = await db.update(schema.demoUsers)
      .set(updates)
      .where(eq(schema.demoUsers.id, id))
      .returning();
    return results[0];
  }

  // Access Management
  async updateUserAccess(userId: string, expiresAt: Date | null, grantedDays: number | null): Promise<DemoUser | undefined> {
    const updates: Partial<DemoUser> = {
      accessExpiresAt: expiresAt,
      accessGrantedDays: grantedDays,
      isActive: expiresAt ? new Date() < expiresAt : false,
      updatedAt: new Date()
    };
    
    const results = await db.update(schema.demoUsers)
      .set(updates)
      .where(eq(schema.demoUsers.id, userId))
      .returning();
    return results[0];
  }

  async getUsersWithAccessInfo(): Promise<DemoUser[]> {
    // Get all demo users with their access information
    const users = await db.select().from(schema.demoUsers);
    
    // Calculate isActive status based on accessExpiresAt
    return users.map(user => ({
      ...user,
      isActive: user.accessExpiresAt ? new Date() < new Date(user.accessExpiresAt) : user.isActive ?? true
    }));
  }

  // Gateway Downloads
  async getGatewayDownloadsByUser(demoUserId: string): Promise<GatewayDownload[]> {
    return await db.select().from(schema.gatewayDownloads).where(eq(schema.gatewayDownloads.demoUserId, demoUserId));
  }

  async getGatewayDownloadByToken(token: string): Promise<GatewayDownload | undefined> {
    const results = await db.select().from(schema.gatewayDownloads).where(eq(schema.gatewayDownloads.downloadToken, token));
    return results[0];
  }

  async createGatewayDownload(download: InsertGatewayDownload): Promise<GatewayDownload> {
    const results = await db.insert(schema.gatewayDownloads).values(download).returning();
    return results[0];
  }

  async updateGatewayDownload(id: number, updates: Partial<GatewayDownload>): Promise<GatewayDownload | undefined> {
    const results = await db.update(schema.gatewayDownloads)
      .set(updates)
      .where(eq(schema.gatewayDownloads.id, id))
      .returning();
    return results[0];
  }

  // ==================== SESSION MANAGEMENT ====================
  
  async createSession(userId: string, sessionId: string, expiresAt: Date, data: any): Promise<any> {
    const results = await db.insert(schema.sessions).values({
      userId,
      sessionId,
      expiresAt,
      data: data || {},
      createdAt: new Date()
    }).returning();
    return results[0];
  }

  async getSession(sessionId: string): Promise<any | undefined> {
    const results = await db.select().from(schema.sessions)
      .where(eq(schema.sessions.sessionId, sessionId));
    return results[0];
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    const results = await db.delete(schema.sessions)
      .where(eq(schema.sessions.sessionId, sessionId))
      .returning();
    return results.length > 0;
  }

  async deleteExpiredSessions(): Promise<number> {
    const results = await db.delete(schema.sessions)
      .where(sql`${schema.sessions.expiresAt} < NOW()`)
      .returning();
    return results.length;
  }

  async updateSessionExpiry(sessionId: string, expiresAt: Date): Promise<boolean> {
    const results = await db.update(schema.sessions)
      .set({ expiresAt })
      .where(eq(schema.sessions.sessionId, sessionId))
      .returning();
    return results.length > 0;
  }

  // ==================== GATEWAY ACTIVATION CODES ====================
  
  // Get activation code by gateway ID
  async getActivationCodeByGatewayId(gatewayId: string): Promise<any> {
    try {
      const results = await db.select({
        id: schema.gatewayCodes.id,
        code: schema.gatewayCodes.code,
        userId: schema.gatewayCodes.userId,
        gatewayId: schema.gatewayCodes.gatewayId,
        tenantId: schema.gatewayCodes.tenantId,
        status: schema.gatewayCodes.status,
        expiresAt: schema.gatewayCodes.expiresAt,
        activatedAt: schema.gatewayCodes.activatedAt
      })
      .from(schema.gatewayCodes)
      .where(eq(schema.gatewayCodes.gatewayId, gatewayId));
      return results[0];
    } catch (error: any) {
      console.error('[STORAGE] getActivationCodeByGatewayId ERROR:', error);
      return null;
    }
  }

  // ==================== GATEWAY V2 DYNAMIC TABLE MANAGEMENT ====================
  
  // Gateway Schemas
  async getActiveGatewaySchema(userId: string): Promise<GatewaySchema | undefined> {
    console.log('[STORAGE] getActiveGatewaySchema called');
    console.log('[STORAGE]   userId:', userId);
    console.log('[STORAGE]   userId type:', typeof userId);
    
    try {
      console.log('[STORAGE] Executing query: SELECT * FROM gatewaySchemas WHERE userId =', userId, 'AND isActive = true');
      const results = await db.select().from(schema.gatewaySchemas)
        .where(and(
          eq(schema.gatewaySchemas.userId, userId),
          eq(schema.gatewaySchemas.isActive, true)
        ));
      console.log('[STORAGE] Query successful');
      console.log('[STORAGE]   Result count:', results ? results.length : 0);
      console.log('[STORAGE]   Result:', JSON.stringify(results, null, 2));
      const result = results[0];
      console.log('[STORAGE]   Returning:', result ? 'schema found' : 'undefined (no active schema)');
      return result;
    } catch (error: any) {
      console.error('[STORAGE] getActiveGatewaySchema ERROR:', error?.message);
      console.error('[STORAGE] Error stack:', error?.stack);
      throw error;
    }
  }
  
  async getGatewaySchemaById(id: number): Promise<GatewaySchema | undefined> {
    const results = await db.select().from(schema.gatewaySchemas)
      .where(eq(schema.gatewaySchemas.id, id));
    return results[0];
  }
  
  async getGatewaySchemasByUser(userId: string): Promise<GatewaySchema[]> {
    return await db.select().from(schema.gatewaySchemas)
      .where(eq(schema.gatewaySchemas.userId, userId))
      .orderBy(desc(schema.gatewaySchemas.createdAt));
  }
  
  async createGatewaySchema(gatewaySchema: InsertGatewaySchema): Promise<GatewaySchema> {
    const results = await db.insert(schema.gatewaySchemas).values(gatewaySchema).returning();
    return results[0];
  }
  
  async updateGatewaySchema(id: number, updates: Partial<GatewaySchema>): Promise<GatewaySchema | undefined> {
    const results = await db.update(schema.gatewaySchemas)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(schema.gatewaySchemas.id, id))
      .returning();
    return results[0];
  }
  
  async setActiveGatewaySchema(userId: string, schemaId: number): Promise<boolean> {
    // Deactivate all other schemas for this user
    await db.update(schema.gatewaySchemas)
      .set({ isActive: false })
      .where(and(
        eq(schema.gatewaySchemas.userId, userId),
        sql`${schema.gatewaySchemas.id} != ${schemaId}`
      ));
    
    // Activate the specified schema
    const results = await db.update(schema.gatewaySchemas)
      .set({ isActive: true })
      .where(and(
        eq(schema.gatewaySchemas.id, schemaId),
        eq(schema.gatewaySchemas.userId, userId)
      ))
      .returning();
    
    return results.length > 0;
  }
  
  // Gateway Tables
  async getGatewayTablesBySchema(schemaId: number): Promise<GatewayTable[]> {
    return await db.select().from(schema.gatewayTables)
      .where(eq(schema.gatewayTables.schemaId, schemaId))
      .orderBy(schema.gatewayTables.tableName);
  }
  
  async getGatewayTableById(id: number): Promise<GatewayTable | undefined> {
    const results = await db.select().from(schema.gatewayTables)
      .where(eq(schema.gatewayTables.id, id));
    return results[0];
  }
  
  async createGatewayTable(table: InsertGatewayTable): Promise<GatewayTable> {
    const results = await db.insert(schema.gatewayTables).values(table).returning();
    return results[0];
  }
  
  async updateGatewayTable(id: number, updates: Partial<GatewayTable>): Promise<GatewayTable | undefined> {
    const results = await db.update(schema.gatewayTables)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(schema.gatewayTables.id, id))
      .returning();
    return results[0];
  }
  
  async deleteGatewayTable(id: number): Promise<boolean> {
    const results = await db.delete(schema.gatewayTables)
      .where(eq(schema.gatewayTables.id, id))
      .returning();
    return results.length > 0;
  }
  
  // Gateway Table Status
  async getGatewayTableStatus(gatewayId: string, tableName?: string): Promise<GatewayTableStatus[]> {
    const conditions = [eq(schema.gatewayTableStatus.gatewayId, gatewayId)];
    if (tableName) {
      conditions.push(eq(schema.gatewayTableStatus.tableName, tableName));
    }
    return await db.select().from(schema.gatewayTableStatus)
      .where(and(...conditions))
      .orderBy(desc(schema.gatewayTableStatus.reportedAt));
  }
  
  async getLatestTableStatus(gatewayId: string): Promise<GatewayTableStatus[]> {
    // Get the most recent status for each table
    const subquery = db
      .select({
        tableName: schema.gatewayTableStatus.tableName,
        maxReportedAt: sql`MAX(${schema.gatewayTableStatus.reportedAt})`.as('max_reported_at')
      })
      .from(schema.gatewayTableStatus)
      .where(eq(schema.gatewayTableStatus.gatewayId, gatewayId))
      .groupBy(schema.gatewayTableStatus.tableName)
      .as('latest');
    
    return await db
      .select({
        id: schema.gatewayTableStatus.id,
        gatewayId: schema.gatewayTableStatus.gatewayId,
        tableName: schema.gatewayTableStatus.tableName,
        rowCount: schema.gatewayTableStatus.rowCount,
        sizeBytes: schema.gatewayTableStatus.sizeBytes,
        oldestRecord: schema.gatewayTableStatus.oldestRecord,
        newestRecord: schema.gatewayTableStatus.newestRecord,
        lastVacuum: schema.gatewayTableStatus.lastVacuum,
        lastCleanup: schema.gatewayTableStatus.lastCleanup,
        fragmentation: schema.gatewayTableStatus.fragmentation,
        indexCount: schema.gatewayTableStatus.indexCount,
        errorCount: schema.gatewayTableStatus.errorCount,
        lastError: schema.gatewayTableStatus.lastError,
        reportedAt: schema.gatewayTableStatus.reportedAt
      })
      .from(schema.gatewayTableStatus)
      .innerJoin(
        subquery,
        and(
          eq(schema.gatewayTableStatus.tableName, subquery.tableName),
          eq(schema.gatewayTableStatus.reportedAt, subquery.maxReportedAt)
        )
      )
      .where(eq(schema.gatewayTableStatus.gatewayId, gatewayId));
  }
  
  async createGatewayTableStatus(status: InsertGatewayTableStatus): Promise<GatewayTableStatus> {
    const results = await db.insert(schema.gatewayTableStatus).values(status).returning();
    return results[0];
  }
  
  async bulkCreateTableStatus(statuses: InsertGatewayTableStatus[]): Promise<GatewayTableStatus[]> {
    if (statuses.length === 0) return [];
    const results = await db.insert(schema.gatewayTableStatus).values(statuses).returning();
    return results;
  }
  
  // Gateway Commands
  async getPendingGatewayCommands(gatewayId: string): Promise<GatewayCommand[]> {
    return await db.select().from(schema.gatewayCommands)
      .where(and(
        eq(schema.gatewayCommands.gatewayId, gatewayId),
        eq(schema.gatewayCommands.status, 'pending')
      ))
      .orderBy(schema.gatewayCommands.priority, desc(schema.gatewayCommands.createdAt));
  }
  
  async getGatewayCommandById(id: number): Promise<GatewayCommand | undefined> {
    const results = await db.select().from(schema.gatewayCommands)
      .where(eq(schema.gatewayCommands.id, id));
    return results[0];
  }
  
  async createGatewayCommand(command: InsertGatewayCommand): Promise<GatewayCommand> {
    const results = await db.insert(schema.gatewayCommands).values(command).returning();
    return results[0];
  }
  
  async updateGatewayCommand(id: number, updates: Partial<GatewayCommand>): Promise<GatewayCommand | undefined> {
    const results = await db.update(schema.gatewayCommands)
      .set(updates)
      .where(eq(schema.gatewayCommands.id, id))
      .returning();
    return results[0];
  }
  
  async markCommandSent(commandId: number): Promise<boolean> {
    const results = await db.update(schema.gatewayCommands)
      .set({ status: 'sent', sentAt: new Date() })
      .where(eq(schema.gatewayCommands.id, commandId))
      .returning();
    return results.length > 0;
  }
  
  async markCommandAcknowledged(commandId: number): Promise<boolean> {
    const results = await db.update(schema.gatewayCommands)
      .set({ status: 'acknowledged', acknowledgedAt: new Date() })
      .where(eq(schema.gatewayCommands.id, commandId))
      .returning();
    return results.length > 0;
  }
  
  async markCommandCompleted(commandId: number, result?: any): Promise<boolean> {
    const updates: any = { status: 'completed', completedAt: new Date() };
    if (result !== undefined) {
      updates.result = result;
    }
    const results = await db.update(schema.gatewayCommands)
      .set(updates)
      .where(eq(schema.gatewayCommands.id, commandId))
      .returning();
    return results.length > 0;
  }
  
  async markCommandFailed(commandId: number, errorMessage: string): Promise<boolean> {
    const results = await db.update(schema.gatewayCommands)
      .set({ 
        status: 'failed', 
        failedAt: new Date(),
        errorMessage 
      })
      .where(eq(schema.gatewayCommands.id, commandId))
      .returning();
    return results.length > 0;
  }
  
  async getRecentCommands(gatewayId: string, limit?: number): Promise<GatewayCommand[]> {
    const query = db.select().from(schema.gatewayCommands)
      .where(eq(schema.gatewayCommands.gatewayId, gatewayId))
      .orderBy(desc(schema.gatewayCommands.createdAt));
    
    if (limit) {
      query.limit(limit);
    }
    
    return await query;
  }
  
  // ==================== GATEWAY DEBUG METHODS ====================
  
  async getGatewayDebugInfo(): Promise<any[]> {
    try {
      // Get all gateways with their latest status
      const gateways = await db.select({
        id: schema.gateways.id,
        userId: schema.gateways.userId,
        machineId: schema.gateways.machineId,
        lastIp: schema.gateways.lastIp,
        os: schema.gateways.os,
        osVersion: schema.gateways.osVersion,
        cpu: schema.gateways.cpu,
        memory: schema.gateways.memory,
        status: schema.gateways.status,
        tokenExpiresAt: schema.gateways.tokenExpiresAt,
        createdAt: schema.gateways.createdAt,
        updatedAt: schema.gateways.updatedAt
      })
      .from(schema.gateways)
      .where(eq(schema.gateways.status, 'active'));
      
      // Get latest heartbeat info from gateway codes table
      const gatewayCodesInfo = await db.select({
        gatewayId: schema.gatewayCodes.gatewayId,
        lastSyncAt: schema.gatewayCodes.lastSyncAt,
        syncCount: schema.gatewayCodes.syncCount
      })
      .from(schema.gatewayCodes)
      .where(sql`${schema.gatewayCodes.gatewayId} IS NOT NULL`);
      
      // Get latest schema version for each gateway
      const gatewaySchemas = await db.select({
        gatewayId: schema.gatewaySchemas.gatewayId,
        version: schema.gatewaySchemas.version
      })
      .from(schema.gatewaySchemas)
      .where(and(
        sql`${schema.gatewaySchemas.gatewayId} IS NOT NULL`,
        eq(schema.gatewaySchemas.isActive, true)
      ));
      
      // Combine the information
      const enrichedGateways = gateways.map(gateway => {
        const codeInfo = gatewayCodesInfo.find(info => info.gatewayId === gateway.id);
        const schemaInfo = gatewaySchemas.find(s => s.gatewayId === gateway.id);
        
        return {
          ...gateway,
          lastHeartbeat: codeInfo?.lastSyncAt || gateway.updatedAt,
          syncCount: codeInfo?.syncCount || 0,
          schemaVersion: schemaInfo?.version || 'v1'
        };
      });
      
      return enrichedGateways;
    } catch (error) {
      console.error('Failed to get gateway debug info:', error);
      return [];
    }
  }
  
  async getRecentGatewayActivity(gatewayId?: string): Promise<any[]> {
    // This method returns empty array as actual activity is tracked in-memory in routes.ts
    // The in-memory tracking provides better performance for real-time debug monitoring
    return [];
  }
}