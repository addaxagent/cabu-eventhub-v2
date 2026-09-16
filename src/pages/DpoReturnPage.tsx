import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  XCircle,
  HelpCircle,
} from "lucide-react";
import {
  getRegistrations,
  saveRegistrations,
  getPayments,
  savePayments,
  getAttendees,
  getAccommodationBookings,
  saveAccommodationBookings,
  assignBedspace,
  getMealTickets,
  saveMealTickets,
  getCheckIns,
  saveCheckIns,
  setCurrentGuestSession,
  generateReceiptNumber,
  logDpoTransaction,
  initializeStorage,
} from "../lib/storage";

export const DpoReturnPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [verifying, setVerifying] = useState(true);
  const [statusState, setStatusState] = useState<"verifying" | "success" | "pending" | "failed">("verifying");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [targetRegistrationRef, setTargetRegistrationRef] = useState<string | null>(null);
  const [eventSlug, setEventSlug] = useState<string | null>(null);
  const [isDirectTest, setIsDirectTest] = useState(false);
  const [testResultDetails, setTestResultDetails] = useState<{
    amount: number;
    token?: string;
    transRef?: string;
    explanation?: string;
  } | null>(null);

  const transId = searchParams.get("TransID");
  const transactionToken = searchParams.get("TransactionToken") || searchParams.get("transToken");
  const companyRef = searchParams.get("CompanyRef") || searchParams.get("companyRef");

  const runVerification = async () => {
    setVerifying(true);
    setStatusState("verifying");
    setErrorMessage(null);

    try {
      initializeStorage();
      const payments = getPayments();
      const registrations = getRegistrations();
      const attendees = getAttendees();

      // Search payment record by DPO token, CompanyRef, or recent pending DPO payment
      let payment = payments.find(
        (p) =>
          (transactionToken && p.dpoTransToken === transactionToken) ||
          (companyRef && p.dpoTransactionReference === companyRef)
      );

      if (!payment && payments.length > 0) {
        payment = payments.slice().reverse().find((p) => p.paymentProvider === "DPO");
      }

      if (!payment) {
        setStatusState("failed");
        setErrorMessage("Matching transaction record could not be located in local session.");
        setVerifying(false);
        return;
      }

      const registration = registrations.find((r) => r.id === payment.registrationId);
      const isDirectTestPayment =
        !registration ||
        payment.registrationId.startsWith("TEST-") ||
        (companyRef && (companyRef.includes("TEST") || companyRef.includes("QUICK")));

      if (!registration && !isDirectTestPayment) {
        setStatusState("failed");
        setErrorMessage("Matching event registration record not found.");
        setVerifying(false);
        return;
      }

      const fallbackRef = companyRef || payment.dpoTransactionReference || "TEST-REG-0001";
      if (registration) {
        setTargetRegistrationRef(registration.registrationReference);
      } else {
        setIsDirectTest(true);
      }

      const attendee = registration ? attendees.find((a) => a.id === registration.attendeeId) : null;

      // Call Server API `/api/dpo/verify-token`
      const apiRes = await fetch("/api/dpo/verify-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionToken: transactionToken || payment.dpoTransToken,
          companyRef: companyRef || payment.dpoTransactionReference,
          registrationReference: registration ? registration.registrationReference : fallbackRef,
        }),
      });

      const rawText = await apiRes.text();
      let verifyData: any;
      try {
        verifyData = JSON.parse(rawText);
      } catch {
        verifyData = {
          success: false,
          result: "NON_JSON_RESPONSE",
          message: "The server API route returned HTML instead of JSON. DPO verification route unreachable."
        };
      }

      const resultCode = String(verifyData.result || "");
      const isSuccess =
        verifyData.success ||
        resultCode === "000" ||
        resultCode === "001" ||
        (verifyData.resultExplanation && verifyData.resultExplanation.toLowerCase().includes("paid"));

      const isPending =
        resultCode === "901" ||
        resultCode === "902" ||
        (verifyData.resultExplanation && verifyData.resultExplanation.toLowerCase().includes("pending"));

      if (isSuccess) {
        // Direct Test Payment Flow (No Registration)
        if (!registration) {
          const receiptNumber = payment.receiptNumber || generateReceiptNumber(fallbackRef);
          payment.paymentStatus = "verified";
          payment.receiptNumber = receiptNumber;
          payment.verifiedAt = new Date().toISOString();
          payment.amountVerified = payment.amountDue || 1;
          payment.rawVerifyTokenResponse = verifyData;
          if (transId) payment.dpoTransRef = transId;
          savePayments(payments);

          logDpoTransaction({
            registrationId: payment.registrationId || "TEST-DIRECT",
            transactionReference: payment.dpoTransactionReference,
            dpoTransToken: transactionToken || payment.dpoTransToken,
            dpoTransRef: transId || payment.dpoTransRef,
            eventType: "success",
            resultCode: resultCode || "000",
            resultExplanation: verifyData.resultExplanation || "Verified and Confirmed (Direct Test Payment)",
            responsePayload: verifyData,
            parsedResult: verifyData,
            localStatusBefore: "dpo_redirected",
            localStatusAfter: "verified",
          });

          setTestResultDetails({
            amount: payment.amountDue || 1,
            token: transactionToken || payment.dpoTransToken,
            transRef: transId || payment.dpoTransRef,
            explanation: verifyData.resultExplanation || "Transaction authorized and verified with DPO",
          });

          setIsDirectTest(true);
          setStatusState("success");
          setVerifying(false);
          return;
        }

        // 1. Generate Receipt Number
        const receiptNumber =
          registration.receiptNumber ||
          payment.receiptNumber ||
          generateReceiptNumber(registration.registrationReference);

        // 2. Update Payment Record
        payment.paymentStatus = "verified";
        payment.receiptNumber = receiptNumber;
        payment.verifiedAt = new Date().toISOString();
        payment.amountVerified = payment.amountDue;
        payment.rawVerifyTokenResponse = verifyData;
        if (transId) payment.dpoTransRef = transId;
        savePayments(payments);

        // 3. Confirm Registration
        registration.paymentStatus = "verified";
        registration.registrationStatus = "confirmed";
        registration.receiptNumber = receiptNumber;
        registration.updatedAt = new Date().toISOString();
        saveRegistrations(registrations);

        // 4. Automatic Gender-Appropriate Bedspace Assignment if purchased
        if (registration.accommodationRequested && attendee) {
          const bookings = getAccommodationBookings();
          const existingBooking = bookings.find((b) => b.registrationId === registration.id);
          if (!existingBooking) {
            assignBedspace(registration.eventId, registration.id, registration.attendeeId, attendee.gender);
          } else {
            existingBooking.bookingStatus = "confirmed";
            existingBooking.updatedAt = new Date().toISOString();
            saveAccommodationBookings(bookings);
          }
        }

        // 5. Update Meal Ticket if present
        if (registration.mealTicketRequested) {
          const mealTickets = getMealTickets();
          const mtIndex = mealTickets.findIndex((m) => m.registrationId === registration.id);
          if (mtIndex !== -1) {
            mealTickets[mtIndex].status = "confirmed";
            mealTickets[mtIndex].updatedAt = new Date().toISOString();
            saveMealTickets(mealTickets);
          }
        }

        // 6. Generate & Preserve Check-in QR Record
        const checkIns = getCheckIns();
        const existingCheckInIndex = checkIns.findIndex((c) => c.registrationId === registration.id);
        if (existingCheckInIndex === -1) {
          checkIns.push({
            id: `chk-${registration.id}`,
            eventId: registration.eventId,
            registrationId: registration.id,
            attendeeId: registration.attendeeId,
            checkedIn: false,
            materialsCollected: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          saveCheckIns(checkIns);
        }

        // 7. Store Active Guest Session State
        setCurrentGuestSession(
          registration.attendeeId,
          registration.id,
          registration.registrationReference
        );

        // 8. Log DPO Audit Transaction
        logDpoTransaction({
          registrationId: registration.id,
          transactionReference: payment.dpoTransactionReference,
          dpoTransToken: transactionToken || payment.dpoTransToken,
          dpoTransRef: transId || payment.dpoTransRef,
          eventType: "success",
          resultCode: resultCode || "000",
          resultExplanation: verifyData.resultExplanation || "Verified and Confirmed",
          responsePayload: verifyData,
          parsedResult: verifyData,
          localStatusBefore: "dpo_redirected",
          localStatusAfter: "verified",
        });

        setStatusState("success");
        setVerifying(false);

        // Short delay then navigate to Guest Dashboard
        setTimeout(() => {
          navigate(`/guest/dashboard?ref=${registration.registrationReference}`);
        }, 1200);
      } else if (isPending) {
        payment.paymentStatus = "verification_pending";
        payment.rawVerifyTokenResponse = verifyData;
        savePayments(payments);

        if (registration) {
          registration.paymentStatus = "verification_pending";
          saveRegistrations(registrations);
        }

        logDpoTransaction({
          registrationId: registration ? registration.id : (payment.registrationId || "TEST-DIRECT"),
          transactionReference: payment.dpoTransactionReference,
          eventType: "verify",
          resultCode: resultCode,
          resultExplanation: verifyData.resultExplanation || "Payment verification pending",
          responsePayload: verifyData,
          localStatusAfter: "verification_pending",
        });

        setStatusState("pending");
        setErrorMessage(verifyData.resultExplanation || "Your payment is currently being processed by the mobile money/card gateway.");
        setVerifying(false);
      } else {
        payment.paymentStatus = "payment_failed";
        payment.rawVerifyTokenResponse = verifyData;
        savePayments(payments);

        if (registration) {
          registration.paymentStatus = "payment_failed";
          saveRegistrations(registrations);
        }

        logDpoTransaction({
          registrationId: registration ? registration.id : (payment.registrationId || "TEST-DIRECT"),
          transactionReference: payment.dpoTransactionReference,
          eventType: "failed",
          resultCode: resultCode || "ERR",
          resultExplanation: verifyData.resultExplanation || "DPO Payment Verification failed or was declined.",
          responsePayload: verifyData,
          localStatusAfter: "payment_failed",
        });

        setStatusState("failed");
        setErrorMessage(verifyData.resultExplanation || "DPO Payment Verification failed or was declined by the issuer.");
        setVerifying(false);
      }
    } catch (err: any) {
      console.error("DPO verification exception:", err);
      setStatusState("failed");
      const msg =
        err instanceof TypeError || err.message?.includes("fetch") || err.message?.includes("Failed to fetch")
          ? "The server could not communicate with the DPO verification route. Please verify your connection."
          : `Error verifying transaction: ${err.message || "Unknown error"}`;
      setErrorMessage(msg);
      setVerifying(false);
    }
  };

  useEffect(() => {
    runVerification();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-[#F8FAF9] flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-lg max-w-lg w-full text-center space-y-6">
        {/* State 1: Verifying */}
        {statusState === "verifying" && (
          <div className="space-y-4 py-8">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-[#0B6B3A] flex items-center justify-center mx-auto">
              <Loader2 className="w-8 h-8 animate-spin text-[#0B6B3A]" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">
              Verifying Payment with DPO...
            </h1>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              Confirming transaction authorization and issuing your registration reference and accommodation...
            </p>
          </div>
        )}

        {/* State 2: Success */}
        {statusState === "success" && isDirectTest && (
          <div className="space-y-5 py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-[#0B6B3A] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-[#0B6B3A]" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#0B6B3A] bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                Direct DPO Test Payment Verified
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
                K1 Payment Authorized!
              </h1>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
              Your direct K1.00 DPO sandbox test payment was processed and verified successfully without going through registration.
            </p>

            <div className="bg-slate-50 rounded-2xl p-4 text-left border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Test Amount:</span>
                <span className="font-bold text-slate-900">ZMW 1.00</span>
              </div>
              {testResultDetails?.token && (
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-500 font-medium">TransToken:</span>
                  <span className="font-mono text-[11px] text-slate-700 truncate max-w-[200px]" title={testResultDetails.token}>
                    {testResultDetails.token}
                  </span>
                </div>
              )}
              {testResultDetails?.transRef && (
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">DPO Reference:</span>
                  <span className="font-mono font-bold text-slate-900">{testResultDetails.transRef}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Result:</span>
                <span className="font-semibold text-emerald-700">000 - Verified Successfully</span>
              </div>
            </div>

            <div className="pt-3 flex flex-col gap-2.5">
              <Link
                to="/"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#0B6B3A] hover:bg-[#08522d] text-white font-bold text-xs rounded-xl shadow-xs transition-all w-full"
              >
                <span>Return to Homepage</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/admin/payments/dpo-test"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all w-full"
              >
                <span>View in Admin DPO Diagnostics</span>
              </Link>
            </div>
          </div>
        )}

        {statusState === "success" && !isDirectTest && (
          <div className="space-y-5 py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-[#0B6B3A] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-[#0B6B3A]" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#0B6B3A] bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                Payment Authorized
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
                Registration Confirmed!
              </h1>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
              Your payment has been verified successfully. Receipt and check-in QR code have been generated.
            </p>
            <div className="pt-3">
              <Link
                to={targetRegistrationRef ? `/guest/dashboard?ref=${targetRegistrationRef}` : "/guest/dashboard"}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#0B6B3A] hover:bg-[#08522d] text-white font-bold text-xs rounded-xl shadow-xs transition-all w-full"
              >
                <span>Go to My Guest Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {/* State 3: Pending Payment */}
        {statusState === "pending" && (
          <div className="space-y-5 py-4">
            <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <Clock className="w-10 h-10 text-amber-600" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                Processing Gateway Response
              </span>
              <h1 className="text-2xl font-black text-slate-900 mt-2">
                Payment Status Pending
              </h1>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed bg-amber-50/60 p-3 rounded-xl border border-amber-200/80">
              {errorMessage || "Your mobile money or card transaction is still being processed by the network. Please wait a few seconds and check again."}
            </p>
            <div className="pt-2 flex flex-col gap-2.5">
              <button
                onClick={runVerification}
                className="w-full py-3 bg-[#0B6B3A] hover:bg-[#08522d] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Re-check Payment Status
              </button>
              <Link
                to="/registration/status"
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
              >
                Check Registration Status Later
              </Link>
            </div>
          </div>
        )}

        {/* State 4: Failed / Declined Payment */}
        {statusState === "failed" && (
          <div className="space-y-5 py-4">
            <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <XCircle className="w-10 h-10 text-rose-600" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                Gateway Notification
              </span>
              <h1 className="text-2xl font-black text-slate-900 mt-2">
                Payment Declined or Incomplete
              </h1>
            </div>
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-100 text-xs text-rose-700 text-left">
              <p className="font-bold mb-1">Reason for failure:</p>
              <p>{errorMessage || "The payment authorization was cancelled, declined by the bank, or timed out."}</p>
            </div>
            <div className="pt-2 flex flex-col gap-2.5">
              <Link
                to="/"
                className="w-full py-3 bg-[#F58220] hover:bg-[#C65F12] text-black font-extrabold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                Retry Payment / Select Event
              </Link>
              <Link
                to="/registration/status"
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
              >
                Look Up Saved Registration
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
