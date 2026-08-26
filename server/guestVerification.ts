import crypto from 'crypto';
import { sendEmailOtp, verifySubmittedEmailOtp } from './emailService';
import { sendOtpToPhone, verifySubmittedOtp } from './airtelSms';

export type VerificationPurpose = 'RETURNING_GUEST_ACCESS' | 'REGISTRATION_STATUS_ACCESS';
export type VerificationDeliveryMethod = 'email' | 'sms';

export interface GuestChallengeRecord {
  challengeId: string;
  purpose: VerificationPurpose;
  attendeeId: string;
  rawEmail?: string;
  rawPhone?: string;
  maskedEmail?: string;
  maskedPhone?: string;
  availableMethods: VerificationDeliveryMethod[];
  defaultMethod: VerificationDeliveryMethod;
  activeMethod?: VerificationDeliveryMethod;
  verified: boolean;
  verifiedToken?: string;
  verifiedAt?: number;
  createdAt: number;
  expiresAt: number;
  lastSentAt?: number;
  verifyAttempts: number;
  clientIp: string;
}

// In-memory challenge store (10-minute expiry)
const challengeStore = new Map<string, GuestChallengeRecord>();

// IP Rate Limiting Store for Challenge Creation
interface RateLimitRecord {
  count: number;
  resetAt: number;
}
const ipRateLimitStore = new Map<string, RateLimitRecord>();

const MAX_CHALLENGES_PER_WINDOW = 25; // 25 lookups per 15 minutes per IP
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const CHALLENGE_LIFETIME_MS = 10 * 60 * 1000; // 10 minutes
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
const MAX_VERIFY_ATTEMPTS = 5;

/**
 * Clean up expired challenges and rate limit records periodically
 */
function cleanupExpiredRecords() {
  const now = Date.now();
  for (const [key, record] of challengeStore.entries()) {
    if (now > record.expiresAt) {
      challengeStore.delete(key);
    }
  }
  for (const [ip, limit] of ipRateLimitStore.entries()) {
    if (now > limit.resetAt) {
      ipRateLimitStore.delete(ip);
    }
  }
}

// Run cleanup every 2 minutes
setInterval(cleanupExpiredRecords, 2 * 60 * 1000);

/**
 * Masks an email address: e.g. patsonbk2014@gmail.com -> pa***@gmail.com
 */
export function maskEmailAddress(email?: string): string {
  if (!email || typeof email !== 'string' || !email.includes('@')) return '';
  const parts = email.trim().toLowerCase().split('@');
  const user = parts[0] || '';
  const domain = parts[1] || '';
  if (!domain) return '';
  const prefix = user.slice(0, 2);
  return `${prefix}***@${domain}`;
}

/**
 * Masks a phone number: e.g. 260766949665 -> 26076*****65
 */
export function maskPhoneNumber(phone?: string): string {
  if (!phone || typeof phone !== 'string') return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 6) return '*****';

  if (digits.startsWith('260') && digits.length >= 10) {
    const prefix = digits.slice(0, 5);
    const suffix = digits.slice(-2);
    return `${prefix}*****${suffix}`;
  }

  if (digits.startsWith('0') && digits.length >= 10) {
    const prefix = '260' + digits.slice(1, 3);
    const suffix = digits.slice(-2);
    return `${prefix}*****${suffix}`;
  }

  const prefix = digits.slice(0, Math.min(4, digits.length - 2));
  const suffix = digits.slice(-2);
  return `${prefix}*****${suffix}`;
}

/**
 * Initiates a secure, short-lived ownership verification challenge
 */
