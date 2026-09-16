import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  MapPin,
  ArrowRight,
  UserCheck,
  CreditCard,
  BedDouble,
  Award,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Users,
  Zap,
  Loader2,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  getEvents,
  getTracks,
  getPayments,
  savePayments,
  logDpoTransaction,
  initializeStorage,
} from "../lib/storage";
import { Event } from "../types";

export const HomePage: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [isInitiatingDpo, setIsInitiatingDpo] = useState(false);
  const [dpoError, setDpoError] = useState<string | null>(null);
  const [showCustomDetails, setShowCustomDetails] = useState(false);
  const [payerEmail, setPayerEmail] = useState("chapel@cabuniversity.com");
  const [payerPhone, setPayerPhone] = useState("0971234567");

  useEffect(() => {
    initializeStorage();
    const loaded = getEvents().filter((e) => e.status === "published" && e.isActive);
    setEvents(loaded);
  }, []);

  const handleDirectDpoTestPayment = async () => {
    setIsInitiatingDpo(true);
    setDpoError(null);

    const transactionReference = `CABU-DPO-QUICK-${Date.now()}`;
    const testRegId = `TEST-QUICK-${Date.now()}`;

    try {
      const phoneDigits = payerPhone.replace(/\D/g, "");
      const cleanPhone = phoneDigits.startsWith("260")
        ? phoneDigits
        : phoneDigits.startsWith("0")
        ? "26" + phoneDigits
        : "260" + phoneDigits;

      const res = await fetch("/api/dpo/create-token-test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          registrationReference: testRegId,
          transactionReference,
          amount: 1.0,
          currency: "ZMW",
          firstName: "Direct",
          lastName: "Tester",
          email: payerEmail.trim() || "chapel@cabuniversity.com",
          phone: cleanPhone || "260971234567",
          eventName: "CABU EventHub Direct DPO Test (K1)",
        }),
      });

      const responseData = await res.json().catch(() => ({
        success: false,
        message: "Failed to parse DPO server response.",
      }));

      if (responseData.success && responseData.paymentUrl) {
        // Record test payment in local storage
        const currentPayments = getPayments();
        currentPayments.push({
          id: `pay-${Date.now()}`,
          registrationId: testRegId,
          amountDue: 1.0,
          currency: "ZMW",
          paymentProvider: "DPO",
          paymentReference: transactionReference,
          dpoTransactionReference: transactionReference,
          dpoTransToken: responseData.transToken,
          dpoTransRef: responseData.transRef,
          paymentStatus: "dpo_redirected",
          rawCreateTokenResponse: responseData.rawResponse,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        savePayments(currentPayments);

        logDpoTransaction({
          registrationId: testRegId,
          transactionReference,
          dpoTransToken: responseData.transToken,
          dpoTransRef: responseData.transRef,
          eventType: "redirect",
          resultCode: responseData.result || "000",
          resultExplanation: "Direct K1 DPO test initiated from Homepage card",
          maskedXmlRequest: responseData.maskedXmlRequest,
          rawXmlResponse: responseData.rawResponse,
          httpStatus: responseData.httpStatus || 200,
          responsePayload: responseData,
          localStatusAfter: "dpo_redirected",
        });

        // Direct hand-off to DPO payment gateway
        window.location.href = responseData.paymentUrl;
      } else {
        const errorMsg =
          responseData.errorMessage ||
          responseData.resultExplanation ||
          responseData.message ||
          "DPO could not generate a payment token.";
        setDpoError(errorMsg);
        setIsInitiatingDpo(false);
      }
    } catch (err: any) {
      setDpoError(err.message || "Network error while connecting to DPO.");
      setIsInitiatingDpo(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-[#212121] to-black text-white py-16 sm:py-20 px-4 sm:px-6 lg:px-8 border-b border-neutral-800 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#0B6B3A_1px,transparent_1px)] [background-size:20px_20px]" />
        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0B6B3A]/20 border border-[#0B6B3A]/40 text-[#4ade80] text-xs font-bold uppercase tracking-widest">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#0B6B3A]" />
            Central Africa Baptist University
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight text-white">
            CABU <span className="text-[#F58220]">EventHub</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed">
            Register for CABU conferences, manage DPO payments, reserve accommodation, and access your event records in one place.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <a
              href="#active-events"
              className="w-full sm:w-auto px-7 py-3.5 bg-[#F58220] hover:bg-[#e07318] text-white font-bold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <Calendar className="w-4 h-4" />
              View Active Events
            </a>
            <Link
              to="/returning-guest"
              className="w-full sm:w-auto px-7 py-3.5 bg-transparent hover:bg-[#0B6B3A]/20 text-white font-bold text-sm rounded-xl border-2 border-[#0B6B3A] transition-all flex items-center justify-center gap-2"
            >
              <UserCheck className="w-4 h-4 text-[#4ade80]" />
              Returning Guest
            </Link>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
        {/* Active Events List */}
        <section id="active-events" className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-slate-200/80 pb-4 gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Upcoming Conferences & Events
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Select an event to view details, available tracks, on-campus accommodation options, and begin registration.
              </p>
            </div>
            <span className="text-xs font-extrabold text-[#0B6B3A] bg-[#0B6B3A]/10 border border-[#0B6B3A]/20 px-3.5 py-1.5 rounded-full self-start sm:self-auto">
              {events.length} Published Event{events.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {events.map((evt) => {
              const tracks = getTracks().filter((t) => t.eventId === evt.id && t.isActive);
              return (
                <div
                  key={evt.id}
                  className="bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300 transition-all overflow-hidden flex flex-col justify-between"
                >
                  <div className="p-6 sm:p-8 space-y-5">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="bg-[#0B6B3A] text-white text-xs font-extrabold px-3 py-1 rounded-xl uppercase tracking-wider shadow-2xs">
                          {evt.code}
                        </span>
                        {(evt.isTestEvent || evt.priceOverrideEnabled) && (
                          <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-black px-2.5 py-1 rounded-xl uppercase tracking-wider">
                            DPO Test Event
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-3 py-1 rounded-full flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Registration Open
                      </span>
                    </div>

                    <div>
                      <h3 className="text-2xl font-bold text-slate-900 leading-snug">
                        {evt.name}
                      </h3>
                      <p className="text-xs font-bold text-[#0B6B3A] mt-1 uppercase tracking-wide">
                        Theme: {evt.theme}
                      </p>
                    </div>

                    <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed">
                      {evt.description}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs font-medium text-slate-700">
                      <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <Calendar className="w-4 h-4 text-[#0B6B3A] shrink-0" />
                        <span>{evt.startDate} to {evt.endDate}</span>
                      </div>
                      <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <MapPin className="w-4 h-4 text-[#0B6B3A] shrink-0" />
                        <span className="truncate">{evt.venue}</span>
                      </div>
                    </div>

                    {/* Tracks Preview */}
                    {tracks.length > 0 && (
                      <div className="pt-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                          Available Tracks ({tracks.length}):
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {tracks.map((t) => (
                            <span
                              key={t.id}
                              className="text-xs font-semibold bg-slate-100 text-slate-700 px-3 py-1 rounded-lg"
                            >
                              {t.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Pricing Footer Action */}
                  <div className="bg-slate-50/80 border-t border-slate-100 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <span className="text-xs font-medium text-slate-500 block">Registration Fee</span>
                      {evt.priceOverrideEnabled && typeof evt.priceOverrideAmount === "number" ? (
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="text-2xl font-black text-[#F58220]">
                            ZMW {evt.priceOverrideAmount.toFixed(2)}
                          </span>
                          <span className="text-xs font-bold text-slate-400 line-through">
                            ZMW 350.00
                          </span>
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                            DPO Sandbox Test
                          </span>
                        </div>
                      ) : (
                        <span className="text-2xl font-black text-slate-900">
                          ZMW 350
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <Link
                        to={`/event/${evt.slug}`}
                        className="w-1/2 sm:w-auto px-4 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 text-center transition-colors shadow-2xs"
                      >
                        Details
                      </Link>
                      <Link
                        to={`/event/${evt.slug}/register`}
                        className="w-1/2 sm:w-auto px-5 py-2.5 text-xs font-extrabold text-white bg-[#0B6B3A] hover:bg-[#08522d] rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
                      >
                        Register
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* DPO 1-Click Direct Test Payment Card */}
            <div
              id="dpo-direct-test-card"
              className="bg-linear-to-br from-white via-amber-50/20 to-emerald-50/25 rounded-3xl border-2 border-dashed border-[#F58220]/60 shadow-xs hover:shadow-md hover:border-[#F58220] transition-all overflow-hidden flex flex-col justify-between relative"
            >
              <div className="p-6 sm:p-8 space-y-5">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="bg-[#F58220] text-white text-xs font-black px-3 py-1 rounded-xl uppercase tracking-wider shadow-2xs">
                      DPO-TEST
                    </span>
                    <span className="bg-amber-100 text-amber-950 border border-amber-300 text-[11px] font-black px-2.5 py-1 rounded-xl uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-[#F58220]" />
                      Direct Test
                    </span>
                  </div>
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
                    <Zap className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
                    Bypass Registration
                  </span>
                </div>

                <div>
                  <h3 className="text-2xl font-bold text-slate-900 leading-snug">
                    DPO Test Payment (Direct K1)
                  </h3>
                  <p className="text-xs font-bold text-[#F58220] mt-1 uppercase tracking-wide">
                    Live Gateway Sandbox • 1-Click Instant Hand-Off
                  </p>
                </div>

                <p className="text-sm text-slate-600 leading-relaxed">
                  Directly test the live Direct Pay Online (DPO) gateway with a nominal K1 charge. Skip attendee forms, NRC validation, SMS OTP, and room selection. Generates a token and opens the official DPO payment portal.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs font-medium text-slate-700">
                  <div className="flex items-center gap-2 bg-white/90 p-3 rounded-xl border border-amber-200/60 shadow-2xs">
                    <CreditCard className="w-4 h-4 text-[#F58220] shrink-0" />
                    <span>Exact Charge: <strong className="text-slate-900">ZMW 1.00</strong></span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/90 p-3 rounded-xl border border-amber-200/60 shadow-2xs">
                    <ShieldCheck className="w-4 h-4 text-[#0B6B3A] shrink-0" />
                    <span>Gateway: <strong className="text-slate-900">Live DPO v6 API</strong></span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/90 p-3 rounded-xl border border-amber-200/60 shadow-2xs">
                    <ExternalLink className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>Hosted: <strong className="text-slate-900">DPO Secure Checkout</strong></span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/90 p-3 rounded-xl border border-amber-200/60 shadow-2xs">
                    <Zap className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Flow: <strong className="text-slate-900">Immediate Redirect</strong></span>
                  </div>
                </div>

                {/* Optional Attendee Customization */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowCustomDetails(!showCustomDetails)}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span>{showCustomDetails ? "Hide Payer Details" : "Customize Payer Phone & Email (Optional)"}</span>
                    {showCustomDetails ? (
                      <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </button>

                  {showCustomDetails && (
                    <div className="mt-3 p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            Payer Email (for DPO Receipt)
                          </label>
                          <input
                            type="email"
                            value={payerEmail}
                            onChange={(e) => setPayerEmail(e.target.value)}
                            placeholder="chapel@cabuniversity.com"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#F58220]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            Mobile Phone (for Mobile Money OTP)
                          </label>
                          <input
                            type="tel"
                            value={payerPhone}
                            onChange={(e) => setPayerPhone(e.target.value)}
                            placeholder="0971234567"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#F58220]"
                          />
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Defaulted to your account email. If testing Mobile Money (Airtel/MTN), set your phone number so DPO can send the payment prompt.
                      </p>
                    </div>
                  )}
                </div>

                {/* Error Banner */}
                {dpoError && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold">DPO Token Generation Error</p>
                      <p className="text-rose-700">{dpoError}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Footer */}
              <div className="bg-amber-50/60 border-t border-amber-200/70 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-medium text-slate-500 block">Direct Test Fee</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-[#F58220]">
                      ZMW 1.00
                    </span>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md">
                      Instant DPO Hand-off
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    id="btn-pay-k1-dpo-direct"
                    type="button"
                    onClick={handleDirectDpoTestPayment}
                    disabled={isInitiatingDpo}
                    className="w-full sm:w-auto px-6 py-3 text-xs font-black text-white bg-linear-to-r from-[#F58220] to-[#e07318] hover:from-[#e07318] hover:to-[#c8620f] active:scale-[0.98] rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isInitiatingDpo ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Connecting to DPO Gateway...</span>
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4 text-white" />
                        <span>Pay K1 via DPO Now</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Overview Section */}
        <section className="bg-white rounded-3xl border border-slate-200/80 p-8 sm:p-12 shadow-xs space-y-10">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Complete Event & Accommodation Portal
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              CABU EventHub provides seamless registration, bedspace allocation, payment verification, and attendee history services for all university-hosted events.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#0B6B3A]/10 text-[#0B6B3A] flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-slate-900">1. Fast Registration</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Enter your attendee details with automatic Zambian NRC formatting and mobile verification. Returning guests are recognized instantly.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#0B6B3A]/10 text-[#0B6B3A] flex items-center justify-center font-bold">
                <BedDouble className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-slate-900">2. Gender Bedspaces</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Add K100 dormitory bedspace. Male and female attendees are assigned to gender-restricted campus dormitories automatically.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <CreditCard className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-slate-900">3. DPO Payments</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Pay securely using Direct Pay Online (DPO Sandbox). Real server-side token generation and verification ensure complete transaction safety.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#0B6B3A]/10 text-[#0B6B3A] flex items-center justify-center font-bold">
                <Award className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-slate-900">4. Guest Records</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Access your personal dashboard anytime to view assigned room/bedspace, meal tickets, check-in status, and permanent Results & Certificates.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
