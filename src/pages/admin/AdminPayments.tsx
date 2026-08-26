import React, { useState, useEffect } from "react";
import {
  CreditCard,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Search,
  ExternalLink,
  Loader2,
} from "lucide-react";
import {
  getPayments,
  savePayments,
  getRegistrations,
  saveRegistrations,
  getAttendees,
  getEvents,
  logDpoTransaction,
  initializeStorage,
} from "../../lib/storage";
import { Payment, Registration, Attendee, Event } from "../../types";

export const AdminPayments: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [registrationsMap, setRegistrationsMap] = useState<Record<string, Registration>>({});
  const [attendeesMap, setAttendeesMap] = useState<Record<string, Attendee>>({});
  const [eventsMap, setEventsMap] = useState<Record<string, Event>>({});

  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  useEffect(() => {
    initializeStorage();
    loadData();
  }, []);

  const loadData = () => {
    const pays = getPayments();
    setPayments(pays);

    const regs = getRegistrations().reduce((acc, r) => ({ ...acc, [r.id]: r }), {});
    setRegistrationsMap(regs);

    const atts = getAttendees().reduce((acc, a) => ({ ...acc, [a.id]: a }), {});
    setAttendeesMap(atts);

    const evts = getEvents().reduce((acc, e) => ({ ...acc, [e.id]: e }), {});
    setEventsMap(evts);
  };

  const handleVerifyDpoToken = async (payment: Payment) => {
    setVerifyingId(payment.id);
    setStatusNotice(null);

    const reg = registrationsMap[payment.registrationId];

    try {
      const res = await fetch("/api/dpo/verify-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionToken: payment.dpoTransToken,
          companyRef: payment.dpoTransactionReference,
          registrationReference: reg?.registrationReference || "",
        }),
      });

      const rawText = await res.text();
      let data: any;
      try {
        data = JSON.parse(rawText);
      } catch {
        data = {
          success: false,
          message: "API route returned HTML instead of JSON. Server route unreachable."
        };
      }

      if (data.success || data.result === "000" || data.result === "001") {
        // Update local records
        const allPays = getPayments();
        const pIdx = allPays.findIndex((p) => p.id === payment.id);
        if (pIdx !== -1) {
          allPays[pIdx].paymentStatus = "payment_successful";
          allPays[pIdx].verifiedAt = new Date().toISOString();
          allPays[pIdx].amountVerified = payment.amountDue;
          allPays[pIdx].rawVerifyTokenResponse = data;
          savePayments(allPays);
        }

        if (reg) {
          const allRegs = getRegistrations();
          const rIdx = allRegs.findIndex((r) => r.id === reg.id);
          if (rIdx !== -1) {
            allRegs[rIdx].paymentStatus = "verified";
            allRegs[rIdx].registrationStatus = "confirmed";
            saveRegistrations(allRegs);
          }
        }

        logDpoTransaction({
          registrationId: payment.registrationId,
          transactionReference: payment.dpoTransactionReference,
          dpoTransToken: payment.dpoTransToken,
          eventType: "verify",
          responsePayload: data,
          parsedResult: data,
          localStatusAfter: "verified",
        });

        setStatusNotice(`Payment ${payment.dpoTransactionReference} successfully verified via DPO API.`);
      } else {
        setStatusNotice(`DPO Verification returned result ${data.result}: ${data.resultExplanation || "Declined"}`);
      }
    } catch (err: any) {
      setStatusNotice(`Error verifying payment token: ${err.message}`);
    } finally {
      setVerifyingId(null);
      loadData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#111827]">
            DPO Payment Verification Desk
          </h1>
          <p className="text-xs text-[#64748B] mt-1">
            Audit DPO Direct Pay Online transaction references, verify tokens server-side, and inspect authorization logs.
          </p>
        </div>

        <span className="text-xs font-bold bg-[#0B6B3A] text-white px-3 py-1.5 rounded-full self-start sm:self-auto">
          {payments.length} Transaction Record(s)
        </span>
      </div>

      {statusNotice && (
        <div className="bg-green-50 border border-green-200 p-4 rounded-2xl flex items-center gap-2.5 text-xs text-[#064E2A]">
          <CheckCircle2 className="w-4 h-4 text-[#0B6B3A] shrink-0" />
          <span>{statusNotice}</span>
        </div>
      )}

      {/* Payment Table Card */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-[#F8FAF9] text-gray-600 uppercase font-bold">
                <th className="p-3">DPO CompanyRef</th>
                <th className="p-3">Registration</th>
                <th className="p-3">Attendee Name</th>
                <th className="p-3">Event</th>
                <th className="p-3">Amount Due</th>
                <th className="p-3">TransToken</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Verification Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payments.map((p) => {
                const reg = registrationsMap[p.registrationId];
                const att = reg ? attendeesMap[reg.attendeeId] : undefined;
                const evt = reg ? eventsMap[reg.eventId] : undefined;
                const isVerifying = verifyingId === p.id;

                return (
                  <tr key={p.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="p-3 font-mono font-bold text-gray-800 text-[11px] truncate max-w-[150px]">
                      {p.dpoTransactionReference}
                    </td>
                    <td className="p-3 font-mono font-bold text-[#0B6B3A]">
                      {reg?.registrationReference || "N/A"}
                    </td>
                    <td className="p-3 font-bold text-[#111827]">
                      {att?.fullName || "N/A"}
                    </td>
                    <td className="p-3 font-bold">{evt?.code || "EVENT"}</td>
                    <td className="p-3 font-mono font-bold text-[#F58220]">
                      ZMW {p.amountDue.toFixed(2)}
                    </td>
                    <td className="p-3 font-mono text-gray-500 text-[11px] truncate max-w-[110px]">
                      {p.dpoTransToken || "N/A"}
                    </td>
                    <td className="p-3">
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                          p.paymentStatus === "payment_successful" || p.paymentStatus === "verified"
                            ? "bg-green-100 text-[#0B6B3A]"
                            : p.paymentStatus.includes("pending")
                            ? "bg-amber-100 text-amber-800"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {p.paymentStatus.replace("_", " ")}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        disabled={isVerifying}
                        onClick={() => handleVerifyDpoToken(p)}
                        className="px-3 py-1 bg-[#0B6B3A] hover:bg-[#064E2A] text-white font-bold rounded text-[10px] inline-flex items-center gap-1 shadow-sm"
                      >
                        {isVerifying ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3 h-3" />
                        )}
                        Verify Token
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
