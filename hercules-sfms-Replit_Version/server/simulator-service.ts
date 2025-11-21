import { db } from "./db";
import { plcTags, plcDevices, gatewayCodes } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { generateGatewayToken } from "./gateway-service";

interface SimulatorState {
  isRunning: boolean;
  intervalId: NodeJS.Timeout | null;
  lastUpdate: Date | null;
  gatewayToken: string | null;
  gatewayId: string | null;
}

class PLCDataSimulator {
  private state: SimulatorState = {
    isRunning: false,
    intervalId: null,
    lastUpdate: null,
    gatewayToken: null,
    gatewayId: null
  };

  private currentUserId: string | null = null;
  private readonly TEST_USER_ID = "104574281984742902977";
  private readonly UPDATE_INTERVAL_MS = 2000; // 2 seconds
  private readonly SIMULATOR_GATEWAY_ID = "simulator-gateway-001";

  constructor() {
    console.log("[SIMULATOR] PLC Data Simulator initialized");
  }

  /**
   * Initialize or retrieve gateway token for the simulator
   */
  private async initializeGatewayToken(): Promise<boolean> {
    try {
      console.log("[SIMULATOR] Initializing gateway token for simulator...");
      
      // Check if we already have a gateway code for the simulator
      const existingGateway = await db
        .select()
        .from(gatewayCodes)
        .where(
          and(
            eq(gatewayCodes.userId, this.TEST_USER_ID),
            eq(gatewayCodes.gatewayId, this.SIMULATOR_GATEWAY_ID)
          )
        )
        .limit(1);
      
      if (existingGateway.length > 0) {
        // Generate a new token for the existing gateway
        this.state.gatewayToken = generateGatewayToken(this.SIMULATOR_GATEWAY_ID, this.TEST_USER_ID);
        this.state.gatewayId = this.SIMULATOR_GATEWAY_ID;
        console.log("[SIMULATOR] Using existing gateway token for simulator");
        return true;
      }
      
      // Create a new gateway code for the simulator
      const code = `SIM-${Date.now().toString(36).toUpperCase()}`;
      const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year expiry for simulator
      
      await db.insert(gatewayCodes).values({
        code,
        userId: this.TEST_USER_ID,
        gatewayId: this.SIMULATOR_GATEWAY_ID,
        status: 'active',
        expiresAt,
        activatedAt: new Date(),
        gatewayInfo: {
          name: 'PLC Data Simulator',
          type: 'simulator',
          version: '1.0.0'
        },
        notes: 'Auto-generated gateway for PLC data simulation'
      });
      
      // Generate token
      this.state.gatewayToken = generateGatewayToken(this.SIMULATOR_GATEWAY_ID, this.TEST_USER_ID);
      this.state.gatewayId = this.SIMULATOR_GATEWAY_ID;
      
      console.log("[SIMULATOR] Created new gateway token for simulator");
      return true;
      
    } catch (error) {
      console.error("[SIMULATOR] Failed to initialize gateway token:", error);
      return false;
    }
  }

  /**
   * Initialize or retrieve gateway token for the simulator for a specific user
   */
  private async initializeGatewayTokenForUser(userId: string): Promise<boolean> {
    try {
      console.log("[SIMULATOR] Initializing gateway token for user:", userId);
      
      const gatewayIdForUser = `simulator-gateway-${userId}`;
      
      // Check if we already have a gateway code for this user's simulator
      const existingGateway = await db
        .select()
        .from(gatewayCodes)
        .where(
          and(
            eq(gatewayCodes.userId, userId),
            eq(gatewayCodes.gatewayId, gatewayIdForUser)
          )
        )
        .limit(1);
      
      if (existingGateway.length > 0) {
        // Generate a new token for the existing gateway
        this.state.gatewayToken = generateGatewayToken(gatewayIdForUser, userId);
        this.state.gatewayId = gatewayIdForUser;
        this.currentUserId = userId;
        console.log("[SIMULATOR] Using existing gateway token for user simulator");
        return true;
      }
      
      // Create a new gateway code for the user's simulator
      const code = `SIM-${Date.now().toString(36).toUpperCase()}`;
      const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year expiry for simulator
      
      await db.insert(gatewayCodes).values({
        code,
        userId: userId,
        gatewayId: gatewayIdForUser,
        status: 'active',
        expiresAt,
        activatedAt: new Date(),
        gatewayInfo: {
          name: 'PLC Data Simulator',
          type: 'simulator',
          version: '1.0.0'
        },
        notes: 'Auto-generated gateway for PLC data simulation'
      });
      
      // Generate token
      this.state.gatewayToken = generateGatewayToken(gatewayIdForUser, userId);
      this.state.gatewayId = gatewayIdForUser;
      this.currentUserId = userId;
      
      console.log("[SIMULATOR] Created new gateway token for user simulator");
      return true;
      
    } catch (error) {
      console.error("[SIMULATOR] Failed to initialize gateway token for user:", error);
      return false;
    }
  }

