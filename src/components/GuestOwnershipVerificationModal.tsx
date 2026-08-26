import React, { useState, useEffect, useRef } from "react";
import {
  ShieldCheck,
  Mail,
  MessageSquare,
  KeyRound,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

export interface GuestVerificationChallengeData {
  challengeId: string;
  purpose: "RETURNING_GUEST_ACCESS" | "REGISTRATION_STATUS_ACCESS";
  maskedEmail?: string;
  maskedPhone?: string;
  availableMethods: ("email" | "sms")[];
  defaultMethod: "email" | "sms";
}

interface GuestOwnershipVerificationModalProps {
  challenge: GuestVerificationChallengeData;
  isOpen: boolean;
  onClose: () => void;
  onVerified: (verificationToken: string) => void;
  title?: string;
  description?: string;
}

export const GuestOwnershipVerificationModal: React.FC<GuestOwnershipVerificationModalProps> = ({
  challenge,
  isOpen,
  onClose,
  onVerified,
  title = "Identity Found — Verification Required",
  description = "To protect personal registration records and conference details, please verify your ownership using your registered contact details.",
}) => {
  const [selectedMethod, setSelectedMethod] = useState<"email" | "sms">(
    challenge.defaultMethod || challenge.availableMethods[0] || "email"
  );
  const [otpCode, setOtpCode] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const initialSentRef = useRef<boolean>(false);

  // Initialize and send initial code when modal opens
  useEffect(() => {
    if (isOpen && challenge && !initialSentRef.current) {
      initialSentRef.current = true;
      const methodToUse = challenge.defaultMethod || challenge.availableMethods[0] || "email";
      setSelectedMethod(methodToUse);
      handleSendCode(methodToUse);
    }
  }, [isOpen, challenge]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown > 0) {
      timerRef.current = setTimeout(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [cooldown]);

  if (!isOpen) return null;

  const handleSendCode = async (method: "email" | "sms") => {
    if (isSending || (cooldown > 0 && selectedMethod === method)) return;

    setIsSending(true);
    setErrorMessage(null);
    setSelectedMethod(method);

    try {
      const response = await fetch("/api/guest/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId: challenge.challengeId,
          method,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setCodeSent(true);
        setStatusMessage(
          data.message ||
            `Verification code sent to ${
              method === "email" ? challenge.maskedEmail : challenge.maskedPhone
            }.`
        );
        setCooldown(data.cooldownSeconds || 60);
      } else {
        setErrorMessage(data.message || "Failed to send verification code. Please try again.");
        if (data.cooldownSeconds) {
          setCooldown(data.cooldownSeconds);
        }
      }
    } catch (err: any) {
      console.error("Error dispatching verification code:", err);
      setErrorMessage("Network error while sending verification code. Please check your connection.");
    } finally {
      setIsSending(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = otpCode.trim();
    if (clean.length !== 6 || isVerifying) return;

    setIsVerifying(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/guest/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId: challenge.challengeId,
          otp: clean,
        }),
      });

      const data = await response.json();

      if (data.success && data.verified) {
        onVerified(data.verificationToken || "");
      } else {
        setErrorMessage(data.message || "Invalid verification code. Please check and try again.");
      }
    } catch (err: any) {
      console.error("Error verifying code:", err);
      setErrorMessage("Network error while verifying code. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative space-y-6"
        role="dialog"
        aria-modal="true"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Close verification modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#0B6B3A]/10 text-[#0B6B3A] flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-[#111827] tracking-tight">
            {title}
          </h2>
          <p className="text-xs text-[#64748B] leading-relaxed max-w-sm mx-auto">
            {description}
          </p>
        </div>

        {/* Masked Contact Selection Options */}
        <div className="space-y-2">
          <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#64748B] text-center">
            Send verification code to:
          </label>

          <div className="grid grid-cols-1 gap-2">
            {challenge.availableMethods.includes("email") && challenge.maskedEmail && (
              <button
                type="button"
                onClick={() => handleSendCode("email")}
                disabled={isSending}
                className={`p-3 rounded-2xl border flex items-center justify-between text-xs font-bold transition-all text-left cursor-pointer ${
                  selectedMethod === "email"
                    ? "border-[#0B6B3A] bg-[#0B6B3A]/5 text-[#0B6B3A] ring-1 ring-[#0B6B3A]"
                    : "border-slate-200 hover:border-slate-300 text-slate-700 bg-white"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Mail className="w-4 h-4 shrink-0 text-[#0B6B3A]" />
                  <div className="truncate">
                    <span className="text-[10px] text-[#64748B] block font-semibold">Registered Email</span>
                    <span className="font-mono text-xs text-[#111827]">{challenge.maskedEmail}</span>
                  </div>
                </div>
                {selectedMethod === "email" && (
                  <span className="text-[10px] uppercase font-black px-2 py-0.5 bg-[#0B6B3A] text-white rounded-full shrink-0">
                    Active
                  </span>
                )}
              </button>
            )}

            {challenge.availableMethods.includes("sms") && challenge.maskedPhone && (
              <button
                type="button"
                onClick={() => handleSendCode("sms")}
                disabled={isSending}
                className={`p-3 rounded-2xl border flex items-center justify-between text-xs font-bold transition-all text-left cursor-pointer ${
                  selectedMethod === "sms"
                    ? "border-[#0B6B3A] bg-[#0B6B3A]/5 text-[#0B6B3A] ring-1 ring-[#0B6B3A]"
                    : "border-slate-200 hover:border-slate-300 text-slate-700 bg-white"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <MessageSquare className="w-4 h-4 shrink-0 text-[#0B6B3A]" />
                  <div className="truncate">
                    <span className="text-[10px] text-[#64748B] block font-semibold">Registered Phone (SMS)</span>
                    <span className="font-mono text-xs text-[#111827]">{challenge.maskedPhone}</span>
                  </div>
                </div>
                {selectedMethod === "sms" && (
                  <span className="text-[10px] uppercase font-black px-2 py-0.5 bg-[#0B6B3A] text-white rounded-full shrink-0">
                    Active
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Sending State Banner */}
        {isSending && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-[#064E2A] flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-[#0B6B3A] shrink-0" />
            <span>Sending verification code to your registered contact...</span>
          </div>
        )}

        {/* Success Status Banner */}
        {statusMessage && !isSending && !errorMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-[#064E2A] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#0B6B3A] shrink-0" />
            <span className="leading-snug">{statusMessage}</span>
          </div>
        )}

        {/* Error Alert Banner */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="leading-snug">{errorMessage}</span>
          </div>
        )}

        {/* Verification Form */}
        <form onSubmit={handleVerifyCode} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#111827] mb-1.5 text-center">
              Enter 6-Digit Verification Code
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              autoFocus
              value={otpCode}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                setOtpCode(val);
                setErrorMessage(null);
              }}
              placeholder="······"
              className="w-full text-center font-mono text-2xl tracking-[0.5em] py-3 px-4 border-2 border-slate-300 rounded-2xl focus:outline-none focus:border-[#0B6B3A] focus:ring-4 focus:ring-[#0B6B3A]/10 transition-all bg-[#F8FAF9] focus:bg-white"
            />
          </div>

          <button
            type="submit"
            disabled={isVerifying || otpCode.trim().length !== 6}
            className={`w-full py-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
              otpCode.trim().length === 6 && !isVerifying
                ? "bg-[#0B6B3A] hover:bg-[#064E2A] text-white shadow-sm cursor-pointer"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            {isVerifying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying Code...</span>
              </>
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                <span>Verify & Access Details</span>
              </>
            )}
          </button>

          <div className="flex items-center justify-between text-xs pt-1">
            <button
              type="button"
              disabled={cooldown > 0 || isSending}
              onClick={() => handleSendCode(selectedMethod)}
              className={`font-bold flex items-center gap-1.5 transition-colors ${
                cooldown > 0 || isSending
                  ? "text-slate-400 cursor-not-allowed"
                  : "text-[#0B6B3A] hover:underline cursor-pointer"
              }`}
            >
              <RefreshCw className={`w-3 h-3 ${isSending ? "animate-spin" : ""}`} />
              <span>
                {isSending
                  ? "Sending..."
                  : cooldown > 0
                  ? `Resend in ${cooldown}s`
                  : "Resend Code"}
              </span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="text-[#64748B] hover:text-[#111827] font-semibold cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