export function createGuestVerificationChallenge({
  purpose,
  attendeeId,
  email,
  phone,
  clientIp,
}: {
  purpose: VerificationPurpose;
  attendeeId: string;
  email?: string;
  phone?: string;
  clientIp: string;
}): {
  success: boolean;
  message: string;
  challengeId?: string;
  maskedEmail?: string;
  maskedPhone?: string;
  availableMethods?: VerificationDeliveryMethod[];
  defaultMethod?: VerificationDeliveryMethod;
  errorType?: string;
} {
  const now = Date.now();

  // Check IP rate limit
  const ipKey = clientIp || 'unknown';
  let ipRecord = ipRateLimitStore.get(ipKey);
  if (!ipRecord || now > ipRecord.resetAt) {
    ipRecord = { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS };
    ipRateLimitStore.set(ipKey, ipRecord);
  } else {
    ipRecord.count += 1;
    if (ipRecord.count > MAX_CHALLENGES_PER_WINDOW) {
      return {
        success: false,
        message: 'Too many verification lookup requests. Please wait a few minutes before trying again.',
        errorType: 'RATE_LIMITED',
      };
    }
  }

  const cleanEmail = email?.trim().toLowerCase() || '';
  const cleanPhone = phone?.trim() || '';

  const hasValidEmail = cleanEmail.includes('@') && cleanEmail.length > 5;
  const hasValidPhone = cleanPhone.replace(/\D/g, '').length >= 9;

  if (!hasValidEmail && !hasValidPhone) {
    return {
      success: false,
      message: 'No verified contact method (email or phone) is on file for this record. Please contact CABU support.',
      errorType: 'NO_CONTACT_METHOD',
    };
  }

  const availableMethods: VerificationDeliveryMethod[] = [];
  if (hasValidEmail) availableMethods.push('email');
  if (hasValidPhone) availableMethods.push('sms');

  // Default to email if present, otherwise SMS
  const defaultMethod: VerificationDeliveryMethod = hasValidEmail ? 'email' : 'sms';

  const challengeId = `ch_${crypto.randomBytes(24).toString('hex')}`;
  const maskedEmail = hasValidEmail ? maskEmailAddress(cleanEmail) : undefined;
  const maskedPhone = hasValidPhone ? maskPhoneNumber(cleanPhone) : undefined;

  const record: GuestChallengeRecord = {
    challengeId,
    purpose,
    attendeeId,
    rawEmail: hasValidEmail ? cleanEmail : undefined,
    rawPhone: hasValidPhone ? cleanPhone : undefined,
    maskedEmail,
    maskedPhone,
    availableMethods,
    defaultMethod,
    verified: false,
    createdAt: now,
    expiresAt: now + CHALLENGE_LIFETIME_MS,
    verifyAttempts: 0,
    clientIp,
  };

  challengeStore.set(challengeId, record);

  return {
    success: true,
    message: 'Identity found. Ownership verification required.',
    challengeId,
    maskedEmail,
    maskedPhone,
    availableMethods,
    defaultMethod,
  };
}

/**
 * Sends OTP to the securely stored contact details associated with challengeId
 */
export async function sendGuestChallengeOtp({
  challengeId,
  method,
  clientIp,
}: {
  challengeId: string;
  method?: VerificationDeliveryMethod;
  clientIp: string;
}): Promise<{
  success: boolean;
  message: string;
  method?: VerificationDeliveryMethod;
  maskedDestination?: string;
  cooldownSeconds?: number;
  errorType?: string;
}> {
  const record = challengeStore.get(challengeId);
  if (!record) {
    return {
      success: false,
      message: 'Verification challenge expired or invalid. Please start the search again.',
      errorType: 'INVALID_CHALLENGE',
    };
  }

  if (Date.now() > record.expiresAt) {
    challengeStore.delete(challengeId);
    return {
      success: false,
      message: 'Verification session expired. Please start the search again.',
      errorType: 'CHALLENGE_EXPIRED',
    };
  }

  if (record.verified) {
    return {
      success: false,
      message: 'This verification challenge has already been completed.',
      errorType: 'ALREADY_VERIFIED',
    };
  }

  // Determine requested delivery method
  const chosenMethod: VerificationDeliveryMethod =
    method && record.availableMethods.includes(method)
      ? method
      : record.defaultMethod;

  // Enforce resend cooldown (60 seconds)
  const now = Date.now();
  if (record.lastSentAt && now - record.lastSentAt < RESEND_COOLDOWN_MS) {
    const remainingSeconds = Math.ceil((RESEND_COOLDOWN_MS - (now - record.lastSentAt)) / 1000);
    return {
      success: false,
      message: `Please wait ${remainingSeconds} seconds before requesting another code.`,
      cooldownSeconds: remainingSeconds,
      errorType: 'RESEND_COOLDOWN',
    };
  }

  record.activeMethod = chosenMethod;
  record.lastSentAt = now;

  if (chosenMethod === 'email') {
    if (!record.rawEmail) {
      return {
        success: false,
        message: 'No registered email address found on this profile.',
        errorType: 'NO_EMAIL_ON_RECORD',
      };
    }

    const emailResult = await sendEmailOtp({
      email: record.rawEmail,
      guestName: 'CABU Guest',
      clientIp,
    });

    if (!emailResult.success) {
      return {
        success: false,
        message: emailResult.message || 'Failed to dispatch email verification code.',
        errorType: emailResult.errorType || 'EMAIL_SEND_FAILED',
      };
    }

    return {
      success: true,
      message: `Verification code sent to ${record.maskedEmail}.`,
      method: 'email',
      maskedDestination: record.maskedEmail,
      cooldownSeconds: 60,
    };
  } else {
    if (!record.rawPhone) {
      return {
        success: false,
        message: 'No registered phone number found on this profile.',
        errorType: 'NO_PHONE_ON_RECORD',
      };
    }

    const smsResult = await sendOtpToPhone({
      phone: record.rawPhone,
      ip: clientIp,
    });

    if (!smsResult.success) {
      return {
        success: false,
        message: smsResult.message || 'Failed to dispatch SMS verification code.',
        errorType: smsResult.errorType || 'SMS_SEND_FAILED',
      };
    }

    return {
      success: true,
      message: `Verification code sent via SMS to ${record.maskedPhone}.`,
      method: 'sms',
      maskedDestination: record.maskedPhone,
      cooldownSeconds: 60,
    };
  }
}

