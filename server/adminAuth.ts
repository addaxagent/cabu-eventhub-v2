import crypto from 'crypto';
import express from 'express';
import { sendEmail, buildBrandedEmailHtml, normalizeEmail } from './emailService';

interface AdminAccount {
  email: string;
  name: string;
  passwordHash?: string;
  passwordSalt?: string;
  updatedAt?: number;
}

interface ResetTokenRecord {
  tokenHash: string;
  adminEmail: string;
  createdAt: number;
  expiresAt: number;
  used: boolean;
}

/**
 * Returns the authoritative administrator email address
 */
export function getAdminEmail(): string {
  return (process.env.ADMIN_EMAIL || 'itmanger@cabuniversity.com').toLowerCase().trim();
}

// Token Expiry: 30 minutes in milliseconds
const RESET_TOKEN_EXPIRY_MS = 30 * 60 * 1000;

// In-memory admin account store
const adminAccounts = new Map<string, AdminAccount>();

// In-memory reset tokens store: tokenHash -> ResetTokenRecord
const resetTokens = new Map<string, ResetTokenRecord>();

// Rate-limiting map: key (ip/email) -> timestamps[]
const rateLimitMap = new Map<string, number[]>();

/**
 * Normalizes an admin identifier (email or username)
 */
export function normalizeAdminIdentifier(input?: string): string {
  if (!input || typeof input !== 'string') return '';
  const clean = input.trim().toLowerCase();
  const primaryAdmin = getAdminEmail();
  if (clean === 'admin' || clean === primaryAdmin) {
    return primaryAdmin;
  }
  return clean;
}

/**
 * Checks if an identifier belongs to a valid administrator
 */
export function isValidAdminAccount(identifier: string): boolean {
  if (!identifier) return false;
  const clean = normalizeAdminIdentifier(identifier);
  const primaryAdmin = getAdminEmail();
  const knownAdmins = [
    primaryAdmin,
    'itmanger@cabuniversity.com',
    'admin@cabuniversity.com',
    'admin@cabu.edu.zm',
    'chapel@cabuniversity.com',
  ];

  if (clean === primaryAdmin) return true;
  if (knownAdmins.includes(clean)) return true;
  if (adminAccounts.has(clean)) return true;
  if (clean.startsWith('admin@')) return true;

  return false;
}

/**
 * Hashes a password using crypto.scrypt with a unique random salt
 */
export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const useSalt = salt || crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, useSalt, 64);
  return {
    hash: derivedKey.toString('hex'),
    salt: useSalt,
  };
}

/**
 * Verifies a password against hash & salt or initial environment variable
 */
export function verifyAdminCredentials(emailInput: string, passwordInput: string): boolean {
  if (!emailInput || !passwordInput) return false;

  const clean = normalizeAdminIdentifier(emailInput);
  if (!isValidAdminAccount(clean)) return false;

  const primaryAdmin = getAdminEmail();
  const account =
    adminAccounts.get(clean) ||
    adminAccounts.get(primaryAdmin) ||
    adminAccounts.get('primary_admin');

  // If password was updated via reset
  if (account && account.passwordHash && account.passwordSalt) {
    const calculated = crypto.scryptSync(passwordInput, account.passwordSalt, 64).toString('hex');
    try {
      return (
        calculated.length === account.passwordHash.length &&
        crypto.timingSafeEqual(Buffer.from(calculated), Buffer.from(account.passwordHash))
      );
    } catch {
      return false;
    }
  }

  // Fallback to initial configured ADMIN_PASSWORD
  const expectedPassword = process.env.ADMIN_PASSWORD || 'admin123';
  return passwordInput === expectedPassword;
}

/**
 * Hash token for safe storage (SHA-256)
 */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

/**
 * Sliding window rate limit check (Max 5 reset requests per 15 minutes)
 */
function checkResetRateLimit(key: string): boolean {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const maxRequests = 5;

  const timestamps = rateLimitMap.get(key) || [];
  const validTimestamps = timestamps.filter((t) => now - t < windowMs);

  if (validTimestamps.length >= maxRequests) {
    return false; // Rate limit exceeded
  }

  validTimestamps.push(now);
  rateLimitMap.set(key, validTimestamps);
  return true;
}

/**
 * Handles administrator password reset request
 */
