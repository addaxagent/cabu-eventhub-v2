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
  | 'AIRTEL_CONFIG_MISSING'
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
  provider: string; // 'Airtel'
  channel: string;  // 'SMS'
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
  messageRequestId?: string;
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
 * Strict validator for runtime environment variables.
 * Confirms non-empty string after trimming, and never treats documentation
 * placeholders, fake defaults, or sample dummy IDs as configured.
 */
export const hasValue = (value?: string): boolean => {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('your_') ||
    lower.includes('placeholder') ||
    lower.includes('some-default') ||
    lower === 'secret' ||
    lower === '<secret>' ||
    lower === 'undefined' ||
    lower === 'null'
  ) {
    return false;
  }
  return true;
};

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
      provider: 'Airtel',
      channel: 'SMS',
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
  const rawCustomerId = process.env.AIRTEL_SMS_CUSTOMER_ID;
  const rawUsername = process.env.AIRTEL_SMS_USERNAME;
  const rawPassword = process.env.AIRTEL_SMS_PASSWORD;
  const rawSubAccountId = process.env.AIRTEL_SMS_SUBACCOUNT_ID;
  const senderId = (process.env.AIRTEL_SMS_SENDER_ID || '').trim() || 'CABU';
  const baseUrl = (process.env.AIRTEL_SMS_BASE_URL || '').trim() || 'https://www.airtel.co.zm/gateway/v1/sendDefaultSms';

  const customerIdConfigured = hasValue(rawCustomerId);
  const subAccountIdConfigured = hasValue(rawSubAccountId);
  const usernameConfigured = hasValue(rawUsername);
  const passwordConfigured = hasValue(rawPassword);

  const missingEnvVars: string[] = [];
  if (!customerIdConfigured) missingEnvVars.push('AIRTEL_SMS_CUSTOMER_ID');
  if (!subAccountIdConfigured) missingEnvVars.push('AIRTEL_SMS_SUBACCOUNT_ID');
  if (!usernameConfigured) missingEnvVars.push('AIRTEL_SMS_USERNAME');
  if (!passwordConfigured) missingEnvVars.push('AIRTEL_SMS_PASSWORD');

  const isConfigured = missingEnvVars.length === 0;

  const maskedCustId = customerIdConfigured ? maskIdentifier(rawCustomerId!) : '(not configured)';
  const maskedSubId = subAccountIdConfigured ? maskIdentifier(rawSubAccountId!) : '(not configured)';
  const maskedUser = usernameConfigured ? maskIdentifier(rawUsername!) : '(not configured)';

  if (!isConfigured) {
    const err = `Airtel SMS configuration incomplete. Missing: ${missingEnvVars.join(', ')}`;
    addTrace('AIRTEL_CONFIG_VALIDATED', 'FAILED', err, {
      missingVariables: missingEnvVars,
      customerIdConfigured,
      subAccountIdConfigured,
      usernameConfigured,
      passwordConfigured,
    });
    addTrace('SMS_FAILED', 'FAILED', `Process stopped at config validation: ${err}`);

    const safeLog: SafeSmsLog = {
      id: logId,
      timestamp: nowIso,
      provider: 'Airtel',
      channel: 'SMS',
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
      failureClassification: 'AIRTEL_CONFIG_MISSING',
      errorMessage: err,
      trace,
    };
    addSafeLog(safeLog);

    return {
      success: false,
      httpStatus: null,
      error: 'AIRTEL_CONFIG_MISSING',
      log: safeLog,
      trace,
    };
  }

  // Trim accidental leading/trailing whitespace from runtime credentials
  const cleanCustomerId = rawCustomerId!.trim();
  const cleanUsername = rawUsername!.trim();
  const cleanSubAccountId = rawSubAccountId!.trim();
  // Do not modify the password except where technically required
  const cleanPassword = rawPassword!;

  addTrace('AIRTEL_CONFIG_VALIDATED', 'SUCCESS', 'Airtel SMS credentials and configuration verified on server.', {
    customerId: maskedCustId,
    username: maskedUser,
    subAccountId: maskedSubId,
    senderId,
    endpoint: baseUrl,
  });

  // Stage 4: SMS Payload Generated (Matches working Postman request)
  const requestBody = {
    customerId: cleanCustomerId,
    senderId,
    destinationAddress: [normalized],
    message,
    metaData: {
      subAccountId: cleanSubAccountId,
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
  // Authorization Type: Basic Auth (dynamically encoded using runtime username and password)
  const basicAuth = Buffer.from(`${cleanUsername}:${cleanPassword}`).toString('base64');
  addTrace('AIRTEL_REQUEST_SENT', 'INFO', `Dispatching HTTPS POST request to Airtel SMS Gateway at ${baseUrl}...`, {
    method: 'POST',
    url: baseUrl,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': 'Basic [DYNAMIC_RUNTIME_BASIC_AUTH]',
    },
  });

  let httpStatus: number | null = null;
  let responseText = '';
  let responseContentType = '';
  let parsedResponse: any = null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000); // 12-second provider timeout guard

  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${basicAuth}`,
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

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
    let messageRequestId: string | undefined = undefined;
    let providerRef: string | undefined = undefined;
    let providerMsg: string | undefined = undefined;

    if (parsedResponse && typeof parsedResponse === 'object') {
      messageRequestId =
        parsedResponse.messageRequestId ||
        parsedResponse.message_request_id ||
        parsedResponse.referenceId ||
        parsedResponse.trackingId ||
        parsedResponse.transactionId ||
        parsedResponse.refNo;
      providerRef = messageRequestId;
      providerMsg = parsedResponse.message || parsedResponse.description || parsedResponse.statusDesc || parsedResponse.msg;
    }

    if (httpStatus >= 200 && httpStatus < 300) {
      // 2xx response from Airtel is treated as successful submission
      if (parsedResponse?.status === 'FAILED' || parsedResponse?.statusCode >= 400 || (parsedResponse?.error && !messageRequestId)) {
        failureClass = 'PROVIDER_REJECTED';
        specificError = providerMsg || parsedResponse?.error || `Airtel rejected payload with status ${parsedResponse?.status}`;
      } else {
        failureClass = 'SUCCESS';
      }
    } else if (httpStatus === 400) {
      failureClass = 'BAD_REQUEST_400';
      specificError = `Airtel validation/account error (HTTP 400). Check payload parameters and format. Provider response: ${providerMsg || responseText.slice(0, 200)}`;
    } else if (httpStatus === 401) {
      failureClass = 'AUTH_FAILURE_401';
      specificError = `Airtel authentication/configuration issue (HTTP 401). Verify AIRTEL_SMS_USERNAME and AIRTEL_SMS_PASSWORD. Provider response: ${providerMsg || responseText.slice(0, 200)}`;
    } else if (httpStatus === 403) {
      failureClass = 'PERMISSION_DENIED_403';
      specificError = `Airtel permission denied (HTTP 403). Customer ID (${maskedCustId}), SubAccount ID (${maskedSubId}), or Sender ID (${senderId}) not authorized. Provider response: ${providerMsg || responseText.slice(0, 200)}`;
    } else if (httpStatus >= 500) {
      failureClass = 'GATEWAY_ERROR_5XX';
      specificError = `Airtel service unavailable (HTTP ${httpStatus}). Provider response: ${providerMsg || responseText.slice(0, 200)}`;
    } else {
      failureClass = 'PROVIDER_REJECTED';
      specificError = `Airtel gateway returned HTTP ${httpStatus}. Provider response: ${providerMsg || responseText.slice(0, 200)}`;
    }

    const isSuccess = failureClass === 'SUCCESS';

    if (isSuccess) {
      addTrace('SMS_ACCEPTED', 'SUCCESS', `Airtel accepted SMS for delivery to ${normalized} (Sender: ${senderId}).`, {
        messageRequestId: messageRequestId || providerRef || '(provider accepted)',
        message: providerMsg || 'SMS queued successfully',
      });
    } else {
      addTrace('SMS_FAILED', 'FAILED', specificError || `Airtel dispatch failed with HTTP ${httpStatus}`, {
        classification: failureClass,
        providerMessage: providerMsg,
        providerReference: providerRef,
        messageRequestId,
      });
    }

    const safeLog: SafeSmsLog = {
      id: logId,
      timestamp: nowIso,
      provider: 'Airtel',
      channel: 'SMS',
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
      messageRequestId: messageRequestId || providerRef,
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
    clearTimeout(timeoutId);
    const isTimeout = error.name === 'AbortError' || error.message?.toLowerCase().includes('timeout') || error.code === 'ETIMEDOUT';
    const failureClass: SmsFailureClassification = isTimeout ? 'GATEWAY_ERROR_5XX' : 'NETWORK_EXCEPTION';
    const netErr = isTimeout
      ? 'Airtel SMS Gateway request timed out (temporary provider failure).'
      : (error.message || 'Network exception while connecting to Airtel SMS gateway');

    addTrace('AIRTEL_RESPONSE_RECEIVED', 'FAILED', `Network/fetch failure connecting to ${baseUrl}: ${netErr}`, {
      errorMessage: netErr,
      isTimeout,
    });
    addTrace('SMS_FAILED', 'FAILED', `Process failed due to network exception: ${netErr}`);

    const safeLog: SafeSmsLog = {
      id: logId,
      timestamp: nowIso,
      provider: 'Airtel',
      channel: 'SMS',
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
      failureClassification: failureClass,
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

  // 0. Pre-validate Airtel configuration
  const airtelStatus = getAirtelConfigStatus();
  if (!airtelStatus.configured) {
    return {
      success: false,
      message: 'SMS verification is temporarily unavailable. Please use Email verification.',
      errorType: 'AIRTEL_CONFIG_MISSING',
    };
  }

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
  const smsText = `Your CABU EventHub verification code is ${otp}. It expires in 5 minutes.`;

  const sendResult = await sendAirtelSms({
    phone: normalized,
    message: smsText,
    purpose: 'OTP_VERIFICATION',
  });

  if (!sendResult.success) {
    // Do not save OTP if delivery failed
    const isConfigMissing =
      sendResult.error === 'AIRTEL_CONFIG_MISSING' ||
      sendResult.log.failureClassification === 'AIRTEL_CONFIG_MISSING' ||
      sendResult.log.failureClassification === 'CONFIG_MISSING';

    const guestMessage = isConfigMissing
      ? 'SMS verification is temporarily unavailable. Please use Email verification.'
      : 'We could not send the SMS verification code right now. Please try again or use Email verification.';

    return {
      success: false,
      message: guestMessage,
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
  const rawCustomerId = process.env.AIRTEL_SMS_CUSTOMER_ID;
  const rawUsername = process.env.AIRTEL_SMS_USERNAME;
  const rawPassword = process.env.AIRTEL_SMS_PASSWORD;
  const rawSubAccountId = process.env.AIRTEL_SMS_SUBACCOUNT_ID;
  const senderId = (process.env.AIRTEL_SMS_SENDER_ID || '').trim() || 'CABU';
  const baseUrl = (process.env.AIRTEL_SMS_BASE_URL || '').trim() || 'https://www.airtel.co.zm/gateway/v1/sendDefaultSms';

  const customerIdConfigured = hasValue(rawCustomerId);
  const subAccountIdConfigured = hasValue(rawSubAccountId);
  const usernameConfigured = hasValue(rawUsername);
  const passwordConfigured = hasValue(rawPassword);
  const endpointConfigured = Boolean(baseUrl && baseUrl.startsWith('http'));

  const missingEnvVars: string[] = [];
  if (!customerIdConfigured) missingEnvVars.push('AIRTEL_SMS_CUSTOMER_ID');
  if (!subAccountIdConfigured) missingEnvVars.push('AIRTEL_SMS_SUBACCOUNT_ID');
  if (!usernameConfigured) missingEnvVars.push('AIRTEL_SMS_USERNAME');
  if (!passwordConfigured) missingEnvVars.push('AIRTEL_SMS_PASSWORD');

  const isConfigured = missingEnvVars.length === 0 && endpointConfigured;
  const lastLog = smsLogs.length > 0 ? smsLogs[0] : null;

  return {
    provider: 'Airtel Zambia',
    configured: isConfigured,
    senderId,
    endpoint: baseUrl,
    endpointConfigured,
    runtimeEnv: process.env.NODE_ENV || 'production',
    customerIdConfigured,
    customerIdPresent: customerIdConfigured,
    maskedCustomerId: customerIdConfigured ? maskIdentifier(rawCustomerId!) : '(not configured)',
    subAccountIdConfigured,
    subAccountIdPresent: subAccountIdConfigured,
    maskedSubAccountId: subAccountIdConfigured ? maskIdentifier(rawSubAccountId!) : '(not configured)',
    usernameConfigured,
    usernamePresent: usernameConfigured,
    maskedUsername: usernameConfigured ? maskIdentifier(rawUsername!) : '(not configured)',
    passwordConfigured,
    passwordPresent: passwordConfigured,
    lastHttpStatus: lastLog ? lastLog.httpStatus : null,
    lastMessageRequestId: lastLog ? (lastLog.messageRequestId || lastLog.providerReference || null) : null,
    lastSafeProviderError: lastLog ? (lastLog.errorMessage || null) : null,
    lastTimestamp: lastLog ? lastLog.timestamp : null,
    missingEnvVars,
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

