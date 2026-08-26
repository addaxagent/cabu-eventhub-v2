import React, { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { XCircle, RefreshCw, Calendar, ArrowLeft } from "lucide-react";
import {
  getPayments,
  savePayments,
  getRegistrations,
  saveRegistrations,
  releaseBedspaceForRegistration,
  logDpoTransaction,
  initializeStorage,
} from "../lib/storage";

export const DpoCancelPage: React.FC = () => {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    initializeStorage();
    const companyRef = searchParams.get("CompanyRef") || searchParams.get("companyRef");
    const transToken = searchParams.get("TransactionToken") || searchParams.get("transToken");

    const payments = getPayments();
    let payment = payments.find(
      (p) =>
        (companyRef && p.dpoTransactionReference === companyRef) ||
        (transToken && p.dpoTransToken === transToken)
    );

    if (!payment && payments.length > 0) {
      payment = payments.slice().reverse().find((p) => p.paymentStatus === "dpo_redirected");
    }

    if (payment) {
      payment.paymentStatus = "payment_cancelled";
      savePayments(payments);

      const registrations = getRegistrations();
      const registration = registrations.find((r) => r.id === payment.registrationId);
      if (registration) {
        registration.paymentStatus = "payment_cancelled";
        saveRegistrations(registrations);

        // Release bedspace on cancellation as required
        releaseBedspaceForRegistration(registration.id);

        logDpoTransaction({
          registrationId: registration.id,
          transactionReference: payment.dpoTransactionReference,
          eventType: "cancelled",
          localStatusAfter: "payment_cancelled",
        });
      }
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-[#F8FAF9] flex items-center justify-center p-4">
      <div className="bg-white p-8 sm:p-10 rounded-3xl border border-gray-200 shadow-md max-w-md w-full text-center space-y-6">
        <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
          <XCircle className="w-8 h-8" />
        </div>

        <div>
          <h1 className="text-2xl font-black text-[#111827]">
            DPO Payment Cancelled
          </h1>
          <p className="text-xs text-[#64748B] mt-2 leading-relaxed">
            You exited or cancelled the DPO Direct Pay Online hosted checkout session. Your registration record remains saved as pending payment.
          </p>
        </div>

        <div className="pt-2 flex flex-col gap-3">
          <Link
            to="/"
            className="w-full py-3 bg-[#F58220] hover:bg-[#C65F12] text-black font-extrabold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Retry Payment / View Active Events
          </Link>

          <Link
            to="/registration/status"
            className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-xl flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Check Saved Registration Status
          </Link>
        </div>
      </div>
    </div>
  );
};