export async function requestAdminPasswordReset({
  email,
  baseUrl,
  clientIp,
}: {
  email: string;
  baseUrl: string;
  clientIp?: string;
}): Promise<{
  success: boolean;
  message: string;
  emailSent?: boolean;
}> {
  const rateKey = `${clientIp || 'unknown'}_${email || 'unknown'}`;
  const isAllowed = checkResetRateLimit(rateKey);

  const primaryAdminEmail = getAdminEmail();

  // Generic security response constant (to prevent account enumeration)
  const genericResponse = {
    success: true,
    message: 'If this administrator account is valid, password reset instructions have been sent to the CABU IT administrator.',
  };

  if (!isAllowed) {
    return genericResponse;
  }

  const clean = normalizeAdminIdentifier(email);
  if (!clean || !isValidAdminAccount(clean)) {
    return genericResponse;
  }

  // Invalidate any existing active tokens for this admin
  for (const [hash, record] of resetTokens.entries()) {
    if (record.adminEmail === clean || record.adminEmail === primaryAdminEmail || record.adminEmail === 'primary_admin') {
      resetTokens.delete(hash);
    }
  }

  // Generate cryptographically secure single-use token (32 bytes hex)
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const now = Date.now();
  const expiresAt = now + RESET_TOKEN_EXPIRY_MS;

  resetTokens.set(tokenHash, {
    tokenHash,
    adminEmail: clean,
    createdAt: now,
    expiresAt,
    used: false,
  });

  // Construct absolute reset URL using the current public base URL
  const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
  const resetLink = `${cleanBaseUrl}/admin/reset-password?token=${encodeURIComponent(rawToken)}`;

  const nowFormatted = new Date().toUTCString();

  // Construct official CABU IT recovery email
  const contentHtml = `
    <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:12px;padding:16px;margin-bottom:20px;">
      <div style="color:#92400e;font-weight:700;font-size:14px;">\uD83D\uDD11 Admin Password Reset Requested</div>
      <p style="color:#b45309;font-size:12px;margin:4px 0 0 0;">
        A password reset request was initiated for an administrator account on CABU EventHub.
      </p>
    </div>

    <table style="width:100%;border-collapse:collapse;font-size:12px;margin:16px 0;background:#F8FAF9;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;">
      <tr style="border-bottom:1px solid #e5e7eb;">
        <td style="padding:10px 14px;font-weight:bold;color:#6b7280;width:35%;">Requested Admin Account:</td>
        <td style="padding:10px 14px;font-family:monospace;font-weight:bold;color:#111827;">${clean}</td>
      </tr>
      <tr style="border-bottom:1px solid #e5e7eb;">
        <td style="padding:10px 14px;font-weight:bold;color:#6b7280;">Request Timestamp:</td>
        <td style="padding:10px 14px;color:#111827;">${nowFormatted}</td>
      </tr>
      <tr style="border-bottom:1px solid #e5e7eb;">
        <td style="padding:10px 14px;font-weight:bold;color:#6b7280;">Link Expiration:</td>
        <td style="padding:10px 14px;color:#dc2626;font-weight:bold;">30 Minutes (Single-Use)</td>
      </tr>
      <tr>
        <td style="padding:10px 14px;font-weight:bold;color:#6b7280;">Destination Mailbox:</td>
        <td style="padding:10px 14px;color:#111827;">${primaryAdminEmail}</td>
      </tr>
    </table>

    <div style="text-align:center;margin:28px 0;">
      <a href="${resetLink}" target="_blank" style="display:inline-block;background:#0B6B3A;color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;padding:14px 28px;border-radius:10px;box-shadow:0 2px 6px rgba(11,107,58,0.3);">
        Reset Administrator Password
      </a>
    </div>

    <div style="background:#f3f4f6;padding:12px;border-radius:8px;font-size:11px;color:#4b5563;word-break:break-all;margin-top:16px;">
      <strong>Direct Reset URL:</strong><br/>
      <a href="${resetLink}" style="color:#0B6B3A;">${resetLink}</a>
    </div>

    <p style="font-size:12px;color:#6b7280;margin-top:20px;line-height:1.5;">
      <strong>Security Notice:</strong> If you did not request this password reset, no action is required. The administrator account password has not been altered, and this link will expire automatically in 30 minutes.
    </p>
  `;

  const emailHtml = buildBrandedEmailHtml({
    title: 'CABU EventHub Admin Password Reset',
    preheader: `Admin password reset instructions for ${clean}. Link expires in 30 minutes.`,
    contentHtml,
  });

  try {
    const emailResult = await sendEmail({
      to: primaryAdminEmail,
      subject: 'CABU EventHub Admin Password Reset',
      html: emailHtml,
      purpose: 'NOTIFICATION',
    });

    return {
      ...genericResponse,
      emailSent: emailResult.success,
    };
  } catch (err) {
    console.error('[Admin Auth] Error sending recovery email:', err);
    return genericResponse;
  }
}

