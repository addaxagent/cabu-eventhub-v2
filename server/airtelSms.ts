import crypto from 'crypto';

export type SmsStage =
  | 'SMS_ROUTE_REACHED'
  | 'AIRTEL_CONFIG_VALIDATED'
  | 'PHONE_NORMALIZED'
  | 'SMS_PAYLOAD_GENERATED'
  | 'AIRTEL_REQUEST_SENT'
  | 'AIRTEL_RESPONSE_RECEIVED'
  | 'SMS_ACCEPTED'
  | 'SMS_FAILED';

export interface SmsTraceStep {
  stage: SmsStage;
  timestamp: string;
  status: 'SUCCESS' | 'FAILED' | 'INFO';
  detail: string;
  data?: Record<string, any> | string;
}

export type SmsFailureClassification =
  | 'CONFIG_MISSING'
  | 'INVALID_PHONE'
  | 'AUTH_FAILURE_401'
  | 'PERMISSION_DENIED_403'
  | 'BAD_REQUEST_400'
  | 'GATEWAY_ERROR_5XX'
  | 'NETWORK_EXCEPTION'
  | 'PROVIDER_REJECTED'
  | 'SUCCESS';

export interface SafeSmsLog {
  id: string;
  timestamp: string;
  purpose: 'OTP_VERIFICATION' | 'TEST_SMS' | 'OTHER';
  originalPhone: string;
  normalizedPhone: string;
  maskedPhone: string;
  apiUrl: string;
  httpMethod: string;
  contentType: string;
  senderId: string;
  maskedCustomerId: string;
  maskedSubAccountId: string;
  maskedUsername: string;
  messageLength: number;
  maskedMessagePreview: string;
  httpStatus: number | null;
  responseContentType?: string;
  responseBody?: any;
  providerReference?: string;
  providerMessage?: string;
  success: boolean;
  finalStage: SmsStage;
  failureClassification: SmsFailureClassification;
  errorMessage?: string;
  trace: SmsTraceStep[];
}

interface OtpRecord {
  phone: string; // normalized 260XXXXXXXXX
  otpHash: string;
  salt: string;
  createdAt: number;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
  verified: boolean;
  verifiedAt?: number;
}

// In-memory OTP storage
const otpStore = new Map<string, OtpRecord>();

// In-memory rate-limit trackers
const phoneSendTimestamps = new Map<string, number[]>();
const ipSendTimestamps = new Map<string, number[]>();

// In-memory safe SMS log buffer (max 150 entries)
const smsLogs: SafeSmsLog[] = [];

function addSafeLog(log: SafeSmsLog) {
  smsLogs.unshift(log);
  if (smsLogs.length > 150) {
    smsLogs.pop();
  }
}

/**
 * Normalizes a phone number to standard Zambian format: 260XXXXXXXXX
 * Handles:
 * - 0770782602   -> 260770782602
 * - +260770782602 -> 260770782602
 * - 260770782602  -> 260770782602
 */
export function normalizeZambianPhone(input: string): {
  isValid: boolean;
  normalized: string;
  displayFormatted: string;
  originalInput: string;
} {
  if (!input || typeof input !== 'string') {
    return { isValid: false, normalized: '', displayFormatted: '', originalInput: String(input || '') };
  }

  const clean = input.trim();
  const digitsOnly = clean.replace(/\D/g, '');
  let subscriber = digitsOnly;

  if (subscriber.startsWith('260')) {
    subscriber = subscriber.slice(3);
  }
  if (subscriber.startsWith('0')) {
    subscriber = subscriber.slice(1);
  }

  // Must be exactly 9 digits starting with valid Zambian mobile prefixes:
  // 97 (Airtel), 96 (MTN), 95 (Zamtel), 98 (Zedmobile/future),
  // 77 (Airtel), 76 (MTN), 75 (Zamtel), 79 (Zedmobile), 71 (Beeline)
  const isValid = /^(97|96|95|98|77|76|75|79|71)\d{7}$/.test(subscriber);
  const normalized = isValid ? `260${subscriber}` : '';
  const displayFormatted = isValid
    ? `+260 ${subscriber.slice(0, 2)} ${subscriber.slice(2, 5)} ${subscriber.slice(5)}`
    : clean;

  return { isValid, normalized, displayFormatted, originalInput: clean };
}

