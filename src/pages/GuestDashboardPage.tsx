import React, { useEffect, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import {
  User,
  Calendar,
  BedDouble,
  Utensils,
  CreditCard,
  CheckCircle2,
  Clock,
  Award,
  Printer,
  ShieldCheck,
  Search,
  FileText,
  LogOut,
  QrCode,
  Building,
  MapPin,
  Mail,
  Phone,
  Layers,
  ChevronRight,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import {
  getCurrentGuestSession,
  clearGuestSession,
  getRegistrations,
  getAttendees,
  getEvents,
  getTracks,
  getPayments,
  getAccommodationBookings,
  getMealTickets,
  getResultsCertificates,
  getCheckIns,
  initializeStorage,
  formatSafeDate,
} from "../lib/storage";
import { maskNrc } from "../lib/nrc";
import {
  Registration,
  Attendee,
  Event,
  Track,
  Payment,
  AccommodationBooking,
  MealTicket,
  ResultCertificate,
  CheckIn,
} from "../types";
import { PrintableReceipt } from "../components/PrintableReceipt";

type DashboardTab = "registration" | "payment" | "accommodation" | "checkin" | "events" | "profile" | "results";

export const GuestDashboardPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<DashboardTab>("registration");
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const [attendee, setAttendee] = useState<Attendee | null>(null);
  const [currentReg, setCurrentReg] = useState<Registration | null>(null);
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [currentPayment, setCurrentPayment] = useState<Payment | null>(null);
  const [currentBooking, setCurrentBooking] = useState<AccommodationBooking | null>(null);
  const [currentMealTicket, setCurrentMealTicket] = useState<MealTicket | null>(null);
  const [currentCheckIn, setCurrentCheckIn] = useState<CheckIn | null>(null);

  // History state for attendee
  const [allRegistrations, setAllRegistrations] = useState<Registration[]>([]);
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [certificates, setCertificates] = useState<ResultCertificate[]>([]);

  useEffect(() => {
    initializeStorage();

    const session = getCurrentGuestSession();
    const queryRef = searchParams.get("ref");
    const tabParam = searchParams.get("tab") as DashboardTab;
    if (tabParam && ["registration", "payment", "accommodation", "checkin", "events", "profile", "results"].includes(tabParam)) {
      setActiveTab(tabParam);
    }

    const registrations = getRegistrations();
    const attendees = getAttendees();
    const events = getEvents();
    const tracks = getTracks();
    const payments = getPayments();
    const bookings = getAccommodationBookings();
    const mealTickets = getMealTickets();
    const checkIns = getCheckIns();
    const certs = getResultsCertificates();

    setAllEvents(events);

    let targetReg: Registration | undefined;

    if (queryRef) {
      targetReg = registrations.find((r) => r.registrationReference === queryRef);
    }

    if (!targetReg && session.registrationId) {
      targetReg = registrations.find((r) => r.id === session.registrationId);
    }

    if (!targetReg && session.attendeeId) {
      targetReg = registrations
        .filter((r) => r.attendeeId === session.attendeeId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    }

    if (!targetReg && registrations.length > 0) {
      targetReg = registrations[registrations.length - 1];
    }

    if (targetReg) {
      setCurrentReg(targetReg);

      const att = attendees.find((a) => a.id === targetReg?.attendeeId);
      if (att) {
        setAttendee(att);
        const historyRegs = registrations.filter((r) => r.attendeeId === att.id);
        setAllRegistrations(historyRegs);

        const userCerts = certs.filter((c) => c.attendeeId === att.id);
        setCertificates(userCerts);
      }

      const evt = events.find((e) => e.id === targetReg?.eventId);
      if (evt) setCurrentEvent(evt);

      const trk = tracks.find((t) => t.id === targetReg?.trackId);
      if (trk) setCurrentTrack(trk);

      const pay = payments.find((p) => p.registrationId === targetReg?.id);
      if (pay) setCurrentPayment(pay);

      const bk = bookings.find((b) => b.registrationId === targetReg?.id);
      if (bk) setCurrentBooking(bk);

      const mt = mealTickets.find((m) => m.registrationId === targetReg?.id);
      if (mt) setCurrentMealTicket(mt);

      const chk = checkIns.find((c) => c.registrationId === targetReg?.id);
      if (chk) setCurrentCheckIn(chk);
    }
  }, [searchParams]);

  const handleLogout = () => {
    clearGuestSession();
    navigate("/returning-guest");
  };

  const selectRegistration = (regRef: string) => {
    setSearchParams({ ref: regRef });
  };

  if (!currentReg || !attendee || !currentEvent) {
    return (
      <div className="min-h-[70vh] bg-[#F8FAF9] flex items-center justify-center p-4">
        <div className="bg-white p-8 sm:p-10 rounded-3xl border border-slate-200 text-center max-w-md w-full shadow-sm space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-[#0B6B3A] flex items-center justify-center mx-auto">
            <User className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">No Active Guest Session</h1>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Please enter your registration reference or NRC number to view your confirmed events and receipts.
            </p>
          </div>
          <div className="flex flex-col gap-2.5 pt-2">
            <Link
              to="/returning-guest"
              className="py-3 bg-[#0B6B3A] hover:bg-[#08522d] text-white text-xs font-bold rounded-xl transition-all shadow-xs"
            >
              Look Up Existing Registration
            </Link>
            <Link
              to="/"
              className="py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
            >
              Browse Active Events
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // QR Code payload (non-sensitive)
  const checkinQrPayload = JSON.stringify({
    ref: currentReg.registrationReference,
    code: currentEvent.code,
    name: attendee.fullName,
    status: currentReg.registrationStatus,
  });

  const isPaid = currentReg.paymentStatus === "verified" || currentReg.paymentStatus === "payment_successful";

  return (
    <div className="min-h-screen bg-[#F8FAF9] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Attendee Profile Header Banner */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#0B6B3A] text-white flex items-center justify-center font-black text-2xl shrink-0 shadow-xs">
                {attendee.firstName.charAt(0)}
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="bg-[#0B6B3A] text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded uppercase tracking-wider">
                    Attendee
                  </span>
                  <span className="font-mono text-xs font-bold text-[#0B6B3A] bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                    {currentReg.registrationReference}
                  </span>
                  <span
                    className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded ${
                      isPaid
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {isPaid ? "Payment Verified" : currentReg.paymentStatus.replace("_", " ")}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
                  {attendee.fullName}
                </h1>
                <p className="text-xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span>{attendee.churchOrganization || "Independent Attendee"}</span>
                  <span>·</span>
                  <span>{attendee.city}, {attendee.country || "Zambia"}</span>
                </p>
              </div>
            </div>

            {/* Header Right Actions */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => setShowReceiptModal(true)}
                className="px-4 py-2.5 bg-[#0B6B3A] hover:bg-[#08522d] text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Official Receipt</span>
              </button>

              <button
                onClick={() => setActiveTab("checkin")}
                className="px-4 py-2.5 bg-[#ee5700] hover:bg-[#d44e00] text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs transition-all cursor-pointer"
              >
                <QrCode className="w-4 h-4" />
                <span>Check-In QR</span>
              </button>

              <button
                onClick={handleLogout}
                className="px-3.5 py-2.5 border border-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-slate-600 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Sign out of guest session"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>

        {/* Current Event Spotlight Card */}
        <div className="bg-[#060606] text-white rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-[#F58220] font-bold uppercase tracking-wider">
                <Calendar className="w-4 h-4" />
                <span>Current Event Registration</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                {currentEvent.name}
              </h2>
              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                {currentEvent.theme}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs bg-white/5 backdrop-blur-xs p-4 rounded-2xl border border-white/10 shrink-0">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Dates</span>
                <span className="font-semibold text-white">{currentEvent.startDate}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Selected Track</span>
                <span className="font-bold text-[#F58220]">{currentTrack?.name || "General"}</span>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Venue</span>
                <span className="font-semibold text-white">CABU Campus, Kitwe</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation Menu */}
        <div className="bg-white border border-slate-200 rounded-2xl p-1.5 shadow-2xs">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {[
              { id: "registration", label: "My Registration", icon: FileText },
              { id: "payment", label: "Payment / Receipt", icon: CreditCard },
              { id: "accommodation", label: "Accommodation & Dining", icon: BedDouble },
              { id: "checkin", label: "Check-In QR Badge", icon: QrCode },
              { id: "events", label: "My Events", icon: Calendar, badge: allRegistrations.length > 1 ? allRegistrations.length : undefined },
              { id: "profile", label: "Attendee Profile", icon: User },
              ...(certificates.length > 0
                ? [{ id: "results" as DashboardTab, label: "Results & Certificates", icon: Award, badge: certificates.length }]
                : []),
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as DashboardTab)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? "bg-[#0B6B3A] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isActive ? "bg-white text-[#0B6B3A]" : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* TAB 1: MY REGISTRATION */}
        {activeTab === "registration" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-lg font-black text-slate-900">Registration Details</h3>
                <p className="text-xs text-slate-500">Official conference enrollment summary</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400">Registration Reference</span>
                  <p className="text-base font-mono font-black text-[#0B6B3A]">{currentReg.registrationReference}</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400">Status</span>
                  <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-sm">
                    <CheckCircle2 className="w-4 h-4 text-[#0B6B3A]" />
                    <span className="capitalize">{currentReg.registrationStatus.replace("_", " ")}</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1 sm:col-span-2">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400">Enrolled Track</span>
                  <p className="text-sm font-bold text-slate-900">{currentTrack?.name || "General Conference Track"}</p>
                  <p className="text-xs text-slate-500">{currentTrack?.description}</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1 sm:col-span-2">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400">Special Notes & Accommodations</span>
                  <p className="text-xs text-slate-700">
                    {currentReg.specialNotes || "No special dietary or medical notes submitted."}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Checklist Sidebar */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xs">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Conference Checklist</h3>
              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                  <CheckCircle2 className="w-4 h-4 text-[#0B6B3A] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-emerald-900">Registration Confirmed</p>
                    <p className="text-[11px] text-emerald-700">Your seat is reserved for all plenary & track sessions.</p>
                  </div>
                </div>

                <div className={`flex items-start gap-3 p-3 rounded-xl ${isPaid ? "bg-emerald-50 border border-emerald-100" : "bg-amber-50 border border-amber-100"}`}>
                  {isPaid ? (
                    <CheckCircle2 className="w-4 h-4 text-[#0B6B3A] shrink-0 mt-0.5" />
                  ) : (
                    <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="font-bold text-slate-900">{isPaid ? "Payment Verified" : "Payment Pending"}</p>
                    <p className="text-[11px] text-slate-600">Total: ZMW {currentReg.totalAmountDue.toFixed(2)}</p>
                  </div>
                </div>

                <div className={`flex items-start gap-3 p-3 rounded-xl ${currentBooking ? "bg-emerald-50 border border-emerald-100" : "bg-slate-50 border border-slate-100"}`}>
                  <BedDouble className={`w-4 h-4 shrink-0 mt-0.5 ${currentBooking ? "text-[#0B6B3A]" : "text-slate-400"}`} />
                  <div>
                    <p className="font-bold text-slate-900">
                      {currentBooking ? `Room ${currentBooking.roomNumber}, Bed #${currentBooking.bedspaceNumber}` : "No Bedspace Booked"}
                    </p>
                    <p className="text-[11px] text-slate-600">
                      {currentBooking ? "On-campus dorm key at desk." : "Commuter / Off-campus attendee."}
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => setShowReceiptModal(true)}
                    className="w-full py-2.5 bg-[#ee5700] hover:bg-[#d44e00] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Registration Card</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PAYMENT & RECEIPT */}
        {activeTab === "payment" && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Payment & Transaction Summary</h3>
                  <p className="text-xs text-slate-500">Processed securely via Direct Pay Online (DPO)</p>
                </div>

                <button
                  onClick={() => setShowReceiptModal(true)}
                  className="px-4 py-2 bg-[#0B6B3A] hover:bg-[#08522d] text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs transition-all cursor-pointer self-start sm:self-auto"
                >
                  <Printer className="w-4 h-4" />
                  <span>View Printable Official Receipt</span>
                </button>
              </div>

              {/* Itemized breakdown table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                      <th className="py-3">Item Description</th>
                      <th className="py-3 text-center">Status</th>
                      <th className="py-3 text-right">Fee (ZMW)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    <tr>
                      <td className="py-3 font-semibold">
                        Standard Conference Registration Fee
                        <span className="block text-[11px] text-slate-400 font-normal">{currentEvent.name}</span>
                      </td>
                      <td className="py-3 text-center">
                        <span className="bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px]">
                          VERIFIED
                        </span>
                      </td>
                      <td className="py-3 text-right font-mono font-bold">
                        ZMW {currentReg.baseRegistrationFee.toFixed(2)}
                      </td>
                    </tr>

                    {currentReg.accommodationRequested && (
                      <tr>
                        <td className="py-3 font-semibold">
                          On-Campus Dormitory Bedspace
                          <span className="block text-[11px] text-slate-400 font-normal">
                            {currentBooking ? `Assigned: Room ${currentBooking.roomNumber} (Bed #${currentBooking.bedspaceNumber})` : "Gender-allocated dormitory"}
                          </span>
                        </td>
                        <td className="py-3 text-center">
                          <span className="bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px]">
                            ALLOCATED
                          </span>
                        </td>
                        <td className="py-3 text-right font-mono font-bold">
                          ZMW {currentReg.accommodationFee.toFixed(2)}
                        </td>
                      </tr>
                    )}

                    {currentReg.mealTicketRequested && (
                      <tr>
                        <td className="py-3 font-semibold">
                          Event Dining & Meal Ticket Pass
                          <span className="block text-[11px] text-slate-400 font-normal">Conference meal badge access</span>
                        </td>
                        <td className="py-3 text-center">
                          <span className="bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px]">
                            INCLUDED
                          </span>
                        </td>
                        <td className="py-3 text-right font-mono font-bold">
                          ZMW {currentReg.mealTicketFee.toFixed(2)}
                        </td>
                      </tr>
                    )}

                    {currentReg.priceOverrideApplied && (
                      <tr className="bg-amber-50/50 text-amber-900">
                        <td className="py-2.5 font-medium">
                          DPO Sandbox Payment Override
                          <span className="block text-[10px] text-amber-700">{currentReg.priceOverrideReason}</span>
                        </td>
                        <td className="py-2.5 text-center font-bold text-[10px]">APPLIED</td>
                        <td className="py-2.5 text-right font-mono font-bold text-amber-900">
                          - ZMW {Math.abs(currentReg.priceOverrideDiscount || 0).toFixed(2)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-900 text-slate-900 font-extrabold text-sm">
                      <td className="py-4" colSpan={2}>
                        Total Amount Paid
                      </td>
                      <td className="py-4 text-right font-mono text-base text-[#0B6B3A]">
                        ZMW {currentReg.totalAmountDue.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Payment Details Metadata Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">DPO Transaction Ref</span>
                  <span className="font-mono font-bold text-slate-800 truncate block mt-0.5">
                    {currentPayment?.dpoTransactionReference || currentReg.dpoTransactionReference || "N/A"}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Payment Method</span>
                  <span className="font-bold text-[#0B6B3A] block mt-0.5">
                    Direct Pay Online (DPO) 3G Gateway
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Payment Verification Date</span>
                  <span className="font-semibold text-slate-800 block mt-0.5">
                    {formatSafeDate(currentPayment?.verifiedAt || currentReg.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ACCOMMODATION & DINING */}
        {activeTab === "accommodation" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Bedspace Card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-[#F58220] flex items-center justify-center shrink-0">
                  <BedDouble className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Dormitory Bedspace</h3>
                  <p className="text-xs text-slate-500">On-campus housing reservation</p>
                </div>
              </div>

              {currentBooking ? (
                <div className="space-y-4">
                  <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
                        Bedspace Allocated
                      </span>
                      <span className="text-[10px] font-extrabold uppercase bg-[#0B6B3A] text-white px-2 py-0.5 rounded">
                        {currentBooking.bookingStatus}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <span className="text-[10px] text-emerald-700 uppercase font-semibold block">Room Number</span>
                        <span className="text-lg font-black text-slate-900">Room {currentBooking.roomNumber}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-700 uppercase font-semibold block">Bed Number</span>
                        <span className="text-lg font-black text-slate-900">Bed #{currentBooking.bedspaceNumber}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-slate-600 space-y-2">
                    <p className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#0B6B3A]" />
                      <span>Gender Restricted: <strong>{attendee.gender} Dormitory</strong></span>
                    </p>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Keys and room access cards will be issued upon presenting your Check-In QR code at the CABU Welcome Desk in Kitwe.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 text-center space-y-3">
                  <p className="text-xs font-semibold text-slate-700">No on-campus accommodation booked.</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    You are registered as a non-residential conference attendee. If you need accommodation on campus, please visit the desk on arrival subject to availability.
                  </p>
                </div>
              )}
            </div>

            {/* Dining & Meal Ticket Card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#0B6B3A] flex items-center justify-center shrink-0">
                  <Utensils className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Dining & Meal Pass</h3>
                  <p className="text-xs text-slate-500">Conference meal schedule access</p>
                </div>
              </div>

              {currentMealTicket ? (
                <div className="space-y-4">
                  <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
                        Meal Pass Active
                      </span>
                      <span className="text-[10px] font-extrabold uppercase bg-[#0B6B3A] text-white px-2 py-0.5 rounded">
                        {currentMealTicket.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-800 font-medium">
                      All conference breakfast, lunch, and dinner sessions included on campus dining hall.
                    </p>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Your physical conference lanyard badge will contain the dining token scan code.
                  </p>
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 text-center space-y-3">
                  <p className="text-xs font-semibold text-slate-700">No meal ticket pass requested.</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Campus dining passes can be purchased separately at the cafeteria reception during session intervals.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: CHECK-IN QR CODE */}
        {activeTab === "checkin" && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 space-y-8 shadow-xs max-w-2xl mx-auto">
            <div className="text-center space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#0B6B3A] bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                Official Check-In Badge
              </span>
              <h3 className="text-2xl font-black text-slate-900 mt-2">
                Fast-Track Check-In QR
              </h3>
              <p className="text-xs text-slate-500">
                Present this QR code on your mobile device at the CABU Welcome Desk upon arrival.
              </p>
            </div>

            {/* QR Code Container */}
            <div className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-3xl border border-slate-200 space-y-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-md">
                <QRCodeSVG
                  value={checkinQrPayload}
                  size={200}
                  level="M"
                  includeMargin={false}
                />
              </div>

              <div className="text-center space-y-0.5">
                <span className="text-xs font-mono font-black text-slate-900 block">
                  {currentReg.registrationReference}
                </span>
                <span className="text-[11px] font-semibold text-slate-500 block">
                  {attendee.fullName} · {currentEvent.code}
                </span>
              </div>
            </div>

            {/* Check-In Desk Status */}
            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 flex items-start gap-3 text-xs text-slate-700">
              <CheckCircle2 className="w-5 h-5 text-[#0B6B3A] shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-900">Check-In Desk Verification Ready</p>
                <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                  Scanning this QR code gives campus staff immediate access to verify your registration, assign materials, and hand you your badge without delays.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: MY EVENTS HISTORY */}
        {activeTab === "events" && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-lg font-black text-slate-900">My Registered Events</h3>
              <p className="text-xs text-slate-500">All conferences and block classes associated with your attendee profile</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {allRegistrations.map((reg) => {
                const regEvent = allEvents.find((e) => e.id === reg.eventId);
                const isSelected = reg.id === currentReg.id;

                return (
                  <div
                    key={reg.id}
                    className={`p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      isSelected
                        ? "border-[#0B6B3A] bg-emerald-50/30 ring-1 ring-[#0B6B3A]"
                        : "border-slate-200 bg-slate-50/50 hover:bg-slate-50"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#0B6B3A]">{reg.registrationReference}</span>
                        <span className="text-[10px] font-extrabold uppercase bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                          {reg.paymentStatus}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-slate-900">{regEvent?.name || reg.eventId}</h4>
                      <p className="text-xs text-slate-500">
                        {regEvent?.startDate} to {regEvent?.endDate} · CABU Campus
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono font-black text-sm text-slate-900">
                        ZMW {reg.totalAmountDue.toFixed(2)}
                      </span>

                      {!isSelected && (
                        <button
                          onClick={() => selectRegistration(reg.registrationReference)}
                          className="px-3.5 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-800 text-xs font-bold rounded-xl transition-all cursor-pointer"
                        >
                          View Details
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 6: ATTENDEE PROFILE */}
        {activeTab === "profile" && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs max-w-3xl mx-auto">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-lg font-black text-slate-900">Attendee Personal Profile</h3>
              <p className="text-xs text-slate-500">Your profile details on file with Central Africa Baptist University</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400">Full Name</span>
                <p className="text-sm font-bold text-slate-900">{attendee.fullName}</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400">NRC (National Identity)</span>
                <p className="text-sm font-mono font-bold text-slate-900">{maskNrc(attendee.nrcNumber)}</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400">Email Address</span>
                <p className="text-sm font-semibold text-slate-900">{attendee.email}</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400">Mobile / WhatsApp</span>
                <p className="text-sm font-mono font-semibold text-slate-900">{attendee.phone}</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400">Gender</span>
                <p className="text-sm font-semibold text-slate-900">{attendee.gender}</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400">Church or Organization</span>
                <p className="text-sm font-semibold text-slate-900">{attendee.churchOrganization || "N/A"}</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1 sm:col-span-2">
                <span className="text-[10px] font-bold uppercase text-slate-400">Location</span>
                <p className="text-sm font-semibold text-slate-900">{attendee.city}, {attendee.country || "Zambia"}</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-slate-500 text-xs flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-[#0B6B3A] shrink-0" />
              <span>
                To update your contact information or transfer your registration to another participant, please contact registration@cabuniversity.com.
              </span>
            </div>
          </div>
        )}

        {/* TAB 7: RESULTS & CERTIFICATES */}
        {activeTab === "results" && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-lg font-black text-slate-900">Results & Academic Certificates</h3>
              <p className="text-xs text-slate-500">Official grades and course certificates issued by CABU faculty</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {certificates.map((cert) => (
                <div
                  key={cert.id}
                  className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2 text-xs text-amber-950"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-[11px] text-[#F58220]">
                      {cert.certificateNumber || "Certificate Issued"}
                    </span>
                    <span className="font-extrabold uppercase bg-amber-200 text-amber-900 px-2 py-0.5 rounded text-[10px]">
                      {cert.resultStatus}
                    </span>
                  </div>
                  <h4 className="font-black text-sm text-slate-900">{cert.assessmentName}</h4>
                  <p className="text-slate-600">Module: {cert.moduleName}</p>
                  {cert.score !== undefined && (
                    <p className="font-bold">Score: {cert.score}% ({cert.grade || "Passed"})</p>
                  )}
                  {cert.adminComments && (
                    <p className="text-slate-500 italic">Comments: {cert.adminComments}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Printable Receipt Modal */}
      {showReceiptModal && (
        <PrintableReceipt
          registration={currentReg}
          attendee={attendee}
          event={currentEvent}
          track={currentTrack}
          payment={currentPayment}
          booking={currentBooking}
          mealTicket={currentMealTicket}
          onClose={() => setShowReceiptModal(false)}
          isModal={true}
        />
      )}
    </div>
  );
};
