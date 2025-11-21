// PLC Data Simulator - Simulates real-time OT data from different PLC types

export interface SimulatedTag {
  tagId: string;
  tagName: string;
  plcId: string;
  address: string;
  dataType: string;
  value: number | boolean | string;
  quality: 'good' | 'bad' | 'uncertain';
  timestamp: Date;
  trend: 'up' | 'down' | 'stable';
}

// Address validation patterns for different PLC brands
const ADDRESS_PATTERNS = {
  siemens: {
    patterns: [
      /^DB\d+\.DB[XBWD]\d+(\.\d+)?$/i,  // Data Block: DB100.DBX0.0, DB100.DBD0
      /^M\d+(\.\d+)?$/i,                  // Memory: M10.0, M100
      /^I\d+(\.\d+)?$/i,                  // Input: I0.0, I10
      /^Q\d+(\.\d+)?$/i,                  // Output: Q0.0, Q10
    ],
    examples: ['DB100.DBD0', 'M10.0', 'I0.0', 'Q0.0']
  },
  allen_bradley: {
    patterns: [
      /^[NBFT]\d+:\d+$/i,                 // File types: N7:10, B3:0, F8:20, T4:1
      /^[NBFT]\d+:\d+\/\d+$/i,            // Bit level: B3:0/1
      /^[A-Z]+\[\d+\]$/i,                 // Array format: TAG[10]
    ],
    examples: ['N7:10', 'B3:0/1', 'F8:20', 'TAG[10]']
  },
  schneider: {
    patterns: [
      /^%M[WXD]?\d+$/i,                   // Memory: %MW100, %M100
      /^%I[WXD]?\d+(\.\d+)?$/i,          // Input: %IW0, %I0.0
      /^%Q[WXD]?\d+(\.\d+)?$/i,          // Output: %QW0, %Q0.0
    ],
    examples: ['%MW100', '%M100', '%I0.0', '%Q0.0']
  },
  mitsubishi: {
    patterns: [
      /^[DMXYR]\d+$/i,                    // D100, M100, X0, Y0, R100
      /^[A-Z]+\d+$/i,                     // General format
    ],
    examples: ['D100', 'M100', 'X0', 'Y0']
  },
  omron: {
    patterns: [
      /^DM\d+$/i,                         // Data Memory: DM100
      /^CIO\d+(\.\d+)?$/i,               // CIO area: CIO100.00
      /^W\d+$/i,                          // Work area: W100
      /^H\d+$/i,                          // Holding area: H100
    ],
    examples: ['DM100', 'CIO100.00', 'W100', 'H100']
  }
};

// Validate PLC address format
export function validateAddress(plcBrand: string, address: string): boolean {
  const brand = plcBrand.toLowerCase().replace(/[_\s-]/g, '');
  
  // Find matching brand patterns
  let patterns = null;
  if (brand.includes('siemens')) {
    patterns = ADDRESS_PATTERNS.siemens.patterns;
  } else if (brand.includes('allen') || brand.includes('bradley') || brand.includes('rockwell')) {
    patterns = ADDRESS_PATTERNS.allen_bradley.patterns;
  } else if (brand.includes('schneider') || brand.includes('modicon')) {
    patterns = ADDRESS_PATTERNS.schneider.patterns;
  } else if (brand.includes('mitsubishi')) {
    patterns = ADDRESS_PATTERNS.mitsubishi.patterns;
  } else if (brand.includes('omron')) {
    patterns = ADDRESS_PATTERNS.omron.patterns;
  }
  
  if (!patterns) return true; // Unknown brand, allow any format
  
  return patterns.some(pattern => pattern.test(address));
}

// Get address format examples for a PLC brand
export function getAddressExamples(plcBrand: string): string[] {
  const brand = plcBrand.toLowerCase().replace(/[_\s-]/g, '');
  
  if (brand.includes('siemens')) {
    return ADDRESS_PATTERNS.siemens.examples;
  } else if (brand.includes('allen') || brand.includes('bradley') || brand.includes('rockwell')) {
    return ADDRESS_PATTERNS.allen_bradley.examples;
  } else if (brand.includes('schneider') || brand.includes('modicon')) {
    return ADDRESS_PATTERNS.schneider.examples;
  } else if (brand.includes('mitsubishi')) {
    return ADDRESS_PATTERNS.mitsubishi.examples;
  } else if (brand.includes('omron')) {
    return ADDRESS_PATTERNS.omron.examples;
  }
  
  return [];
}