/**
 * Masks a phone number for safe diagnostic display (e.g. 26077*****02)
 */
export function maskPhone(phone: string): string {
  if (!phone) return '***';
  const clean = phone.replace(/\D/g, '');
  if (clean.length < 7) return '***';
  const prefix = clean.startsWith('260') ? clean.slice(0, 5) : clean.slice(0, 4);
  const suffix = clean.slice(-2);
  return `${prefix}*****${suffix}`;
}

/**
 * Masks sensitive configuration IDs (e.g. Customer ID or SubAccount ID)
 */
export function maskIdentifier(val: string): string {
  if (!val) return '(empty)';
  if (val.length <= 4) return '****';
  return `${val.slice(0, 2)}****${val.slice(-2)}`;
}

/**
 * Masks OTP numbers in messages so raw codes are never logged
 */
export function maskOtpMessage(msg: string): string {
  if (!msg) return '';
  return msg.replace(/\b\d{6}\b/g, '******');
}

/**
 * Generates a cryptographically secure 6-digit numeric OTP
 */
function generateSecureOtp(): string {
  const code = crypto.randomInt(100000, 1000000);
  return code.toString();
}

/**
 * Hashes OTP using HMAC-SHA256 with a unique salt
 */
function hashOtp(otp: string, salt: string): string {
  return crypto.createHmac('sha256', salt).update(otp.trim()).digest('hex');
}

/**
 * Checks and updates rate limits (e.g. max 5 requests per 15 minutes)
 */
function checkRateLimit(key: string, map: Map<string, number[]>, maxCount = 5, windowMs = 15 * 60 * 1000): boolean {
  const now = Date.now();
  const timestamps = (map.get(key) || []).filter((t) => now - t < windowMs);
  if (timestamps.length >= maxCount) {
    return false;
  }
  timestamps.push(now);
  map.set(key, timestamps);
  return true;
}

/**
 * Core Airtel SMS HTTP Sender with Detailed Safe Request Tracing
 */
