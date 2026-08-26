import React, { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Lock, ShieldCheck, Mail, Key, AlertCircle, CheckCircle2, Loader2, ArrowLeft, Home } from "lucide-react";
import { setAdminLoggedIn } from "../lib/storage";

export const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isResetSuccess = searchParams.get("reset") === "success";

  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [email, setEmail] = useState("itmanger@cabuniversity.com");
  const [password, setPassword] = useState("");

  const [recoveryEmail, setRecoveryEmail] = useState("itmanger@cabuniversity.com");
  const [recoverySubmitted, setRecoverySubmitted] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (data.success) {
        setAdminLoggedIn(true);
        navigate("/admin");
      } else {
        setError(data.message || "Invalid administrator credentials");
        setLoading(false);
      }
    } catch (err: any) {
      setError(`Authentication server error: ${err.message || "Failed to reach backend"}`);
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: recoveryEmail }),
      });

      const data = await res.json();
      setRecoverySubmitted(true);
      setRecoveryMessage(
        data.message || "If this administrator account is valid, password reset instructions have been sent to the CABU IT administrator."
      );
      setLoading(false);
    } catch (err: any) {
      // In all cases, display generic response to prevent account enumeration
      setRecoverySubmitted(true);
      setRecoveryMessage("If this administrator account is valid, password reset instructions have been sent to the CABU IT administrator.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-white flex flex-col items-center justify-center p-4">
      {/* Return to Main Site Header Link */}
      <div className="max-w-md w-full mb-4 flex items-center justify-between px-2">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-white transition-colors group cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
          <span>Back to EventHub</span>
        </Link>
        <span className="text-[11px] font-mono text-gray-600">CABU Security Zone</span>
      </div>

      <div className="max-w-md w-full bg-gray-900 p-8 rounded-3xl border border-gray-800 shadow-2xl space-y-6">
        <div className="text-center space-y-3">
          <img
            src="https://imguser.free.nf/uploads/0_1786960332_6a82d9cc2e709_image-Photoroom5.png"
            alt="Central Africa Baptist University"
            className="h-14 w-auto object-contain mx-auto"
            referrerPolicy="no-referrer"
          />
          <h1 className="text-2xl font-black text-white">
            {mode === "login" ? "CABU EventHub Administrator" : "Admin Password Recovery"}
          </h1>
          <p className="text-xs text-gray-400">
            {mode === "login"
              ? "Sign in to manage conference registrations, bedspace allocations, payments, and reports."
              : "Enter your administrator email to receive secure password reset instructions via the CABU IT recovery mailbox."}
          </p>
        </div>

        {/* Reset Success Alert Banner */}
        {isResetSuccess && mode === "login" && (
          <div className="bg-emerald-950/80 border border-emerald-800 p-3.5 rounded-xl flex items-center gap-2.5 text-xs text-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Password updated successfully. You can now sign in.</span>
          </div>
        )}

        {error && (
          <div className="bg-red-950/80 border border-red-800 p-3.5 rounded-xl flex items-center gap-2.5 text-xs text-red-200">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {mode === "login" ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">
                Admin Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-950 border border-gray-800 text-sm text-white focus:outline-none focus:border-[#0B6B3A]"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-gray-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setRecoverySubmitted(false);
                    setRecoveryEmail(email || "itmanger@cabuniversity.com");
                    setMode("forgot");
                  }}
                  className="text-xs text-[#F58220] hover:text-[#ff9c4b] hover:underline font-semibold cursor-pointer transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Key className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-950 border border-gray-800 text-sm text-white focus:outline-none focus:border-[#0B6B3A]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#F58220] hover:bg-[#C65F12] text-black font-extrabold text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Access Administrator Console</span>
                </>
              )}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            {recoverySubmitted ? (
              <div className="space-y-4">
                <div className="bg-emerald-950/80 border border-emerald-800 p-4 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Reset Instructions Dispatched</span>
                  </div>
                  <p className="text-xs text-emerald-200 leading-relaxed">
                    {recoveryMessage}
                  </p>
                </div>

                <div className="p-3 bg-gray-950 border border-gray-800 rounded-xl text-[11px] text-gray-400 space-y-1">
                  <p className="font-semibold text-gray-300">CABU IT Recovery Mailbox:</p>
                  <p className="font-mono text-[#F58220]">itmanger@cabuniversity.com</p>
                  <p className="text-[10px] text-gray-500 pt-1">
                    Check the IT recovery mailbox for the single-use reset link (valid for 30 minutes).
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setRecoverySubmitted(false);
                    setError(null);
                  }}
                  className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Return to Admin Sign In</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">
                    Administrator Email / Username
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      value={recoveryEmail}
                      onChange={(e) => setRecoveryEmail(e.target.value)}
                      required
                      placeholder="itmanger@cabuniversity.com"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-950 border border-gray-800 text-sm text-white focus:outline-none focus:border-[#0B6B3A]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-[#F58220] hover:bg-[#C65F12] text-black font-extrabold text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending Instructions...</span>
                    </>
                  ) : (
                    <>
                      <Key className="w-4 h-4" />
                      <span>Send Password Reset Instructions</span>
                    </>
                  )}
                </button>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setMode("login");
                      setError(null);
                    }}
                    className="text-xs text-gray-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Cancel and Return to Sign In
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        <div className="text-center text-[11px] text-gray-500 pt-2 border-t border-gray-800 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-[#0B6B3A]" />
          <span>Central Africa Baptist University • Admin Portal</span>
        </div>
      </div>
    </div>
  );
};
