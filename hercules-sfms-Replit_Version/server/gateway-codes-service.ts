import crypto from "crypto";
import { db } from "./db";
import { gatewayCodes } from "@shared/schema";
import { eq, and, gt } from "drizzle-orm";

/**
 * Generate a collision-safe activation code
 * Format: HERC-XXXX-XXXX-XXXX-XXXX
 */
export function generateActivationCode(): string {
  // 4×4 uppercase base32 chunks
  const buf = crypto.randomBytes(13); // More bytes to ensure 4 chunks of 4 chars
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no O/0, I/1 to avoid confusion
  let s = "";
  for (let i = 0; i < buf.length; i++) {
    s += alphabet[buf[i] % alphabet.length];
  }
  // Ensure we have at least 16 characters for 4 chunks
  while (s.length < 16) {
    s += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  const chunks = [s.slice(0, 4), s.slice(4, 8), s.slice(8, 12), s.slice(12, 16)];
  return `HERC-${chunks.join("-")}`;
}

/**
 * Issue a gateway activation code for a user
 * If an existing unredeemed/unexpired code exists, return it
 * Otherwise generate a new unique code
 */
export async function issueGatewayCode(
  userId: string,
  tenantId?: string,
  ttlDays = 30
): Promise<{ code: string; expiresAt: Date }> {
  console.log('[GATEWAY-CODES] ===== issueGatewayCode called =====');
  console.log('[GATEWAY-CODES] Parameters:');
  console.log('[GATEWAY-CODES]   userId:', userId, 'Type:', typeof userId);
  console.log('[GATEWAY-CODES]   tenantId:', tenantId, 'Type:', typeof tenantId);
  console.log('[GATEWAY-CODES]   ttlDays:', ttlDays, 'Type:', typeof ttlDays);
  
  // Check for potential integer overflow with tenantId
  // Check for existing unredeemed/unexpired code
  console.log('[GATEWAY-CODES] Checking for existing unredeemed/unexpired code for user:', userId);
  const existing = await db.query.gatewayCodes.findFirst({
    where: (t, { and, eq, gt }) =>
      and(
        eq(t.userId, userId),
        eq(t.status, "issued"),
        gt(t.expiresAt, new Date())
      ),
  });
  console.log('[GATEWAY-CODES] Existing code check result:', existing ? 'found existing code' : 'no existing code');

  if (existing) {
    console.log('[GATEWAY-CODES] Returning existing code:', existing.code);
    console.log('[GATEWAY-CODES]   Expires at:', existing.expiresAt);
    return { code: existing.code, expiresAt: existing.expiresAt };
  }

  // Generate unique code with collision detection
  console.log('[GATEWAY-CODES] Generating new activation code...');
  let code = "";
  for (let i = 0; i < 5; i++) {
    const candidateCode = generateActivationCode();
    console.log('[GATEWAY-CODES] Generated candidate code:', candidateCode, 'Attempt:', i + 1);
    const clash = await db.query.gatewayCodes.findFirst({
      where: (t, { eq }) => eq(t.code, candidateCode),
    });
    console.log('[GATEWAY-CODES]   Collision check:', clash ? 'COLLISION!' : 'unique');
    if (!clash) {
      code = candidateCode;
      console.log('[GATEWAY-CODES] Code accepted:', code);
      break;
    }
  }

  if (!code) {
    console.error('[GATEWAY-CODES] ERROR: Failed to generate unique code after 5 attempts');
    throw new Error("code_generation_failed");
  }

  const expiresAt = new Date(Date.now() + ttlDays * 24 * 3600 * 1000);
  console.log('[GATEWAY-CODES] Code will expire at:', expiresAt.toISOString());
  
  console.log('[GATEWAY-CODES] Inserting gateway code into database...');
  console.log('[GATEWAY-CODES] Insert values:');
  console.log('[GATEWAY-CODES]   code:', code);
  console.log('[GATEWAY-CODES]   userId:', userId);
  console.log('[GATEWAY-CODES]   tenantId:', tenantId ?? null);
  console.log('[GATEWAY-CODES]   status: issued');
  console.log('[GATEWAY-CODES]   expiresAt:', expiresAt.toISOString());
  console.log('[GATEWAY-CODES]   createdAt:', new Date().toISOString());
  
  try {
    await db.insert(gatewayCodes).values({
      code,
      userId,
      tenantId: tenantId ?? null,
      status: "issued",
      expiresAt,
      createdAt: new Date(),
      notes: "auto-issued at signup",
    });
    console.log('[GATEWAY-CODES] Code successfully inserted into database');
  } catch (error: any) {
    console.error('[GATEWAY-CODES] ERROR inserting code:', error?.message);
    console.error('[GATEWAY-CODES] Error stack:', error?.stack);
    throw error;
  }

  console.log('[GATEWAY-CODES] Successfully issued gateway code:', code);
  console.log('[GATEWAY-CODES] ===== issueGatewayCode completed =====');
  return { code, expiresAt };
}

/**
 * Redeem an activation code (bind machine & flip status)
 */
export async function redeemCode(
  code: string,
  machineId: string
): Promise<
  | { ok: true; userId: string; tenantId: string | null }
  | { err: "invalid_code" | "machine_mismatch" | "already_redeemed" }
> {
  const row = await db.query.gatewayCodes.findFirst({
    where: (t, { eq }) => eq(t.code, code),
  });

  if (!row) {
    return { err: "invalid_code" };
  }

  if (row.status !== "issued") {
    if (row.status === "redeemed" && row.machineId === machineId) {
      // Allow re-activation with the same machine
      return { ok: true, userId: row.userId, tenantId: row.tenantId };
    }
    return { err: "already_redeemed" };
  }

  if (row.expiresAt < new Date()) {
    return { err: "invalid_code" };
  }

  if (row.machineId && row.machineId !== machineId) {
    return { err: "machine_mismatch" };
  }

  // Update the code to redeemed status
  await db
    .update(gatewayCodes)
    .set({
      status: "redeemed",
      machineId,
      redeemedAt: new Date(),
    })
    .where(eq(gatewayCodes.code, code));

  return { ok: true, userId: row.userId, tenantId: row.tenantId };
}

/**
 * Revoke existing issued codes for a user
 */
export async function revokeIssuedCodes(userId: string): Promise<void> {
  await db
    .update(gatewayCodes)
    .set({
      status: "revoked",
    })
    .where(
      and(
        eq(gatewayCodes.userId, userId),
        eq(gatewayCodes.status, "issued")
      )
    );
}

/**
 * Get user's current activation code
 */
export async function getUserActivationCode(
  userId: string
): Promise<{ code: string; expiresAt: Date; status: string } | null> {
  const code = await db.query.gatewayCodes.findFirst({
    where: (t, { and, eq, gt }) =>
      and(
        eq(t.userId, userId),
        eq(t.status, "issued"),
        gt(t.expiresAt, new Date())
      ),
  });

  if (!code) {
    return null;
  }

  return {
    code: code.code,
    expiresAt: code.expiresAt,
    status: code.status,
  };
}