export async function sendAirtelSms({
  phone,
  message,
  purpose = 'OTP_VERIFICATION',
}: {
  phone: string;
  message: string;
  purpose?: 'OTP_VERIFICATION' | 'TEST_SMS' | 'OTHER';
}): Promise<{
  success: boolean;
  httpStatus: number | null;
  error?: string;
  providerResponse?: any;
  log: SafeSmsLog;
  trace: SmsTraceStep[];
}> {
  const trace: SmsTraceStep[] = [];
  const logId = `sms-log-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const nowIso = new Date().toISOString();

  const addTrace = (stage: SmsStage, status: 'SUCCESS' | 'FAILED' | 'INFO', detail: string, data?: any) => {
    trace.push({
      stage,
      timestamp: new Date().toISOString(),
      status,
      detail,
      data,
    });
  };

  // Stage 1: SMS Route Reached
  addTrace('SMS_ROUTE_REACHED', 'SUCCESS', `Inbound ${purpose} dispatch request received by Node.js server.`, {
    rawPhoneInput: phone,
    purpose,
    messageLength: message?.length || 0,
  });

  // Stage 2: Phone Normalization
  const phoneResult = normalizeZambianPhone(phone);
  const normalized = phoneResult.normalized;
  const masked = maskPhone(normalized || phone);

  if (!phoneResult.isValid || !normalized) {
    const err = 'Invalid Zambian phone number. Must be 9 digits (e.g. 0770782602 or +260770782602).';
    addTrace('PHONE_NORMALIZED', 'FAILED', err, {
      rawInput: phone,
    });
    addTrace('SMS_FAILED', 'FAILED', `Process aborted: ${err}`);

    const safeLog: SafeSmsLog = {
      id: logId,
      timestamp: nowIso,
      purpose,
      originalPhone: phone,
      normalizedPhone: normalized || '(invalid)',
      maskedPhone: masked,
      apiUrl: process.env.AIRTEL_SMS_BASE_URL || 'https://www.airtel.co.zm/gateway/v1/sendDefaultSms',
      httpMethod: 'POST',
      contentType: 'application/json',
      senderId: process.env.AIRTEL_SMS_SENDER_ID || 'CABU',
      maskedCustomerId: maskIdentifier(process.env.AIRTEL_SMS_CUSTOMER_ID || ''),
      maskedSubAccountId: maskIdentifier(process.env.AIRTEL_SMS_SUBACCOUNT_ID || ''),
      maskedUsername: maskIdentifier(process.env.AIRTEL_SMS_USERNAME || ''),
      messageLength: message?.length || 0,
      maskedMessagePreview: maskOtpMessage(message),
      httpStatus: null,
      success: false,
      finalStage: 'SMS_FAILED',
      failureClassification: 'INVALID_PHONE',
      errorMessage: err,
      trace,
    };
    addSafeLog(safeLog);

    return {
      success: false,
      httpStatus: null,
      error: err,
      log: safeLog,
      trace,
    };
  }

  addTrace('PHONE_NORMALIZED', 'SUCCESS', `Phone normalized successfully to canonical format: ${normalized}`, {
    originalInput: phone,
    canonicalDestination: normalized,
    displayFormatted: phoneResult.displayFormatted,
  });

  // Stage 3: Airtel Configuration Validation
  const customerId = process.env.AIRTEL_SMS_CUSTOMER_ID || '';
  const username = process.env.AIRTEL_SMS_USERNAME || '';
  const password = process.env.AIRTEL_SMS_PASSWORD || '';
  const subAccountId = process.env.AIRTEL_SMS_SUBACCOUNT_ID || '';
  const senderId = process.env.AIRTEL_SMS_SENDER_ID || 'CABU';
  const baseUrl = process.env.AIRTEL_SMS_BASE_URL || 'https://www.airtel.co.zm/gateway/v1/sendDefaultSms';

  const maskedCustId = maskIdentifier(customerId);
  const maskedSubId = maskIdentifier(subAccountId);
  const maskedUser = maskIdentifier(username);

  const missingEnvVars: string[] = [];
  if (!customerId) missingEnvVars.push('AIRTEL_SMS_CUSTOMER_ID');
  if (!username) missingEnvVars.push('AIRTEL_SMS_USERNAME');
  if (!password) missingEnvVars.push('AIRTEL_SMS_PASSWORD');
  if (!subAccountId) missingEnvVars.push('AIRTEL_SMS_SUBACCOUNT_ID');

  const isConfigured = missingEnvVars.length === 0;

  if (!isConfigured) {
    const err = `Airtel SMS configuration missing server environment variables: ${missingEnvVars.join(', ')}`;
    addTrace('AIRTEL_CONFIG_VALIDATED', 'FAILED', err, {
      missingVariables: missingEnvVars,
      customerIdPresent: Boolean(customerId),
      usernamePresent: Boolean(username),
      passwordPresent: Boolean(password),
      subAccountIdPresent: Boolean(subAccountId),
    });
    addTrace('SMS_FAILED', 'FAILED', `Process stopped at config validation: ${err}`);

    const safeLog: SafeSmsLog = {
      id: logId,
      timestamp: nowIso,
      purpose,
      originalPhone: phone,
      normalizedPhone: normalized,
      maskedPhone: masked,
      apiUrl: baseUrl,
      httpMethod: 'POST',
      contentType: 'application/json',
      senderId,
      maskedCustomerId: maskedCustId,
      maskedSubAccountId: maskedSubId,
      maskedUsername: maskedUser,
      messageLength: message?.length || 0,
      maskedMessagePreview: maskOtpMessage(message),
      httpStatus: null,
      success: false,
      finalStage: 'SMS_FAILED',
      failureClassification: 'CONFIG_MISSING',
      errorMessage: err,
      trace,
    };
    addSafeLog(safeLog);

    return {
      success: false,
      httpStatus: null,
      error: err,
      log: safeLog,
      trace,
    };
  }

  addTrace('AIRTEL_CONFIG_VALIDATED', 'SUCCESS', 'Airtel SMS credentials and configuration verified on server.', {
    customerId: maskedCustId,
    username: maskedUser,
    subAccountId: maskedSubId,
    senderId,
    endpoint: baseUrl,
  });

  // Stage 4: SMS Payload Generated
  const requestBody = {
    customerId,
    senderId,
    destinationAddress: [normalized],
    message,
    metaData: {
      subAccountId,
    },
  };

  const safePayloadPreview = {
    customerId: maskedCustId,
    senderId,
    destinationAddress: [normalized],
    message: maskOtpMessage(message),
    metaData: {
      subAccountId: maskedSubId,
    },
  };

  addTrace('SMS_PAYLOAD_GENERATED', 'SUCCESS', `Airtel JSON payload created (Destination: ${normalized}, SenderID: ${senderId}).`, {
    safePayload: safePayloadPreview,
    messageLength: message.length,
  });

  // Stage 5: Airtel Request Sent
  const basicAuth = Buffer.from(`${username}:${password}`).toString('base64');
  addTrace('AIRTEL_REQUEST_SENT', 'INFO', `Dispatching HTTPS POST request to Airtel SMS Gateway at ${baseUrl}...`, {
    method: 'POST',
    url: baseUrl,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': 'Basic [PROTECTED_SERVER_CREDENTIALS]',
    },
  });

  let httpStatus: number | null = null;
  let responseText = '';
  let responseContentType = '';
  let parsedResponse: any = null;

  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${basicAuth}`,
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    httpStatus = response.status;
    responseContentType = response.headers.get('content-type') || '';
    responseText = await response.text();

    try {
      parsedResponse = JSON.parse(responseText);
    } catch {
      parsedResponse = { rawText: responseText.slice(0, 1000) };
    }

    // Stage 6: Airtel Response Received
    addTrace('AIRTEL_RESPONSE_RECEIVED', response.ok ? 'SUCCESS' : 'FAILED', `Airtel gateway returned HTTP ${httpStatus}.`, {
      httpStatus,
      contentType: responseContentType,
      responseBody: parsedResponse,
    });

    let failureClass: SmsFailureClassification = 'SUCCESS';
    let specificError: string | undefined = undefined;
    let providerRef: string | undefined = undefined;
    let providerMsg: string | undefined = undefined;

    if (parsedResponse && typeof parsedResponse === 'object') {
      providerRef = parsedResponse.referenceId || parsedResponse.trackingId || parsedResponse.transactionId || parsedResponse.refNo;
      providerMsg = parsedResponse.message || parsedResponse.description || parsedResponse.statusDesc || parsedResponse.msg;
    }

    if (httpStatus === 200 || httpStatus === 201 || httpStatus === 202) {
      // Check if provider returned inner error status in 200 OK body
      if (parsedResponse?.status === 'FAILED' || parsedResponse?.statusCode >= 400 || parsedResponse?.error) {
        failureClass = 'PROVIDER_REJECTED';
        specificError = providerMsg || parsedResponse?.error || `Airtel rejected payload with status ${parsedResponse?.status}`;
      } else {
        failureClass = 'SUCCESS';
      }
    } else if (httpStatus === 401) {
      failureClass = 'AUTH_FAILURE_401';
      specificError = `Airtel Basic Authentication Failed (HTTP 401). Verify AIRTEL_SMS_USERNAME and AIRTEL_SMS_PASSWORD. Provider response: ${providerMsg || responseText.slice(0, 200)}`;
    } else if (httpStatus === 403) {
      failureClass = 'PERMISSION_DENIED_403';
      specificError = `Airtel Permission Denied (HTTP 403). Customer ID (${maskedCustId}), SubAccount ID (${maskedSubId}), or Sender ID (${senderId}) not authorized. Provider response: ${providerMsg || responseText.slice(0, 200)}`;
    } else if (httpStatus === 400) {
      failureClass = 'BAD_REQUEST_400';
      specificError = `Airtel Bad Request (HTTP 400). Check payload parameters and format. Provider response: ${providerMsg || responseText.slice(0, 200)}`;
    } else if (httpStatus >= 500) {
      failureClass = 'GATEWAY_ERROR_5XX';
      specificError = `Airtel SMS Gateway Internal Error (HTTP ${httpStatus}). Provider response: ${providerMsg || responseText.slice(0, 200)}`;
    } else {
      failureClass = 'PROVIDER_REJECTED';
      specificError = `Airtel gateway returned HTTP ${httpStatus}. Provider response: ${providerMsg || responseText.slice(0, 200)}`;
    }

    const isSuccess = failureClass === 'SUCCESS';

    if (isSuccess) {
      addTrace('SMS_ACCEPTED', 'SUCCESS', `Airtel accepted SMS for delivery to ${normalized} (Sender: ${senderId}).`, {
        reference: providerRef || '(provider accepted)',
        message: providerMsg || 'SMS queued successfully',
      });
    } else {
      addTrace('SMS_FAILED', 'FAILED', specificError || `Airtel dispatch failed with HTTP ${httpStatus}`, {
        classification: failureClass,
        providerMessage: providerMsg,
        providerReference: providerRef,
      });
    }

    const safeLog: SafeSmsLog = {
      id: logId,
      timestamp: nowIso,
      purpose,
      originalPhone: phone,
      normalizedPhone: normalized,
      maskedPhone: masked,
      apiUrl: baseUrl,
      httpMethod: 'POST',
      contentType: 'application/json',
      senderId,
      maskedCustomerId: maskedCustId,
      maskedSubAccountId: maskedSubId,
      maskedUsername: maskedUser,
      messageLength: message.length,
      maskedMessagePreview: maskOtpMessage(message),
      httpStatus,
      responseContentType,
      responseBody: parsedResponse,
      providerReference: providerRef,
      providerMessage: providerMsg,
      success: isSuccess,
      finalStage: isSuccess ? 'SMS_ACCEPTED' : 'SMS_FAILED',
      failureClassification: failureClass,
      errorMessage: specificError,
      trace,
    };

    addSafeLog(safeLog);

    return {
      success: isSuccess,
      httpStatus,
      error: specificError,
      providerResponse: parsedResponse,
      log: safeLog,
      trace,
    };
  } catch (error: any) {
    const netErr = error.message || 'Network exception while connecting to Airtel SMS gateway';
    addTrace('AIRTEL_RESPONSE_RECEIVED', 'FAILED', `Network/fetch failure connecting to ${baseUrl}: ${netErr}`, {
      errorMessage: netErr,
    });
    addTrace('SMS_FAILED', 'FAILED', `Process failed due to network exception: ${netErr}`);

    const safeLog: SafeSmsLog = {
      id: logId,
      timestamp: nowIso,
      purpose,
      originalPhone: phone,
      normalizedPhone: normalized,
      maskedPhone: masked,
      apiUrl: baseUrl,
      httpMethod: 'POST',
      contentType: 'application/json',
      senderId,
      maskedCustomerId: maskedCustId,
      maskedSubAccountId: maskedSubId,
      maskedUsername: maskedUser,
      messageLength: message.length,
      maskedMessagePreview: maskOtpMessage(message),
      httpStatus: null,
      success: false,
      finalStage: 'SMS_FAILED',
      failureClassification: 'NETWORK_EXCEPTION',
      errorMessage: netErr,
      trace,
    };

    addSafeLog(safeLog);

    return {
      success: false,
      httpStatus: null,
      error: netErr,
      log: safeLog,
      trace,
    };
  }
}

