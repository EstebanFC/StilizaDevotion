import crypto from "crypto";

/**
 * Módulo de Seguridad Criptográfica y Autenticación para Stiliza & Devotion
 * Sigue las directrices de login-security y frontend-excellence
 */

const AUTH_SECRET =
  process.env.AUTH_SECRET ||
  "sd-secret-production-auth-hardened-key-2026-stiliza-devotion";

export interface SecureSessionPayload {
  role: "admin" | "kiosco";
  label: string;
  kioskNumber?: number;
  branchId?: string;
  branchName?: string;
  brand?: "Stiliza" | "Devotion";
  issuedAt: number;
  expiresAt: number;
  nonce: string;
}

// Registro en memoria de intentos fallidos para Rate-Limiting anti fuerza bruta
interface RateLimitRecord {
  attempts: number;
  lockedUntil: number;
  lastAttempt: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 30 * 1000; // 30 segundos tras 5 intentos
const SEVERE_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutos tras 10 intentos

/**
 * Limpia registros obsoletos para evitar fugas de memoria
 */
function cleanupRateLimitStore() {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now - record.lastAttempt > 30 * 60 * 1000) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Comprueba si un identificador (IP o usuario) está bloqueado por fuerza bruta
 */
export function checkRateLimit(identifier: string): {
  allowed: boolean;
  remainingSeconds: number;
  attempts: number;
} {
  cleanupRateLimitStore();
  const record = rateLimitStore.get(identifier);
  if (!record) {
    return { allowed: true, remainingSeconds: 0, attempts: 0 };
  }

  const now = Date.now();
  if (record.lockedUntil > now) {
    const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return { allowed: false, remainingSeconds, attempts: record.attempts };
  }

  return { allowed: true, remainingSeconds: 0, attempts: record.attempts };
}

/**
 * Registra un intento fallido y calcula tiempo de enfriamiento si supera el umbral
 */
export function recordFailedAttempt(identifier: string): {
  isLocked: boolean;
  remainingSeconds: number;
  attempts: number;
} {
  const now = Date.now();
  const record = rateLimitStore.get(identifier) || {
    attempts: 0,
    lockedUntil: 0,
    lastAttempt: now,
  };

  record.attempts += 1;
  record.lastAttempt = now;

  let lockoutDuration = 0;
  if (record.attempts >= 10) {
    lockoutDuration = SEVERE_LOCKOUT_MS;
  } else if (record.attempts >= MAX_ATTEMPTS) {
    lockoutDuration = LOCKOUT_MS;
  }

  if (lockoutDuration > 0) {
    record.lockedUntil = now + lockoutDuration;
    rateLimitStore.set(identifier, record);
    return {
      isLocked: true,
      remainingSeconds: Math.ceil(lockoutDuration / 1000),
      attempts: record.attempts,
    };
  }

  rateLimitStore.set(identifier, record);
  return {
    isLocked: false,
    remainingSeconds: 0,
    attempts: record.attempts,
  };
}

/**
 * Reinicia el contador de intentos al autenticarse exitosamente
 */
export function resetRateLimit(identifier: string) {
  rateLimitStore.delete(identifier);
}

/**
 * Comparación resistente a ataques de temporización (Timing Attacks)
 */
export function timingSafeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, "utf-8");
    const bufB = Buffer.from(b, "utf-8");
    if (bufA.length !== bufB.length) {
      // Comparación constante contra sí mismo para mitigar filtración de longitud
      crypto.timingSafeEqual(bufA, bufA);
      return false;
    }
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * Genera un token firmado con HMAC-SHA256 para la sesión
 */
export function generateSignedSessionToken(
  payload: Omit<SecureSessionPayload, "issuedAt" | "expiresAt" | "nonce">,
  durationHours = 12
): string {
  const now = Date.now();
  const fullPayload: SecureSessionPayload = {
    ...payload,
    issuedAt: now,
    expiresAt: now + durationHours * 60 * 60 * 1000,
    nonce: crypto.randomBytes(16).toString("hex"),
  };

  const payloadBase64 = Buffer.from(JSON.stringify(fullPayload)).toString(
    "base64url"
  );
  const signature = crypto
    .createHmac("sha256", AUTH_SECRET)
    .update(payloadBase64)
    .digest("base64url");

  return `${payloadBase64}.${signature}`;
}

/**
 * Valida la firma criptográfica y la vigencia del token de sesión
 */
export function verifySignedSessionToken(
  token: string
): { valid: boolean; payload?: SecureSessionPayload; error?: string } {
  if (!token || typeof token !== "string") {
    return { valid: false, error: "Token ausente" };
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    return { valid: false, error: "Formato de token alterado o inválido" };
  }

  const [payloadBase64, signature] = parts;

  // Verificar firma HMAC
  const expectedSignature = crypto
    .createHmac("sha256", AUTH_SECRET)
    .update(payloadBase64)
    .digest("base64url");

  if (!timingSafeCompare(signature, expectedSignature)) {
    return { valid: false, error: "Firma inválida o sesión manipulada" };
  }

  try {
    const rawJson = Buffer.from(payloadBase64, "base64url").toString("utf-8");
    const payload = JSON.parse(rawJson) as SecureSessionPayload;

    if (!payload.expiresAt || Date.now() > payload.expiresAt) {
      return { valid: false, error: "Sesión expirada" };
    }

    if (!payload.role || !["admin", "kiosco"].includes(payload.role)) {
      return { valid: false, error: "Rol no autorizado" };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false, error: "No fue posible deserializar la sesión" };
  }
}
