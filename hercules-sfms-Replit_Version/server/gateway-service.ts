import { randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';
import { db } from './db';
import { gatewayCodes, gateways, gatewayAuditLog, rateLimits, plcDevices, plcTags, plcData } from '@shared/schema';
import { eq, and, gt, lt, sql } from 'drizzle-orm';
import { generateActivationCode } from './gateway-codes-service.js';
import * as GatewayErrors from './gateway-errors';
import { DrizzleStorage } from './storage-drizzle';

// Initialize storage instance for data operations
const storage = new DrizzleStorage();

// ==================== IN-MEMORY CACHE FOR REAL-TIME DATA ====================

// Interface for real-time tag data
export interface RealtimeTagData {
  tagId: string;
  tagName: string;
  value: number;
  quality: string;
  timestamp: Date;
  plcId: string;
  dataType?: string;
  unit?: string;
}

// In-memory cache for real-time data (per user)
const realtimeDataCache = new Map<string, Map<string, RealtimeTagData>>();

// Cache cleanup interval (runs every minute)
let cacheCleanupInterval: NodeJS.Timer | null = null;

// Function to normalize quality codes to string values
function normalizeQuality(quality: any): string {
  // Handle numeric quality codes
  if (typeof quality === 'number') {
    switch (quality) {
      case 192: return 'good';
      case 0: return 'bad';
      case 64: return 'uncertain';
      default: return quality >= 128 ? 'good' : 'uncertain';
    }
  }
  
  // Handle string quality values
  if (typeof quality === 'string') {
    const lowerQuality = quality.toLowerCase();
    if (lowerQuality.includes('good')) return 'good';
    if (lowerQuality.includes('bad')) return 'bad';
    if (lowerQuality.includes('uncertain')) return 'uncertain';
    
    // Try to parse as number if string contains a number
    const numQuality = parseInt(quality, 10);
    if (!isNaN(numQuality)) {
      return normalizeQuality(numQuality);
    }
  }
  
  // Default to uncertain for unknown quality values
  return 'uncertain';
}

// Function to retrieve real-time data from cache for a user
export function getRealtimeData(userId: string, tagIds?: string[]): RealtimeTagData[] {
  const userCache = realtimeDataCache.get(userId);
  if (!userCache) {
    return [];
  }
  
  // If specific tag IDs requested, filter to those
  if (tagIds && tagIds.length > 0) {
    const tagIdSet = new Set(tagIds);
    return Array.from(userCache.values()).filter(data => 
      tagIdSet.has(data.tagId)
    );
  }
  
  // Return all cached data for the user
  return Array.from(userCache.values());
}

// Cache cleanup function to remove old data
function cleanupCache() {
  const now = Date.now();
  const maxAge = 5 * 60 * 1000; // 5 minutes
  
  for (const [userId, userCache] of Array.from(realtimeDataCache.entries())) {
    for (const [tagId, tagData] of Array.from(userCache.entries())) {
      if (now - tagData.timestamp.getTime() > maxAge) {
        userCache.delete(tagId);
        console.log(`[CACHE-CLEANUP] Removed old data for user ${userId}, tag ${tagId}`);
      }
    }
    
    // Remove user cache if empty
    if (userCache.size === 0) {
      realtimeDataCache.delete(userId);
      console.log(`[CACHE-CLEANUP] Removed empty cache for user ${userId}`);
    }
  }
}

// Start cache cleanup interval (runs every minute)
if (!cacheCleanupInterval) {
  cacheCleanupInterval = setInterval(cleanupCache, 60 * 1000);
  console.log('[CACHE] Started cache cleanup interval (every 60 seconds)');
}

// Generate secure gateway code (uses base32 format for consistency)
export function generateGatewayCode(): string {
  return generateActivationCode();
}

// Generate hardware fingerprint for security tracking
function generateHardwareFingerprint(gatewayInfo: any): string {
  const components = [
    gatewayInfo?.os || 'unknown',
    gatewayInfo?.version || 'unknown',
    gatewayInfo?.hardware?.cpu || 'unknown',
    gatewayInfo?.hardware?.memory || 'unknown',
    gatewayInfo?.hardware?.machineId || randomBytes(8).toString('hex')
  ];
  
  // Create a deterministic hash from hardware components
  const fingerprint = components.join('|');
  const hash = randomBytes(4).toString('hex'); // Add random component for uniqueness
  return `${Buffer.from(fingerprint).toString('base64').substring(0, 16)}-${hash}`;
}

// Generate JWT token for gateway
export function generateGatewayToken(gatewayId: string, userId: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required for secure token generation');
  }
  return jwt.sign(
    {
      gatewayId,
      userId,
      type: 'gateway',
      iat: Math.floor(Date.now() / 1000),
    },
    secret,
    { expiresIn: '7d' } // Token expires in 7 days, gateway must refresh
  );
}