  /**
   * Start the simulator
   */
  async start(): Promise<{ success: boolean; message: string }> {
    if (this.state.isRunning) {
      return { success: false, message: "Simulator is already running" };
    }

    console.log("[SIMULATOR] Starting PLC data simulation for user:", this.TEST_USER_ID);
    
    // Initialize gateway token
    const tokenInitialized = await this.initializeGatewayToken();
    if (!tokenInitialized) {
      return { 
        success: false, 
        message: "Failed to initialize gateway token for simulator" 
      };
    }
    
    this.state.isRunning = true;
    this.state.lastUpdate = new Date();

    // Start the simulation interval
    this.state.intervalId = setInterval(async () => {
      await this.syncTagValues();
    }, this.UPDATE_INTERVAL_MS);

    // Run the first update immediately
    await this.syncTagValues();

    return { 
      success: true, 
      message: `Simulator started. Syncing data via gateway endpoint every ${this.UPDATE_INTERVAL_MS / 1000} seconds` 
    };
  }

  /**
   * Start the simulator for a specific user
   */
  async startForUser(userId: string): Promise<{ success: boolean; message: string }> {
    if (this.state.isRunning) {
      return { success: false, message: "Simulator is already running" };
    }

    console.log("[SIMULATOR] Starting PLC data simulation for user:", userId);
    
    // Initialize gateway token for the specific user
    const tokenInitialized = await this.initializeGatewayTokenForUser(userId);
    if (!tokenInitialized) {
      return { 
        success: false, 
        message: "Failed to initialize gateway token for simulator" 
      };
    }
    
    this.state.isRunning = true;
    this.state.lastUpdate = new Date();

    // Start the simulation interval
    this.state.intervalId = setInterval(async () => {
      await this.syncTagValuesForUser(userId);
    }, this.UPDATE_INTERVAL_MS);

    // Run the first update immediately
    await this.syncTagValuesForUser(userId);

    return { 
      success: true, 
      message: `Simulator started. Syncing data via gateway endpoint every ${this.UPDATE_INTERVAL_MS / 1000} seconds` 
    };
  }

  /**
   * Stop the simulator
   */
  stop(): { success: boolean; message: string } {
    if (!this.state.isRunning) {
      return { success: false, message: "Simulator is not running" };
    }

    console.log("[SIMULATOR] Stopping PLC data simulation");

    if (this.state.intervalId) {
      clearInterval(this.state.intervalId);
      this.state.intervalId = null;
    }

    this.state.isRunning = false;

    return { 
      success: true, 
      message: "Simulator stopped" 
    };
  }

  /**
   * Get the current simulator status
   */
  getStatus(): { isRunning: boolean; lastUpdate: Date | null; gatewayId: string | null } {
    return {
      isRunning: this.state.isRunning,
      lastUpdate: this.state.lastUpdate,
      gatewayId: this.state.gatewayId
    };
  }