/**
 * Sends OTP to a phone number
 */
export async function sendOtpToPhone({
  phone,
  ip = 'unknown',
}: {
  phone: string;
  ip?: string;
}): Promise<{
  success: boolean;
  message: string;
  cooldownSeconds?: number;
  errorType?: string;
  logId?: string;
  trace?: SmsTraceStep[];
}> {
  const { isValid, normalized, displayFormatted } = normalizeZambianPhone(phone);
  if (!isValid) {
    return {
      success: false,
      message: 'Please provide a valid 9-digit Zambian mobile number (e.g. 0770782602, 0977123456, or +260770782602).',
      errorType: 'INVALID_PHONE',
    };
  }

  const now = Date.now();

  // 1. Check Rate Limits (Max 5 requests per 15 min per phone / IP)
  if (!checkRateLimit(normalized, phoneSendTimestamps, 5, 15 * 60 * 1000)) {
    return {
      success: false,
      message: 'Too many verification code requests for this phone number. Please wait 15 minutes before trying again.',
      errorType: 'RATE_LIMITED',
    };
  }

  if (ip !== 'unknown' && !checkRateLimit(ip, ipSendTimestamps, 15, 15 * 60 * 1000)) {
    return {
      success: false,
      message: 'Too many verification requests from this device. Please wait 15 minutes.',
      errorType: 'RATE_LIMITED',
    };
  }

  // 2. Check 60-second Resend Cooldown
  const existingRecord = otpStore.get(normalized);
  if (existingRecord && now - existingRecord.lastSentAt < 60 * 1000) {
    const remainingSeconds = Math.ceil((60 * 1000 - (now - existingRecord.lastSentAt)) / 1000);
    return {
      success: false,
      message: `Please wait ${remainingSeconds} seconds before requesting a new verification code.`,
      cooldownSeconds: remainingSeconds,
      errorType: 'COOLDOWN_ACTIVE',
    };
  }

  // 3. Generate 6-digit numeric OTP & Salt
  const otp = generateSecureOtp();
  const salt = crypto.randomBytes(16).toString('hex');
  const hashedOtp = hashOtp(otp, salt);

  const otpRecord: OtpRecord = {
    phone: normalized,
    otpHash: hashedOtp,
    salt,
    createdAt: now,
    expiresAt: now + 5 * 60 * 1000, // 5 minutes expiry
    attempts: 0,
    lastSentAt: now,
    verified: false,
  };

  // 4. Dispatch SMS via Airtel
  const smsText = `Your CABU EventHub verification code is ${otp}. It expires in 5 minutes. Do not share this code.`;

  const sendResult = await sendAirtelSms({
    phone: normalized,
    message: smsText,
    purpose: 'OTP_VERIFICATION',
  });

  if (!sendResult.success) {
    // Do not save OTP if delivery failed
    return {
      success: false,
      message: sendResult.error || 'We could not send your verification code. Please try again shortly.',
      errorType: sendResult.log.failureClassification || 'SMS_DELIVERY_FAILED',
      logId: sendResult.log.id,
      trace: sendResult.trace,
    };
  }

  // 5. Store OTP record in memory only after successful SMS dispatch
  otpStore.set(normalized, otpRecord);

  return {
    success: true,
    message: `Verification code sent to ${displayFormatted}.`,
    cooldownSeconds: 60,
    logId: sendResult.log.id,
    trace: sendResult.trace,
  };
}

