import nodemailer from 'nodemailer';
import crypto from 'crypto';

export type EmailStage =
  | 'EMAIL_ROUTE_REACHED'
  | 'SMTP_CONFIG_VALIDATED'
  | 'SMTP_CONNECTION_VERIFIED'
  | 'EMAIL_TEMPLATE_GENERATED'
  | 'SMTP_DISPATCH_SENT'
  | 'GOOGLE_RESPONSE_RECEIVED'
  | 'EMAIL_ACCEPTED'
  | 'EMAIL_FAILED';

export interface EmailTraceStep {
  stage: EmailStage;
  timestamp: string;
  status: 'SUCCESS' | 'FAILED' | 'INFO';
  detail: string;
  data?: Record<string, any> | string;
}

export type EmailFailureClassification =
  | 'CONFIG_MISSING'
  | 'INVALID_EMAIL'
  | 'AUTH_FAILURE_535'
  | 'CONNECTION_REFUSED'
  | 'TIMEOUT'
  | 'RATE_LIMITED'
  | 'GOOGLE_REJECTED'
  | 'NETWORK_EXCEPTION'
  | 'SUCCESS';

export interface SafeEmailLog {
  id: string;
  timestamp: string;
  purpose: 'EMAIL_OTP_VERIFICATION' | 'ADMIN_SMTP_TEST' | 'TICKET_RECEIPT' | 'NOTIFICATION';
  recipient: string;
  maskedRecipient: string;
  subject: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  fromHeader: string;
  messageId?: string;
  googleResponse?: string;
  accepted?: string[];
  rejected?: string[];
  success: boolean;
  finalStage: EmailStage;
  failureClassification: EmailFailureClassification;
  errorMessage?: string;
  trace: EmailTraceStep[];
}

interface EmailOtpRecord {
  email: string;
  otp: string;
  createdAt: number;
  expiresAt: number;
  attempts: number;
  verified: boolean;
}

// In-memory OTP storage for emails (Key: normalized email)
const emailOtpStore = new Map<string, EmailOtpRecord>();

// In-memory rate limiter maps
const emailSendTimestamps = new Map<string, number[]>();
const ipSendTimestamps = new Map<string, number[]>();

// In-memory safe email logs buffer (max 150 entries)
const emailLogs: SafeEmailLog[] = [];

function addSafeEmailLog(log: SafeEmailLog) {
  emailLogs.unshift(log);
  if (emailLogs.length > 150) {
    emailLogs.pop();
  }
}

/**
 * Normalizes and validates an email address
 */
export function normalizeEmail(input: string): {
  isValid: boolean;
  normalized: string;
} {
  if (!input || typeof input !== 'string') {
    return { isValid: false, normalized: '' };
  }
  const clean = input.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValid = emailRegex.test(clean);
  return { isValid, normalized: isValid ? clean : clean };
}

/**
 * Masks an email address for safe display (e.g. ch***@cabuniversity.com)
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '***@***';
  const [localPart, domain] = email.split('@');
  if (localPart.length <= 2) {
    return `${localPart[0]}***@${domain}`;
  }
  return `${localPart.slice(0, 2)}***${localPart.slice(-1)}@${domain}`;
}

/**
 * Masks sensitive identifiers safely
 */
export function maskIdentifier(val: string): string {
  if (!val) return '(empty)';
  if (val.length <= 4) return '****';
  return `${val.slice(0, 2)}****${val.slice(-2)}`;
}

/**
 * Generates a 6-digit cryptographically secure numeric OTP
 */
function generateSecureOtp(): string {
  const code = crypto.randomInt(100000, 1000000);
  return code.toString();
}

/**
 * In-memory sliding-window rate limiter
 */
