import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Settings, RefreshCw, ShieldCheck, Database, CheckCircle2, AlertCircle, MessageSquare, Send, Radio, Wrench, Mail, KeyRound, Check } from "lucide-react";
import { resetDemoData, initializeStorage } from "../../lib/storage";

export const AdminSettings: React.FC = () => {
  const [dpoStatus, setDpoStatus] = useState<any>(null);
  const [airtelStatus, setAirtelStatus] = useState<any>(null);
  const [emailStatus, setEmailStatus] = useState<any>(null);
  const [smsLogs, setSmsLogs] = useState<any[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  // Test SMS state
  const [testPhone, setTestPhone] = useState("");
  const [sendingTestSms, setSendingTestSms] = useState(false);
  const [testSmsResult, setTestSmsResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);

  useEffect(() => {
    initializeStorage();
    checkConfigs();
  }, []);

  const checkConfigs = async () => {
    setLoadingConfig(true);
    try {
      const [dpoRes, airtelRes, emailRes, logsRes] = await Promise.allSettled([
        fetch("/api/dpo/config-status"),
        fetch("/api/admin/airtel/status"),
        fetch("/api/admin/email/status"),
        fetch("/api/admin/airtel/logs"),
      ]);

      if (dpoRes.status === "fulfilled" && dpoRes.value.ok) {
        const data = await dpoRes.value.json();
        setDpoStatus(data);
      }
      if (airtelRes.status === "fulfilled" && airtelRes.value.ok) {
        const data = await airtelRes.value.json();
        setAirtelStatus(data);
      }
      if (emailRes.status === "fulfilled" && emailRes.value.ok) {
        const data = await emailRes.value.json();
        setEmailStatus(data);
      }
      if (logsRes.status === "fulfilled" && logsRes.value.ok) {
        const data = await logsRes.value.json();
        setSmsLogs(data.logs || []);
      }
      setConfigError(null);
    } catch (err) {
      console.error(err);
      setConfigError("The app could not reach server diagnostic routes. Please verify that the backend server is running.");
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleSendTestSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone.trim()) return;

    setSendingTestSms(true);
    setTestSmsResult(null);

    try {
      const res = await fetch("/api/admin/airtel/test-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: testPhone.trim() }),
      });

      const data = await res.json();
      setTestSmsResult({
        success: data.success,
        message: data.message || (data.success ? "Test SMS sent successfully." : "Failed to send test SMS."),
        details: data.providerResponse,
      });

      // Refresh SMS logs
      const logsRes = await fetch("/api/admin/airtel/logs");
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setSmsLogs(logsData.logs || []);
      }
    } catch (err: any) {
      setTestSmsResult({
        success: false,
        message: err.message || "Network error while attempting test SMS dispatch.",
      });
    } finally {
      setSendingTestSms(false);
    }
  };

  const handleResetData = () => {
    if (confirm("WARNING: This will reset all demo registrations, attendees, and bedspaces to clean default seed data. Continue?")) {
      resetDemoData();
      setNotice("Demo state successfully reset to initial seed data.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-[#111827]">
          System & Gateway Settings
        </h1>
        <p className="text-xs text-[#64748B] mt-1">
          Inspect server environment variables, Direct Pay Online API credentials, Airtel Zambia SMS gateway health, and database versioning state.
        </p>
      </div>

      {notice && (
        <div className="bg-green-50 border border-green-200 p-4 rounded-2xl flex items-center gap-2 text-xs text-[#064E2A]">
          <CheckCircle2 className="w-4 h-4 text-[#0B6B3A]" />
          <span>{notice}</span>
        </div>
      )}

      {/* Airtel SMS Health & Verification Box */}
      <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3 text-[#0B6B3A]">
            <div className="w-10 h-10 rounded-2xl bg-[#0B6B3A]/10 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-[#0B6B3A]" />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#111827]">
                Airtel Zambia SMS Gateway & Phone OTP
              </h2>
              <p className="text-xs text-[#64748B]">
                Approved Sender ID: <strong className="text-[#111827]">CABU</strong> | Endpoint: <code className="font-mono text-[11px] bg-gray-100 px-1 py-0.5 rounded">https://www.airtel.co.zm/gateway/v1/sendDefaultSms</code>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/admin/sms-diagnostics"
              className="px-3 py-1.5 text-xs font-bold text-white bg-[#0B6B3A] hover:bg-[#064E2A] rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Wrench className="w-3.5 h-3.5" />
              Full SMS Diagnostics & Trace
            </Link>
            <button
              onClick={checkConfigs}
              disabled={loadingConfig}
              className="px-3 py-1.5 text-xs font-bold text-[#0B6B3A] bg-[#0B6B3A]/10 hover:bg-[#0B6B3A]/20 rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingConfig ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {airtelStatus ? (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3.5 bg-[#F8FAF9] rounded-2xl border border-gray-100">
                <span className="text-gray-500 font-bold block text-[11px]">Airtel SMS Configured</span>
                <span className={`font-black text-sm ${airtelStatus.configured ? "text-[#0B6B3A]" : "text-amber-600"}`}>
                  {airtelStatus.configured ? "YES (READY)" : "INCOMPLETE"}
                </span>
              </div>

              <div className="p-3.5 bg-[#F8FAF9] rounded-2xl border border-gray-100">
                <span className="text-gray-500 font-bold block text-[11px]">Approved Sender ID</span>
                <span className="font-black text-sm text-[#111827]">{airtelStatus.senderId || "CABU"}</span>
              </div>

              <div className="p-3.5 bg-[#F8FAF9] rounded-2xl border border-gray-100">
                <span className="text-gray-500 font-bold block text-[11px]">Customer ID</span>
                <span className={`font-black text-sm ${airtelStatus.customerIdPresent ? "text-[#0B6B3A]" : "text-red-500"}`}>
                  {airtelStatus.customerIdPresent ? "PRESENT" : "MISSING"}
                </span>
              </div>

              <div className="p-3.5 bg-[#F8FAF9] rounded-2xl border border-gray-100">
                <span className="text-gray-500 font-bold block text-[11px]">Username</span>
                <span className={`font-black text-sm ${airtelStatus.usernamePresent ? "text-[#0B6B3A]" : "text-red-500"}`}>
                  {airtelStatus.usernamePresent ? "PRESENT" : "MISSING"}
                </span>
              </div>

              <div className="p-3.5 bg-[#F8FAF9] rounded-2xl border border-gray-100">
                <span className="text-gray-500 font-bold block text-[11px]">Password</span>
                <span className={`font-black text-sm ${airtelStatus.passwordPresent ? "text-[#0B6B3A]" : "text-red-500"}`}>
                  {airtelStatus.passwordPresent ? "PRESENT (SECURE)" : "MISSING"}
                </span>
              </div>

              <div className="p-3.5 bg-[#F8FAF9] rounded-2xl border border-gray-100">
                <span className="text-gray-500 font-bold block text-[11px]">Sub Account ID</span>
                <span className={`font-black text-sm ${airtelStatus.subAccountIdPresent ? "text-[#0B6B3A]" : "text-red-500"}`}>
                  {airtelStatus.subAccountIdPresent ? "PRESENT" : "MISSING"}
                </span>
              </div>
            </div>

            {airtelStatus.missingEnvVars && airtelStatus.missingEnvVars.length > 0 && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-black">Missing Server Environment Variables:</strong>
                  <span className="font-mono text-[11px]">{airtelStatus.missingEnvVars.join(", ")}</span>
                  <p className="mt-1 text-[11px] text-amber-800">
                    Set these secrets in your server environment to enable live SMS dispatch via Airtel gateway.
                  </p>
                </div>
              </div>
            )}

            {/* Admin-Only Test SMS Dispatch Form */}
            <div className="p-5 bg-[#F8FAF9] rounded-2xl border border-gray-200 space-y-3">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#0B6B3A]" />
                <h3 className="font-black text-sm text-[#111827]">Live Admin SMS Health Test</h3>
              </div>
              <p className="text-[11px] text-[#64748B]">
                Send an immediate test SMS message (<code className="bg-white px-1 py-0.5 border rounded">CABU EventHub SMS integration test successful.</code>) to verify connectivity with the Airtel gateway.
              </p>

              <form onSubmit={handleSendTestSms} className="flex flex-col sm:flex-row gap-3 pt-1">
                <input
                  type="text"
                  placeholder="e.g. 0971234567 or +260971234567"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-xs focus:outline-none focus:border-[#0B6B3A] font-medium"
                />
                <button
                  type="submit"
                  disabled={sendingTestSms || !testPhone.trim()}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                    testPhone.trim() && !sendingTestSms
                      ? "bg-[#0B6B3A] hover:bg-[#064E2A] text-white shadow-sm"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  {sendingTestSms ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Sending SMS...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Send Test SMS
                    </>
                  )}
                </button>
              </form>

              {testSmsResult && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-start gap-2 ${
                    testSmsResult.success
                      ? "bg-green-50 border-green-200 text-[#064E2A]"
                      : "bg-red-50 border-red-200 text-red-900"
                  }`}
                >
                  {testSmsResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-[#0B6B3A] shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <strong className="block font-bold">{testSmsResult.message}</strong>
                    {testSmsResult.details && (
                      <p className="font-mono text-[11px] mt-1 opacity-90">
                        {typeof testSmsResult.details === "object"
                          ? JSON.stringify(testSmsResult.details)
                          : testSmsResult.details}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Recent SMS Activity Logs */}
            {smsLogs.length > 0 && (
              <div className="pt-2">
                <span className="font-black text-xs text-[#111827] block mb-2">Recent Gateway Activity (Masked Numbers)</span>
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-[#F8FAF9] border-b border-gray-200 text-gray-500 font-bold">
                      <tr>
                        <th className="py-2 px-3">Timestamp</th>
                        <th className="py-2 px-3">Destination</th>
                        <th className="py-2 px-3">Purpose</th>
                        <th className="py-2 px-3">HTTP Status</th>
                        <th className="py-2 px-3">Result</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {smsLogs.slice(0, 10).map((log) => (
                        <tr key={log.id}>
                          <td className="py-2 px-3 text-gray-500 font-mono">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-gray-700">{log.maskedPhone}</td>
                          <td className="py-2 px-3 text-gray-600">{log.purpose}</td>
                          <td className="py-2 px-3 font-mono text-gray-600">{log.httpStatus || "N/A"}</td>
                          <td className="py-2 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                log.success
                                  ? "bg-green-100 text-[#0B6B3A]"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {log.success ? "SUCCESS" : "FAILED"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Google Workspace Gmail SMTP Health & Configuration Box */}
      <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3 text-[#0B6B3A]">
            <div className="w-10 h-10 rounded-2xl bg-[#0B6B3A]/10 flex items-center justify-center">
              <Mail className="w-5 h-5 text-[#0B6B3A]" />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#111827]">
                Google Workspace SMTP Email Gateway
              </h2>
              <p className="text-xs text-[#64748B]">
                Sender: <strong className="text-[#111827]">noreply@cabuniversity.com</strong> | Transport: <code className="font-mono text-[11px] bg-gray-100 px-1 py-0.5 rounded">smtp.gmail.com:587 (STARTTLS)</code>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/admin/email-diagnostics"
              className="px-3 py-1.5 text-xs font-bold text-white bg-[#0B6B3A] hover:bg-[#064E2A] rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Wrench className="w-3.5 h-3.5" />
              Full Email & OTP Diagnostics
            </Link>
            <button
              onClick={checkConfigs}
              disabled={loadingConfig}
              className="px-3 py-1.5 text-xs font-bold text-[#0B6B3A] bg-[#0B6B3A]/10 hover:bg-[#0B6B3A]/20 rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingConfig ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {emailStatus ? (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 bg-[#F8FAF9] rounded-2xl border border-gray-100">
                <span className="text-gray-500 font-bold block text-[11px]">SMTP Gateway</span>
                <span className={`font-black text-sm ${emailStatus.configured ? "text-[#0B6B3A]" : "text-amber-600"}`}>
                  {emailStatus.configured ? "CONFIGURED (READY)" : "INCOMPLETE"}
                </span>
              </div>

              <div className="p-3.5 bg-[#F8FAF9] rounded-2xl border border-gray-100">
                <span className="text-gray-500 font-bold block text-[11px]">Authorized Mailbox</span>
                <span className="font-mono font-bold text-xs text-[#0B6B3A] truncate block" title={emailStatus.user}>
                  {emailStatus.user}
                </span>
              </div>

              <div className="p-3.5 bg-[#F8FAF9] rounded-2xl border border-gray-100">
                <span className="text-gray-500 font-bold block text-[11px]">Host / Port</span>
                <span className="font-mono font-bold text-xs text-slate-800 block">
                  {emailStatus.host}:{emailStatus.port}
                </span>
              </div>

              <div className="p-3.5 bg-[#F8FAF9] rounded-2xl border border-gray-100">
                <span className="text-gray-500 font-bold block text-[11px]">App Password Secret</span>
                <span className={`font-mono font-bold text-xs block ${emailStatus.passwordPresent ? "text-[#0B6B3A]" : "text-rose-500"}`}>
                  {emailStatus.passwordPresent ? "•••••••• (STORED)" : "MISSING"}
                </span>
              </div>
            </div>

            <div className="p-4 bg-emerald-50/70 border border-emerald-100 rounded-2xl text-[11px] text-[#0B6B3A] flex items-center justify-between">
              <div>
                <strong>Display Sender Name:</strong> {emailStatus.fromHeader}
              </div>
              <Link
                to="/admin/email-diagnostics"
                className="font-bold underline hover:text-[#064E2A]"
              >
                Send Test Email & Inspect Traces →
              </Link>
            </div>
          </div>
        ) : null}
      </div>

      {/* DPO Configuration Box */}
      <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-[#0B6B3A]">
          <ShieldCheck className="w-6 h-6" />
          <h2 className="text-lg font-black text-[#111827]">
            Server DPO Sandbox Credentials
          </h2>
        </div>

        {configError && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-xs text-amber-900">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-black">API Route Unreachable</strong>
              <p className="mt-0.5">{configError}</p>
            </div>
          </div>
        )}

        {loadingConfig ? (
          <p className="text-xs text-gray-500">Checking server configuration...</p>
        ) : dpoStatus ? (
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-[#F8FAF9] rounded-2xl border border-gray-100">
                <span className="text-gray-500 font-bold block">Company Token Present</span>
                <span className={`font-black text-sm ${dpoStatus.companyTokenConfigured ? "text-[#0B6B3A]" : "text-amber-600"}`}>
                  {dpoStatus.companyTokenConfigured ? "CONFIGURED (ENV)" : "FALLBACK DEMO TOKEN"}
                </span>
                <p className="text-[11px] font-mono text-gray-400 mt-1">{dpoStatus.companyTokenMasked}</p>
              </div>

              <div className="p-4 bg-[#F8FAF9] rounded-2xl border border-gray-100">
                <span className="text-gray-500 font-bold block">DPO Endpoint</span>
                <span className="font-mono font-bold text-sm text-[#111827]">{dpoStatus.endpoint}</span>
                <p className="text-[11px] text-gray-400 mt-1">Service Type: {dpoStatus.serviceType}</p>
              </div>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between">
              <div>
                <span className="font-bold text-amber-900 block">Mock Payment Sandbox Mode</span>
                <span className="text-amber-800 text-[11px]">
                  When enabled, token creation automatically yields mock authorization tokens for end-to-end testing without calling live external gateways.
                </span>
              </div>
              <span className={`font-black px-3 py-1 rounded uppercase ${dpoStatus.mockMode ? "bg-amber-200 text-amber-900" : "bg-green-100 text-[#0B6B3A]"}`}>
                {dpoStatus.mockMode ? "MOCK ACTIVE" : "LIVE GATEWAY"}
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {/* Database State Management Box */}
      <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-red-600">
          <Database className="w-6 h-6" />
          <h2 className="text-lg font-black text-[#111827]">
            Local Data Version & Seed Reset
          </h2>
        </div>

        <p className="text-xs text-gray-600">
          CABU EventHub stores prototype data in versioned browser localStorage (<code className="font-mono bg-gray-100 px-1 py-0.5 rounded">cabu_eventhub_data_version</code>). You can force a reset back to the default seed datasets.
        </p>

        <button
          onClick={handleResetData}
          className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Reset Demo Seed Data
        </button>
      </div>
    </div>
  );
};
