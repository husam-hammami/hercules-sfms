import { type Facility, type InsertFacility, type Metric, type InsertMetric, type Alert, type InsertAlert, type Tenant, type InsertTenant, type User, type InsertUser, type PlcDevice, type InsertPlcDevice, type PlcTag, type InsertPlcTag, type PlcData, type InsertPlcData, type DashboardConfig, type InsertDashboardConfig, type ReportConfig, type InsertReportConfig, type DemoUser, type UpsertDemoUser, type GatewayDownload, type InsertGatewayDownload, type GatewaySchema, type InsertGatewaySchema, type GatewayTable, type InsertGatewayTable, type GatewayTableStatus, type InsertGatewayTableStatus, type GatewayCommand, type InsertGatewayCommand, type UserDashboard, type InsertUserDashboard } from "@shared/schema";
import { DrizzleStorage } from "./storage-drizzle";

export interface IStorage {
  // Facilities
  getAllFacilities(): Promise<Facility[]>;
  getFacility(id: number): Promise<Facility | undefined>;
  createFacility(facility: InsertFacility): Promise<Facility>;
  
  // Metrics
  getFacilityMetrics(facilityId: number): Promise<Metric[]>;
  createMetric(metric: InsertMetric): Promise<Metric>;
  
  // Alerts
  getAllAlerts(): Promise<Alert[]>;
  getFacilityAlerts(facilityId: number): Promise<Alert[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  updateAlert(id: number, updates: Partial<Alert>): Promise<Alert | undefined>;
  
  // ==================== HERCULES V2 - MULTI-TENANT AUTHENTICATION ====================

  // Tenants
  getTenantById(id: number): Promise<Tenant | undefined>;
  getTenantBySlug(slug: string): Promise<Tenant | undefined>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  updateTenant(id: number, updates: Partial<Tenant>): Promise<Tenant | undefined>;

  // Users
  getUserById(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  getUsersByTenant(tenantId: string): Promise<User[]>;

  // PLC Devices
  getPlcDeviceById(id: number): Promise<PlcDevice | undefined>;
  getPlcDevicesByTenant(tenantId: string): Promise<PlcDevice[]>;
  createPlcDevice(config: InsertPlcDevice): Promise<PlcDevice>;
  updatePlcDevice(id: number, updates: Partial<PlcDevice>): Promise<PlcDevice | undefined>;
  deletePlcDevice(id: number): Promise<boolean>;
  
  // PLC Device methods for user-specific operations (demo users)
  getAllPlcDevices(userId: string): Promise<PlcDevice[]>;
  getPlcDevice(id: number): Promise<PlcDevice | undefined>;
  upsertPlcDevice(device: Partial<PlcDevice> & { userId: string }): Promise<PlcDevice>;

  // PLC Tags
  getPlcTagById(id: number): Promise<PlcTag | undefined>;
  getPlcTagsByTenant(tenantId: string, configId?: number): Promise<PlcTag[]>;
  getPlcTagsByUser(userId: string, plcId?: string): Promise<PlcTag[]>;
  getPlcTagsByPlcId(plcId: number): Promise<PlcTag[]>;
  createPlcTag(tag: InsertPlcTag): Promise<PlcTag>;
  updatePlcTag(id: number, updates: Partial<PlcTag>): Promise<PlcTag | undefined>;
  deletePlcTag(id: number): Promise<boolean>;

  // PLC Data (Real-time data)
  createPlcData(data: InsertPlcData): Promise<PlcData>;
  getLatestPlcData(tenantId: string, tagIds?: number[]): Promise<PlcData[]>;
  getLatestPlcDataByUser(userId: string, tagIds?: number[]): Promise<PlcData[]>;
  getPlcDataHistory(tagId: number, from?: Date, to?: Date, limit?: number): Promise<PlcData[]>;

  // Dashboard Configurations
  getDashboardConfigsByUser(userId: number): Promise<DashboardConfig[]>;
  getDashboardConfigsByTenant(tenantId: string): Promise<DashboardConfig[]>;
  createDashboardConfig(config: InsertDashboardConfig): Promise<DashboardConfig>;
  updateDashboardConfig(id: number, updates: Partial<DashboardConfig>): Promise<DashboardConfig | undefined>;
  deleteDashboardConfig(id: number): Promise<boolean>;
  
  // User Dashboards (Custom Tag Dashboards)
  getUserDashboards(userId: string): Promise<UserDashboard[]>;
  getUserDashboard(id: number): Promise<UserDashboard | undefined>;
  createUserDashboard(dashboard: InsertUserDashboard): Promise<UserDashboard>;
  updateUserDashboard(id: number, updates: Partial<UserDashboard>): Promise<UserDashboard | undefined>;
  deleteUserDashboard(id: number): Promise<boolean>;

  // Report Configs
  getReportConfigsByTenant(tenantId: string): Promise<ReportConfig[]>;
  createReportConfig(template: InsertReportConfig): Promise<ReportConfig>;
  updateReportConfig(id: number, updates: Partial<ReportConfig>): Promise<ReportConfig | undefined>;
  deleteReportConfig(id: number): Promise<boolean>;

  // ==================== DEMO USER MANAGEMENT ====================
  
  // Demo Users (Google OAuth)
  getDemoUser(id: string): Promise<DemoUser | undefined>;
  getDemoUserByEmail(email: string): Promise<DemoUser | undefined>;
  getDemoUserByDemoKey(demoKey: string): Promise<DemoUser | undefined>;
  upsertDemoUser(user: UpsertDemoUser): Promise<DemoUser>;
  updateDemoUser(id: string, updates: Partial<DemoUser>): Promise<DemoUser | undefined>;
  
  // Access Management
  updateUserAccess(userId: string, expiresAt: Date | null, grantedDays: number | null): Promise<DemoUser | undefined>;
  getUsersWithAccessInfo(): Promise<DemoUser[]>;
  
  // Gateway Downloads
  getGatewayDownloadsByUser(demoUserId: string): Promise<GatewayDownload[]>;
  getGatewayDownloadByToken(token: string): Promise<GatewayDownload | undefined>;
  createGatewayDownload(download: InsertGatewayDownload): Promise<GatewayDownload>;
  updateGatewayDownload(id: number, updates: Partial<GatewayDownload>): Promise<GatewayDownload | undefined>;
  
  // ==================== SESSION MANAGEMENT ====================
  createSession(userId: string, sessionId: string, expiresAt: Date, data: any): Promise<any>;
  getSession(sessionId: string): Promise<any | undefined>;
  deleteSession(sessionId: string): Promise<boolean>;
  deleteExpiredSessions(): Promise<number>;
  updateSessionExpiry(sessionId: string, expiresAt: Date): Promise<boolean>;
  
  // ==================== GATEWAY DEBUG ====================
  
  // Gateway Debug Information
  getGatewayDebugInfo(): Promise<any[]>;
  getRecentGatewayActivity(gatewayId?: string): Promise<any[]>;
  
  // ==================== GATEWAY V2 DYNAMIC TABLE MANAGEMENT ====================
  
  // Gateway Schemas
  getActiveGatewaySchema(userId: string): Promise<GatewaySchema | undefined>;
  getGatewaySchemaById(id: number): Promise<GatewaySchema | undefined>;
  getGatewaySchemasByUser(userId: string): Promise<GatewaySchema[]>;
  createGatewaySchema(schema: InsertGatewaySchema): Promise<GatewaySchema>;
  updateGatewaySchema(id: number, updates: Partial<GatewaySchema>): Promise<GatewaySchema | undefined>;
  setActiveGatewaySchema(userId: string, schemaId: number): Promise<boolean>;
  
  // Gateway Tables
  getGatewayTablesBySchema(schemaId: number): Promise<GatewayTable[]>;
  getGatewayTableById(id: number): Promise<GatewayTable | undefined>;
  createGatewayTable(table: InsertGatewayTable): Promise<GatewayTable>;
  updateGatewayTable(id: number, updates: Partial<GatewayTable>): Promise<GatewayTable | undefined>;
  deleteGatewayTable(id: number): Promise<boolean>;
  
  // Gateway Table Status
  getGatewayTableStatus(gatewayId: string, tableName?: string): Promise<GatewayTableStatus[]>;
  getLatestTableStatus(gatewayId: string): Promise<GatewayTableStatus[]>;
  createGatewayTableStatus(status: InsertGatewayTableStatus): Promise<GatewayTableStatus>;
  bulkCreateTableStatus(statuses: InsertGatewayTableStatus[]): Promise<GatewayTableStatus[]>;
  
  // Gateway Commands
  getPendingGatewayCommands(gatewayId: string): Promise<GatewayCommand[]>;
  getGatewayCommandById(id: number): Promise<GatewayCommand | undefined>;
  createGatewayCommand(command: InsertGatewayCommand): Promise<GatewayCommand>;
  updateGatewayCommand(id: number, updates: Partial<GatewayCommand>): Promise<GatewayCommand | undefined>;
  markCommandSent(commandId: number): Promise<boolean>;
  markCommandAcknowledged(commandId: number): Promise<boolean>;
  markCommandCompleted(commandId: number, result?: any): Promise<boolean>;
  markCommandFailed(commandId: number, errorMessage: string): Promise<boolean>;
  getRecentCommands(gatewayId: string, limit?: number): Promise<GatewayCommand[]>;
}

class MemStorage {
  private facilities: Map<number, Facility>;
  private metrics: Map<number, Metric>;
  private alerts: Map<number, Alert>;
  private tenants: Map<number, Tenant>;
  private users: Map<number, User>;
  private plcDevices: Map<number, PlcDevice>;
  private plcTags: Map<number, PlcTag>;
  private plcData: Map<number, PlcData>;
  private dashboardConfigs: Map<number, DashboardConfig>;
  private reportConfigs: Map<number, ReportConfig>;
  private demoUsers: Map<string, DemoUser>;
  private gatewayDownloads: Map<number, GatewayDownload>;
  private currentFacilityId: number;
  private currentMetricId: number;
  private currentAlertId: number;
  private currentTenantId: number;
  private currentUserId: number;
  private currentPlcDeviceId: number;
  private currentPlcTagId: number;
  private currentPlcDataId: number;
  private currentDashboardConfigId: number;
  private currentReportConfigId: number;
  private currentGatewayDownloadId: number;

  constructor() {
    this.facilities = new Map();
    this.metrics = new Map();
    this.alerts = new Map();
    this.tenants = new Map();
    this.users = new Map();
    this.plcDevices = new Map();
    this.plcTags = new Map();
    this.plcData = new Map();
    this.dashboardConfigs = new Map();
    this.reportConfigs = new Map();
    this.demoUsers = new Map();
    this.gatewayDownloads = new Map();
    this.currentFacilityId = 1;
    this.currentMetricId = 1;
    this.currentAlertId = 1;
    this.currentTenantId = 1;
    this.currentUserId = 1;
    this.currentPlcDeviceId = 1;
    this.currentPlcTagId = 1;
    this.currentPlcDataId = 1;
    this.currentDashboardConfigId = 1;
    this.currentReportConfigId = 1;
    this.currentGatewayDownloadId = 1;
    
    this.initializeMockData();
  }

  private initializeMockData() {
    // Add mock facilities with proper structure matching the Facility type
    const mockFacilities = [
      { tenantId: "1", facilityCode: "FAC001", name: "Mumbai Water Treatment Plant", address: "Mumbai Industrial Zone", city: "Mumbai", country: "India" },
      { tenantId: "1", facilityCode: "FAC002", name: "Delhi Water Treatment Plant", address: "Delhi Industrial Zone", city: "Delhi", country: "India" },
    ];

    mockFacilities.forEach(facility => {
      const id = this.currentFacilityId++;
      this.facilities.set(id, {
        id,
        ...facility,
        state: null,
        timezone: null,
        gatewayStatus: null,
        lastGatewayPing: null,
        gatewayVersion: null,
        gatewayOS: null,
        gatewayHardware: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    // Add mock alerts with proper structure matching the Alert type
    const mockAlerts = [
      { facilityId: 1, severity: "critical", type: "system", message: "System offline", isActive: true },
      { facilityId: 2, severity: "high", type: "threshold", message: "High pressure detected", isActive: true },
    ];

    mockAlerts.forEach(alert => {
      const id = this.currentAlertId++;
      this.alerts.set(id, {
        id,
        ...alert,
        plcId: null,
        tagId: null,
        details: null,
        acknowledgedBy: null,
        acknowledgedAt: null,
        resolvedAt: null,
        createdAt: new Date(),
      });
    });
  }

  // Facilities
  async getAllFacilities(): Promise<Facility[]> {
    return Array.from(this.facilities.values());
  }

  async getFacility(id: number): Promise<Facility | undefined> {
    return this.facilities.get(id);
  }

  async createFacility(facility: InsertFacility): Promise<Facility> {
    const id = this.currentFacilityId++;
    const newFacility: Facility = {
      id,
      tenantId: facility.tenantId,
      facilityCode: facility.facilityCode,
      name: facility.name,
      address: facility.address || null,
      city: facility.city || null,
      state: facility.state || null,
      country: facility.country || null,
      timezone: facility.timezone || null,
      gatewayStatus: facility.gatewayStatus || null,
      lastGatewayPing: facility.lastGatewayPing || null,
      gatewayVersion: facility.gatewayVersion || null,
      gatewayOS: facility.gatewayOS || null,
      gatewayHardware: facility.gatewayHardware || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.facilities.set(id, newFacility);
    return newFacility;
  }

  // Metrics
  async getFacilityMetrics(facilityId: number): Promise<Metric[]> {
    return Array.from(this.metrics.values()).filter(m => m.facilityId === facilityId);
  }

  async createMetric(metric: InsertMetric): Promise<Metric> {
    const id = this.currentMetricId++;
    const newMetric: Metric = {
      id,
      facilityId: metric.facilityId || null,
      metricType: metric.metricType,
      value: metric.value,
      unit: metric.unit,
      timestamp: new Date(),
      createdAt: new Date(),
    };
    this.metrics.set(id, newMetric);
    return newMetric;
  }

  // Alerts
  async getAllAlerts(): Promise<Alert[]> {
    return Array.from(this.alerts.values());
  }

  async getFacilityAlerts(facilityId: number): Promise<Alert[]> {
    return Array.from(this.alerts.values()).filter(a => a.facilityId === facilityId);
  }

  async createAlert(alert: InsertAlert): Promise<Alert> {
    const id = this.currentAlertId++;
    const newAlert: Alert = {
      id,
      facilityId: alert.facilityId || null,
      plcId: alert.plcId || null,
      tagId: alert.tagId || null,
      severity: alert.severity,
      type: alert.type,
      message: alert.message,
      details: alert.details || null,
      isActive: alert.isActive ?? true,
      acknowledgedBy: alert.acknowledgedBy || null,
      acknowledgedAt: alert.acknowledgedAt || null,
      resolvedAt: alert.resolvedAt || null,
      createdAt: new Date(),
    };
    this.alerts.set(id, newAlert);
    return newAlert;
  }

  async updateAlert(id: number, updates: Partial<Alert>): Promise<Alert | undefined> {
    const existingAlert = this.alerts.get(id);
    if (!existingAlert) return undefined;
    const updatedAlert = { ...existingAlert, ...updates };
    this.alerts.set(id, updatedAlert);
    return updatedAlert;
  }

  // Tenants
  async getTenantById(id: number): Promise<Tenant | undefined> {
    return this.tenants.get(id);
  }

  async getTenantBySlug(slug: string): Promise<Tenant | undefined> {
    return Array.from(this.tenants.values()).find(t => t.companyCode === slug);
  }

  async createTenant(tenant: InsertTenant): Promise<Tenant> {
    const id = this.currentTenantId++;
    const newTenant: Tenant = {
      id,
      companyName: tenant.companyName,
      companyCode: tenant.companyCode,
      email: tenant.email,
      industry: tenant.industry || null,
      country: tenant.country || null,
      demoUserId: tenant.demoUserId || null,
      licenseType: tenant.licenseType || 'trial',
      licenseExpiresAt: tenant.licenseExpiresAt || null,
      status: tenant.status || 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.tenants.set(id, newTenant);
    return newTenant;
  }

  async updateTenant(id: number, updates: Partial<Tenant>): Promise<Tenant | undefined> {
    const existing = this.tenants.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.tenants.set(id, updated);
    return updated;
  }

  // Users
  async getUserById(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.email === email);
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const newUser: User = {
      id,
      tenantId: user.tenantId || null,
      email: user.email || null,
      googleId: user.googleId || null,
      passwordHash: user.passwordHash || null,
      firstName: user.firstName || null,
      lastName: user.lastName || null,
      profileImageUrl: user.profileImageUrl || null,
      role: user.role || 'operator',
      isActive: user.isActive ?? true,
      lastLogin: user.lastLogin || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(id, newUser);
    return newUser;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const existing = this.users.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.users.set(id, updated);
    return updated;
  }

  async getUsersByTenant(tenantId: string): Promise<User[]> {
    return Array.from(this.users.values()).filter(u => u.tenantId === tenantId);
  }

  // PLC Devices
  async getPlcDeviceById(id: number): Promise<PlcDevice | undefined> {
    return this.plcDevices.get(id);
  }

  async getPlcDevicesByTenant(tenantId: string): Promise<PlcDevice[]> {
    return Array.from(this.plcDevices.values()).filter(d => {
      const facility = this.facilities.get(d.facilityId || 0);
      return facility?.tenantId === tenantId;
    });
  }

  async createPlcDevice(config: InsertPlcDevice): Promise<PlcDevice> {
    const id = this.currentPlcDeviceId++;
    const newDevice: PlcDevice = {
      id,
      userId: config.userId || null,
      facilityId: config.facilityId || null,
      gatewayId: config.gatewayId || null,
      name: config.name,
      brand: config.brand,
      model: config.model,
      protocol: config.protocol,
      ipAddress: config.ipAddress,
      port: config.port,
      rackNumber: config.rackNumber || null,
      slotNumber: config.slotNumber || null,
      nodeId: config.nodeId || null,
      unitId: config.unitId || null,
      status: config.status || 'configured',
      lastSeen: config.lastSeen || null,
      connectionSettings: config.connectionSettings || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.plcDevices.set(id, newDevice);
    return newDevice;
  }

  async updatePlcDevice(id: number, updates: Partial<PlcDevice>): Promise<PlcDevice | undefined> {
    const existing = this.plcDevices.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.plcDevices.set(id, updated);
    return updated;
  }

  async deletePlcDevice(id: number): Promise<boolean> {
    return this.plcDevices.delete(id);
  }

  async getAllPlcDevices(userId: string): Promise<PlcDevice[]> {
    return Array.from(this.plcDevices.values()).filter(d => d.userId === userId);
  }

  async getPlcDevice(id: number): Promise<PlcDevice | undefined> {
    return this.plcDevices.get(id);
  }

  async upsertPlcDevice(device: Partial<PlcDevice> & { userId: string }): Promise<PlcDevice> {
    const existing = Array.from(this.plcDevices.values()).find(d => 
      d.userId === device.userId && d.name === device.name
    );
    
    if (existing) {
      const updated = { ...existing, ...device, updatedAt: new Date() };
      this.plcDevices.set(existing.id, updated);
      return updated;
    } else {
      return await this.createPlcDevice(device as InsertPlcDevice);
    }
  }

  // PLC Tags
  async getPlcTagById(id: number): Promise<PlcTag | undefined> {
    return this.plcTags.get(id);
  }

  async getPlcTagsByTenant(tenantId: string, configId?: number): Promise<PlcTag[]> {
    return Array.from(this.plcTags.values()).filter(tag => {
      const device = this.plcDevices.get(tag.plcId);
      if (!device) return false;
      const facility = this.facilities.get(device.facilityId || 0);
      return facility?.tenantId === tenantId && (!configId || device.id === configId);
    });
  }

  async getPlcTagsByUser(userId: string, plcId?: string): Promise<PlcTag[]> {
    return Array.from(this.plcTags.values()).filter(tag => {
      const device = this.plcDevices.get(tag.plcId);
      if (!device) return false;
      return device.userId === userId && (plcId ? device.id === parseInt(plcId) : true);
    });
  }

  async getPlcTagsByPlcId(plcId: number): Promise<PlcTag[]> {
    return Array.from(this.plcTags.values()).filter(tag => tag.plcId === plcId);
  }

  async createPlcTag(tag: InsertPlcTag): Promise<PlcTag> {
    const id = this.currentPlcTagId++;
    const newTag: PlcTag = {
      id,
      plcId: tag.plcId,
      name: tag.name, // tag_name column in db
      description: tag.description || null,
      address: tag.address,
      dataType: tag.dataType,
      unit: tag.unit || null,
      scaleFactor: tag.scaleFactor || null,
      offset: tag.offset || null,
      minValue: tag.minValue || null,
      maxValue: tag.maxValue || null,
      alarmLow: tag.alarmLow || null,
      alarmHigh: tag.alarmHigh || null,
      enabled: tag.enabled ?? true, // is_active column in db
      scanRate: tag.scanRate ?? 1000, // read_interval column in db
      lastValue: tag.lastValue || null,
      lastReadTime: tag.lastReadTime || null,
      quality: tag.quality || null,
      createdAt: new Date(),
    };
    this.plcTags.set(id, newTag);
    return newTag;
  }

  async updatePlcTag(id: number, updates: Partial<PlcTag>): Promise<PlcTag | undefined> {
    const existing = this.plcTags.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    this.plcTags.set(id, updated);
    return updated;
  }

  async deletePlcTag(id: number): Promise<boolean> {
    return this.plcTags.delete(id);
  }

  // PLC Data
  async createPlcData(data: InsertPlcData): Promise<PlcData> {
    const id = this.currentPlcDataId++;
    const newData: PlcData = {
      id,
      tagId: data.tagId,
      value: data.value,
      quality: data.quality || 'good',
      timestamp: new Date(),
    };
    this.plcData.set(id, newData);
    return newData;
  }

  async getLatestPlcData(tenantId: string, tagIds?: number[]): Promise<PlcData[]> {
    const data = Array.from(this.plcData.values());
    return tagIds ? data.filter(d => tagIds.includes(d.tagId)) : data;
  }

  async getLatestPlcDataByUser(userId: string, tagIds?: number[]): Promise<PlcData[]> {
    // For demo users, return filtered data based on tagIds
    const data = Array.from(this.plcData.values());
    return tagIds ? data.filter(d => tagIds.includes(d.tagId)) : data;
  }

  async getPlcDataHistory(tagId: number, from?: Date, to?: Date, limit?: number): Promise<PlcData[]> {
    let data = Array.from(this.plcData.values()).filter(d => d.tagId === tagId);
    if (from) data = data.filter(d => d.timestamp && d.timestamp >= from);
    if (to) data = data.filter(d => d.timestamp && d.timestamp <= to);
    data.sort((a, b) => {
      if (!a.timestamp && !b.timestamp) return 0;
      if (!a.timestamp) return 1;
      if (!b.timestamp) return -1;
      return b.timestamp.getTime() - a.timestamp.getTime();
    });
    return limit ? data.slice(0, limit) : data;
  }

  // Dashboard Configurations
  async getDashboardConfigsByUser(userId: number): Promise<DashboardConfig[]> {
    return Array.from(this.dashboardConfigs.values()).filter(c => c.userId === userId);
  }

  async getDashboardConfigsByTenant(tenantId: string): Promise<DashboardConfig[]> {
    return Array.from(this.dashboardConfigs.values()).filter(c => {
      const user = this.users.get(c.userId);
      return user?.tenantId === tenantId;
    });
  }

  async createDashboardConfig(config: InsertDashboardConfig): Promise<DashboardConfig> {
    const id = this.currentDashboardConfigId++;
    const newConfig: DashboardConfig = {
      id,
      userId: config.userId,
      name: config.name,
      layout: config.layout,
      widgets: config.widgets,
      isDefault: config.isDefault ?? false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.dashboardConfigs.set(id, newConfig);
    return newConfig;
  }

  async updateDashboardConfig(id: number, updates: Partial<DashboardConfig>): Promise<DashboardConfig | undefined> {
    const existing = this.dashboardConfigs.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.dashboardConfigs.set(id, updated);
    return updated;
  }

  async deleteDashboardConfig(id: number): Promise<boolean> {
    return this.dashboardConfigs.delete(id);
  }

  // Report Configs
  async getReportConfigsByTenant(tenantId: string): Promise<ReportConfig[]> {
    return Array.from(this.reportConfigs.values()).filter(c => c.tenantId === tenantId);
  }

  async createReportConfig(template: InsertReportConfig): Promise<ReportConfig> {
    const id = this.currentReportConfigId++;
    const newConfig: ReportConfig = {
      id,
      tenantId: template.tenantId,
      name: template.name,
      reportType: template.reportType,
      facilityIds: template.facilityIds,
      tagIds: template.tagIds || null,
      schedule: template.schedule || null,
      emailRecipients: template.emailRecipients || null,
      format: template.format || 'pdf',
      isActive: template.isActive ?? true,
      lastGenerated: template.lastGenerated || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.reportConfigs.set(id, newConfig);
    return newConfig;
  }

  async updateReportConfig(id: number, updates: Partial<ReportConfig>): Promise<ReportConfig | undefined> {
    const existing = this.reportConfigs.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.reportConfigs.set(id, updated);
    return updated;
  }

  async deleteReportConfig(id: number): Promise<boolean> {
    return this.reportConfigs.delete(id);
  }

  // Demo Users
  async getDemoUser(id: string): Promise<DemoUser | undefined> {
    return this.demoUsers.get(id);
  }

  async getDemoUserByEmail(email: string): Promise<DemoUser | undefined> {
    return Array.from(this.demoUsers.values()).find(u => u.email === email);
  }

  async getDemoUserByDemoKey(demoKey: string): Promise<DemoUser | undefined> {
    return Array.from(this.demoUsers.values()).find(u => u.demoKey === demoKey);
  }

  async upsertDemoUser(user: UpsertDemoUser): Promise<DemoUser> {
    const existing = user.id ? this.demoUsers.get(user.id) : undefined;
    
    if (existing) {
      const updated = { ...existing, ...user, updatedAt: new Date() };
      this.demoUsers.set(existing.id, updated);
      return updated;
    } else {
      const id = user.id || crypto.randomUUID();
      const newUser: DemoUser = {
        id,
        email: user.email || null,
        password: user.password || null,
        firstName: user.firstName || null,
        lastName: user.lastName || null,
        profileImageUrl: user.profileImageUrl || null,
        companyName: user.companyName || null,
        industry: user.industry || null,
        country: user.country || null,
        demoStartDate: user.demoStartDate || new Date(),
        demoEndDate: user.demoEndDate || null,
        demoKey: user.demoKey || null,
        status: user.status || 'active',
        gatewayDownloaded: user.gatewayDownloaded ?? false,
        gatewayDownloadedAt: user.gatewayDownloadedAt || null,
        isActive: user.isActive ?? true,
        accessExpiresAt: user.accessExpiresAt || null,
        accessGrantedDays: user.accessGrantedDays || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.demoUsers.set(id, newUser);
      return newUser;
    }
  }

  async updateDemoUser(id: string, updates: Partial<DemoUser>): Promise<DemoUser | undefined> {
    const existing = this.demoUsers.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.demoUsers.set(id, updated);
    return updated;
  }

  // Access Management Methods
  async updateUserAccess(userId: string, expiresAt: Date | null, grantedDays: number | null): Promise<DemoUser | undefined> {
    const existing = this.demoUsers.get(userId);
    if (!existing) return undefined;
    
    const updated = {
      ...existing,
      accessExpiresAt: expiresAt,
      accessGrantedDays: grantedDays,
      isActive: expiresAt ? expiresAt > new Date() : true,
      updatedAt: new Date()
    };
    
    this.demoUsers.set(userId, updated);
    return updated;
  }

  async getUsersWithAccessInfo(): Promise<DemoUser[]> {
    return Array.from(this.demoUsers.values()).filter(user => 
      user.isActive || (user.accessExpiresAt && user.accessExpiresAt > new Date())
    );
  }

  // Gateway Downloads
  async getGatewayDownloadsByUser(demoUserId: string): Promise<GatewayDownload[]> {
    return Array.from(this.gatewayDownloads.values()).filter(d => d.demoUserId === demoUserId);
  }

  async getGatewayDownloadByToken(token: string): Promise<GatewayDownload | undefined> {
    return Array.from(this.gatewayDownloads.values()).find(d => d.downloadToken === token);
  }

  async createGatewayDownload(download: InsertGatewayDownload): Promise<GatewayDownload> {
    const id = this.currentGatewayDownloadId++;
    const newDownload: GatewayDownload = {
      id,
      demoUserId: download.demoUserId,
      downloadToken: download.downloadToken,
      ipAddress: download.ipAddress || null,
      userAgent: download.userAgent || null,
      osType: download.osType || null,
      downloadedAt: new Date(),
      gatewayActivated: download.gatewayActivated ?? false,
      gatewayActivatedAt: download.gatewayActivatedAt || null,
    };
    this.gatewayDownloads.set(id, newDownload);
    return newDownload;
  }

  async updateGatewayDownload(id: number, updates: Partial<GatewayDownload>): Promise<GatewayDownload | undefined> {
    const existing = this.gatewayDownloads.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    this.gatewayDownloads.set(id, updated);
    return updated;
  }

  // ==================== SESSION MANAGEMENT ====================
  private sessions: Map<string, any> = new Map();
  
  async createSession(userId: string, sessionId: string, expiresAt: Date, data: any): Promise<any> {
    const session = {
      id: this.sessions.size + 1,
      userId,
      sessionId,
      expiresAt,
      createdAt: new Date(),
      data: data || {}
    };
    this.sessions.set(sessionId, session);
    return session;
  }

  async getSession(sessionId: string): Promise<any | undefined> {
    return this.sessions.get(sessionId);
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    return this.sessions.delete(sessionId);
  }

  async deleteExpiredSessions(): Promise<number> {
    const now = new Date();
    let deleted = 0;
    for (const [sessionId, session] of Array.from(this.sessions.entries())) {
      if (session.expiresAt < now) {
        this.sessions.delete(sessionId);
        deleted++;
      }
    }
    return deleted;
  }

  async updateSessionExpiry(sessionId: string, expiresAt: Date): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.expiresAt = expiresAt;
      return true;
    }
    return false;
  }

  // ==================== GATEWAY V2 DYNAMIC TABLE MANAGEMENT ====================
  private gatewaySchemas: Map<number, GatewaySchema> = new Map();
  private gatewayTables: Map<number, GatewayTable> = new Map();
  private gatewayTableStatus: Map<number, GatewayTableStatus> = new Map();
  private gatewayCommands: Map<number, GatewayCommand> = new Map();
  private currentGatewaySchemaId: number = 1;
  private currentGatewayTableId: number = 1;
  private currentGatewayTableStatusId: number = 1;
  private currentGatewayCommandId: number = 1;
  
  // Gateway Schemas
  async getActiveGatewaySchema(userId: string): Promise<GatewaySchema | undefined> {
    return Array.from(this.gatewaySchemas.values()).find(s => s.userId === userId && s.isActive);
  }
  
  async getGatewaySchemaById(id: number): Promise<GatewaySchema | undefined> {
    return this.gatewaySchemas.get(id);
  }
  
  async getGatewaySchemasByUser(userId: string): Promise<GatewaySchema[]> {
    return Array.from(this.gatewaySchemas.values()).filter(s => s.userId === userId);
  }
  
  async createGatewaySchema(schema: InsertGatewaySchema): Promise<GatewaySchema> {
    const id = this.currentGatewaySchemaId++;
    const newSchema: GatewaySchema = {
      id,
      userId: schema.userId,
      gatewayId: schema.gatewayId || null,
      version: schema.version,
      mode: schema.mode || 'single_table',
      isActive: schema.isActive ?? true,
      configuration: schema.configuration,
      tagMapping: schema.tagMapping || null,
      retentionPolicies: schema.retentionPolicies || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.gatewaySchemas.set(id, newSchema);
    return newSchema;
  }
  
  async updateGatewaySchema(id: number, updates: Partial<GatewaySchema>): Promise<GatewaySchema | undefined> {
    const existing = this.gatewaySchemas.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.gatewaySchemas.set(id, updated);
    return updated;
  }
  
  async setActiveGatewaySchema(userId: string, schemaId: number): Promise<boolean> {
    // Deactivate all other schemas for this user
    for (const schema of Array.from(this.gatewaySchemas.values())) {
      if (schema.userId === userId && schema.id !== schemaId) {
        schema.isActive = false;
      }
    }
    // Activate the specified schema
    const schema = this.gatewaySchemas.get(schemaId);
    if (schema && schema.userId === userId) {
      schema.isActive = true;
      return true;
    }
    return false;
  }
  
  // Gateway Tables
  async getGatewayTablesBySchema(schemaId: number): Promise<GatewayTable[]> {
    return Array.from(this.gatewayTables.values()).filter(t => t.schemaId === schemaId);
  }
  
  async getGatewayTableById(id: number): Promise<GatewayTable | undefined> {
    return this.gatewayTables.get(id);
  }
  
  async createGatewayTable(table: InsertGatewayTable): Promise<GatewayTable> {
    const id = this.currentGatewayTableId++;
    const newTable: GatewayTable = {
      id,
      schemaId: table.schemaId,
      tableName: table.tableName,
      tableType: table.tableType,
      plcId: table.plcId || null,
      columns: table.columns,
      indices: table.indices || null,
      retentionDays: table.retentionDays || 30,
      compressionEnabled: table.compressionEnabled ?? false,
      partitioningStrategy: table.partitioningStrategy || null,
      isActive: table.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.gatewayTables.set(id, newTable);
    return newTable;
  }
  
  async updateGatewayTable(id: number, updates: Partial<GatewayTable>): Promise<GatewayTable | undefined> {
    const existing = this.gatewayTables.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.gatewayTables.set(id, updated);
    return updated;
  }
  
  async deleteGatewayTable(id: number): Promise<boolean> {
    return this.gatewayTables.delete(id);
  }
  
  // Gateway Table Status
  async getGatewayTableStatus(gatewayId: string, tableName?: string): Promise<GatewayTableStatus[]> {
    return Array.from(this.gatewayTableStatus.values()).filter(s => 
      s.gatewayId === gatewayId && (!tableName || s.tableName === tableName)
    );
  }
  
  async getLatestTableStatus(gatewayId: string): Promise<GatewayTableStatus[]> {
    const statusByTable = new Map<string, GatewayTableStatus>();
    for (const status of Array.from(this.gatewayTableStatus.values())) {
      if (status.gatewayId === gatewayId) {
        const existing = statusByTable.get(status.tableName);
        if (!existing || status.reportedAt! > existing.reportedAt!) {
          statusByTable.set(status.tableName, status);
        }
      }
    }
    return Array.from(statusByTable.values());
  }
  
  async createGatewayTableStatus(status: InsertGatewayTableStatus): Promise<GatewayTableStatus> {
    const id = this.currentGatewayTableStatusId++;
    const newStatus: GatewayTableStatus = {
      id,
      gatewayId: status.gatewayId,
      tableName: status.tableName,
      rowCount: status.rowCount,
      sizeBytes: status.sizeBytes || null,
      oldestRecord: status.oldestRecord || null,
      newestRecord: status.newestRecord || null,
      lastVacuum: status.lastVacuum || null,
      lastCleanup: status.lastCleanup || null,
      fragmentation: status.fragmentation || null,
      indexCount: status.indexCount || null,
      errorCount: status.errorCount ?? 0,
      lastError: status.lastError || null,
      reportedAt: new Date(),
    };
    this.gatewayTableStatus.set(id, newStatus);
    return newStatus;
  }
  
  async bulkCreateTableStatus(statuses: InsertGatewayTableStatus[]): Promise<GatewayTableStatus[]> {
    const results: GatewayTableStatus[] = [];
    for (const status of statuses) {
      results.push(await this.createGatewayTableStatus(status));
    }
    return results;
  }
  
  // Gateway Commands
  async getPendingGatewayCommands(gatewayId: string): Promise<GatewayCommand[]> {
    return Array.from(this.gatewayCommands.values()).filter(c => 
      c.gatewayId === gatewayId && c.status === 'pending'
    ).sort((a, b) => (a.priority ?? 5) - (b.priority ?? 5)); // Sort by priority (lower number = higher priority)
  }
  
  async getGatewayCommandById(id: number): Promise<GatewayCommand | undefined> {
    return this.gatewayCommands.get(id);
  }
  
  async createGatewayCommand(command: InsertGatewayCommand): Promise<GatewayCommand> {
    const id = this.currentGatewayCommandId++;
    const newCommand: GatewayCommand = {
      id,
      gatewayId: command.gatewayId,
      commandType: command.commandType,
      commandData: command.commandData,
      status: command.status || 'pending',
      priority: command.priority ?? 5,
      retryCount: command.retryCount ?? 0,
      maxRetries: command.maxRetries ?? 3,
      sentAt: command.sentAt || null,
      acknowledgedAt: command.acknowledgedAt || null,
      completedAt: command.completedAt || null,
      failedAt: command.failedAt || null,
      errorMessage: command.errorMessage || null,
      result: command.result || null,
      createdAt: new Date(),
      expiresAt: command.expiresAt || null,
    };
    this.gatewayCommands.set(id, newCommand);
    return newCommand;
  }
  
  async updateGatewayCommand(id: number, updates: Partial<GatewayCommand>): Promise<GatewayCommand | undefined> {
    const existing = this.gatewayCommands.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    this.gatewayCommands.set(id, updated);
    return updated;
  }
  
  async markCommandSent(commandId: number): Promise<boolean> {
    const command = this.gatewayCommands.get(commandId);
    if (!command) return false;
    command.status = 'sent';
    command.sentAt = new Date();
    return true;
  }
  
  async markCommandAcknowledged(commandId: number): Promise<boolean> {
    const command = this.gatewayCommands.get(commandId);
    if (!command) return false;
    command.status = 'acknowledged';
    command.acknowledgedAt = new Date();
    return true;
  }
  
  async markCommandCompleted(commandId: number, result?: any): Promise<boolean> {
    const command = this.gatewayCommands.get(commandId);
    if (!command) return false;
    command.status = 'completed';
    command.completedAt = new Date();
    if (result) command.result = result;
    return true;
  }
  
  async markCommandFailed(commandId: number, errorMessage: string): Promise<boolean> {
    const command = this.gatewayCommands.get(commandId);
    if (!command) return false;
    command.status = 'failed';
    command.failedAt = new Date();
    command.errorMessage = errorMessage;
    return true;
  }
  
  async getRecentCommands(gatewayId: string, limit?: number): Promise<GatewayCommand[]> {
    const commands = Array.from(this.gatewayCommands.values())
      .filter(c => c.gatewayId === gatewayId)
      .sort((a, b) => {
        const aTime = a.createdAt?.getTime() ?? 0;
        const bTime = b.createdAt?.getTime() ?? 0;
        return bTime - aTime;
      });
    return limit ? commands.slice(0, limit) : commands;
  }
  
  // ==================== GATEWAY DEBUG METHODS ====================
  
  async getGatewayDebugInfo(): Promise<any[]> {
    // In memory storage, return mock debug info
    return [
      {
        id: 'gw_test_001',
        userId: 'demo-user-1',
        machineId: 'MACHINE-TEST-123',
        lastIp: '192.168.1.100',
        lastHeartbeat: new Date(Date.now() - 5000).toISOString(), // 5 seconds ago
        tokenExpiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
        os: 'Windows',
        osVersion: '10',
        cpu: 'Intel Core i7',
        memory: '16GB'
      }
    ];
  }
  
  async getRecentGatewayActivity(gatewayId?: string): Promise<any[]> {
    // In memory storage, return empty array
    return [];
  }
}

// Use DrizzleStorage for PostgreSQL database integration
export const storage = new DrizzleStorage();