function checkRateLimit(
  map: Map<string, number[]>,
  key: string,
  maxCount: number,
  windowMs: number
): boolean {
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
 * Retrieves SMTP configuration from server environment variables
 */
export function getSmtpConfig() {
  const host = (process.env.GOOGLE_SMTP_HOST || 'smtp.gmail.com').trim();
  const port = Number(process.env.GOOGLE_SMTP_PORT || 587);
  const secure = process.env.GOOGLE_SMTP_SECURE === 'true'; // false for 587 STARTTLS
  const user = (process.env.GOOGLE_SMTP_USER || 'noreply@cabuniversity.com').trim();
  const rawPass = process.env.GOOGLE_SMTP_PASSWORD || '';
  const pass = rawPass.replace(/\s+/g, '');
  const fromEmail = (process.env.EMAIL_FROM || 'noreply@cabuniversity.com').trim();
  const fromName = (process.env.EMAIL_FROM_NAME || 'CABU EventHub').trim();

  const isConfigured = Boolean(user && pass);

  return {
    host,
    port,
    secure,
    user,
    pass,
    fromEmail,
    fromName,
    fromHeader: `"${fromName}" <${fromEmail}>`,
    isConfigured,
  };
}

/**
 * Creates a Nodemailer transporter using Google Workspace Gmail SMTP
 */
function createSmtpTransporter() {
  const config = getSmtpConfig();
  
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure, // false for port 587
    requireTLS: true,
    auth: {
      user: config.user,
      pass: config.pass,
    },
    tls: {
      rejectUnauthorized: true,
    },
  });
}

/**
 * Verifies the Google Workspace SMTP connection and authentication
 */
export async function verifySmtpConnection(): Promise<{
  success: boolean;
  message: string;
  details?: any;
  trace: EmailTraceStep[];
}> {
  const trace: EmailTraceStep[] = [];
  const config = getSmtpConfig();

  const addTrace = (stage: EmailStage, status: 'SUCCESS' | 'FAILED' | 'INFO', detail: string, data?: any) => {
    trace.push({
      stage,
      timestamp: new Date().toISOString(),
      status,
      detail,
      data,
    });
  };

  addTrace('SMTP_CONFIG_VALIDATED', 'INFO', 'Validating Google Workspace SMTP environment configuration...', {
    host: config.host,
    port: config.port,
    secure: config.secure,
    user: config.user,
    fromHeader: config.fromHeader,
    passwordPresent: Boolean(config.pass),
  });

  if (!config.isConfigured) {
    const missing: string[] = [];
    if (!config.user) missing.push('GOOGLE_SMTP_USER');
    if (!config.pass) missing.push('GOOGLE_SMTP_PASSWORD');

    const err = `SMTP credentials incomplete. Missing variables: ${missing.join(', ')}`;
    addTrace('SMTP_CONFIG_VALIDATED', 'FAILED', err, { missing });
    return {
      success: false,
      message: err,
      trace,
    };
  }

  addTrace('SMTP_CONFIG_VALIDATED', 'SUCCESS', `Configuration complete. Using ${config.user} on ${config.host}:${config.port} (STARTTLS).`);

  try {
    const transporter = createSmtpTransporter();
    addTrace('SMTP_CONNECTION_VERIFIED', 'INFO', `Connecting to ${config.host}:${config.port} and performing SMTP AUTH handshake...`);

    await transporter.verify();

    addTrace('SMTP_CONNECTION_VERIFIED', 'SUCCESS', 'Google Workspace SMTP authentication succeeded. Transporter is ready to deliver emails.');

    return {
      success: true,
      message: `Successfully authenticated with Google Workspace Gmail SMTP as ${config.user}.`,
      details: {
        host: config.host,
        port: config.port,
        user: config.user,
        fromHeader: config.fromHeader,
      },
      trace,
    };
  } catch (error: any) {
    let errorDesc = error.message || 'Failed to authenticate with Google Workspace SMTP.';
    let classification: EmailFailureClassification = 'AUTH_FAILURE_535';

    if (errorDesc.includes('535') || errorDesc.toLowerCase().includes('badcredentials') || errorDesc.toLowerCase().includes('username and password not accepted')) {
      classification = 'AUTH_FAILURE_535';
      errorDesc = `Google Workspace SMTP Authentication Failed (535). Please ensure you are using an authorized Google Workspace App Password for ${config.user}. Original error: ${error.message}`;
    } else if (errorDesc.includes('ECONNREFUSED')) {
      classification = 'CONNECTION_REFUSED';
    } else if (errorDesc.includes('ETIMEDOUT')) {
      classification = 'TIMEOUT';
    }

    addTrace('SMTP_CONNECTION_VERIFIED', 'FAILED', errorDesc, {
      code: error.code,
      response: error.response,
      command: error.command,
    });

    return {
      success: false,
      message: errorDesc,
      details: {
        code: error.code,
        responseCode: error.responseCode,
      },
      trace,
    };
  }
}

