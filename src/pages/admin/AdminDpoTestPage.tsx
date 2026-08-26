import React, { useState, useEffect } from "react";
import { Terminal, Send, CheckCircle2, AlertCircle, Loader2, ExternalLink, Code, FileText, Wrench, ShieldCheck, RefreshCw } from "lucide-react";
import { logDpoTransaction } from "../../lib/storage";

export const AdminDpoTestPage: React.FC = () => {
  const [amount, setAmount] = useState<string>("1.00");
  const [currency, setCurrency] = useState<string>("ZMW");
  const [firstName, setFirstName] = useState<string>("Test");
  const [lastName, setLastName] = useState<string>("Attendee");
  const [email, setEmail] = useState<string>("test@cabuniversity.com");
  const [phone, setPhone] = useState<string>("260971234567");
  const [eventName, setEventName] = useState<string>("Equip Conference 2026");

  const [loading, setLoading] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<any | null>(null);

  // Health & Connectivity State
  const [healthData, setHealthData] = useState<any | null>(null);
  const [checkingHealth, setCheckingHealth] = useState<boolean>(false);
  const [healthError, setHealthError] = useState<string | null>(null);

  const [connData, setConnData] = useState<any | null>(null);
  const [testingConn, setTestingConn] = useState<boolean>(false);

  useEffect(() => {
    handleCheckHealth();
  }, []);

  const handleCheckHealth = async () => {
    setCheckingHealth(true);
    setHealthError(null);
    setHealthData(null);
    try {
      const res = await fetch("/api/health", {
        headers: { "Accept": "application/json" }
      });
      const rawText = await res.text();
      let data;
      try {
        data = JSON.parse(rawText);
      } catch (e) {
        throw new Error("Frontend received non-JSON (HTML) response from /api/health. The backend route is not reachable.");
      }
      if (!res.ok || !data.ok) {
        throw new Error(data.message || `HTTP status ${res.status}`);
      }
      setHealthData(data);
    } catch (err: any) {
      console.error("Health check failed:", err);
      setHealthError(err.message || "The frontend cannot reach the backend route.");
    } finally {
      setCheckingHealth(false);
    }
  };

  const handleTestConnectivity = async () => {
    setTestingConn(true);
    setConnData(null);
    try {
      const res = await fetch("/api/dpo/connectivity-test");
      const data = await res.json();
      setConnData(data);
    } catch (err: any) {
      setConnData({
        success: false,
        hostname: "secure.3gdirectpay.com",
        endpoint: "https://secure.3gdirectpay.com/API/v6/",
        reachable: false,
        requestReachedDpo: false,
        errorType: "FRONTEND_FETCH_FAILED",
        errorMessage: err.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setTestingConn(false);
    }
  };

  const handleRunTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTestResult({
      success: false,
      stage: "FRONTEND_REQUEST_STARTED",
      message: "Initiating DPO CreateToken test request...",
    });

    const transactionReference = `CABU-DPO-TEST-${Date.now()}`;

    try {
      const res = await fetch("/api/dpo/create-token-test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          registrationReference: "TEST-REG-0001",
          transactionReference,
          amount: parseFloat(amount) || 1.0,
          currency,
          firstName,
          lastName,
          email,
          phone,
          eventName,
        }),
      });

      const rawText = await res.text();
      let responseData: any;
      try {
        responseData = JSON.parse(rawText);
      } catch (parseErr) {
        responseData = {
          success: false,
          result: "NON_JSON_RESPONSE",
          resultCode: "NON_JSON_RESPONSE",
          resultExplanation: "The API returned non-JSON content.",
          httpStatus: res.status,
          rawResponse: rawText.slice(0, 2000),
          errorType: "DPO_HTML_RESPONSE",
          stage: "dpo_error",
          requestReachedDpo: true,
        };
      }

      setTestResult(responseData);

      // Log in audit trail
      logDpoTransaction({
        registrationId: "TEST-REG-0001",
        transactionReference,
        dpoTransToken: responseData.transToken,
        dpoTransRef: responseData.transRef,
        eventType: "test_token",
        resultCode: responseData.result || "ERR",
        resultExplanation: responseData.resultExplanation || responseData.errorMessage || "Test token generation attempted",
        maskedXmlRequest: responseData.maskedXmlRequest,
        rawXmlResponse: responseData.rawResponse,
        missingEnvVars: responseData.missing,
        httpStatus: responseData.httpStatus || res.status,
        responsePayload: responseData,
        parsedResult: responseData,
        localStatusAfter: responseData.result === "000" ? "test_success" : "test_failed",
      });
    } catch (err: any) {
      console.error("DPO Test Exception:", err);
      const errObj = {
        success: false,
        httpStatus: 0,
        result: "NET_ERR",
        resultCode: "NET_ERR",
        resultExplanation: err instanceof Error ? err.message : "Network request failed",
        errorType: "DPO_NETWORK_ERROR",
        stage: "dpo_error",
        requestReachedDpo: false,
        xmlRequest: null,
        maskedXmlRequest: null,
        rawResponse: null,
      };
      setTestResult(errObj);
    } finally {
      setLoading(false);
    }
  };

  const isSuccess = testResult?.success && testResult?.result === "000";

  return (
    <div className="space-y-6 font-sans max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-[#111827] flex items-center gap-2.5">
          <Wrench className="w-6 h-6 text-indigo-600" />
          DPO Token Creation Diagnostic Tool
        </h1>
        <p className="text-xs text-[#64748B] mt-1">
          Directly test DPO v6 API token generation, view raw XML requests/responses, and verify sandbox credentials without creating attendee registrations.
        </p>
      </div>

      {/* DPO Environment & API Health Section */}
      <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              DPO Environment & API Health
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Verify server route availability, runtime environment variables, and DPO sandbox endpoint connectivity.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCheckHealth}
              disabled={checkingHealth}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              {checkingHealth ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Health Check
            </button>
            <button
              type="button"
              onClick={handleTestConnectivity}
              disabled={testingConn}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              {testingConn ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Test Connectivity to DPO Host
            </button>
          </div>
        </div>

        {connData && (
          <div className={`p-4 rounded-2xl border text-xs space-y-2 ${connData.requestReachedDpo ? "bg-emerald-50 border-emerald-200 text-emerald-950" : "bg-rose-50 border-rose-200 text-rose-950"}`}>
            <div className="flex items-center justify-between font-black text-sm">
              <span className="flex items-center gap-2">
                {connData.requestReachedDpo ? (
                  <span className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-black tracking-wider">
                    REQUEST REACHED DPO
                  </span>
                ) : (
                  <span className="px-2.5 py-1 bg-rose-600 text-white rounded-lg text-xs font-black tracking-wider">
                    REQUEST DID NOT REACH DPO
                  </span>
                )}
                <span>Endpoint Connectivity Test Result</span>
              </span>
              <span className="font-mono text-xs text-slate-600">{connData.timestamp?.slice(11, 19)}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono pt-1 text-[11px]">
              <div><strong>Host:</strong> {connData.hostname}</div>
              <div><strong>Status:</strong> {connData.httpStatus ?? "NET_ERR"}</div>
              <div><strong>Content-Type:</strong> {connData.contentType || "N/A"}</div>
              <div><strong>Error Type:</strong> {connData.errorType || "NONE"}</div>
            </div>
            {connData.errorMessage && (
              <p className="text-xs font-semibold text-rose-800">Error: {connData.errorMessage}</p>
            )}
            {connData.rawSnippet && (
              <pre className="p-2.5 bg-slate-900 text-slate-200 font-mono text-[10px] rounded-xl overflow-x-auto max-h-24">
                {connData.rawSnippet}
              </pre>
            )}
          </div>
        )}

        {healthError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl space-y-2 text-xs text-red-900">
            <div className="flex items-center gap-2 font-black text-red-950">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <span>API Route Reachable: No (Failed to Connect)</span>
            </div>
            <p className="font-medium">{healthError}</p>
          </div>
        )}

        {healthData && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-between">
                <span className="text-slate-500 font-bold block">API Route Reachable</span>
                <span className="font-black text-sm text-emerald-700 flex items-center gap-1.5 mt-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Yes ({healthData.message})
                </span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-between">
                <span className="text-slate-500 font-bold block">Runtime Environment</span>
                <span className="font-mono font-black text-sm text-slate-900 mt-1 uppercase">
                  {healthData.runtime || "nodejs"}
                </span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-between">
                <span className="text-slate-500 font-bold block">Missing Variables</span>
                <span className={`font-black text-sm mt-1 ${healthData.missing?.length > 0 ? "text-red-600" : "text-emerald-700"}`}>
                  {healthData.missing?.length > 0 ? `${healthData.missing.length} Missing (${healthData.missing.join(", ")})` : "0 Missing (All Required Set)"}
                </span>
              </div>
            </div>

            <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-100 text-[11px] text-indigo-950 font-medium">
              <strong>Environment Status:</strong> DPO Company Token is <code>{healthData.companyTokenMasked || "missing"}</code>. Target API: <code>{healthData.endpoint}</code>.
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Input Form */}
        <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-gray-200 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 border-b border-gray-100 pb-3 uppercase tracking-wider">
            Test Payload Parameters
          </h2>

          <form onSubmit={handleRunTest} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-gray-700 font-bold mb-1">Event Name</label>
              <input
                type="text"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:border-indigo-600"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 font-mono focus:outline-none focus:border-indigo-600"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">Currency</label>

                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 font-mono focus:outline-none focus:border-indigo-600 bg-white"
                >
                  <option value="ZMW">ZMW (Zambian Kwacha)</option>
                  <option value="USD">USD (US Dollar)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-700 font-bold mb-1">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:border-indigo-600"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:border-indigo-600"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:border-indigo-600"
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-1">Phone Number (Zambia format)</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 font-mono focus:outline-none focus:border-indigo-600"
                required
              />
            </div>

            {!healthData?.ok && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Run "Test Backend API Route" health check above to enable DPO token creation.</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !healthData || !healthData.ok}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md shadow-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Requesting DPO Token...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Generate Test DPO Token
                </>
              )}
            </button>
          </form>
        </div>

        {/* Results & Raw XML Inspection */}
        <div className="lg:col-span-7 space-y-4">
          {!testResult ? (
            <div className="bg-white p-12 rounded-3xl border border-gray-200 text-center space-y-3">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
                <Terminal className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-sm text-slate-800">No Test Executed Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Fill in the test parameters on the left and click "Generate Test DPO Token" to execute a live API call to DPO.
              </p>
            </div>
          ) : (
            <div className="bg-slate-900 text-slate-100 p-6 rounded-3xl border border-slate-700 shadow-lg space-y-5 text-xs font-sans">
              {/* Status Header */}
              <div className="flex items-start justify-between border-b border-slate-700 pb-4">
                <div className="flex items-center gap-3">
                  {isSuccess ? (
                    <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                  ) : (
                    <div className="p-2 bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/30">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-white">
                        {isSuccess ? "DPO Token Created Successfully" : "DPO Token Request Failed"}
                      </span>
                      <span className={`px-2 py-0.5 rounded font-mono font-black text-xs ${
                        isSuccess ? "bg-emerald-950 text-emerald-400 border border-emerald-800" : "bg-rose-950 text-rose-400 border border-rose-800"
                      }`}>
                        {testResult.result || testResult.errorType || "ERR"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5 font-medium">
                      {testResult.resultExplanation || testResult.message}
                    </p>
                  </div>
                </div>

                {isSuccess && testResult.paymentUrl && (
                  <a
                    href={testResult.paymentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
                  >
                    Open DPO Pay Page
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              {/* Missing Env Alert */}
              {testResult.missing && (
                <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-rose-300 space-y-1">
                  <span className="font-bold text-xs">Missing Environment Variables:</span>
                  <p className="font-mono text-xs">{testResult.missing.join(", ")}</p>
                </div>
              )}

              {/* Response Details Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-slate-800/60 rounded-2xl border border-slate-700">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">HTTP Status</span>
                  <span className="font-mono font-bold text-emerald-400">{testResult.httpStatus ?? 200}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Error Type</span>
                  <span className="font-mono font-bold text-rose-300">{testResult.errorType || "N/A"}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Stage</span>
                  <span className="font-mono font-bold text-indigo-300">{testResult.stage || "N/A"}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">TransToken</span>
                  <span className="font-mono text-slate-200 text-[11px] font-bold">{testResult.transToken || "N/A"}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">TransRef</span>
                  <span className="font-mono text-slate-200 text-[11px] font-bold">{testResult.transRef || "N/A"}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Mock Mode</span>
                  <span className="font-mono text-amber-400 font-bold">{testResult.isMock ? "Yes" : "No"}</span>
                </div>
              </div>

              {testResult.friendlyMessage && (
                <div className="p-3 bg-amber-950/60 border border-amber-800 rounded-xl text-amber-200 space-y-1">
                  <span className="font-bold text-xs block">Diagnostic Notice:</span>
                  <p className="text-xs leading-relaxed">{testResult.friendlyMessage}</p>
                </div>
              )}

              {/* Masked XML Request */}
              <div className="space-y-1.5">
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  <Code className="w-4 h-4 text-indigo-400" />
                  Masked XML Request Payload
                </span>
                <pre className="p-3.5 bg-slate-950 text-emerald-400 font-mono text-[11px] leading-relaxed rounded-xl border border-slate-800 max-h-44 overflow-x-auto whitespace-pre-wrap">
                  {testResult.maskedXmlRequest || "N/A"}
                </pre>
              </div>

              {/* Raw XML Response */}
              <div className="space-y-1.5">
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-amber-400" />
                  Raw XML Response
                </span>
                <pre className="p-3.5 bg-slate-950 text-amber-300 font-mono text-[11px] leading-relaxed rounded-xl border border-slate-800 max-h-44 overflow-x-auto whitespace-pre-wrap">
                  {testResult.rawResponse || "N/A"}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
