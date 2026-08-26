import React, { useState, useEffect } from "react";
import {
  Mail,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Send,
  Lock,
  ArrowRight,
  Sparkles,
  Search,
  ExternalLink,
  ChevronRight,
  X,
  Server,
  HelpCircle,
  KeyRound,
  Check,
  RotateCw,
} from "lucide-react";

interface EmailConfigStatus {
  ok: boolean;
  configured: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  userPresent: boolean;
  fromEmail: string;
  fromName: string;
  fromHeader: string;
  passwordPresent: boolean;
  passwordLength: number;
  missingEnvVars: string[];
  runtimeEnv: string;
  timestamp: string;
}

interface EmailTraceStep {
  stage: string;
  timestamp: string;
  status: "SUCCESS" | "FAILED" | "INFO";
  detail: string;
  data?: any;
}

interface SafeEmailLog {
  id: string;
  timestamp: string;
  purpose: "EMAIL_OTP_VERIFICATION" | "ADMIN_SMTP_TEST" | "TICKET_RECEIPT" | "NOTIFICATION";
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
  finalStage: string;
  failureClassification: string;
  errorMessage?: string;
  trace: EmailTraceStep[];
}

export const AdminEmailDiagnostics: React.FC = () => {
  const [config, setConfig] = useState<EmailConfigStatus | null>(null);
  const [loadingConfig, setLoadingConfig] = useState<boolean>(true);

  // SMTP Verify Connection State
  const [verifyingConn, setVerifyingConn] = useState<boolean>(false);
  const [connResult, setConnResult] = useState<{
    success: boolean;
    message: string;
    trace?: EmailTraceStep[];
  } | null>(null);

  // Test Email State
  const [testEmail, setTestEmail] = useState<string>("chapel@cabuniversity.com");
  const [customNote, setCustomNote] = useState<string>("Manual verification from CABU Admin Console.");
  const [sendingTest, setSendingTest] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    messageId?: string;
    log?: SafeEmailLog;
    trace?: EmailTraceStep[];
  } | null>(null);

  // Email OTP Sandbox State
  const [otpTestEmail, setOtpTestEmail] = useState<string>("chapel@cabuniversity.com");
  const [otpGuestName, setOtpGuestName] = useState<string>("Chapel Admin");
  const [sendingOtp, setSendingOtp] = useState<boolean>(false);
  const [otpSentResponse, setOtpSentResponse] = useState<any>(null);
  const [submittedOtp, setSubmittedOtp] = useState<string>("");
  const [verifyingOtp, setVerifyingOtp] = useState<boolean>(false);
  const [otpVerifyResponse, setOtpVerifyResponse] = useState<any>(null);

  // Logs & Trace Modal
  const [logs, setLogs] = useState<SafeEmailLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState<boolean>(false);
  const [searchLog, setSearchLog] = useState<string>("");
  const [selectedLog, setSelectedLog] = useState<SafeEmailLog | null>(null);

  const fetchConfig = async () => {
    setLoadingConfig(true);
    try {
      const res = await fetch("/api/admin/email/status");
      const data = await res.json();
      setConfig(data);
    } catch (err) {
      console.error("Failed to load email config:", err);
    } finally {
      setLoadingConfig(false);
    }
  };

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch("/api/admin/email/logs");
      const data = await res.json();
      if (data.ok && Array.isArray(data.logs)) {
        setLogs(data.logs);
      }
    } catch (err) {
      console.error("Failed to load email logs:", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchLogs();
  }, []);

  // Run SMTP Handshake Verification
  const handleVerifyConnection = async () => {
    setVerifyingConn(true);
    setConnResult(null);
    try {
      const res = await fetch("/api/admin/email/verify-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      setConnResult({
        success: Boolean(data.ok || data.success),
        message: data.message || (data.success ? "SMTP connection and authentication verified." : "Failed to verify connection."),
        trace: data.trace,
      });
    } catch (err: any) {
      setConnResult({
        success: false,
        message: err.message || "Network exception during SMTP verification.",
      });
    } finally {
      setVerifyingConn(false);
      fetchConfig();
      fetchLogs();
    }
  };

  // Run Test Email Dispatch
  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail.trim()) return;

    setSendingTest(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/email/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toEmail: testEmail.trim(),
          customNote: customNote.trim(),
        }),
      });

      const data = await res.json();
      setTestResult(data);
      if (data.log) {
        setSelectedLog(data.log);
      }
      fetchLogs();
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || "Network failure initiating test email.",
      });
    } finally {
      setSendingTest(false);
    }
  };

  // Run OTP Send Test
  const handleSendOtpTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpTestEmail.trim()) return;

    setSendingOtp(true);
    setOtpSentResponse(null);
    setOtpVerifyResponse(null);
    try {
      const res = await fetch("/api/email/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: otpTestEmail.trim(),
          guestName: otpGuestName.trim() || undefined,
        }),
      });

      const data = await res.json();
      setOtpSentResponse(data);
      fetchLogs();
    } catch (err: any) {
      setOtpSentResponse({
        success: false,
        message: err.message || "Failed to trigger email OTP.",
      });
    } finally {
      setSendingOtp(false);
    }
  };

  // Run OTP Verify Test
  const handleVerifyOtpTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittedOtp.trim()) return;

    setVerifyingOtp(true);
    setOtpVerifyResponse(null);
    try {
      const res = await fetch("/api/email/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: otpTestEmail.trim(),
          otp: submittedOtp.trim(),
        }),
      });

      const data = await res.json();
      setOtpVerifyResponse(data);
    } catch (err: any) {
      setOtpVerifyResponse({
        success: false,
        message: err.message || "Failed to verify email OTP.",
      });
    } finally {
      setVerifyingOtp(false);
    }
  };

  const filteredLogs = logs.filter((l) => {
    if (!searchLog.trim()) return true;
    const q = searchLog.toLowerCase();
    return (
      l.recipient.toLowerCase().includes(q) ||
      l.subject.toLowerCase().includes(q) ||
      l.purpose.toLowerCase().includes(q) ||
      (l.messageId && l.messageId.toLowerCase().includes(q))
    );
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Top Banner Header */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-50 rounded-full blur-3xl -z-10 -mr-20 -mt-20 opacity-60"></div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#0B6B3A] flex items-center justify-center text-white shadow-xs">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Google Workspace SMTP & Email Service
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-[#0B6B3A] border border-emerald-200">
                  Node.js Backend
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Authoritative verification emails sent exclusively via <strong>noreply@cabuniversity.com</strong> using Google Workspace SMTP STARTTLS (Port 587).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            <button
              onClick={() => {
                fetchConfig();
                fetchLogs();
              }}
              disabled={loadingConfig}
              className="flex-1 sm:flex-none px-4 py-2 text-xs font-bold text-[#0B6B3A] bg-[#0B6B3A]/10 hover:bg-[#0B6B3A]/20 rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingConfig ? "animate-spin" : ""}`} />
              Refresh Status
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Config Health + Live SMTP Verification */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Configuration Inspection (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <Server className="w-4 h-4 text-[#0B6B3A]" />
                <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                  SMTP Configuration
                </h2>
              </div>
              {config ? (
                config.configured ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-50 text-[#0B6B3A] border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" />
                    Configured
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                    <AlertCircle className="w-3 h-3" />
                    Missing Secrets
                  </span>
                )
              ) : (
                <span className="text-xs text-slate-400">Loading...</span>
              )}
            </div>

            {config && (
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-slate-500 font-medium">SMTP Host</span>
                  <code className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {config.host}
                  </code>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-slate-500 font-medium">SMTP Port</span>
                  <code className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {config.port}
                  </code>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-slate-500 font-medium">SMTP Secure</span>
                  <div className="flex items-center gap-1.5">
                    <code className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {config.secure ? "true" : "false"}
                    </code>
                    <span className="px-2 py-0.5 text-[10px] font-extrabold bg-emerald-100 text-[#0B6B3A] rounded">
                      STARTTLS (587)
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-slate-500 font-medium">SMTP User Present</span>
                  <span className={`inline-flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded border ${
                    config.userPresent
                      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                      : "text-rose-600 bg-rose-50 border-rose-200"
                  }`}>
                    {config.userPresent ? "Yes" : "No"}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-slate-500 font-medium">SMTP Password Present</span>
                  <span className={`inline-flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded border ${
                    config.passwordPresent
                      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                      : "text-rose-600 bg-rose-50 border-rose-200"
                  }`}>
                    {config.passwordPresent ? "Yes" : "No"}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-slate-500 font-medium">SMTP Password Length</span>
                  <code className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {config.passwordPresent ? `${config.passwordLength} chars` : "0 (Not set)"}
                  </code>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-slate-500 font-medium">From Address</span>
                  <code className="font-mono font-bold text-[#0B6B3A] bg-white px-2 py-0.5 rounded border border-slate-200">
                    {config.fromEmail}
                  </code>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-slate-500 font-medium">From Header Display</span>
                  <span className="font-semibold text-slate-800 text-right truncate max-w-[200px]" title={config.fromHeader}>
                    {config.fromHeader}
                  </span>
                </div>
              </div>
            )}

            {/* Quick Connection Verification Trigger */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleVerifyConnection}
                disabled={verifyingConn}
                className="w-full py-2.5 px-4 bg-[#111827] hover:bg-black text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
              >
                <KeyRound className={`w-3.5 h-3.5 ${verifyingConn ? "animate-spin" : "text-amber-400"}`} />
                {verifyingConn ? "Verifying Google Handshake..." : "Test SMTP Connection (STARTTLS)"}
              </button>
            </div>

            {connResult && (
              <div
                className={`p-3.5 rounded-2xl border text-xs ${
                  connResult.success
                    ? "bg-emerald-50 border-emerald-200 text-[#0B6B3A]"
                    : "bg-rose-50 border-rose-200 text-rose-800"
                }`}
              >
                <div className="flex items-center gap-2 font-bold mb-1">
                  {connResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-[#0B6B3A]" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                  )}
                  <span>{connResult.success ? "Authentication Verified" : "Authentication Failure"}</span>
                </div>
                <p className="leading-relaxed">{connResult.message}</p>
              </div>
            )}

            {/* Security Notice */}
            <div className="p-4 bg-emerald-50/70 border border-emerald-200/60 rounded-2xl text-[11px] text-[#0B6B3A] space-y-1.5 leading-relaxed">
              <div className="flex items-center gap-1.5 font-bold">
                <ShieldCheck className="w-4 h-4 text-[#0B6B3A]" />
                <span>Zero Secret Exposure Enforced</span>
              </div>
              <p className="text-slate-600">
                SMTP credentials run strictly inside the Node.js backend. Passwords are never sent to the browser, stored in client bundles, or logged.
              </p>
            </div>
          </div>

          {/* Setup Guide Accordion Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-3 text-xs">
            <div className="flex items-center gap-2 font-extrabold text-slate-900">
              <HelpCircle className="w-4 h-4 text-[#0B6B3A]" />
              <span>Google Workspace App Password Instructions</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              For security, Google Workspace accounts with 2-Step Verification require an <strong>App Password</strong> for SMTP:
            </p>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-600 font-medium pl-1">
              <li>Sign in to <code className="bg-slate-100 px-1 py-0.5 rounded">myaccount.google.com</code> with <strong className="text-slate-900">noreply@cabuniversity.com</strong></li>
              <li>Navigate to <strong>Security → 2-Step Verification → App Passwords</strong></li>
              <li>Generate a new app password for <em>Mail / CABU EventHub</em></li>
              <li>Set the generated 16-character token as <code className="bg-slate-100 px-1 py-0.5 rounded text-[#0B6B3A]">GOOGLE_SMTP_PASSWORD</code> in AI Studio Secrets</li>
            </ol>
          </div>
        </div>

        {/* Right Column: Live SMTP Test Dispatcher & OTP Simulator (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* TAB 1: Live SMTP Test Email */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                  Admin SMTP Live Dispatch Test
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Sends an official verification test email through Google Workspace SMTP to verify acceptance and delivery.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#0B6B3A] text-white">
                Live Test
              </span>
            </div>

            <form onSubmit={handleSendTestEmail} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Destination Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="e.g. chapel@cabuniversity.com"
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-[#0B6B3A] focus:outline-none transition-all pl-10"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Custom Diagnostic Note (Optional)
                </label>
                <input
                  type="text"
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder="e.g. Verified by chapel administrator before conference"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-[#0B6B3A] focus:outline-none transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={sendingTest || !testEmail.trim()}
                className="w-full py-3 px-6 bg-[#0B6B3A] hover:bg-[#08522c] disabled:bg-slate-300 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
              >
                {sendingTest ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>Transmitting Test via Google Workspace SMTP...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Live Test Email</span>
                  </>
                )}
              </button>
            </form>

            {testResult && (
              <div
                className={`p-4 rounded-2xl border text-xs space-y-2 ${
                  testResult.success
                    ? "bg-emerald-50 border-emerald-200 text-[#0B6B3A]"
                    : "bg-rose-50 border-rose-200 text-rose-800"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-[#0B6B3A]" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                    )}
                    <span>{testResult.success ? "Test Email Accepted by Google" : "Delivery Failure"}</span>
                  </div>
                  {testResult.messageId && (
                    <span className="font-mono text-[10px] bg-emerald-100 px-2 py-0.5 rounded text-emerald-800">
                      ID: {testResult.messageId}
                    </span>
                  )}
                </div>
                <p className="leading-relaxed">{testResult.message}</p>

                {testResult.trace && testResult.trace.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-emerald-200/60 space-y-1.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
                      Execution Trace:
                    </span>
                    <div className="space-y-1 font-mono text-[11px]">
                      {testResult.trace.map((step, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <span
                            className={`px-1 rounded text-[9px] font-bold ${
                              step.status === "SUCCESS"
                                ? "bg-emerald-200 text-emerald-900"
                                : step.status === "FAILED"
                                ? "bg-rose-200 text-rose-900"
                                : "bg-slate-200 text-slate-800"
                            }`}
                          >
                            {step.stage}
                          </span>
                          <span className="text-slate-700 flex-1">{step.detail}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* TAB 2: Email OTP Sandbox Simulator */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                  Email OTP Verification Flow Sandbox
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Simulate the exact guest registration OTP verification email generated by the backend.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#111827] text-white">
                Guest Flow
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Step A: Request Code */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                  <span className="w-5 h-5 rounded-full bg-[#0B6B3A] text-white flex items-center justify-center text-[10px]">1</span>
                  <span>Dispatch 6-Digit OTP</span>
                </div>

                <div className="space-y-2">
                  <input
                    type="email"
                    value={otpTestEmail}
                    onChange={(e) => setOtpTestEmail(e.target.value)}
                    placeholder="Guest Email"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                  />
                  <input
                    type="text"
                    value={otpGuestName}
                    onChange={(e) => setOtpGuestName(e.target.value)}
                    placeholder="Guest Name"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSendOtpTest}
                  disabled={sendingOtp || !otpTestEmail.trim()}
                  className="w-full py-2 px-3 bg-[#0B6B3A] hover:bg-[#08522c] disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  {sendingOtp ? "Sending OTP..." : "Send Verification Code"}
                </button>

                {otpSentResponse && (
                  <div className={`p-2.5 rounded-xl text-[11px] ${otpSentResponse.success ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                    {otpSentResponse.message}
                  </div>
                )}
              </div>

              {/* Step B: Verify Code */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px]">2</span>
                  <span>Verify Received OTP</span>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] text-slate-500 font-medium">Enter 6-Digit Numeric Code:</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={submittedOtp}
                    onChange={(e) => setSubmittedOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-center text-lg font-mono font-bold tracking-widest text-[#0B6B3A]"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleVerifyOtpTest}
                  disabled={verifyingOtp || submittedOtp.length !== 6}
                  className="w-full py-2 px-3 bg-slate-900 hover:bg-black disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  {verifyingOtp ? "Verifying..." : "Validate OTP Code"}
                </button>

                {otpVerifyResponse && (
                  <div className={`p-2.5 rounded-xl text-[11px] ${otpVerifyResponse.success ? "bg-emerald-100 text-emerald-800 font-bold" : "bg-rose-100 text-rose-800"}`}>
                    {otpVerifyResponse.message}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Audit Log Table & Inspector */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
              Email Audit Log & Delivery Traces
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              In-memory history of OTP dispatches and SMTP verification tests.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <input
                type="text"
                placeholder="Search recipient or subject..."
                value={searchLog}
                onChange={(e) => setSearchLog(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#0B6B3A] focus:outline-none"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>

            <button
              onClick={fetchLogs}
              disabled={loadingLogs}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              title="Refresh Logs"
            >
              <RefreshCw className={`w-4 h-4 ${loadingLogs ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Logs Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="pb-3 px-3">Timestamp</th>
                <th className="pb-3 px-3">Purpose</th>
                <th className="pb-3 px-3">Recipient</th>
                <th className="pb-3 px-3">Status</th>
                <th className="pb-3 px-3">Message ID / Error</th>
                <th className="pb-3 px-3 text-right">Trace</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No email audit logs recorded in this session yet.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                        {log.purpose}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-semibold text-slate-800">
                      {log.recipient}
                    </td>
                    <td className="py-3.5 px-3">
                      {log.success ? (
                        <span className="inline-flex items-center gap-1 text-[#0B6B3A] font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Accepted
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-600 font-bold">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Failed
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 font-mono text-[11px] text-slate-600 max-w-xs truncate">
                      {log.messageId || log.errorMessage || "—"}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="px-2.5 py-1 text-[11px] font-bold text-[#0B6B3A] bg-[#0B6B3A]/10 hover:bg-[#0B6B3A]/20 rounded-lg transition-colors cursor-pointer"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trace Inspection Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white ${selectedLog.success ? "bg-[#0B6B3A]" : "bg-rose-600"}`}>
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Email Trace Inspector
                  </h3>
                  <span className="text-[11px] font-mono text-slate-500">
                    {selectedLog.id} · {selectedLog.recipient}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedLog(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-xs">
              {/* Summary Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Status</span>
                  <span className={`font-bold ${selectedLog.success ? "text-[#0B6B3A]" : "text-rose-600"}`}>
                    {selectedLog.success ? "Delivered" : "Failed"}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Sender</span>
                  <span className="font-semibold text-slate-800 truncate block">{selectedLog.fromHeader}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Host</span>
                  <span className="font-mono font-semibold text-slate-800">{selectedLog.smtpHost}:{selectedLog.smtpPort}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Classification</span>
                  <span className="font-bold text-slate-800">{selectedLog.failureClassification}</span>
                </div>
              </div>

              {/* Step By Step Trace */}
              <div>
                <h4 className="font-bold text-slate-900 mb-3 uppercase tracking-wider text-[11px]">
                  Step-by-Step Delivery Stages
                </h4>
                <div className="space-y-2 font-mono">
                  {selectedLog.trace.map((step, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border text-[11px] ${
                        step.status === "SUCCESS"
                          ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                          : step.status === "FAILED"
                          ? "bg-rose-50/70 border-rose-200 text-rose-900"
                          : "bg-slate-50 border-slate-200 text-slate-800"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold">{step.stage}</span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(step.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </span>
                      </div>
                      <p className="font-sans text-xs">{step.detail}</p>
                      {step.data && (
                        <pre className="mt-2 p-2 bg-black/5 rounded-lg text-[10px] overflow-x-auto">
                          {typeof step.data === "string" ? step.data : JSON.stringify(step.data, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