/**
 * Verifies submitted OTP
 */
export function verifySubmittedOtp({
  phone,
  otp,
}: {
  phone: string;
  otp: string;
}): {
  success: boolean;
  verified: boolean;
  message: string;
  phone?: string;
  normalizedPhone?: string;
  errorType?: string;
} {
  const { isValid, normalized } = normalizeZambianPhone(phone);
  if (!isValid) {
    return {
      success: false,
      verified: false,
      message: 'Invalid phone number format.',
      errorType: 'INVALID_PHONE',
    };
  }

  const record = otpStore.get(normalized);
  const now = Date.now();

  if (!record || !record.otpHash) {
    return {
      success: false,
      verified: false,
      message: 'No active verification code found for this phone number. Please request a new code.',
      errorType: 'NO_OTP_FOUND',
    };
  }

  // Check if expired (5 minutes)
  if (now > record.expiresAt) {
    otpStore.delete(normalized);
    return {
      success: false,
      verified: false,
      message: 'This verification code has expired. Please request a new code.',
      errorType: 'OTP_EXPIRED',
    };
  }

  // Check attempt limit (max 5 attempts)
  if (record.attempts >= 5) {
    otpStore.delete(normalized);
    return {
      success: false,
      verified: false,
      message: 'Maximum verification attempts exceeded (5/5). Please request a new verification code.',
      errorType: 'MAX_ATTEMPTS_EXCEEDED',
    };
  }

  record.attempts += 1;

  // Verify hash
  const submittedHash = hashOtp(otp, record.salt);
  if (submittedHash !== record.otpHash) {
    const remainingAttempts = 5 - record.attempts;
    if (remainingAttempts <= 0) {
      otpStore.delete(normalized);
      return {
        success: false,
        verified: false,
        message: 'Invalid verification code. Maximum attempts reached. Please request a new code.',
        errorType: 'MAX_ATTEMPTS_EXCEEDED',
      };
    }
    return {
      success: false,
      verified: false,
      message: `Incorrect verification code. ${remainingAttempts} attempt${remainingAttempts === 1 ? '' : 's'} remaining.`,
      errorType: 'INVALID_OTP',
    };
  }

  // Verification Succeeded: Mark verified and invalidate active OTP single-use hash
  record.verified = true;
  record.verifiedAt = now;
  record.otpHash = ''; // Invalidate OTP hash immediately so it cannot be reused

  return {
    success: true,
    verified: true,
    message: 'Phone number verified successfully.',
    phone: normalized,
    normalizedPhone: `+${normalized}`,
  };
}