/**
 * Validates whether a reset token is valid and unexpired
 */
export function validateResetToken(rawToken: string): {
  valid: boolean;
  message?: string;
  adminEmail?: string;
} {
  if (!rawToken || typeof rawToken !== 'string') {
    return { valid: false, message: 'Invalid or missing password reset token.' };
  }

  const tokenHash = hashToken(rawToken);
  const record = resetTokens.get(tokenHash);

  if (!record) {
    return { valid: false, message: 'This password reset link is invalid or has already been used.' };
  }

  if (record.used) {
    return { valid: false, message: 'This password reset link has already been used.' };
  }

  if (Date.now() > record.expiresAt) {
    resetTokens.delete(tokenHash);
    return { valid: false, message: 'This password reset link has expired (valid for 30 minutes). Please request a new one.' };
  }

  return { valid: true, adminEmail: record.adminEmail };
}

/**
 * Changes the administrator password for an already-authenticated admin,
 * proven by re-supplying the current password (no email dependency).
 */
export function changeAdminPassword({
  email,
  currentPassword,
  newPassword,
}: {
  email: string;
  currentPassword: string;
  newPassword: string;
}): {
  success: boolean;
  message: string;
} {
  if (!verifyAdminCredentials(email, currentPassword)) {
    return {
      success: false,
      message: 'Current password is incorrect.',
    };
  }

  if (!newPassword || newPassword.length < 8) {
    return {
      success: false,
      message: 'New password must be at least 8 characters long.',
    };
  }

  const { hash, salt } = hashPassword(newPassword);
  const primaryAdmin = getAdminEmail();
  const updatedAccount: AdminAccount = {
    email: primaryAdmin,
    name: 'CABU EventHub Administrator',
    passwordHash: hash,
    passwordSalt: salt,
    updatedAt: Date.now(),
  };

  adminAccounts.set(primaryAdmin, updatedAccount);
  adminAccounts.set(normalizeAdminIdentifier(email), updatedAccount);
  adminAccounts.set('primary_admin', updatedAccount);
  adminAccounts.set('itmanger@cabuniversity.com', updatedAccount);
  adminAccounts.set('admin@cabuniversity.com', updatedAccount);
  adminAccounts.set('admin@cabu.edu.zm', updatedAccount);

  return {
    success: true,
    message: 'Password updated successfully.',
  };
}

/**
 * Executes the password reset with a valid token
 */
export function executePasswordReset({
  token,
  newPassword,
}: {
  token: string;
  newPassword: string;
}): {
  success: boolean;
  message: string;
} {
  const validation = validateResetToken(token);
  if (!validation.valid || !validation.adminEmail) {
    return {
      success: false,
      message: validation.message || 'Invalid or expired password reset token.',
    };
  }

  if (!newPassword || newPassword.length < 8) {
    return {
      success: false,
      message: 'New password must be at least 8 characters long.',
    };
  }

  const tokenHash = hashToken(token);
  const record = resetTokens.get(tokenHash);
  if (record) {
    record.used = true;
    resetTokens.delete(tokenHash); // Invalidate token immediately
  }

  // Hash new password securely with crypto.scrypt
  const { hash, salt } = hashPassword(newPassword);

  // Update administrator accounts
  const primaryAdmin = getAdminEmail();
  const targetEmail = validation.adminEmail;
  const updatedAccount: AdminAccount = {
    email: primaryAdmin,
    name: 'CABU EventHub Administrator',
    passwordHash: hash,
    passwordSalt: salt,
    updatedAt: Date.now(),
  };

  adminAccounts.set(primaryAdmin, updatedAccount);
  adminAccounts.set(targetEmail, updatedAccount);
  adminAccounts.set('primary_admin', updatedAccount);
  adminAccounts.set('itmanger@cabuniversity.com', updatedAccount);
  adminAccounts.set('admin@cabuniversity.com', updatedAccount);
  adminAccounts.set('admin@cabu.edu.zm', updatedAccount);

  // Invalidate any other outstanding tokens
  for (const [h, r] of resetTokens.entries()) {
    if (r.adminEmail === validation.adminEmail || r.adminEmail === primaryAdmin) {
      resetTokens.delete(h);
    }
  }

  return {
    success: true,
    message: 'Password updated successfully. You can now sign in.',
  };
}