// Verify gateway token
export function verifyGatewayToken(token: string): { gatewayId: string; userId: string } | null {
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is required for secure token verification');
    }
    const decoded = jwt.verify(token, secret) as any;
    if (decoded.type !== 'gateway') return null;
    return { gatewayId: decoded.gatewayId, userId: decoded.userId };
  } catch {
    return null;
  }
}

// Check rate limit
export async function checkRateLimit(
  identifier: string,
  endpoint: string,
  maxAttempts: number = 5,
  windowMinutes: number = 60
): Promise<{ allowed: boolean; remainingAttempts: number }> {
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);
  
  // Clean old rate limit entries
  await db.delete(rateLimits)
    .where(and(
      eq(rateLimits.endpoint, endpoint),
      lt(rateLimits.windowStart, windowStart)
    ));
  
  // Check current rate limit
  const [existing] = await db.select()
    .from(rateLimits)
    .where(and(
      eq(rateLimits.identifier, identifier),
      eq(rateLimits.endpoint, endpoint),
      gt(rateLimits.windowStart, windowStart)
    ));
  
  if (existing) {
    if (existing.blockedUntil && existing.blockedUntil > new Date()) {
      return { allowed: false, remainingAttempts: 0 };
    }
    
    if (existing.attemptCount >= maxAttempts) {
      // Block for additional time
      const blockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      await db.update(rateLimits)
        .set({ blockedUntil })
        .where(eq(rateLimits.id, existing.id));
      
      return { allowed: false, remainingAttempts: 0 };
    }
    
    // Increment attempt count
    await db.update(rateLimits)
      .set({ attemptCount: existing.attemptCount + 1 })
      .where(eq(rateLimits.id, existing.id));
    
    return { 
      allowed: true, 
      remainingAttempts: maxAttempts - existing.attemptCount - 1 
    };
  }
  
  // Create new rate limit entry
  await db.insert(rateLimits).values({
    identifier,
    endpoint,
    attemptCount: 1,
    windowStart: new Date(),
  });
  
  return { allowed: true, remainingAttempts: maxAttempts - 1 };
}

// Log audit event
export async function logAuditEvent(
  action: string,
  success: boolean,
  options: {
    gatewayId?: string;
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
    errorMessage?: string;
    metadata?: any;
  } = {}
) {
  await db.insert(gatewayAuditLog).values({
    action,
    success,
    ...options,
  });
}

// Create gateway code for user
export async function createGatewayCode(userId: string): Promise<string> {
  const code = generateGatewayCode();
  const expiresAt = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000); // 15 days
  
  await db.insert(gatewayCodes).values({
    code,
    userId,
    expiresAt,
    status: 'pending',
  });
  
  await logAuditEvent('code_generated', true, { userId });
  
  return code;
}