/**
 * Dispatches an email via Google Workspace SMTP with detailed diagnostic logging
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  purpose = 'NOTIFICATION',
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  purpose?: 'EMAIL_OTP_VERIFICATION' | 'ADMIN_SMTP_TEST' | 'TICKET_RECEIPT' | 'NOTIFICATION';
}): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
  log: SafeEmailLog;
  trace: EmailTraceStep[];
}> {
  const trace: EmailTraceStep[] = [];
  const logId = `email-log-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const nowIso = new Date().toISOString();

  const addTrace = (stage: EmailStage, status: 'SUCCESS' | 'FAILED' | 'INFO', detail: string, data?: any) => {
    trace.push({
      stage,
      timestamp: new Date().toISOString(),
      status,
      detail,
      data,
    });
  };

  // Stage 1: Email Route Reached
  addTrace('EMAIL_ROUTE_REACHED', 'SUCCESS', `Inbound ${purpose} dispatch request received.`, {
    rawRecipient: to,
    purpose,
    subject,
  });

  // Stage 2: Validate Recipient Email
  const { isValid, normalized } = normalizeEmail(to);
  const maskedTo = maskEmail(normalized || to);

  if (!isValid || !normalized) {
    const err = `Invalid email address format: "${to}"`;
    addTrace('EMAIL_FAILED', 'FAILED', err);

    const config = getSmtpConfig();
    const safeLog: SafeEmailLog = {
      id: logId,
      timestamp: nowIso,
      purpose,
      recipient: to,
      maskedRecipient: maskedTo,
      subject,
      smtpHost: config.host,
      smtpPort: config.port,
      smtpSecure: config.secure,
      smtpUser: config.user,
      fromHeader: config.fromHeader,
      success: false,
      finalStage: 'EMAIL_FAILED',
      failureClassification: 'INVALID_EMAIL',
      errorMessage: err,
      trace,
    };
    addSafeEmailLog(safeLog);

    return {
      success: false,
      error: err,
      log: safeLog,
      trace,
    };
  }

  // Stage 3: SMTP Config Check
  const config = getSmtpConfig();
  if (!config.isConfigured) {
    const missing: string[] = [];
    if (!config.user) missing.push('GOOGLE_SMTP_USER');
    if (!config.pass) missing.push('GOOGLE_SMTP_PASSWORD');
    const err = `Google Workspace SMTP configuration missing server environment variables: ${missing.join(', ')}`;

    addTrace('SMTP_CONFIG_VALIDATED', 'FAILED', err, { missing });
    addTrace('EMAIL_FAILED', 'FAILED', `Process stopped: ${err}`);

    const safeLog: SafeEmailLog = {
      id: logId,
      timestamp: nowIso,
      purpose,
      recipient: normalized,
      maskedRecipient: maskedTo,
      subject,
      smtpHost: config.host,
      smtpPort: config.port,
      smtpSecure: config.secure,
      smtpUser: config.user,
      fromHeader: config.fromHeader,
      success: false,
      finalStage: 'EMAIL_FAILED',
      failureClassification: 'CONFIG_MISSING',
      errorMessage: err,
      trace,
    };
    addSafeEmailLog(safeLog);

    return {
      success: false,
      error: err,
      log: safeLog,
      trace,
    };
  }

  addTrace('SMTP_CONFIG_VALIDATED', 'SUCCESS', `SMTP credentials verified for sender ${config.fromHeader}`);

  // Stage 4: Email Template Prepared
  addTrace('EMAIL_TEMPLATE_GENERATED', 'SUCCESS', `MIME payload generated for destination: ${normalized}`, {
    subject,
    from: config.fromHeader,
    to: normalized,
    htmlLength: html.length,
  });

  // Stage 5: SMTP Dispatch via Google Workspace
  const transporter = createSmtpTransporter();
  addTrace('SMTP_DISPATCH_SENT', 'INFO', `Connecting to ${config.host}:${config.port} (STARTTLS) to deliver message...`);

  try {
    const info = await transporter.sendMail({
      from: config.fromHeader,
      to: normalized,
      subject,
      text: text || html.replace(/<[^>]*>?/gm, ''), // Fallback plain text
      html,
    });

    addTrace('GOOGLE_RESPONSE_RECEIVED', 'SUCCESS', `Google Workspace SMTP accepted message (MessageID: ${info.messageId})`, {
      messageId: info.messageId,
      response: info.response,
      accepted: info.accepted,
      rejected: info.rejected,
    });

    addTrace('EMAIL_ACCEPTED', 'SUCCESS', `Email successfully queued and delivered to Google Workspace for ${normalized}`);

    const safeLog: SafeEmailLog = {
      id: logId,
      timestamp: nowIso,
      purpose,
      recipient: normalized,
      maskedRecipient: maskedTo,
      subject,
      smtpHost: config.host,
      smtpPort: config.port,
      smtpSecure: config.secure,
      smtpUser: config.user,
      fromHeader: config.fromHeader,
      messageId: info.messageId,
      googleResponse: info.response,
      accepted: Array.isArray(info.accepted) ? info.accepted.map(String) : [],
      rejected: Array.isArray(info.rejected) ? info.rejected.map(String) : [],
      success: true,
      finalStage: 'EMAIL_ACCEPTED',
      failureClassification: 'SUCCESS',
      trace,
    };

    addSafeEmailLog(safeLog);

    return {
      success: true,
      messageId: info.messageId,
      log: safeLog,
      trace,
    };
  } catch (error: any) {
    let errorDesc = error.message || 'SMTP Exception during delivery to Google Workspace';
    let classification: EmailFailureClassification = 'GOOGLE_REJECTED';

    if (errorDesc.includes('535') || errorDesc.toLowerCase().includes('badcredentials')) {
      classification = 'AUTH_FAILURE_535';
      errorDesc = `Google Workspace SMTP Authentication Failed (535). Verify GOOGLE_SMTP_PASSWORD (App Password). ${error.message}`;
    } else if (errorDesc.includes('ECONNREFUSED')) {
      classification = 'CONNECTION_REFUSED';
    } else if (errorDesc.includes('ETIMEDOUT')) {
      classification = 'TIMEOUT';
    } else if (errorDesc.includes('550') || errorDesc.includes('553')) {
      classification = 'GOOGLE_REJECTED';
    }

    addTrace('GOOGLE_RESPONSE_RECEIVED', 'FAILED', errorDesc, {
      code: error.code,
      command: error.command,
      response: error.response,
    });

    addTrace('EMAIL_FAILED', 'FAILED', `Email delivery failed: ${errorDesc}`);

    const safeLog: SafeEmailLog = {
      id: logId,
      timestamp: nowIso,
      purpose,
      recipient: normalized,
      maskedRecipient: maskedTo,
      subject,
      smtpHost: config.host,
      smtpPort: config.port,
      smtpSecure: config.secure,
      smtpUser: config.user,
      fromHeader: config.fromHeader,
      success: false,
      finalStage: 'EMAIL_FAILED',
      failureClassification: classification,
      errorMessage: errorDesc,
      trace,
    };

    addSafeEmailLog(safeLog);

    return {
      success: false,
      error: errorDesc,
      log: safeLog,
      trace,
    };
  }
}

/**
 * Builds standard branded CABU EventHub HTML email template
 */
