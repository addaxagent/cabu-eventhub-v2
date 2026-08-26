import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Lock, ShieldCheck, Key, AlertCircle, CheckCircle2, Loader2, ArrowLeft } from "lucide-react";

export const AdminResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [validatingToken, setValidatingToken] = useState(true);
  const [tokenValid, setTokenValid] = useState(true);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      setTokenError("Missing password reset token. Please use the complete link sent to your IT recovery email.");
      setValidatingToken(false);
      return;
    }

    const checkToken = async () => {
      try {
        const res = await fetch(`/api/admin/reset-password/validate?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (data.valid) {
          setTokenValid(true);
        } else {
          setTokenValid(false);
          setTokenError(data.message || "This password reset link is invalid or has expired.");
        }
      } catch (err: any) {
        setTokenValid(false);
        setTokenError("Unable to reach the server to validate reset token.");
      } finally {
        setValidatingToken(false);
      }
    };

    checkToken();
  }, [token]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation password do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate("/admin/login?reset=success");
        }, 2000);
      } else {
        setError(data.message || "Failed to reset administrator password.");
        setLoading(false);
      }
    } catch (err: any) {
      setError(`Server error: ${err.message || "Failed to process request"}`);
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
            Reset Admin Password
          </h1>
          <p className="text-xs text-gray-400">
            Set a new secure password for your administrator account.
          </p>
        </div>

        {validatingToken ? (
          <div className="py-8 flex flex-col items-center justify-center gap-3 text-sm text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin text-[#F58220]" />
            <span>Verifying password reset authorization...</span>
          </div>
        ) : !tokenValid ? (
          <div className="space-y-4">
            <div className="bg-red-950/80 border border-red-800 p-4 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-red-300">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>Reset Link Invalid or Expired</span>
              </div>
              <p className="text-xs text-red-200">
                {tokenError || "This password reset token has expired (valid for 30 minutes) or has already been used."}
              </p>
            </div>

            <Link
              to="/admin/login"
              className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Admin Login</span>
            </Link>
          </div>
        ) : success ? (
          <div className="bg-emerald-950/80 border border-emerald-800 p-5 rounded-xl space-y-3 text-center">
            <div className="w-10 h-10 bg-emerald-900/60 rounded-full flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-emerald-200">Password Updated Successfully</h3>
            <p className="text-xs text-emerald-300">
              Password updated successfully. You can now sign in. Redirecting to login...
            </p>
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-red-950/80 border border-red-800 p-3.5 rounded-xl flex items-center gap-2.5 text-xs text-red-200">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="Minimum 8 characters"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-950 border border-gray-800 text-sm text-white focus:outline-none focus:border-[#0B6B3A] placeholder:text-gray-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="Repeat new password"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-950 border border-gray-800 text-sm text-white focus:outline-none focus:border-[#0B6B3A] placeholder:text-gray-600"
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
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Reset Password</span>
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <Link
                  to="/admin/login"
                  className="text-xs text-gray-400 hover:text-white transition-colors"
                >
                  Cancel and Return to Sign In
                </Link>
              </div>
            </form>
          </>
        )}

        <div className="text-center text-[11px] text-gray-500 pt-2 border-t border-gray-800 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-[#0B6B3A]" />
          <span>Central Africa Baptist University • Admin Portal</span>
        </div>
      </div>
    </div>
  );
};