// Simulate tag value based on data type and address
export function simulateTagValue(
  dataType: string,
  address: string,
  previousValue?: number | boolean | string
): { value: number | boolean | string; quality: 'good' | 'bad' | 'uncertain'; trend: 'up' | 'down' | 'stable' } {
  const random = Math.random();
  const quality = random > 0.95 ? 'uncertain' : random > 0.9 ? 'bad' : 'good';
  
  let value: number | boolean | string;
  let trend: 'up' | 'down' | 'stable' = 'stable';
  
  switch (dataType.toUpperCase()) {
    case 'BOOL':
    case 'BOOLEAN':
      // Toggle boolean with some randomness
      if (previousValue !== undefined && typeof previousValue === 'boolean') {
        value = random > 0.8 ? !previousValue : previousValue;
      } else {
        value = random > 0.5;
      }
      trend = 'stable';
      break;
      
    case 'INT':
    case 'INT16':
    case 'INT32':
    case 'INTEGER':
      // Simulate integer values with trend
      const intBase = previousValue && typeof previousValue === 'number' ? previousValue : 50;
      const intChange = (random - 0.5) * 10;
      value = Math.round(Math.max(0, Math.min(100, intBase + intChange)));
      if (typeof previousValue === 'number') {
        trend = value > previousValue ? 'up' : value < previousValue ? 'down' : 'stable';
      }
      break;
      
    case 'REAL':
    case 'FLOAT':
    case 'DOUBLE':
      // Simulate floating point values
      const floatBase = previousValue && typeof previousValue === 'number' ? previousValue : 50.0;
      const floatChange = (random - 0.5) * 5;
      value = Math.round((floatBase + floatChange) * 100) / 100;
      value = Math.max(0, Math.min(100, value));
      if (typeof previousValue === 'number') {
        trend = value > previousValue ? 'up' : value < previousValue ? 'down' : 'stable';
      }
      break;
      
    case 'STRING':
      // Simulate string status values
      const statuses = ['RUNNING', 'STOPPED', 'IDLE', 'ERROR', 'MAINTENANCE'];
      value = statuses[Math.floor(random * statuses.length)];
      trend = 'stable';
      break;
      
    default:
      value = 0;
      trend = 'stable';
  }
  
  return { value, quality, trend };
}

// Simulate real-time data for multiple tags
export class PLCDataSimulator {
  private tags: Map<string, SimulatedTag> = new Map();
  private updateInterval: NodeJS.Timeout | null = null;
  private updateCallbacks: Set<(tags: SimulatedTag[]) => void> = new Set();
  
  // Add a tag to simulation
  addTag(tag: {
    tagId: string;
    tagName: string;
    plcId: string;
    address: string;
    dataType: string;
  }) {
    const initialData = simulateTagValue(tag.dataType, tag.address);
    this.tags.set(tag.tagId, {
      ...tag,
      value: initialData.value,
      quality: initialData.quality,
      timestamp: new Date(),
      trend: initialData.trend
    });
  }
  
  // Remove a tag from simulation
  removeTag(tagId: string) {
    this.tags.delete(tagId);
  }
  
  // Start real-time simulation
  start(intervalMs: number = 1000) {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    this.updateInterval = setInterval(() => {
      this.updateTags();
    }, intervalMs);
    
    // Initial update
    this.updateTags();
  }
  
  // Stop simulation
  stop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
  
  // Update all tag values
  private updateTags() {
    const updatedTags: SimulatedTag[] = [];
    
    this.tags.forEach(tag => {
      const newData = simulateTagValue(tag.dataType, tag.address, tag.value as any);
      tag.value = newData.value;
      tag.quality = newData.quality;
      tag.trend = newData.trend;
      tag.timestamp = new Date();
      updatedTags.push({ ...tag });
    });
    
    // Notify all callbacks
    this.updateCallbacks.forEach(callback => callback(updatedTags));
  }
  
  // Subscribe to tag updates
  subscribe(callback: (tags: SimulatedTag[]) => void) {
    this.updateCallbacks.add(callback);
    // Send current state immediately
    callback(Array.from(this.tags.values()));
    
    return () => {
      this.updateCallbacks.delete(callback);
    };
  }
  