  /**
   * Sync tag values via gateway endpoint
   */
  private async syncTagValues(): Promise<void> {
    try {
      if (!this.state.gatewayToken) {
        console.error("[SIMULATOR] No gateway token available");
        return;
      }

      console.log(`[SIMULATOR] Syncing PLC tag values at ${new Date().toISOString()}`);

      // Get all PLC tags for the test user
      const tags = await db
        .select()
        .from(plcTags)
        .innerJoin(plcDevices, eq(plcTags.plcId, plcDevices.id))
        .where(eq(plcDevices.userId, this.TEST_USER_ID));

      if (tags.length === 0) {
        console.log("[SIMULATOR] No tags found for test user:", this.TEST_USER_ID);
        return;
      }

      console.log(`[SIMULATOR] Found ${tags.length} tags to sync`);

      // Prepare data in gateway sync format
      const syncData: any[] = [];
      const timestamp = new Date().toISOString();

      for (const tagRow of tags) {
        const tag = tagRow.plc_tags;
        const newValue = this.generateNewValue(tag);
        
        // Add to sync data array
        syncData.push({
          tagId: tag.name, // Use tag name as the gateway sends tag names
          value: newValue,
          quality: 192, // 192 = good quality
          timestamp: timestamp
        });

        // Also update the tag in the database for local tracking
        await db
          .update(plcTags)
          .set({
            lastValue: newValue,
            lastReadTime: new Date(),
            quality: "good"
          })
          .where(eq(plcTags.id, tag.id));

        console.log(`[SIMULATOR] Prepared tag "${tag.name}" with value: ${newValue}`);
      }

      // Call the gateway sync endpoint
      console.log(`[SIMULATOR] Calling gateway sync endpoint with ${syncData.length} data points`);
      
      try {
        // Make internal API call to sync endpoint
        const response = await fetch('http://localhost:5000/api/gateway/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.state.gatewayToken}`,
            'X-Gateway-ID': this.state.gatewayId!
          },
          body: JSON.stringify({
            data: syncData,
            batchId: `sim_${Date.now()}`
          })
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`[SIMULATOR] ✅ Gateway sync successful:`, result);
          this.state.lastUpdate = new Date();
        } else {
          const error = await response.text();
          console.error(`[SIMULATOR] ❌ Gateway sync failed (${response.status}):`, error);
        }
      } catch (fetchError) {
        console.error("[SIMULATOR] Failed to call gateway sync endpoint:", fetchError);
      }

    } catch (error) {
      console.error("[SIMULATOR] Error syncing tag values:", error);
    }
  }

  /**
   * Sync tag values via gateway endpoint for a specific user
   */
  private async syncTagValuesForUser(userId: string): Promise<void> {
    try {
      if (!this.state.gatewayToken) {
        console.error("[SIMULATOR] No gateway token available");
        return;
      }

      console.log(`[SIMULATOR] Syncing PLC tag values for user ${userId} at ${new Date().toISOString()}`);

      // Get all PLC tags for the specific user
      const tags = await db
        .select()
        .from(plcTags)
        .innerJoin(plcDevices, eq(plcTags.plcId, plcDevices.id))
        .where(eq(plcDevices.userId, userId));

      if (tags.length === 0) {
        console.log("[SIMULATOR] No tags found for user:", userId);
        return;
      }

      console.log(`[SIMULATOR] Found ${tags.length} tags to sync`);

      // Prepare data in gateway sync format
      const syncData: any[] = [];
      const timestamp = new Date().toISOString();

      for (const tagRow of tags) {
        const tag = tagRow.plc_tags;
        const newValue = this.generateNewValue(tag);
        
        // Add to sync data array
        syncData.push({
          tagId: tag.name, // Use tag name as the gateway sends tag names
          value: newValue,
          quality: 192, // 192 = good quality
          timestamp: timestamp
        });

        // Also update the tag in the database for local tracking
        await db
          .update(plcTags)
          .set({
            lastValue: newValue,
            lastReadTime: new Date(),
            quality: "good"
          })
          .where(eq(plcTags.id, tag.id));

        console.log(`[SIMULATOR] Prepared tag "${tag.name}" with value: ${newValue}`);
      }

      // Call the gateway sync endpoint
      console.log(`[SIMULATOR] Calling gateway sync endpoint with ${syncData.length} data points`);
      
      try {
        // Make internal API call to sync endpoint
        const response = await fetch('http://localhost:5000/api/gateway/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.state.gatewayToken}`,
            'X-Gateway-ID': this.state.gatewayId!
          },
          body: JSON.stringify({
            data: syncData,
            batchId: `sim_${Date.now()}`
          })
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`[SIMULATOR] ✅ Gateway sync successful:`, result);
          this.state.lastUpdate = new Date();
        } else {
          const error = await response.text();
          console.error(`[SIMULATOR] ❌ Gateway sync failed (${response.status}):`, error);
        }
      } catch (fetchError) {
        console.error("[SIMULATOR] Failed to call gateway sync endpoint:", fetchError);
      }

    } catch (error) {
      console.error("[SIMULATOR] Error syncing tag values:", error);
    }
  }

  /**
   * Generate a new value based on the tag's data type and current value
   */
  private generateNewValue(tag: any): number {
    const dataType = tag.dataType?.toLowerCase() || 'float';
    const currentValue = tag.lastValue || 0;

    // Handle boolean types
    if (dataType === 'bool' || dataType === 'boolean') {
      // 30% chance to toggle boolean value
      if (Math.random() < 0.3) {
        return currentValue === 0 ? 1 : 0;
      }
      return currentValue;
    }

    // Handle numeric types (int16, int32, float, etc.)
    if (dataType.includes('int') || dataType === 'float' || dataType === 'real' || dataType === 'double') {
      // Generate a random variation between -5% and +5%
      const variation = (Math.random() - 0.5) * 0.1; // -0.05 to +0.05
      let newValue = currentValue * (1 + variation);

      // If current value is 0, generate a small random value
      if (currentValue === 0) {
        newValue = Math.random() * 10;
      }

      // Apply bounds if specified
      if (tag.minValue !== null && newValue < tag.minValue) {
        newValue = tag.minValue;
      }
      if (tag.maxValue !== null && newValue > tag.maxValue) {
        newValue = tag.maxValue;
      }

      // Round integers
      if (dataType.includes('int')) {
        newValue = Math.round(newValue);
      }

      return newValue;
    }

    // Default: return current value unchanged
    return currentValue;
  }
}

// Export a singleton instance
export const plcDataSimulator = new PLCDataSimulator();