// Activate gateway with code - Machine binding and one-time use enforcement
export async function activateGateway(
  code: string,
  ipAddress: string,
  gatewayInfo: any,
  userId?: string // Optional user ID for additional verification
): Promise<{ token: string; gatewayId: string; userId: string; tenantId?: string; refreshToken?: string; endpoints?: any; settings?: any } | { error: string; code?: string }> {
  // Extract machine ID from gateway info (critical for binding)
  const machineId = gatewayInfo?.hardware?.machineId;
  if (!machineId) {
    return { error: 'Machine ID is required for gateway activation.', code: 'MISSING_MACHINE_ID' };
  }
  
  // Check rate limit per IP and per code
  const ipRateLimit = await checkRateLimit(ipAddress, '/activate', 10, 5); // 10 attempts per 5 minutes per IP
  const codeRateLimit = await checkRateLimit(code.substring(0, 8), '/activate', 5, 5); // 5 attempts per 5 minutes per code prefix
  
  if (!ipRateLimit.allowed || !codeRateLimit.allowed) {
    await logAuditEvent('activation_failed', false, {
      ipAddress,
      errorMessage: 'Rate limit exceeded',
      metadata: { codePrefix: code.substring(0, 8) }
    });
    return { error: 'Too many activation attempts. Please try again later.', code: 'RATE_LIMITED' };
  }
  
  // Find the activation code
  const [gatewayCode] = await db.select({
    id: gatewayCodes.id,
    code: gatewayCodes.code,
    userId: gatewayCodes.userId,
    gatewayId: gatewayCodes.gatewayId,
    tenantId: gatewayCodes.tenantId,
    machineId: gatewayCodes.machineId,
    status: gatewayCodes.status,
    expiresAt: gatewayCodes.expiresAt,
    activatedAt: gatewayCodes.activatedAt,
    createdAt: gatewayCodes.createdAt,
    notes: gatewayCodes.notes
  })
    .from(gatewayCodes)
    .where(eq(gatewayCodes.code, code));
  
  if (!gatewayCode) {
    await logAuditEvent('activation_failed', false, {
      ipAddress,
      errorMessage: 'Invalid code',
      metadata: { codePrefix: code.substring(0, 8) }
    });
    return { error: 'Invalid activation code.', code: 'ACTV_CODE_INVALID' };
  }
  
  // Check expiration
  if (gatewayCode.expiresAt < new Date()) {
    await logAuditEvent('activation_failed', false, {
      userId: gatewayCode.userId,
      ipAddress,
      errorMessage: 'Code expired',
    });
    // Update status to expired
    await db.update(gatewayCodes)
      .set({ status: 'expired' })
      .where(eq(gatewayCodes.id, gatewayCode.id));
    return { error: 'Activation code has expired.', code: 'ACTV_CODE_EXPIRED' };
  }
  
  // Check if code is revoked
  if (gatewayCode.status === 'revoked') {
    await logAuditEvent('activation_failed', false, {
      userId: gatewayCode.userId,
      ipAddress,
      errorMessage: 'Code revoked',
    });
    return { error: 'This activation code has been revoked.', code: 'ACTV_CODE_REVOKED' };
  }
  
  // Check if code was already redeemed
  if (gatewayCode.status === 'redeemed') {
    // Check machine ID match for idempotent re-activation
    if (gatewayCode.machineId === machineId) {
      // Same machine re-activating - allow idempotent operation
      const gatewayId = gatewayCode.gatewayId || `gw_${randomBytes(12).toString('hex')}`;
      const token = generateGatewayToken(gatewayId, gatewayCode.userId);
      
      await logAuditEvent('activation_idempotent', true, {
        gatewayId,
        userId: gatewayCode.userId,
        ipAddress,
        metadata: { machineId }
      });
      
      return {
        token,
        gatewayId,
        userId: gatewayCode.userId,
        tenantId: gatewayCode.tenantId || undefined
      };
    } else {
      // Different machine trying to use the same code - reject
      await logAuditEvent('activation_failed', false, {
        userId: gatewayCode.userId,
        ipAddress,
        errorMessage: 'Machine mismatch',
        metadata: { 
          expectedMachine: gatewayCode.machineId?.substring(0, 8) + '...',
          providedMachine: machineId.substring(0, 8) + '...'
        }
      });
      return { error: 'This code was activated on a different machine.', code: 'MACHINE_MISMATCH' };
    }
  }
  
  // Check if code is in a valid state for activation (issued or pending)
  if (gatewayCode.status !== 'issued' && gatewayCode.status !== 'pending') {
    await logAuditEvent('activation_failed', false, {
      userId: gatewayCode.userId,
      ipAddress,
      errorMessage: 'Invalid code status',
      metadata: { status: gatewayCode.status }
    });
    return { error: 'Invalid activation code status.', code: 'INVALID_STATUS' };
  }
  
  // First-time activation - generate gateway ID and bind to machine
  const gatewayId = `gw_${randomBytes(12).toString('hex')}`;
  
  // Check if gateway already exists for this user+machine combo
  const [existingGateway] = await db.select()
    .from(gateways)
    .where(and(
      eq(gateways.userId, gatewayCode.userId),
      eq(gateways.machineId, machineId)
    ));
  
  if (!existingGateway) {
    // Create new gateway record
    await db.insert(gateways).values({
      id: gatewayId,
      userId: gatewayCode.userId,
      tenantId: gatewayCode.tenantId,
      machineId,
      os: gatewayInfo?.os,
      osVersion: gatewayInfo?.version,
      cpu: gatewayInfo?.hardware?.cpu,
      memory: gatewayInfo?.hardware?.memory,
      lastIp: ipAddress,
      status: 'active',
      tokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });
  }
  
  // Generate JWT token using secured helper (no fallback)
  const token = generateGatewayToken(gatewayId, gatewayCode.userId);
  
  // Sanitize gateway info to prevent JSON serialization issues
  const sanitizedGatewayInfo = JSON.parse(JSON.stringify({
    ...gatewayInfo,
    activationTime: new Date().toISOString(),
    ipAddress,
    hardwareFingerprint: generateHardwareFingerprint(gatewayInfo)
  }));

  // Update activation code to redeemed status (explicit JSONB cast to prevent SQL syntax errors)
  await db.update(gatewayCodes)
    .set({
      status: 'redeemed',
      gatewayId,
      gatewayToken: token,
      machineId,
      activatedAt: new Date(),
      activationIp: ipAddress,
      gatewayInfo: sql`cast(${JSON.stringify(sanitizedGatewayInfo)} as jsonb)`
    })
    .where(eq(gatewayCodes.id, gatewayCode.id));
  
  await logAuditEvent('activation_success', true, {
    gatewayId,
    userId: gatewayCode.userId,
    ipAddress,
    metadata: { 
      osType: gatewayInfo?.os,
      version: gatewayInfo?.version
    }
  });
  
  return { token, gatewayId, userId: gatewayCode.userId };
}

