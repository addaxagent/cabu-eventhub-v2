import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  UserCheck,
  Search,
  AlertCircle,
  Calendar,
  BedDouble,
  Award,
  ArrowRight,
  User,
  PlusCircle,
  Sparkles,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import {
  findAttendeeByLastNameAndNrc,
  getRegistrations,
  getEvents,
  getTracks,
  getAccommodationBookings,
  getResultsCertificates,
  setCurrentGuestSession,
  findEventBySlugOrId,
  initializeStorage,
} from "../lib/storage";
import { formatNrc, isValidNrc, maskNrc } from "../lib/nrc";
import { Attendee, Registration, Event, Track, AccommodationBooking, ResultCertificate } from "../types";
import {
  GuestOwnershipVerificationModal,
  GuestVerificationChallengeData,
} from "../components/GuestOwnershipVerificationModal";

export const ReturningGuestPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const eventParam = searchParams.get("event") || searchParams.get("slug") || searchParams.get("eventId");

  const [lastName, setLastName] = useState("");
  const [nrc, setNrc] = useState("");

  const [searched, setSearched] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Unverified matched candidate
  const [pendingAttendee, setPendingAttendee] = useState<Attendee | null>(null);
  const [verificationChallenge, setVerificationChallenge] = useState<GuestVerificationChallengeData | null>(null);
  const [showVerificationModal, setShowVerificationModal] = useState(false);

  // Verified state
  const [isVerified, setIsVerified] = useState(false);
  const [attendee, setAttendee] = useState<Attendee | null>(null);
  const [targetEvent, setTargetEvent] = useState<Event | null>(null);
  const [activeEvents, setActiveEvents] = useState<Event[]>([]);

  // History data for matched verified attendee
  const [historyRegistrations, setHistoryRegistrations] = useState<Registration[]>([]);
  const [eventsMap, setEventsMap] = useState<Record<string, Event>>({});
  const [tracksMap, setTracksMap] = useState<Record<string, Track>>({});
  const [bookingsMap, setBookingsMap] = useState<Record<string, AccommodationBooking>>({});
  const [certificates, setCertificates] = useState<ResultCertificate[]>([]);

  useEffect(() => {
    initializeStorage();
    const all = getEvents();
    setActiveEvents(all.filter((e) => e.status === "published" && e.isActive));
    if (eventParam) {
      const found = findEventBySlugOrId(eventParam);
      if (found) {
        setTargetEvent(found);
      }
    }
  }, [eventParam]);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearched(true);
    setLookupError(null);
    setAttendee(null);
    setIsVerified(false);
    setPendingAttendee(null);

    if (!lastName.trim() || !isValidNrc(nrc)) {
      return;
    }

    setIsLookingUp(true);

    try {
      const match = findAttendeeByLastNameAndNrc(lastName, nrc);

      if (!match) {
        // Generic response if not found
        setIsLookingUp(false);
        return;
      }

      setPendingAttendee(match);

      // Create short-lived backend verification challenge
      const res = await fetch("/api/guest/create-challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purpose: "RETURNING_GUEST_ACCESS",
          attendeeId: match.id,
          email: match.email,
          phone: match.phone,
        }),
      });

      const data = await res.json();

      if (data.success && data.challengeId) {
        setVerificationChallenge({
          challengeId: data.challengeId,
          purpose: "RETURNING_GUEST_ACCESS",
          maskedEmail: data.maskedEmail,
          maskedPhone: data.maskedPhone,
          availableMethods: data.availableMethods || ["email"],
          defaultMethod: data.defaultMethod || "email",
        });
        setShowVerificationModal(true);
      } else {
        setLookupError(data.message || "Could not initialize ownership verification. Please try again.");
      }
    } catch (err: any) {
      console.error("Lookup error:", err);
      setLookupError("Network error occurred during lookup. Please check your connection.");
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleVerificationSuccess = (token: string) => {
    setShowVerificationModal(false);

    if (!pendingAttendee) return;

    // Reveal matched attendee profile only after successful verification
    const verifiedAtt = pendingAttendee;
    setIsVerified(true);
    setAttendee(verifiedAtt);

    const allRegs = getRegistrations().filter((r) => r.attendeeId === verifiedAtt.id);
    setHistoryRegistrations(allRegs);

    const events = getEvents().reduce((acc, ev) => ({ ...acc, [ev.id]: ev }), {});
    setEventsMap(events);

    const tracks = getTracks().reduce((acc, tr) => ({ ...acc, [tr.id]: tr }), {});
    setTracksMap(tracks);

    const bookings = getAccommodationBookings().reduce((acc, bk) => ({ ...acc, [bk.registrationId]: bk }), {});
    setBookingsMap(bookings);

    const certs = getResultsCertificates().filter((c) => c.attendeeId === verifiedAtt.id);
    setCertificates(certs);

    if (allRegs.length > 0) {
      setCurrentGuestSession(verifiedAtt.id, allRegs[0].id, allRegs[0].registrationReference);
    }
  };

  const handleCloseVerificationModal = () => {
    setShowVerificationModal(false);
    setPendingAttendee(null);
    setVerificationChallenge(null);
    setIsVerified(false);
    setAttendee(null);
  };

  return (
    <div className="min-h-screen bg-[#F8FAF9] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#0B6B3A]/10 text-[#0B6B3A] flex items-center justify-center mx-auto">
            <UserCheck className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-black text-[#111827]">
            Returning Guest Lookup
          </h1>
          <p className="text-xs text-[#64748B]">
            Enter your details to locate your existing CABU event history, bedspace records, and registered profiles.
          </p>
        </div>

        {/* Context banner if arriving from an event */}
        {targetEvent && (
          <div className="bg-[#0B6B3A]/10 border border-[#0B6B3A]/30 p-4 rounded-2xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#0B6B3A] text-white flex items-center justify-center font-bold text-xs shrink-0">
                {targetEvent.code}
              </div>
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#0B6B3A] block">
                  Event Selected for Registration
                </span>
                <span className="font-black text-sm text-[#111827]">{targetEvent.name}</span>
              </div>
            </div>
            <Link
              to={`/event/${targetEvent.slug}/register`}
              className="px-3.5 py-1.5 bg-[#0B6B3A] text-white font-extrabold text-xs rounded-lg hover:bg-[#08522d] shrink-0"
            >
              Go to Form
            </Link>
          </div>
        )}

        {/* Form Card */}
        <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm space-y-6">
          <form onSubmit={handleLookup} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#111827] mb-1">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Banda"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#0B6B3A]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111827] mb-1">
                  Zambian NRC Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={nrc}
                  onChange={(e) => setNrc(formatNrc(e.target.value))}
                  placeholder="123456/78/9"
                  maxLength={11}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-mono focus:outline-none focus:border-[#0B6B3A]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!lastName.trim() || !isValidNrc(nrc) || isLookingUp}
              className={`w-full py-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                lastName.trim() && isValidNrc(nrc) && !isLookingUp
                  ? "bg-[#0B6B3A] hover:bg-[#064E2A] text-white shadow-sm cursor-pointer"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              {isLookingUp ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Searching CABU Records...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Search Guest Profile</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Error message banner */}
        {lookupError && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{lookupError}</span>
          </div>
        )}

        {/* Not Found State (Generic notice) */}
        {searched && !isLookingUp && !pendingAttendee && !attendee && (
          <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl text-center space-y-3 text-amber-900">
            <AlertCircle className="w-8 h-8 text-amber-600 mx-auto" />
            <p className="font-bold text-sm">
              If a matching CABU EventHub record exists, verification options will be provided.
            </p>
            <p className="text-xs text-amber-800">
              No matching attendee was found for the provided last name and NRC number. Please check the spelling or proceed as a new guest.
            </p>
            <div className="pt-2">
              <Link
                to={targetEvent ? `/event/${targetEvent.slug}/register` : "/"}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0B6B3A] text-white font-bold text-xs rounded-xl hover:bg-[#08522d]"
              >
                <PlusCircle className="w-4 h-4" />
                {targetEvent ? `Register for ${targetEvent.name}` : "Register as New Guest"}
              </Link>
            </div>
          </div>
        )}

        {/* OTP Ownership Verification Modal */}
        {verificationChallenge && (
          <GuestOwnershipVerificationModal
            isOpen={showVerificationModal}
            challenge={verificationChallenge}
            onClose={handleCloseVerificationModal}
            onVerified={handleVerificationSuccess}
            title="Identity Found — Verification Required"
            description="To protect your registration history, dormitory allocation, and event records, please verify your ownership."
          />
        )}

        {/* Found Profile & History (REVEALED ONLY AFTER SUCCESSFUL OTP VERIFICATION) */}
        {isVerified && attendee && (
          <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm space-y-8 animate-in fade-in duration-300">
            <div className="border-b border-gray-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#0B6B3A]">
                    Verified Guest Profile
                  </span>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-[#0B6B3A]" />
                    Ownership Verified
                  </span>
                </div>
                <h2 className="text-2xl font-black text-[#111827] mt-1">
                  {attendee.fullName}
                </h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  NRC: <span className="font-mono">{maskNrc(attendee.nrcNumber)}</span> • Email: {attendee.email} • Phone: {attendee.phone}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  to={targetEvent ? `/event/${targetEvent.slug}/register` : (activeEvents.length > 0 ? `/event/${activeEvents[0].slug}/register` : "/")}
                  className="px-4 py-2 bg-[#F58220] hover:bg-[#C65F12] text-black font-extrabold text-xs rounded-xl shadow-sm cursor-pointer"
                >
                  {targetEvent ? `Register for ${targetEvent.code}` : "Continue Registration"}
                </Link>
                <Link
                  to="/guest/dashboard"
                  className="px-4 py-2 bg-[#0B6B3A] text-white font-bold text-xs rounded-xl hover:bg-[#08522d] cursor-pointer"
                >
                  Open Dashboard
                </Link>
              </div>
            </div>

            {/* Quick Register into Available Events */}
            <div className="p-4 bg-[#F8FAF9] rounded-2xl border border-gray-200 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-600 block">
                Select an Event to Register:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeEvents.map((ev) => (
                  <div key={ev.id} className="bg-white p-3.5 rounded-xl border border-gray-200 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-black text-gray-900 block truncate">{ev.name}</span>
                      <span className="text-[11px] text-gray-500">{ev.startDate} • {ev.code}</span>
                    </div>
                    <Link
                      to={`/event/${ev.slug}/register`}
                      className="px-3 py-1.5 bg-[#0B6B3A] text-white text-xs font-extrabold rounded-lg hover:bg-[#08522d] shrink-0"
                    >
                      Register
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            {/* Event History */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                Registered Event History ({historyRegistrations.length})
              </h3>

              {historyRegistrations.length === 0 ? (
                <p className="text-xs text-gray-500 italic p-4 bg-gray-50 rounded-xl">
                  No previous event registrations on record for this profile.
                </p>
              ) : (
                <div className="space-y-3">
                  {historyRegistrations.map((reg) => {
                    const evt = eventsMap[reg.eventId];
                    const track = tracksMap[reg.trackId];
                    const booking = bookingsMap[reg.id];

                    return (
                      <div
                        key={reg.id}
                        className="p-5 rounded-2xl bg-[#F8FAF9] border border-gray-200 space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200 pb-2">
                          <div>
                            <span className="text-xs font-mono text-[#0B6B3A] font-bold">
                              {reg.registrationReference}
                            </span>
                            <h4 className="font-black text-base text-[#111827]">
                              {evt?.name || "Event"}
                            </h4>
                          </div>
                          <span
                            className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase self-start sm:self-auto ${
                              reg.paymentStatus === "verified" || reg.paymentStatus === "payment_successful"
                                ? "bg-green-100 text-[#0B6B3A]"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {reg.paymentStatus.replace("_", " ")}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-gray-600">
                          <div>Track: <span className="font-semibold text-gray-900">{track?.name || "Standard"}</span></div>
                          <div>Total Amount: <span className="font-bold text-gray-900">ZMW {reg.totalAmountDue.toFixed(2)}</span></div>
                          <div>
                            Bedspace:{" "}
                            {booking ? (
                              <span className="font-bold text-[#0B6B3A]">
                                Room {booking.roomNumber} (#{booking.bedspaceNumber})
                              </span>
                            ) : (
                              <span className="text-gray-400">None</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Results Certificates Preview */}
            {certificates.length > 0 && (
              <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
                <div className="flex items-center gap-2 text-[#F58220]">
                  <Award className="w-5 h-5" />
                  <span className="font-bold text-xs uppercase tracking-wider text-amber-900">
                    Results & Certificates Issued ({certificates.length})
                  </span>
                </div>
                <div className="space-y-1 text-xs text-amber-900">
                  {certificates.map((c) => (
                    <div key={c.id} className="flex justify-between border-b border-amber-200/60 py-1">
                      <span>{c.assessmentName} ({c.moduleName})</span>
                      <span className="font-bold">{c.resultStatus.toUpperCase()} — {c.certificateNumber || "Eligible"}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
