import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Radio,
  FileText,
  KeyRound,
  ExternalLink,
  ChevronRight,
  Info,
  Clock,
  X,
  Copy,
  Check,
  Search,
  Filter,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { Link } from "react-router-dom";

interface ConfigStatus {
  ok?: boolean;
  provider?: string;
  configured: boolean;
  senderId: string;
  endpoint: string;
  endpointConfigured?: boolean;
  runtimeEnv?: string;
  customerIdConfigured?: boolean;
  customerIdPresent: boolean;
  maskedCustomerId: string;
  usernameConfigured?: boolean;
  usernamePresent: boolean;
  maskedUsername: string;
  passwordConfigured?: boolean;
  passwordPresent: boolean;
  subAccountIdConfigured?: boolean;
  subAccountIdPresent: boolean;
  maskedSubAccountId: string;
  lastHttpStatus?: number | null;
  lastMessageRequestId?: string | null;
  lastSafeProviderError?: string | null;
  lastTimestamp?: string | null;
  missingEnvVars: string[];
  timestamp?: string;
}

interface SmsTraceStep {
  stage: string;
  timestamp: string;
  status: "SUCCESS" | "FAILED" | "INFO";
  detail: string;
  data?: any;
}

interface SafeSmsLog {
  id: string;
  timestamp: string;
  provider?: string;
  channel?: string;
  purpose: "OTP_VERIFICATION" | "TEST_SMS" | "OTHER";
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
  finalStage: string;
  failureClassification: string;
  errorMessage?: string;
  trace: SmsTraceStep[];
}