// Sync data from gateway
export async function syncGatewayData(
  token: string,
  data: any,
  ipAddress: string
): Promise<{ success: boolean; error?: string }> {
  const payload = verifyGatewayToken(token);
  if (!payload) {
    await logAuditEvent('sync_attempt', false, {
      ipAddress,
      errorMessage: 'Invalid token',
    });
    return { success: false, error: 'Invalid or expired token.' };
  }
  
  // Check rate limit
  const { allowed } = await checkRateLimit(payload.gatewayId, 'gateway_sync', 100, 1);
  if (!allowed) {
    await logAuditEvent('sync_attempt', false, {
      gatewayId: payload.gatewayId,
      userId: payload.userId,
      ipAddress,
      errorMessage: 'Rate limit exceeded',
    });
    return { success: false, error: 'Rate limit exceeded.' };
  }
  
  // Update last sync time
  await db.update(gatewayCodes)
    .set({
      lastSyncAt: new Date(),
      syncCount: sql`${gatewayCodes.syncCount} + 1`,
    })
    .where(eq(gatewayCodes.gatewayId, payload.gatewayId));
  
  // Process the synced data (PLC configs, tags, etc.)
  // Parse and store the incoming tag values in plcData table
  let acceptedCount = 0;
  let rejectedCount = 0;
  const errors: string[] = [];

  // Process data array if it exists
  if (data && data.data && Array.isArray(data.data)) {
    console.log(`[GATEWAY-SYNC] Processing ${data.data.length} data points from gateway ${payload.gatewayId}`);
    
    for (const item of data.data) {
      try {
        // Normalize field names (handle both camelCase and snake_case)
        const tagId = item.tagId || item.tag_id;
        const value = item.value;
        const quality = item.quality || 'good';
        const timestamp = item.timestamp ? new Date(item.timestamp) : new Date();
        
        // Validate required fields
        if (!tagId) {
          rejectedCount++;
          errors.push(`Missing tag ID for data point`);
          continue;
        }
        
        if (value === undefined || value === null) {
          rejectedCount++;
          errors.push(`Missing value for tag ${tagId}`);
          continue;
        }
        
        // Look up tag by name OR numeric ID (gateway sends tag names like "hammer_amp")
        let tag: any[] = [];
        
        if (typeof tagId === 'string' && isNaN(parseInt(tagId, 10))) {
          // Tag ID is a string name (e.g., "hammer_amp")
          console.log(`[GATEWAY-SYNC] Looking up tag by name: ${tagId}`);
          tag = await db.select()
            .from(plcTags)
            .where(eq(plcTags.name, tagId))
            .limit(1);
        } else {
          // Tag ID is numeric
          const numericTagId = typeof tagId === 'string' ? parseInt(tagId, 10) : tagId;
          console.log(`[GATEWAY-SYNC] Looking up tag by ID: ${numericTagId}`);
          tag = await db.select()
            .from(plcTags)
            .where(eq(plcTags.id, numericTagId))
            .limit(1);
        }
        
        if (!tag || tag.length === 0) {
          rejectedCount++;
          errors.push(`Tag not found: ${tagId}`);
          console.error(`[GATEWAY-SYNC] Tag lookup failed for: ${tagId}`);
          continue;
        }
        
        // Get the PLC device to verify ownership
        const plcDevice = await db.select()
          .from(plcDevices)
          .where(and(
            eq(plcDevices.id, tag[0].plcId),
            eq(plcDevices.userId, payload.userId)
          ))
          .limit(1);
        
        if (!plcDevice || plcDevice.length === 0) {
          rejectedCount++;
          errors.push(`Tag ${tagId} does not belong to user`);
          continue;
        }
        
        // Convert value based on tag data type
        let processedValue: number = 0;
        const dataType = tag[0].dataType.toLowerCase();
        
        if (dataType === 'bool' || dataType === 'boolean') {
          // Convert boolean values to 0 or 1
          processedValue = (value === true || value === 1 || value === '1' || value === 'true') ? 1 : 0;
        } else if (dataType === 'string') {
          // For string types, we might need to handle differently
          // For now, try to convert to number or use 0
          processedValue = parseFloat(value) || 0;
        } else {
          // For numeric types (int16, int32, float, real, etc.)
          processedValue = parseFloat(value);
          if (isNaN(processedValue)) {
            rejectedCount++;
            errors.push(`Invalid numeric value for tag ${tagId}: ${value}`);
            continue;
          }
        }
        
        // Apply scaling if configured
        if (tag[0].scaleFactor) {
          processedValue = processedValue * tag[0].scaleFactor;
        }
        if (tag[0].offset) {
          processedValue = processedValue + tag[0].offset;
        }
        
        // Normalize the quality value (handle numeric codes like 192)
        const normalizedQuality = normalizeQuality(quality);
        
        // Store data in memory cache instead of database
        if (!realtimeDataCache.has(payload.userId)) {
          realtimeDataCache.set(payload.userId, new Map<string, RealtimeTagData>());
        }
        
        const userCache = realtimeDataCache.get(payload.userId)!;
        userCache.set(String(tag[0].id), {
          tagId: String(tag[0].id),
          tagName: tag[0].name,
          value: processedValue,
          quality: normalizedQuality,
          timestamp: timestamp,
          plcId: String(tag[0].plcId),
          dataType: tag[0].dataType,
          unit: tag[0].unit || undefined
        });
        
        console.log(`[GATEWAY-SYNC] ✅ Cached tag ${tag[0].id} (${tag[0].name}): value=${processedValue}, quality=${normalizedQuality} (original: ${quality})`);
        
        acceptedCount++;
        
        // Update PLC device status to connected when we receive data
        if (acceptedCount === 1) { // Only update once per batch
          await db.update(plcDevices)
            .set({ 
              status: 'connected',
              lastSeen: new Date()
            })
            .where(eq(plcDevices.id, tag[0].plcId));
          console.log(`[GATEWAY-SYNC] Updated PLC ${tag[0].plcId} status to 'connected'`);
        }
        
      } catch (error: any) {
        console.error(`[GATEWAY-SYNC] Error processing data point:`, error);
        rejectedCount++;
        errors.push(`Error processing tag: ${error.message}`);
      }
    }
    
    console.log(`[GATEWAY-SYNC] Data sync completed: ${acceptedCount} accepted, ${rejectedCount} rejected`);
    if (errors.length > 0 && errors.length <= 5) {
      console.log(`[GATEWAY-SYNC] Errors:`, errors);
    }
  }
  
  await logAuditEvent('sync_success', true, {
    gatewayId: payload.gatewayId,
    userId: payload.userId,
    ipAddress,
    metadata: { 
      dataSize: JSON.stringify(data).length,
      acceptedCount,
      rejectedCount,
      batchId: data.batchId || data.batch_id
    },
  });
  
  // Return success
  return { 
    success: true
  };
}

