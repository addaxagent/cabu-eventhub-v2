import React, { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Printer, X, CheckCircle2, ShieldCheck } from "lucide-react";
import { Registration, Attendee, Event, Track, Payment, AccommodationBooking, MealTicket } from "../types";
import { formatSafeDate } from "../lib/storage";

interface PrintableReceiptProps {
  registration: Registration;
  attendee: Attendee;
  event: Event;
  track?: Track | null;
  payment?: Payment | null;
  booking?: AccommodationBooking | null;
  mealTicket?: MealTicket | null;
  onClose?: () => void;
  isModal?: boolean;
}

export const PrintableReceipt: React.FC<PrintableReceiptProps> = ({
  registration,
  attendee,
  event,
  track,
  payment,
  booking,
  mealTicket,
  onClose,
  isModal = false,
}) => {
  const receiptCardRef = useRef<HTMLDivElement>(null);

  const receiptNumber =
    registration.receiptNumber ||
    payment?.receiptNumber ||
    `CABU-REC-${registration.registrationReference.replace(/[^A-Z0-9]/gi, "")}`;

  const paymentDate = payment?.verifiedAt || payment?.createdAt || registration.createdAt;

  // Build clean non-sensitive QR payload
  const qrPayload = JSON.stringify({
    ref: registration.registrationReference,
    code: event.code,
    name: attendee.fullName,
    status: registration.registrationStatus,
  });

  const handlePrint = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    window.focus();
    setTimeout(() => {
      window.print();
    }, 50);
  };

  const content = (
    <div
      id="printable-receipt-card"
      ref={receiptCardRef}
      className="bg-white text-slate-900 border border-slate-200 rounded-3xl p-6 sm:p-10 max-w-3xl mx-auto shadow-lg print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-full font-sans"
    >
      {/* Top Action Bar (Excluded from Print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 mb-6 border-b border-slate-200 print:hidden">
        <div className="flex items-center gap-2">
          <span className="bg-[#0B6B3A] text-white text-[11px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
            Official Payment Receipt
          </span>
          <span className="text-xs font-mono font-bold text-slate-500">
            {receiptNumber}
          </span>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 bg-[#0B6B3A] hover:bg-[#08522d] text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-xs transition-all cursor-pointer"
            title="Print receipt or Save as PDF using browser print dialog"
          >
            <Printer className="w-4 h-4 text-white" />
            <span>Print / Save PDF</span>
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* University & Organization Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b-2 border-slate-900 print-avoid-break">
        <div className="flex items-center gap-4">
          <img
            src="https://imguser.free.nf/uploads/0_1786960332_6a82d9cc2e709_image-Photoroom5.png"
            alt="Central Africa Baptist University"
            className="h-14 w-auto object-contain shrink-0"
            referrerPolicy="no-referrer"
          />
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
              Central Africa Baptist University
            </h1>
            <p className="text-xs font-bold text-[#0B6B3A] tracking-wide uppercase">
              CABU EventHub · Official Receipt
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Plot 8051 Riverside Extension, Kitwe, Zambia · cabuniversity.com
            </p>
          </div>
        </div>

        <div className="text-left sm:text-right space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[#0B6B3A] text-xs font-extrabold uppercase">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>PAID & VERIFIED</span>
          </div>
          <p className="text-xs font-mono font-bold text-slate-800">
            Receipt: {receiptNumber}
          </p>
          <p className="text-[11px] text-slate-500">
            Date: {formatSafeDate(paymentDate)}
          </p>
        </div>
      </div>

      {/* Two Columns: Registration Info & Event Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b border-slate-200 text-xs print-avoid-break">
        {/* Attendee Details */}
        <div className="space-y-3">
          <h2 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">
            Attendee Information
          </h2>
          <div className="space-y-1.5 text-slate-700">
            <p className="text-sm font-black text-slate-900">{attendee.fullName}</p>
            <p className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">Registration Ref:</span>
              <span className="font-mono font-bold text-[#0B6B3A]">{registration.registrationReference}</span>
            </p>
            <p className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">Organization:</span>
              <span className="font-semibold text-slate-800">{attendee.churchOrganization || "N/A"}</span>
            </p>
            <p className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">Location:</span>
              <span>{attendee.city}, {attendee.country || "Zambia"}</span>
            </p>
            <p className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">Email:</span>
              <span>{attendee.email}</span>
            </p>
          </div>
        </div>

        {/* Event Details */}
        <div className="space-y-3">
          <h2 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">
            Event Information
          </h2>
          <div className="space-y-1.5 text-slate-700">
            <p className="text-sm font-black text-slate-900">{event.name}</p>
            <p className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">Selected Track:</span>
              <span className="font-bold text-[#0B6B3A]">{track?.name || "Standard Conference Track"}</span>
            </p>
            <p className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">Dates:</span>
              <span>{event.startDate} to {event.endDate}</span>
            </p>
            <p className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">Venue:</span>
              <span>{event.venue}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Itemized Breakdown Table */}
      <div className="py-6 border-b border-slate-200 print-avoid-break">
        <h2 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 mb-3">
          Itemized Payment Breakdown
        </h2>

        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
              <th className="py-2">Item Description</th>
              <th className="py-2 text-center">Status</th>
              <th className="py-2 text-right">Amount (ZMW)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            <tr>
              <td className="py-2.5 font-medium">
                Standard Event Registration ({event.code})
                <span className="block text-[11px] text-slate-400">{event.name}</span>
              </td>
              <td className="py-2.5 text-center">
                <span className="font-semibold text-emerald-700">Confirmed</span>
              </td>
              <td className="py-2.5 text-right font-mono font-bold">
                ZMW {registration.baseRegistrationFee.toFixed(2)}
              </td>
            </tr>

            {registration.accommodationRequested && (
              <tr>
                <td className="py-2.5 font-medium">
                  On-Campus Dormitory Bedspace
                  {booking && (
                    <span className="block text-[11px] text-slate-500">
                      Assigned: Room {booking.roomNumber}, Bed #{booking.bedspaceNumber} ({attendee.gender} Dorm)
                    </span>
                  )}
                </td>
                <td className="py-2.5 text-center">
                  <span className="font-semibold text-emerald-700">Allocated</span>
                </td>
                <td className="py-2.5 text-right font-mono font-bold">
                  ZMW {registration.accommodationFee.toFixed(2)}
                </td>
              </tr>
            )}

            {registration.mealTicketRequested && (
              <tr>
                <td className="py-2.5 font-medium">
                  Conference Dining & Meal Ticket Pass
                  <span className="block text-[11px] text-slate-500">Full dining session meal access</span>
                </td>
                <td className="py-2.5 text-center">
                  <span className="font-semibold text-emerald-700">Included</span>
                </td>
                <td className="py-2.5 text-right font-mono font-bold">
                  ZMW {registration.mealTicketFee.toFixed(2)}
                </td>
              </tr>
            )}

            {registration.priceOverrideApplied && (
              <tr className="text-amber-800 bg-amber-50/50">
                <td className="py-2 font-medium">
                  DPO Sandbox Override / Subsidy
                  <span className="block text-[10px] text-amber-700">
                    {registration.priceOverrideReason || "Payment test rate"}
                  </span>
                </td>
                <td className="py-2 text-center text-[11px] font-bold">Applied</td>
                <td className="py-2 text-right font-mono font-bold text-amber-800">
                  - ZMW {Math.abs(registration.priceOverrideDiscount || 0).toFixed(2)}
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-900 text-slate-900 font-extrabold text-sm">
              <td className="pt-4 pb-1" colSpan={2}>
                Total Amount Paid (ZMW)
              </td>
              <td className="pt-4 pb-1 text-right font-mono text-base text-[#0B6B3A]">
                ZMW {registration.totalAmountDue.toFixed(2)}
              </td>
            </tr>
            <tr className="text-[11px] text-slate-500">
              <td colSpan={3} className="text-right">
                Payment Provider: Direct Pay Online (DPO) · Reference: {payment?.dpoTransactionReference || registration.dpoTransactionReference || "Verified"}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* QR Code & Check-In Desk Instructions */}
      <div className="pt-6 grid grid-cols-1 sm:grid-cols-3 gap-6 items-center print-avoid-break">
        {/* QR Code Box */}
        <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200 rounded-2xl">
          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
            <QRCodeSVG
              value={qrPayload}
              size={120}
              level="M"
              includeMargin={false}
            />
          </div>
          <span className="text-[10px] font-mono font-bold text-slate-600 mt-2 text-center">
            {registration.registrationReference}
          </span>
          <span className="text-[9px] font-bold text-[#0B6B3A] uppercase tracking-wider mt-0.5">
            Attendee Check-In QR
          </span>
        </div>

        {/* Verification Note */}
        <div className="sm:col-span-2 space-y-2 text-xs text-slate-600">
          <div className="flex items-center gap-2 text-slate-900 font-bold">
            <ShieldCheck className="w-4 h-4 text-[#0B6B3A]" />
            <span>On-Campus Arrival & Check-In Instructions</span>
          </div>
          <p className="leading-relaxed">
            Please present this official receipt on your phone or in printed form upon arrival at the Central Africa Baptist University Welcome Desk in Kitwe.
          </p>
          <p className="leading-relaxed text-[11px] text-slate-500">
            Our welcome team will scan your QR code to instantly verify your registration, issue your official conference lanyard badge, meal tokens, and provide your dorm keys.
          </p>
        </div>
      </div>

      {/* Official Stamp & Sign-off Footer */}
      <div className="pt-8 mt-6 border-t border-dashed border-slate-200 text-center text-[10px] text-slate-400 space-y-1 print-avoid-break">
        <p className="font-semibold text-slate-600">
          Central Africa Baptist University · Transforming Central Africa Through Biblical Leadership
        </p>
        <p>
          For registration assistance or accommodation inquiries, contact registration@cabuniversity.com or +260 977 123456.
        </p>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto print:static print:inset-auto print:bg-transparent print:backdrop-blur-none print:p-0 print:m-0 print:overflow-visible print:block">
        <div className="w-full my-auto animate-in fade-in zoom-in-95 duration-200 print:animate-none print:transform-none print:m-0 print:p-0">
          {content}
        </div>
      </div>
    );
  }

  return content;
};