/**
 * Verifies submitted OTP against the active method for the challenge
 */
export function verifyGuestChallengeOtp({
  challengeId,
  otp,
}: {
  challengeId: string;
  otp: string;
}): {
  success: boolean;
  verified: boolean;
  message: string;
  verificationToken?: string;
  attendeeId?: string;
  purpose?: VerificationPurpose;
  errorType?: string;
} {
  const record = challengeStore.get(challengeId);
  if (!record) {
    return {
      success: false,
      verified: false,
      message: 'Verification challenge expired or invalid. Please start the search again.',
      errorType: 'INVALID_CHALLENGE',
    };
  }

  if (Date.now() > record.expiresAt) {
    challengeStore.delete(challengeId);
    return {
      success: false,
      verified: false,
      message: 'Verification session has expired. Please perform the search again.',
      errorType: 'CHALLENGE_EXPIRED',
    };
  }

  if (record.verifyAttempts >= MAX_VERIFY_ATTEMPTS) {
    challengeStore.delete(challengeId);
    return {
      success: false,
      verified: false,
      message: 'Too many incorrect attempts. For security, this verification session was closed. Please start again.',
      errorType: 'MAX_ATTEMPTS_EXCEEDED',
    };
  }

  const cleanOtp = (otp || '').trim();
  if (!cleanOtp || cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
    return {
      success: false,
      verified: false,
      message: 'Please enter the full 6-digit verification code.',
      errorType: 'INVALID_FORMAT',
    };
  }

  let verifyResult: { success: boolean; verified: boolean; message: string; errorType?: string };

  if (record.activeMethod === 'email') {
    if (!record.rawEmail) {
      return {
        success: false,
        verified: false,
        message: 'No registered email found for this session.',
        errorType: 'NO_EMAIL',
      };
    }
    verifyResult = verifySubmittedEmailOtp({
      email: record.rawEmail,
      otp: cleanOtp,
    });
  } else {
    if (!record.rawPhone) {
      return {
        success: false,
        verified: false,
        message: 'No registered phone number found for this session.',
        errorType: 'NO_PHONE',
      };
    }
    verifyResult = verifySubmittedOtp({
      phone: record.rawPhone,
      otp: cleanOtp,
    });
  }

  if (!verifyResult.success || !verifyResult.verified) {
    record.verifyAttempts += 1;
    const remaining = MAX_VERIFY_ATTEMPTS - record.verifyAttempts;
    return {
      success: false,
      verified: false,
      message:
        remaining > 0
          ? `${verifyResult.message} (${remaining} attempt${remaining === 1 ? '' : 's'} remaining)`
          : 'Too many incorrect attempts. Verification session closed.',
      errorType: verifyResult.errorType || 'INCORRECT_CODE',
    };
  }

  // Verification Succeeded
  record.verified = true;
  record.verifiedAt = Date.now();
  record.verifiedToken = `tok_${crypto.randomBytes(32).toString('hex')}`;

  return {
    success: true,
    verified: true,
    message: 'Identity ownership verified successfully.',
    verificationToken: record.verifiedToken,
    attendeeId: record.attendeeId,
    purpose: record.purpose,
  };
}

/**
 * Validates a single-use verification token
 */
export function validateVerificationToken(token: string): {
  valid: boolean;
  attendeeId?: string;
  purpose?: VerificationPurpose;
} {
  if (!token || typeof token !== 'string') return { valid: false };

  for (const [challengeId, record] of challengeStore.entries()) {
    if (record.verifiedToken === token && record.verified) {
      if (Date.now() <= record.expiresAt) {
        // Token is valid; invalidate it so it cannot be reused
        challengeStore.delete(challengeId);
        return {
          valid: true,
          attendeeId: record.attendeeId,
          purpose: record.purpose,
        };
      } else {
        challengeStore.delete(challengeId);
        return { valid: false };
      }
    }
  }

  return { valid: false };
}