// Get user's gateway codes
export async function getUserGatewayCodes(userId: string) {
  return await db.select()
    .from(gatewayCodes)
    .where(eq(gatewayCodes.userId, userId));
}

// Revoke gateway code
export async function revokeGatewayCode(userId: string, gatewayId: string) {
  const [code] = await db.select()
    .from(gatewayCodes)
    .where(and(
      eq(gatewayCodes.userId, userId),
      eq(gatewayCodes.gatewayId, gatewayId)
    ));
  
  if (!code) {
    return { success: false, error: 'Gateway not found.' };
  }
  
  await db.update(gatewayCodes)
    .set({ status: 'revoked' })
    .where(eq(gatewayCodes.id, code.id));
  
  await logAuditEvent('gateway_revoked', true, {
    gatewayId,
    userId,
  });
  
  return { success: true };
}

// List activation codes for a tenant
export async function listActivationCodes(tenantId?: string) {
  try {
    if (tenantId) {
      const codes = await db.select()
        .from(gatewayCodes)
        .where(eq(gatewayCodes.tenantId, tenantId));
      return codes;
    } else {
      const codes = await db.select()
        .from(gatewayCodes);
      return codes;
    }
  } catch (error) {
    console.error('Failed to list activation codes:', error);
    return [];
  }
}

// Revoke an activation code
export async function revokeActivationCode(codeId: string, userId: string) {
  try {
    const numericCodeId = parseInt(codeId, 10);
    if (isNaN(numericCodeId)) {
      console.error('Invalid code ID:', codeId);
      return false;
    }
    
    const result = await db.update(gatewayCodes)
      .set({ 
        status: 'revoked' as const,
        lastSyncAt: new Date()
      })
      .where(eq(gatewayCodes.id, numericCodeId))
      .returning();
    
    if (result.length > 0) {
      await logAuditEvent('code_revoked', true, {
        userId,
        metadata: { codeId }
      });
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to revoke activation code:', error);
    return false;
  }
}

// Get activation code details
export async function getActivationCodeDetails(codeId: string) {
  try {
    const numericCodeId = parseInt(codeId, 10);
    if (isNaN(numericCodeId)) {
      console.error('Invalid code ID:', codeId);
      return null;
    }
    
    const codes = await db.select()
      .from(gatewayCodes)
      .where(eq(gatewayCodes.id, numericCodeId))
      .limit(1);
    
    return codes[0] || null;
  } catch (error) {
    console.error('Failed to get activation code details:', error);
    return null;
  }
}