export const AdminSmsDiagnostics: React.FC = () => {
  const [config, setConfig] = useState<ConfigStatus | null>(null);
  const [loadingConfig, setLoadingConfig] = useState<boolean>(true);
  const [configError, setConfigError] = useState<string | null>(null);

  // Test SMS State
  const [testPhone, setTestPhone] = useState<string>("0770782602");
  const [sendingTest, setSendingTest] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    httpStatus: number | null;
    message: string;
    log?: SafeSmsLog;
    trace?: SmsTraceStep[];
  } | null>(null);

  // Logs state
  const [logs, setLogs] = useState<SafeSmsLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState<boolean>(false);
  const [selectedLog, setSelectedLog] = useState<SafeSmsLog | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "SUCCESS" | "FAILED">("ALL");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchConfig();
    fetchLogs();
  }, []);

  const fetchConfig = async () => {
    setLoadingConfig(true);
    setConfigError(null);
    try {
      const res = await fetch("/api/admin/airtel/status");
      const data = await res.json();
      setConfig(data);
    } catch (err: any) {
      console.error("Failed to fetch Airtel status:", err);
      setConfigError(err.message || "Failed to contact Airtel SMS diagnostic endpoint");
    } finally {
      setLoadingConfig(false);
    }
  };

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch("/api/admin/airtel/logs");
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err) {
      console.error("Failed to fetch SMS logs:", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleSendTestSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone.trim()) return;

    setSendingTest(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/admin/airtel/test-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: testPhone.trim() }),
      });

      const data = await res.json();
      setTestResult({
        success: data.success,
        httpStatus: data.httpStatus,
        message: data.message || (data.success ? "Test SMS delivered to gateway" : "Test SMS failed"),
        log: data.log,
        trace: data.trace,
      });

      // Auto-refresh logs and config after dispatch
      fetchLogs();
      fetchConfig();
    } catch (err: any) {
      setTestResult({
        success: false,
        httpStatus: null,
        message: err.message || "Network exception while contacting test endpoint",
      });
    } finally {
      setSendingTest(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Helper for live phone normalization preview
  const getNormalizedPreview = (input: string) => {
    const digitsOnly = input.replace(/\D/g, "");
    let subscriber = digitsOnly;
    if (subscriber.startsWith("260")) subscriber = subscriber.slice(3);
    if (subscriber.startsWith("0")) subscriber = subscriber.slice(1);
    if (/^(97|96|95|98|77|76|75|79|71)\d{7}$/.test(subscriber)) {
      return `260${subscriber}`;
    }
    return null;
  };

  const normalizedPreview = getNormalizedPreview(testPhone);

  const filteredLogs = logs.filter((log) => {
    const matchesQuery =
      log.maskedPhone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.normalizedPhone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.providerReference && log.providerReference.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.errorMessage && log.errorMessage.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "SUCCESS" && log.success) ||
      (statusFilter === "FAILED" && !log.success);

    return matchesQuery && matchesStatus;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-[#0B6B3A]/10 text-[#0B6B3A] flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
            <h1 className="text-2xl font-black text-[#111827]">
              Airtel SMS & OTP Diagnostics
            </h1>
          </div>
          <p className="text-xs text-[#64748B]">
            Troubleshoot Airtel Zambia SMS gateway connectivity, inspect live traces, and verify phone normalization.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              fetchConfig();
              fetchLogs();
            }}
            disabled={loadingConfig || loadingLogs}
            className="px-3.5 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-[#111827] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingConfig || loadingLogs ? "animate-spin" : ""}`} />
            Refresh
          </button>

          <Link
            to="/admin/settings"
            className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors"
          >
            All Settings
          </Link>
        </div>
      </div>

      {/* Configuration Status Card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-[#0B6B3A]" />
            <h2 className="text-sm font-bold text-[#111827]">Airtel Zambia Gateway Configuration Status</h2>
          </div>
          {config && (
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                config.configured
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-amber-50 text-amber-800 border border-amber-200"
              }`}
            >
              {config.configured ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                  Credentials Active & Validated
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  Incomplete Configuration
                </>
              )}
            </span>
          )}
        </div>

        {configError ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold">Diagnostic Server Error</strong>
              <p>{configError}</p>
            </div>
          </div>
        ) : loadingConfig ? (
          <div className="py-6 flex items-center justify-center gap-2 text-xs text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin text-[#0B6B3A]" />
            Reading server environment configuration...
          </div>
        ) : config ? (
          <div className="space-y-6">
            {/* Safe Incomplete Configuration Warning */}
            {(!config.configured || (config.missingEnvVars && config.missingEnvVars.length > 0)) && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1.5 text-xs">
                    <h4 className="font-bold text-sm text-amber-950">
                      Airtel SMS configuration incomplete.
                    </h4>
                    <p className="text-amber-800">
                      Missing:
                    </p>
                    <ul className="space-y-0.5 font-mono font-semibold text-amber-950 list-disc list-inside">
                      {config.missingEnvVars.map((v) => (
                        <li key={v}>{v}</li>
                      ))}
                    </ul>
                    <p className="text-amber-700 pt-1">
                      SMS sending is automatically blocked until real server-side secrets are supplied.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 10-Item Safely Masked Diagnostic Summary */}
            <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-2xs">
              <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                  Provider Diagnostics Checklist
                </span>
                <span className="text-[10px] text-gray-500 font-mono">
                  HTTPS Basic Authentication
                </span>
              </div>

              <div className="divide-y divide-gray-100 text-xs">
                {/* 1. Provider */}
                <div className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50/50">
                  <span className="font-semibold text-gray-600">Provider:</span>
                  <span className="font-bold text-gray-900">{config.provider || "Airtel Zambia"}</span>
                </div>

                {/* 2. Endpoint configured */}
                <div className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50/50">
                  <span className="font-semibold text-gray-600">Endpoint configured:</span>
                  <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                    config.endpointConfigured ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                  }`}>
                    {config.endpointConfigured ? "YES" : "NO"}
                  </span>
                </div>

                {/* 3. Sender ID */}
                <div className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50/50">
                  <span className="font-semibold text-gray-600">Sender ID:</span>
                  <span className="font-mono font-bold text-[#0B6B3A]">{config.senderId || "CABU"}</span>
                </div>

                {/* 4. Customer ID configured */}
                <div className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50/50">
                  <span className="font-semibold text-gray-600">Customer ID configured:</span>
                  <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                    (config.customerIdConfigured ?? config.customerIdPresent) ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                  }`}>
                    {(config.customerIdConfigured ?? config.customerIdPresent) ? "YES" : "NO"}
                  </span>
                </div>

                {/* 5. Sub Account ID configured */}
                <div className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50/50">
                  <span className="font-semibold text-gray-600">Sub Account ID configured:</span>
                  <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                    (config.subAccountIdConfigured ?? config.subAccountIdPresent) ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                  }`}>
                    {(config.subAccountIdConfigured ?? config.subAccountIdPresent) ? "YES" : "NO"}
                  </span>
                </div>

                {/* 6. Username configured */}
                <div className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50/50">
                  <span className="font-semibold text-gray-600">Username configured:</span>
                  <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                    (config.usernameConfigured ?? config.usernamePresent) ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                  }`}>
                    {(config.usernameConfigured ?? config.usernamePresent) ? "YES" : "NO"}
                  </span>
                </div>

                {/* 7. Password configured */}
                <div className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50/50">
                  <span className="font-semibold text-gray-600">Password configured:</span>
                  <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                    (config.passwordConfigured ?? config.passwordPresent) ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                  }`}>
                    {(config.passwordConfigured ?? config.passwordPresent) ? "YES" : "NO"}
                  </span>
                </div>

                {/* 8. Last HTTP status */}
                <div className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50/50">
                  <span className="font-semibold text-gray-600">Last HTTP status:</span>
                  <span className="font-mono font-bold text-gray-900">
                    {config.lastHttpStatus !== null && config.lastHttpStatus !== undefined ? `${config.lastHttpStatus}` : "None yet"}
                  </span>
                </div>

                {/* 9. Last messageRequestId */}
                <div className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50/50">
                  <span className="font-semibold text-gray-600">Last messageRequestId:</span>
                  <span className="font-mono font-bold text-gray-900 truncate max-w-xs" title={config.lastMessageRequestId || undefined}>
                    {config.lastMessageRequestId || "None yet"}
                  </span>
                </div>

                {/* 10. Last safe provider error */}
                <div className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50/50">
                  <span className="font-semibold text-gray-600">Last safe provider error:</span>
                  <span
                    className={`font-medium truncate max-w-sm ${
                      config.lastSafeProviderError ? "text-red-700 font-bold" : "text-gray-500"
                    }`}
                    title={config.lastSafeProviderError || undefined}
                  >
                    {config.lastSafeProviderError || "None"}
                  </span>
                </div>
              </div>
            </div>

            {/* Credential Status Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Sender ID */}
              <div className="p-4 bg-[#F8FAF9] rounded-xl border border-gray-200">
                <span className="text-[11px] font-semibold text-[#64748B] block">Approved Sender ID</span>
                <div className="mt-1 flex items-center justify-between">
                  <span className="font-mono font-bold text-sm text-[#111827]">
                    {config.senderId || "CABU"}
                  </span>
                  <span className="text-[10px] bg-green-100 text-green-800 font-bold px-2 py-0.5 rounded">
                    Approved
                  </span>
                </div>
              </div>

              {/* Customer ID */}
              <div className="p-4 bg-[#F8FAF9] rounded-xl border border-gray-200">
                <span className="text-[11px] font-semibold text-[#64748B] block">Customer ID</span>
                <div className="mt-1 flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-[#111827]">
                    {config.maskedCustomerId || "Not set"}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      config.customerIdPresent
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {config.customerIdPresent ? "Present" : "Missing"}
                  </span>
                </div>
              </div>

              {/* Sub Account ID */}
              <div className="p-4 bg-[#F8FAF9] rounded-xl border border-gray-200">
                <span className="text-[11px] font-semibold text-[#64748B] block">SubAccount ID</span>
                <div className="mt-1 flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-[#111827]">
                    {config.maskedSubAccountId || "Not set"}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      config.subAccountIdPresent
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {config.subAccountIdPresent ? "Present" : "Missing"}
                  </span>
                </div>
              </div>

              {/* Auth Credentials */}
              <div className="p-4 bg-[#F8FAF9] rounded-xl border border-gray-200">
                <span className="text-[11px] font-semibold text-[#64748B] block">Basic Auth Credentials</span>
                <div className="mt-1 flex items-center justify-between">
                  <span className="font-mono text-xs text-[#111827]">
                    {config.usernamePresent && config.passwordPresent ? "•••••••• / Protected" : "Incomplete"}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      config.usernamePresent && config.passwordPresent
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {config.usernamePresent && config.passwordPresent ? "Valid" : "Missing"}
                  </span>
                </div>
              </div>
            </div>

            {/* Gateway Endpoint */}
            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="font-bold text-[#64748B] shrink-0">Airtel API Endpoint:</span>
                <code className="text-[#0B6B3A] font-mono text-[11px] truncate">{config.endpoint}</code>
              </div>
              <span className="text-[11px] text-gray-500 shrink-0">
                Method: <strong className="text-gray-900">POST</strong> | Auth: <strong className="text-gray-900">HTTP Basic</strong>
              </span>
            </div>

            {/* Missing Env Vars Warning */}
            {config.missingEnvVars && config.missingEnvVars.length > 0 && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-950">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  Missing Required Environment Variables:
                </div>
                <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] font-mono">
                  {config.missingEnvVars.map((v) => (
                    <li key={v}>{v}</li>
                  ))}
                </ul>
                <p className="text-[11px] text-amber-800">
                  Add these keys in your server environment or Settings menu to enable live Airtel dispatch.
                </p>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Test SMS Dispatcher & Trace Visualizer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Dispatch Form Card */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <Send className="w-4 h-4 text-[#0B6B3A]" />
            <h2 className="text-sm font-bold text-[#111827]">Live Test SMS Dispatcher</h2>
          </div>

          <p className="text-xs text-[#64748B] leading-relaxed">
            Dispatches a real test message to any Zambian mobile number to verify network routing, HTTP authentication, and Airtel gateway acceptance.
          </p>

          <form onSubmit={handleSendTestSms} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#111827] mb-1.5">
                Destination Phone Number
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="e.g. 0770782602 or +260770782602"
                  className="w-full text-xs font-mono py-2.5 px-3 border border-gray-300 rounded-xl focus:outline-none focus:border-[#0B6B3A] focus:ring-2 focus:ring-[#0B6B3A]/20 bg-[#F8FAF9] focus:bg-white"
                />
              </div>

              {/* Live normalization badge */}
              <div className="mt-2 text-[11px] flex items-center justify-between">
                <span className="text-gray-500">Normalized Destination:</span>
                {normalizedPreview ? (
                  <span className="font-mono font-bold text-[#0B6B3A] bg-green-50 px-2 py-0.5 rounded border border-green-200">
                    +{normalizedPreview}
                  </span>
                ) : (
                  <span className="text-amber-600 font-medium">Enter 9-digit Zambian number</span>
                )}
              </div>
            </div>

            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1.5 text-xs">
              <div className="flex justify-between text-[11px] text-gray-500">
                <span>Sender ID:</span>
                <span className="font-mono font-bold text-gray-900">CABU</span>
              </div>
              <div className="flex justify-between text-[11px] text-gray-500">
                <span>Test Message:</span>
                <span className="font-mono text-gray-900 text-right">CABU EventHub SMS integration test successful.</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={sendingTest || !normalizedPreview}
              className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                sendingTest || !normalizedPreview
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
                  : "bg-[#0B6B3A] hover:bg-[#064E2A] text-white shadow-sm cursor-pointer"
              }`}
            >
              {sendingTest ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting to Airtel Gateway...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Test SMS via Airtel
                </>
              )}
            </button>
          </form>

          {/* Quick Result Summary */}
          {testResult && (
            <div
              className={`p-4 rounded-xl border text-xs space-y-2 animate-in fade-in duration-200 ${
                testResult.success
                  ? "bg-green-50 border-green-200 text-green-950"
                  : "bg-red-50 border-red-200 text-red-950"
              }`}
            >
              <div className="flex items-center gap-2 font-bold">
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <span>{testResult.success ? "Dispatch Succeeded" : "Dispatch Failed"}</span>
                {testResult.httpStatus && (
                  <span className="ml-auto font-mono text-[10px] px-2 py-0.5 rounded bg-white/80 border">
                    HTTP {testResult.httpStatus}
                  </span>
                )}
              </div>
              <p className="text-[11px] leading-relaxed">{testResult.message}</p>
            </div>
          )}
        </div>

        {/* Trace Visualizer Card */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#0B6B3A]" />
              <h2 className="text-sm font-bold text-[#111827]">Request & Response Trace</h2>
            </div>
            {testResult?.trace && (
              <span className="text-[11px] text-gray-500 font-mono">
                {testResult.trace.length} stages captured
              </span>
            )}
          </div>

          {!testResult?.trace ? (
            <div className="py-12 text-center text-gray-400 space-y-2">
              <FileText className="w-8 h-8 mx-auto stroke-1 text-gray-300" />
              <p className="text-xs">Dispatch a test SMS to view real-time stage execution and payload traces.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {testResult.trace.map((step, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border text-xs transition-all ${
                    step.status === "SUCCESS"
                      ? "bg-green-50/50 border-green-200 text-green-950"
                      : step.status === "FAILED"
                      ? "bg-red-50/50 border-red-200 text-red-950"
                      : "bg-gray-50 border-gray-200 text-gray-800"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-white font-mono text-[10px] font-bold flex items-center justify-center border shadow-2xs">
                        {idx + 1}
                      </span>
                      <span className="font-bold font-mono text-[11px]">{step.stage}</span>
                    </div>
                    <span
                      className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                        step.status === "SUCCESS"
                          ? "bg-green-100 text-green-800"
                          : step.status === "FAILED"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {step.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-700 pl-7">{step.detail}</p>

                  {step.data && (
                    <div className="mt-2 pl-7">
                      <pre className="bg-white/80 p-2 rounded-lg border text-[10px] font-mono overflow-x-auto text-gray-800 max-h-32">
                        {typeof step.data === "string" ? step.data : JSON.stringify(step.data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SMS Logs & Audit Trail */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-gray-100 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[#111827]">Recent SMS Gateway Requests</h2>
              <p className="text-xs text-[#64748B]">
                In-memory audit log of all registration OTPs and diagnostic test dispatches.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Status filter */}
              <div className="flex items-center bg-gray-100 p-1 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setStatusFilter("ALL")}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${
                    statusFilter === "ALL" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  All ({logs.length})
                </button>
                <button
                  onClick={() => setStatusFilter("SUCCESS")}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${
                    statusFilter === "SUCCESS" ? "bg-white text-green-700 shadow-xs" : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  Accepted
                </button>
                <button
                  onClick={() => setStatusFilter("FAILED")}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${
                    statusFilter === "FAILED" ? "bg-white text-red-700 shadow-xs" : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  Failed
                </button>
              </div>

              <button
                onClick={fetchLogs}
                disabled={loadingLogs}
                className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors cursor-pointer"
                title="Refresh logs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by masked phone, reference, or error message..."
              className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-[#0B6B3A] bg-[#F8FAF9] focus:bg-white"
            />
          </div>
        </div>

        {/* Logs Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Purpose</th>
                <th className="py-3 px-4">Destination</th>
                <th className="py-3 px-4">Status / HTTP</th>
                <th className="py-3 px-4">Provider Message / Error</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400 text-xs">
                    {loadingLogs ? "Loading SMS logs..." : "No SMS logs recorded yet."}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap text-gray-600 font-mono text-[11px]">
                      {new Date(log.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`font-semibold px-2 py-0.5 rounded text-[10px] ${
                          log.purpose === "OTP_VERIFICATION"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {log.purpose === "OTP_VERIFICATION" ? "OTP Verification" : "Admin Test"}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] font-bold text-gray-900">
                      {log.maskedPhone}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            log.success ? "bg-green-500" : "bg-red-500"
                          }`}
                        />
                        <span className="font-bold text-[11px]">
                          {log.success ? "ACCEPTED" : "FAILED"}
                        </span>
                        {log.httpStatus && (
                          <span className="font-mono text-[10px] text-gray-500">
                            ({log.httpStatus})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-[11px] text-gray-600">
                      {log.errorMessage || log.providerMessage || log.providerReference || "SMS accepted by gateway"}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="px-2.5 py-1 bg-white border border-gray-200 hover:bg-gray-100 text-[#0B6B3A] font-bold rounded-lg text-[11px] transition-colors cursor-pointer inline-flex items-center gap-1"
                      >
                        <FileText className="w-3 h-3" />
                        View Trace
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Detail Slide-Over Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 border border-gray-200 shadow-2xl space-y-5 relative max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#0B6B3A]" />
                <div>
                  <h3 className="font-bold text-sm text-[#111827]">SMS Transaction Trace Detail</h3>
                  <p className="text-[11px] text-gray-500 font-mono">{selectedLog.id}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedLog(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto space-y-4 pr-1 text-xs">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-[10px] text-gray-400 block">Status</span>
                  <span className={`font-bold ${selectedLog.success ? "text-green-600" : "text-red-600"}`}>
                    {selectedLog.success ? "ACCEPTED" : "FAILED"}
                  </span>
                </div>
                <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-[10px] text-gray-400 block">HTTP Status</span>
                  <span className="font-mono font-bold text-gray-900">
                    {selectedLog.httpStatus || "N/A"}
                  </span>
                </div>
                <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-[10px] text-gray-400 block">Destination</span>
                  <span className="font-mono font-bold text-gray-900">
                    {selectedLog.maskedPhone}
                  </span>
                </div>
                <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-[10px] text-gray-400 block">Sender ID</span>
                  <span className="font-mono font-bold text-gray-900">
                    {selectedLog.senderId}
                  </span>
                </div>
              </div>

              {/* Failure Error if any */}
              {selectedLog.errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-900 text-xs">
                  <strong className="block font-bold">Error Classification: {selectedLog.failureClassification}</strong>
                  <p className="mt-0.5">{selectedLog.errorMessage}</p>
                </div>
              )}

              {/* Trace Steps */}
              <div>
                <h4 className="font-bold text-[#111827] mb-2 text-xs">Execution Trace Timeline</h4>
                <div className="space-y-2">
                  {selectedLog.trace && selectedLog.trace.length > 0 ? (
                    selectedLog.trace.map((step, i) => (
                      <div
                        key={i}
                        className={`p-2.5 rounded-xl border text-xs ${
                          step.status === "SUCCESS"
                            ? "bg-green-50/50 border-green-200"
                            : step.status === "FAILED"
                            ? "bg-red-50/50 border-red-200"
                            : "bg-gray-50 border-gray-200"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-mono font-bold text-[11px]">{step.stage}</span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              step.status === "SUCCESS"
                                ? "bg-green-100 text-green-800"
                                : step.status === "FAILED"
                                ? "bg-red-100 text-red-800"
                                : "bg-gray-200 text-gray-700"
                            }`}
                          >
                            {step.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-700">{step.detail}</p>
                        {step.data && (
                          <pre className="mt-1.5 bg-white/90 p-2 rounded border text-[10px] font-mono overflow-x-auto text-gray-800">
                            {typeof step.data === "string" ? step.data : JSON.stringify(step.data, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-400 text-xs">No granular trace recorded for this entry.</p>
                  )}
                </div>
              </div>

              {/* Provider Response Body */}
              {selectedLog.responseBody && (
                <div>
                  <h4 className="font-bold text-[#111827] mb-1.5 text-xs">Raw Provider Response</h4>
                  <pre className="bg-gray-900 text-gray-100 p-3 rounded-xl text-[11px] font-mono overflow-x-auto max-h-40">
                    {JSON.stringify(selectedLog.responseBody, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-100 pt-3 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