export function buildBrandedEmailHtml({
  title,
  preheader,
  contentHtml,
}: {
  title: string;
  preheader?: string;
  contentHtml: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f4f6f5;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #111827;
      -webkit-font-smoothing: antialiased;
    }
    .email-container {
      max-width: 580px;
      margin: 32px auto;
      background: #ffffff;
      border-radius: 20px;
      overflow: hidden;
      border: 1px solid #e5e7eb;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
    }
    .header {
      background: #0B6B3A;
      padding: 32px 36px;
      text-align: left;
    }
    .header-logo-badge {
      display: inline-block;
      background: rgba(255, 255, 255, 0.15);
      color: #ffffff;
      font-weight: 900;
      font-size: 11px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      padding: 4px 10px;
      border-radius: 6px;
      margin-bottom: 12px;
    }
    .header h1 {
      margin: 0;
      color: #ffffff;
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .header p {
      margin: 6px 0 0 0;
      color: #d1fae5;
      font-size: 13px;
    }
    .body-content {
      padding: 36px;
      background: #ffffff;
      font-size: 14px;
      line-height: 1.6;
      color: #374151;
    }
    .otp-card {
      background: #F8FAF9;
      border: 2px dashed #0B6B3A;
      border-radius: 16px;
      padding: 24px;
      text-align: center;
      margin: 28px 0;
    }
    .otp-code {
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      font-size: 38px;
      font-weight: 800;
      letter-spacing: 0.25em;
      color: #0B6B3A;
      margin: 10px 0;
      user-select: all;
    }
    .otp-expiry {
      font-size: 12px;
      color: #6b7280;
      margin-top: 6px;
      font-weight: 600;
    }
    .security-notice {
      background: #fef2f2;
      border-left: 4px solid #ef4444;
      padding: 12px 16px;
      border-radius: 0 8px 8px 0;
      font-size: 12px;
      color: #991b1b;
      margin: 24px 0 0 0;
    }
    .footer {
      background: #f9fafb;
      padding: 24px 36px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      font-size: 11px;
      color: #9ca3af;
      line-height: 1.5;
    }
    .footer strong {
      color: #4b5563;
    }
  </style>
</head>
<body>
  ${preheader ? `<div style="display:none;font-size:1px;color:#333333;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}</div>` : ''}
  <div class="email-container">
    <div class="header">
      <div class="header-logo-badge">CABU EVENTHUB</div>
      <h1>Central Africa Baptist University</h1>
      <p>Secure Event Registration & Verification Service</p>
    </div>
    <div class="body-content">
      ${contentHtml}
    </div>
    <div class="footer">
      <p><strong>Central Africa Baptist University</strong> · CABU EventHub</p>
      <p>Riverside Extension, Kitwe, Zambia · <a href="https://cabuniversity.com" style="color:#0B6B3A;text-decoration:none;">cabuniversity.com</a></p>
      <p style="margin-top:8px;font-size:10px;">This automated verification email was sent by <strong>CABU EventHub</strong> from <code>noreply@cabuniversity.com</code>.</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Sends a 6-digit verification code to the guest's email address
 */
export async function sendEmailOtp({
  email,
  guestName,
  purpose = 'EMAIL_OTP_VERIFICATION',
  clientIp,
}: {
  email: string;
  guestName?: string;
  purpose?: 'EMAIL_OTP_VERIFICATION';
  clientIp?: string;
}): Promise<{
  success: boolean;
  message: string;
  cooldownSeconds?: number;
  errorType?: string;
  logId?: string;
  trace?: EmailTraceStep[];
}> {
  const { isValid, normalized } = normalizeEmail(email);
  if (!isValid || !normalized) {
    return {
      success: false,
      message: 'Please provide a valid email address (e.g. yourname@gmail.com).',
      errorType: 'INVALID_EMAIL',
    };
  }

  // Rate limit: max 3 emails per 5 minutes per address
  if (!checkRateLimit(emailSendTimestamps, normalized, 3, 5 * 60 * 1000)) {
    return {
      success: false,
      message: 'Too many verification attempts. Please wait 5 minutes before requesting another code.',
      errorType: 'RATE_LIMIT_EMAIL',
      cooldownSeconds: 300,
    };
  }

  // Rate limit: max 15 emails per 10 minutes per IP
  if (clientIp && !checkRateLimit(ipSendTimestamps, clientIp, 15, 10 * 60 * 1000)) {
    return {
      success: false,
      message: 'Too many requests from your network. Please wait a few minutes.',
      errorType: 'RATE_LIMIT_IP',
      cooldownSeconds: 180,
    };
  }

  const otp = generateSecureOtp();
  const now = Date.now();
  const expiresAt = now + 10 * 60 * 1000; // 10 minutes expiry

  const greeting = guestName ? `Hello ${guestName},` : 'Hello,';

  const contentHtml = `
    <p style="font-size: 15px; font-weight: 600; color: #111827; margin-top: 0;">${greeting}</p>
    <p>Thank you for registering on <strong>CABU EventHub</strong>. Please use the 6-digit verification code below to verify your email address and continue:</p>
    
    <div class="otp-card">
      <div style="font-size: 11px; font-weight: 700; color: #0B6B3A; text-transform: uppercase; letter-spacing: 0.08em;">Your Verification Code</div>
      <div class="otp-code">${otp}</div>
      <div class="otp-expiry">⏳ Code expires in <strong>10 minutes</strong></div>
    </div>

    <p style="font-size: 13px; color: #4b5563;">Enter this code on the event registration page to confirm your contact details.</p>

    <div class="security-notice">
      <strong>Security Notice:</strong> Never share this code with anyone. CABU staff will never ask for your verification code. If you did not initiate this request, you can safely ignore this email.
    </div>
  `;

  const html = buildBrandedEmailHtml({
    title: `CABU EventHub Verification Code: ${otp}`,
    preheader: `Your verification code is ${otp}. Valid for 10 minutes.`,
    contentHtml,
  });

  const sendResult = await sendEmail({
    to: normalized,
    subject: `CABU EventHub Verification Code: ${otp}`,
    html,
    purpose: 'EMAIL_OTP_VERIFICATION',
  });

  if (!sendResult.success) {
    return {
      success: false,
      message: sendResult.error || 'We could not send your verification email. Please check your SMTP configuration.',
      errorType: sendResult.log.failureClassification || 'EMAIL_DELIVERY_FAILED',
      logId: sendResult.log.id,
      trace: sendResult.trace,
    };
  }

  // Store active OTP
  emailOtpStore.set(normalized, {
    email: normalized,
    otp,
    createdAt: now,
    expiresAt,
    attempts: 0,
    verified: false,
  });

  return {
    success: true,
    message: `Verification code sent to ${normalized}. Please check your inbox.`,
    cooldownSeconds: 60,
    logId: sendResult.log.id,
    trace: sendResult.trace,
  };
}

/**
 * Validates a submitted 6-digit email verification code
 */
export function verifySubmittedEmailOtp({
  email,
  otp,
}: {
  email: string;
  otp: string;
}): {
  success: boolean;
  verified: boolean;
  message: string;
  errorType?: string;
} {
  const { isValid, normalized } = normalizeEmail(email);
  if (!isValid || !normalized) {
    return {
      success: false,
      verified: false,
      message: 'Invalid email address provided.',
      errorType: 'INVALID_EMAIL',
    };
  }

  const cleanOtp = (otp || '').trim();
  if (!cleanOtp || cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
    return {
      success: false,
      verified: false,
      message: 'Please enter the 6-digit numeric verification code.',
      errorType: 'INVALID_FORMAT',
    };
  }

  const record = emailOtpStore.get(normalized);
  if (!record) {
    return {
      success: false,
      verified: false,
      message: 'No active verification code found for this email. Please request a new code.',
      errorType: 'NO_ACTIVE_OTP',
    };
  }

  // Check Expiry (10 minutes)
  if (Date.now() > record.expiresAt) {
    emailOtpStore.delete(normalized);
    return {
      success: false,
      verified: false,
      message: 'Verification code has expired. Please request a new code.',
      errorType: 'OTP_EXPIRED',
    };
  }

  // Check Max Attempts (5 attempts)
  if (record.attempts >= 5) {
    emailOtpStore.delete(normalized);
    return {
      success: false,
      verified: false,
      message: 'Too many incorrect attempts. For security, please request a new verification code.',
      errorType: 'MAX_ATTEMPTS_EXCEEDED',
    };
  }

  // Timing-safe constant-time string comparison
  const isMatch =
    record.otp.length === cleanOtp.length &&
    crypto.timingSafeEqual(Buffer.from(record.otp), Buffer.from(cleanOtp));

  if (!isMatch) {
    record.attempts += 1;
    const remaining = 5 - record.attempts;
    return {
      success: false,
      verified: false,
      message: `Incorrect verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
      errorType: 'INCORRECT_OTP',
    };
  }

  // Successful verification
  record.verified = true;
  emailOtpStore.delete(normalized); // Consume OTP once used

  return {
    success: true,
    verified: true,
    message: 'Email successfully verified.',
  };
}

/**
 * Dispatches an Admin SMTP Test Email
 */
export async function sendAdminSmtpTest({
  toEmail,
  customNote,
}: {
  toEmail: string;
  customNote?: string;
}): Promise<{
  success: boolean;
  message: string;
  messageId?: string;
  log: SafeEmailLog;
  trace: EmailTraceStep[];
}> {
  const { isValid, normalized } = normalizeEmail(toEmail);
  if (!isValid || !normalized) {
    throw new Error('Please provide a valid destination email address for the test.');
  }

  const config = getSmtpConfig();
  const timestamp = new Date().toUTCString();

  const contentHtml = `
    <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;padding:16px;margin-bottom:20px;">
      <div style="color:#065f46;font-weight:700;font-size:14px;">✅ Google Workspace SMTP Test Successful</div>
      <p style="color:#047857;font-size:12px;margin:4px 0 0 0;">
        This test confirms that CABU EventHub can successfully authenticate with Google Workspace Gmail SMTP using STARTTLS on port 587 and deliver messages from <strong>${config.fromHeader}</strong>.
      </p>
    </div>

    <table style="width:100%;border-collapse:collapse;font-size:12px;margin:16px 0;background:#F8FAF9;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;">
      <tr style="border-bottom:1px solid #e5e7eb;">
        <td style="padding:10px 14px;font-weight:bold;color:#6b7280;width:35%;">SMTP Host:</td>
        <td style="padding:10px 14px;font-family:monospace;color:#111827;">${config.host}:${config.port}</td>
      </tr>
      <tr style="border-bottom:1px solid #e5e7eb;">
        <td style="padding:10px 14px;font-weight:bold;color:#6b7280;">Security / TLS:</td>
        <td style="padding:10px 14px;font-family:monospace;color:#111827;">STARTTLS (Port 587)</td>
      </tr>
      <tr style="border-bottom:1px solid #e5e7eb;">
        <td style="padding:10px 14px;font-weight:bold;color:#6b7280;">Authenticated User:</td>
        <td style="padding:10px 14px;font-family:monospace;color:#111827;">${config.user}</td>
      </tr>
      <tr style="border-bottom:1px solid #e5e7eb;">
        <td style="padding:10px 14px;font-weight:bold;color:#6b7280;">Sender Display:</td>
        <td style="padding:10px 14px;font-family:monospace;color:#111827;">${config.fromHeader}</td>
      </tr>
      <tr>
        <td style="padding:10px 14px;font-weight:bold;color:#6b7280;">Dispatch Timestamp:</td>
        <td style="padding:10px 14px;color:#111827;">${timestamp}</td>
      </tr>
    </table>

    ${customNote ? `<div style="background:#f3f4f6;padding:12px;border-radius:8px;font-size:12px;color:#374151;margin-top:16px;"><strong>Admin Note:</strong> ${customNote}</div>` : ''}

    <p style="font-size:12px;color:#6b7280;margin-top:20px;">
      If you received this message, your Google Workspace mailbox integration is working properly and ready to deliver registration verification codes, receipts, and event notices.
    </p>
  `;

  const html = buildBrandedEmailHtml({
    title: 'CABU EventHub - Google Workspace SMTP Integration Test',
    preheader: 'Google Workspace SMTP authentication and test email delivery confirmed.',
    contentHtml,
  });

  const result = await sendEmail({
    to: normalized,
    subject: `[TEST] CABU EventHub Google Workspace SMTP Verification (${timestamp})`,
    html,
    purpose: 'ADMIN_SMTP_TEST',
  });

  return {
    success: result.success,
    message: result.success
      ? `Test email accepted by Google Workspace and delivered to ${normalized}.`
      : `Test email failed: ${result.error || 'Unknown error'}`,
    messageId: result.messageId,
    log: result.log,
    trace: result.trace,
  };
}

/**
 * Returns safe SMTP configuration diagnostics without exposing secrets
 */
export function getSafeEmailConfigStatus() {
  const config = getSmtpConfig();

  const missingEnvVars: string[] = [];
  if (!process.env.GOOGLE_SMTP_USER) missingEnvVars.push('GOOGLE_SMTP_USER');
  if (!process.env.GOOGLE_SMTP_PASSWORD) missingEnvVars.push('GOOGLE_SMTP_PASSWORD');

  return {
    ok: true,
    configured: config.isConfigured,
    host: config.host,
    port: config.port,
    secure: config.secure,
    user: config.user,
    userPresent: Boolean(config.user),
    fromEmail: config.fromEmail,
    fromName: config.fromName,
    fromHeader: config.fromHeader,
    passwordPresent: Boolean(config.pass),
    passwordLength: config.pass.length,
    missingEnvVars,
    runtimeEnv: process.env.NODE_ENV || 'production',
  };
}

/**
 * Returns all recorded safe email logs
 */
export function getSafeEmailLogs(): SafeEmailLog[] {
  return [...emailLogs];
}

/**
 * Returns a specific safe email log by ID
 */
export function getSafeEmailLogById(id: string): SafeEmailLog | undefined {
  return emailLogs.find((l) => l.id === id);
}