/**
 * Checks whether a phone number has been verified in the current server session
 */
export function isPhoneVerifiedOnServer(phone: string): boolean {
  const { isValid, normalized } = normalizeZambianPhone(phone);
  if (!isValid) return false;
  const record = otpStore.get(normalized);
  return Boolean(record && record.verified);
}

/**
 * Returns safe Airtel SMS configuration health status without exposing any secrets
 */
export function getAirtelConfigStatus() {
  const customerId = process.env.AIRTEL_SMS_CUSTOMER_ID || '';
  const username = process.env.AIRTEL_SMS_USERNAME || '';
  const password = process.env.AIRTEL_SMS_PASSWORD || '';
  const subAccountId = process.env.AIRTEL_SMS_SUBACCOUNT_ID || '';
  const senderId = process.env.AIRTEL_SMS_SENDER_ID || 'CABU';
  const baseUrl = process.env.AIRTEL_SMS_BASE_URL || 'https://www.airtel.co.zm/gateway/v1/sendDefaultSms';

  const isConfigured = Boolean(customerId && username && password && subAccountId);

  return {
    configured: isConfigured,
    senderId,
    endpoint: baseUrl,
    runtimeEnv: process.env.NODE_ENV || 'production',
    customerIdPresent: Boolean(customerId),
    maskedCustomerId: maskIdentifier(customerId),
    usernamePresent: Boolean(username),
    maskedUsername: maskIdentifier(username),
    passwordPresent: Boolean(password),
    subAccountIdPresent: Boolean(subAccountId),
    maskedSubAccountId: maskIdentifier(subAccountId),
    missingEnvVars: [
      !customerId && 'AIRTEL_SMS_CUSTOMER_ID',
      !username && 'AIRTEL_SMS_USERNAME',
      !password && 'AIRTEL_SMS_PASSWORD',
      !subAccountId && 'AIRTEL_SMS_SUBACCOUNT_ID',
    ].filter(Boolean),
  };
}

/**
 * Returns safe SMS logs
 */
export function getSafeSmsLogs(): SafeSmsLog[] {
  return [...smsLogs];
}

/**
 * Returns a specific safe log by ID
 */
export function getSafeSmsLogById(id: string): SafeSmsLog | undefined {
  return smsLogs.find((l) => l.id === id);
}