  // Get current tag values - returns an object keyed by tagId for easy lookup
  getCurrentValues(): Record<string, SimulatedTag> {
    const values: Record<string, SimulatedTag> = {};
    this.tags.forEach((tag, id) => {
      values[id] = { ...tag };
    });
    return values;
  }
  
  // Get current tag values as array
  getCurrentValuesArray(): SimulatedTag[] {
    return Array.from(this.tags.values());
  }
  
  // Get value for specific tag
  getTagValue(tagId: string): SimulatedTag | undefined {
    return this.tags.get(tagId);
  }
  
  // Generate historical data for a tag (works even if tag wasn't initially in simulator)
  generateHistoricalData(tagId: string, hours: number = 24, pointsPerHour: number = 4): any[] {
    // First check if tag exists in simulator
    let tag = this.tags.get(tagId);
    
    // If tag doesn't exist, create a temporary one for data generation
    if (!tag) {
      // Try to create a basic tag with default values
      const tempTag: SimulatedTag = {
        tagId: tagId,
        tagName: `Tag_${tagId}`,
        plcId: 'unknown',
        address: 'DB0.DBD0',
        dataType: 'REAL',
        value: Math.random() * 100,
        quality: 'good',
        timestamp: new Date(),
        trend: 'stable'
      };
      tag = tempTag;
    }
    
    const data = [];
    const now = new Date();
    const totalPoints = hours * pointsPerHour;
    let currentValue = tag.value;
    
    for (let i = totalPoints; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - (i * (60 / pointsPerHour) * 60 * 1000));
      const simulated = simulateTagValue(tag.dataType, tag.address, currentValue as any);
      currentValue = simulated.value;
      
      data.push({
        tagId: tag.tagId,
        tagName: tag.tagName,
        timestamp: timestamp.toISOString(),
        value: currentValue,
        quality: simulated.quality
      });
    }
    
    return data;
  }
  
  // Initialize tag if not exists (for dynamic tag addition)
  ensureTagExists(tag: {
    tagId: string;
    tagName: string;
    plcId: string;
    address: string;
    dataType: string;
  }) {
    if (!this.tags.has(tag.tagId)) {
      this.addTag(tag);
    }
  }
}

// Global simulator instance
export const globalSimulator = new PLCDataSimulator();

// Gateway connection simulator
export class GatewaySimulator {
  private connectionStatus: 'connected' | 'disconnected' | 'error' = 'disconnected';
  private gatewayCode: string = '';
  private facilityId: string = '';
  private lastPing: Date | null = null;
  
  // Connect gateway with activation code
  connect(activationCode: string): Promise<{
    success: boolean;
    message: string;
    gatewayInfo?: any;
  }> {
    return new Promise((resolve) => {
      // Simulate connection delay
      setTimeout(() => {
        // Validate activation code format (DEMO-COMPANY-FAC001-X7K9P)
        const codePattern = /^DEMO-[A-Z0-9]+-FAC\d{3}-[A-Z0-9]{5}$/;
        
        if (codePattern.test(activationCode)) {
          this.connectionStatus = 'connected';
          this.gatewayCode = activationCode;
          this.lastPing = new Date();
          
          const [, company, facility] = activationCode.split('-');
          this.facilityId = facility;
          
          resolve({
            success: true,
            message: 'Gateway connected successfully',
            gatewayInfo: {
              code: activationCode,
              facility: facility,
              company: company,
              os: 'Linux',
              version: '2.1.0',
              ipAddress: '192.168.1.100',
              hardware: {
                cpu: 'Intel Core i5',
                ram: '8GB',
                storage: '256GB SSD'
              }
            }
          });
        } else {
          this.connectionStatus = 'error';
          resolve({
            success: false,
            message: 'Invalid activation code format'
          });
        }
      }, 2000);
    });
  }
  
  // Disconnect gateway
  disconnect() {
    this.connectionStatus = 'disconnected';
    this.gatewayCode = '';
    this.lastPing = null;
  }
  
  // Get connection status
  getStatus() {
    return {
      status: this.connectionStatus,
      code: this.gatewayCode,
      facilityId: this.facilityId,
      lastPing: this.lastPing
    };
  }
  
  // Simulate periodic heartbeat
  startHeartbeat(intervalMs: number = 5000) {
    return setInterval(() => {
      if (this.connectionStatus === 'connected') {
        this.lastPing = new Date();
      }
    }, intervalMs);
  }
}

// Global gateway instance
export const gatewaySimulator = new GatewaySimulator();