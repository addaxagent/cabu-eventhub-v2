import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  BedDouble,
  Utensils,
  Award,
  ArrowRight,
  User,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import {
  getRegistrations,
  getAttendees,
  getEvents,
  getTracks,
  getPayments,
  getAccommodationBookings,
  getMealTickets,
  getResultsCertificates,
  setCurrentGuestSession,
  findAttendeeByLastNameAndNrc,
  initializeStorage,
} from "../lib/storage";
import { formatNrc, isValidNrc, maskNrc } from "../lib/nrc";
import {
  Registration,
  Attendee,
  Event,
  Track,
  Payment,
  AccommodationBooking,
  MealTicket,
  ResultCertificate,
} from "../types";
import {
  GuestOwnershipVerificationModal,
  GuestVerificationChallengeData,
} from "../components/GuestOwnershipVerificationModal";

export const CheckStatusPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchMode, setSearchMode] = useState<"reference" | "nrc">("reference");

  // Search fields
  const [referenceInput, setReferenceInput] = useState("");
  const [lastNameInput, setLastNameInput] = useState("");
  const [nrcInput, setNrcInput] = useState("");

  const [searched, setSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Unverified candidate matching
  const [pendingRegistration, setPendingRegistration] = useState<Registration | null>(null);
  const [pendingAttendee, setPendingAttendee] = useState<Attendee | null>(null);
  const [verificationChallenge, setVerificationChallenge] = useState<GuestVerificationChallengeData | null>(null);
  const [showVerificationModal, setShowVerificationModal] = useState(false);

  // Verified search result state (REVEALED ONLY AFTER OTP VERIFICATION)
  const [isVerified, setIsVerified] = useState(false);
  const [foundRegistration, setFoundRegistration] = useState<Registration | null>(null);
  const [foundAttendee, setFoundAttendee] = useState<Attendee | null>(null);
  const [foundEvent, setFoundEvent] = useState<Event | null>(null);
  const [foundTrack, setFoundTrack] = useState<Track | null>(null);
  const [foundPayment, setFoundPayment] = useState<Payment | null>(null);
  const [foundBooking, setFoundBooking] = useState<AccommodationBooking | null>(null);
  const [foundMealTicket, setFoundMealTicket] = useState<MealTicket | null>(null);
  const [foundCertificates, setFoundCertificates] = useState<ResultCertificate[]>([]);

  useEffect(() => {
    initializeStorage();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearched(true);
    setErrorMsg(null);
    setIsVerified(false);
    setFoundRegistration(null);
    setFoundAttendee(null);
    setPendingRegistration(null);
    setPendingAttendee(null);

    const registrations = getRegistrations();
    const attendees = getAttendees();

    let matchedReg: Registration | undefined;
    let matchedAtt: Attendee | undefined;

    if (searchMode === "reference") {
      const cleanRef = referenceInput.trim().toUpperCase();
      if (!cleanRef) {
        setErrorMsg("Please enter a valid registration reference.");
        return;
      }
      matchedReg = registrations.find((r) => r.registrationReference === cleanRef);
      if (matchedReg) {
        matchedAtt = attendees.find((a) => a.id === matchedReg?.attendeeId);
      }
    } else {
      if (!lastNameInput.trim() || !isValidNrc(nrcInput)) {
        setErrorMsg("Please enter both last name and a valid 9-digit Zambian NRC.");
        return;
      }
      matchedAtt = findAttendeeByLastNameAndNrc(lastNameInput, nrcInput);
      if (matchedAtt) {
        matchedReg = registrations
          .filter((r) => r.attendeeId === matchedAtt?.id)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      }
    }

    if (matchedReg && matchedAtt) {
      setPendingRegistration(matchedReg);
      setPendingAttendee(matchedAtt);
      setIsSearching(true);

      try {
        // Create backend verification challenge
        const res = await fetch("/api/guest/create-challenge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            purpose: "REGISTRATION_STATUS_ACCESS",
            attendeeId: matchedAtt.id,
            email: matchedAtt.email,
            phone: matchedAtt.phone,
          }),
        });

        const data = await res.json();

        if (data.success && data.challengeId) {
          setVerificationChallenge({
            challengeId: data.challengeId,
            purpose: "REGISTRATION_STATUS_ACCESS",
            maskedEmail: data.maskedEmail,
            maskedPhone: data.maskedPhone,
            availableMethods: data.availableMethods || ["email"],
            defaultMethod: data.defaultMethod || "email",
          });
          setShowVerificationModal(true);
        } else {
          setErrorMsg(data.message || "Could not initialize ownership verification. Please try again.");
        }
      } catch (err: any) {
        console.error("Search error:", err);
        setErrorMsg("Network error occurred during search. Please check your connection.");
      } finally {
        setIsSearching(false);
      }
    } else {
      // Generic message avoiding leaking whether registration exists
      setErrorMsg("If a matching CABU EventHub record exists, verification options will be provided. No record was found for the supplied details.");
    }
  };

  const handleVerificationSuccess = (token: string) => {
    setShowVerificationModal(false);

    if (!pendingRegistration || !pendingAttendee) return;

    const matchedReg = pendingRegistration;
    const matchedAtt = pendingAttendee;

    const events = getEvents();
    const tracks = getTracks();
    const payments = getPayments();
    const bookings = getAccommodationBookings();
    const mealTickets = getMealTickets();
    const certificates = getResultsCertificates();

    setIsVerified(true);
    setFoundRegistration(matchedReg);
    setFoundAttendee(matchedAtt);
    setFoundEvent(events.find((e) => e.id === matchedReg.eventId) || null);
    setFoundTrack(tracks.find((t) => t.id === matchedReg.trackId) || null);
    setFoundPayment(payments.find((p) => p.registrationId === matchedReg.id) || null);
    setFoundBooking(bookings.find((b) => b.registrationId === matchedReg.id) || null);
    setFoundMealTicket(mealTickets.find((m) => m.registrationId === matchedReg.id) || null);
    setFoundCertificates(certificates.filter((c) => c.attendeeId === matchedAtt.id));

    // Save as current guest session
    setCurrentGuestSession(matchedAtt.id, matchedReg.id, matchedReg.registrationReference);
  };

  const handleCloseVerificationModal = () => {
    setShowVerificationModal(false);
    setPendingRegistration(null);
    setPendingAttendee(null);
    setVerificationChallenge(null);
    setIsVerified(false);
  };

  return (
    <div className="min-h-screen bg-[#F8FAF9] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black text-[#111827]">
            Check Registration Status
          </h1>
          <p className="text-xs text-[#64748B]">
            Look up your conference registration, payment authorization, assigned bedspace, or results.
          </p>
        </div>

        {/* Search Card */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-sm space-y-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => {
                setSearchMode("reference");
                setErrorMsg(null);
                setSearched(false);
              }}
              className={`pb-3 px-4 font-bold text-xs border-b-2 transition-colors cursor-pointer ${
                searchMode === "reference"
                  ? "border-[#0B6B3A] text-[#0B6B3A]"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              By Registration Reference
            </button>
            <button
              onClick={() => {
                setSearchMode("nrc");
                setErrorMsg(null);
                setSearched(false);
              }}
              className={`pb-3 px-4 font-bold text-xs border-b-2 transition-colors cursor-pointer ${
                searchMode === "nrc"
                  ? "border-[#0B6B3A] text-[#0B6B3A]"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              By Last Name & NRC
            </button>
          </div>

          <form onSubmit={handleSearch} className="space-y-4">
            {searchMode === "reference" ? (
              <div>
                <label className="block text-xs font-bold text-[#111827] mb-1">
                  Registration Reference Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={referenceInput}
                  onChange={(e) => setReferenceInput(e.target.value)}
                  placeholder="e.g. EQUIP-2026-0001 or CEC27-2026-0001"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-mono focus:outline-none focus:border-[#0B6B3A]"
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#111827] mb-1">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={lastNameInput}
                    onChange={(e) => setLastNameInput(e.target.value)}
                    placeholder="e.g. Banda"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#0B6B3A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#111827] mb-1">
                    NRC Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={nrcInput}
                    onChange={(e) => setNrcInput(formatNrc(e.target.value))}
                    placeholder="123456/78/9"
                    maxLength={11}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-mono focus:outline-none focus:border-[#0B6B3A]"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSearching}
              className="w-full py-3 bg-[#0B6B3A] hover:bg-[#064E2A] text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-60"
            >
              {isSearching ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Searching CABU Records...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Check Status</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Error / Not Found Display */}
        {searched && errorMsg && !isSearching && !isVerified && (
          <div className="bg-red-50 border border-red-200 p-5 rounded-2xl flex items-center gap-3 text-xs text-red-900">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
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
            description="To view confidential registration, payment, bedspace, and attendee records, please verify your identity."
          />
        )}

        {/* Found Registration Display (REVEALED ONLY AFTER SUCCESSFUL OTP VERIFICATION) */}
        {isVerified && foundRegistration && foundAttendee && foundEvent && (
          <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-4 gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 font-mono block">Reference</span>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-[#0B6B3A]" />
                    Ownership Verified
                  </span>
                </div>
                <span className="text-xl font-black text-[#111827] mt-0.5 block font-mono">
                  {foundRegistration.registrationReference}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-extrabold px-3 py-1 rounded-full uppercase ${
                    foundRegistration.paymentStatus === "verified" || foundRegistration.paymentStatus === "payment_successful"
                      ? "bg-green-100 text-[#0B6B3A]"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  Payment: {foundRegistration.paymentStatus.replace("_", " ")}
                </span>
                <span
                  className={`text-xs font-extrabold px-3 py-1 rounded-full uppercase ${
                    foundRegistration.registrationStatus === "confirmed"
                      ? "bg-[#0B6B3A] text-white"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  Status: {foundRegistration.registrationStatus}
                </span>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-[#F8FAF9] rounded-2xl border border-gray-100 space-y-1">
                <span className="font-bold text-gray-500 uppercase">Attendee Name</span>
                <p className="font-bold text-sm text-[#111827]">{foundAttendee.fullName}</p>
                <p className="text-gray-500">NRC: {maskNrc(foundAttendee.nrcNumber)}</p>
                <p className="text-gray-500">Church: {foundAttendee.churchOrganization}</p>
              </div>

              <div className="p-4 bg-[#F8FAF9] rounded-2xl border border-gray-100 space-y-1">
                <span className="font-bold text-gray-500 uppercase">Event & Track</span>
                <p className="font-bold text-sm text-[#111827]">{foundEvent.name}</p>
                <p className="text-[#0B6B3A] font-semibold">Track: {foundTrack?.name || "Standard"}</p>
                <p className="text-gray-500">Total Paid: ZMW {foundRegistration.totalAmountDue.toFixed(2)}</p>
              </div>
            </div>

            {/* Accommodation Details */}
            {foundBooking && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-2xl flex items-center justify-between text-xs text-[#064E2A]">
                <div className="flex items-center gap-2.5">
                  <BedDouble className="w-5 h-5 text-[#0B6B3A]" />
                  <div>
                    <span className="font-bold block">Assigned Dormitory Bedspace</span>
                    <span>Room {foundBooking.roomNumber} (Bedspace #{foundBooking.bedspaceNumber})</span>
                  </div>
                </div>
                <span className="font-extrabold uppercase bg-[#0B6B3A] text-white px-2.5 py-1 rounded">
                  {foundBooking.bookingStatus}
                </span>
              </div>
            )}

            {/* Results / Certificates count */}
            {foundCertificates.length > 0 && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-xs text-amber-900">
                <Award className="w-5 h-5 text-[#F58220]" />
                <span>
                  <strong>{foundCertificates.length} Result / Certificate Record(s)</strong> available for this attendee.
                </span>
              </div>
            )}

            <div className="pt-2">
              <Link
                to="/guest/dashboard"
                className="w-full py-3.5 bg-[#F58220] hover:bg-[#C65F12] text-black font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm"
              >
                Open Full Guest Dashboard
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
