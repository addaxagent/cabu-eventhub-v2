import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  User,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CreditCard,
  BedDouble,
  Utensils,
  Lock,
  Loader2,
  FileText,
  Terminal,
  X,
  Copy,
  Check,
  KeyRound,
  Phone,
  Mail,
  MessageSquare,
} from "lucide-react";
import {
  getEvents,
  getTracks,
  getRooms,
  findEventBySlugOrId,
  findAttendeeByNrc,
  saveAttendees,
  getAttendees,
  saveRegistrations,
  getRegistrations,
  generateRegistrationReference,
  savePayments,
  getPayments,
  assignBedspace,
  setCurrentGuestSession,
  saveMealTickets,
  getMealTickets,
  logDpoTransaction,
  initializeStorage,
} from "../lib/storage";
import { formatNrc, isValidNrc, normalizeNrc, maskNrc } from "../lib/nrc";
import { isValidZambianPhone, normalizePhone } from "../lib/phone";
import { Event, Track, Attendee, Registration, Payment } from "../types";

export const EventRegisterPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [event, setEvent] = useState<Event | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Form State - Step 1
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nrcNumber, setNrcNumber] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<"Male" | "Female">("Male");
  const [churchOrganization, setChurchOrganization] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("Zambia");
  const [consentUpdates, setConsentUpdates] = useState(false);

  // Returning attendee detection state
  const [existingAttendee, setExistingAttendee] = useState<Attendee | null>(null);
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

  // OTP Verification State (SMS & Google Workspace Email)
  const [otpDeliveryMethod, setOtpDeliveryMethod] = useState<"sms" | "email">("sms");
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [phoneVerifiedAt, setPhoneVerifiedAt] = useState<string | null>(null);
  const [verifiedPhoneNumber, setVerifiedPhoneNumber] = useState("");
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpSuccessMessage, setOtpSuccessMessage] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Form State - Step 2
  const [selectedTrackId, setSelectedTrackId] = useState("");
  const [accommodationRequested, setAccommodationRequested] = useState(false);
  const [mealTicketRequested, setMealTicketRequested] = useState(false);

  // Form State - Step 3
  const [specialNotes, setSpecialNotes] = useState("");

  // Processing & Diagnostic state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<{
    resultCode?: string;
    resultExplanation?: string;
    friendlyMessage?: string;
    details?: any;
  } | null>(null);
  const [showDiagnosticsModal, setShowDiagnosticsModal] = useState(false);

  const [eventLoaded, setEventLoaded] = useState(false);

  // OTP Resend Countdown Timer
  useEffect(() => {
    let timer: any;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    initializeStorage();
    const found = findEventBySlugOrId(slug);
    if (found) {
      setEvent(found);
      const loadedTracks = getTracks().filter((t) => t.eventId === found.id && t.isActive);
      setTracks(loadedTracks);
      if (loadedTracks.length > 0) {
        setSelectedTrackId(loadedTracks[0].id);
      }
    } else {
      setEvent(null);
    }
    setEventLoaded(true);
  }, [slug]);

  // Handle NRC Input Formatting
  const handleNrcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const formatted = formatNrc(raw);
    setNrcNumber(formatted);
    markTouched("nrcNumber");
  };

  const markTouched = (fieldName: string) => {
    setTouchedFields((prev) => ({ ...prev, [fieldName]: true }));
  };

  // Check for existing attendee profile ONLY when a complete, valid Zambian NRC is entered
  useEffect(() => {
    if (isValidNrc(nrcNumber)) {
      const match = findAttendeeByNrc(nrcNumber);
      if (match) {
        setExistingAttendee(match);
        // Pre-fill matched profile details
        setFirstName(match.firstName);
        setLastName(match.lastName);
        setGender(match.gender);
        setEmail(match.email);
        setPhone(match.phone || match.normalizedPhone);
        setChurchOrganization(match.churchOrganization);
        setCity(match.city);
        setCountry(match.country || "Zambia");

        if (match.phoneVerified) {
          setIsPhoneVerified(true);
          setVerifiedPhoneNumber(match.normalizedPhone);
          setPhoneVerifiedAt(match.phoneVerifiedAt || match.updatedAt || new Date().toISOString());
        }
      } else {
        setExistingAttendee(null);
      }
    } else {
      setExistingAttendee(null);
    }
  }, [nrcNumber]);

  // OTP Dispatch Function (Supports SMS & Google Workspace Email)
  const handleSendOtp = async (method: "sms" | "email" = otpDeliveryMethod, targetPhone?: string) => {
    setOtpDeliveryMethod(method);
    setOtpSending(true);
    setOtpError(null);
    setOtpSuccessMessage(null);

    if (method === "email") {
      if (!email.trim() || !email.includes("@")) {
        setOtpError("Please enter a valid email address first.");
        setOtpSending(false);
        return;
      }

      try {
        const res = await fetch("/api/email/otp/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.trim(),
            guestName: `${firstName} ${lastName}`.trim() || undefined,
          }),
        });

        const data = await res.json();
        if (data.success) {
          setOtpSuccessMessage(data.message || `We sent a 6-digit verification code to ${email.trim()}.`);
          setResendCooldown(data.cooldownSeconds || 60);
        } else {
          setOtpError(data.message || "We could not send your verification email. Please check your address or try SMS.");
          if (data.cooldownSeconds) {
            setResendCooldown(data.cooldownSeconds);
          }
        }
      } catch (err: any) {
        setOtpError("We could not send your verification email. Please try again shortly.");
      } finally {
        setOtpSending(false);
      }
      return;
    }

    // Default: SMS via Airtel
    const p = targetPhone || phone;
    const norm = normalizePhone(p);
    if (!norm || !isValidZambianPhone(p)) {
      setOtpError("Please enter a valid 9-digit Zambian mobile number.");
      setOtpSending(false);
      return;
    }

    try {
      const res = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: norm }),
      });

      const data = await res.json();
      if (data.success) {
        setOtpSuccessMessage(data.message || `We sent a 6-digit verification code to ${p}.`);
        setResendCooldown(data.cooldownSeconds || 60);
      } else {
        setOtpError(data.message || "We could not send your SMS verification code. Please try again or switch to email verification.");
        if (data.cooldownSeconds) {
          setResendCooldown(data.cooldownSeconds);
        }
      }
    } catch (err: any) {
      setOtpError("We could not send your SMS verification code. Please try again or switch to email verification.");
    } finally {
      setOtpSending(false);
    }
  };

  // OTP Verification Function
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCode = otpCode.trim();
    if (cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
      setOtpError("Please enter the complete 6-digit numeric verification code.");
      return;
    }

    setOtpVerifying(true);
    setOtpError(null);

    if (otpDeliveryMethod === "email") {
      try {
        const res = await fetch("/api/email/otp/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim(), otp: cleanCode }),
        });

        const data = await res.json();
        if (data.success && data.verified) {
          setIsPhoneVerified(true);
          const timestamp = new Date().toISOString();
          setPhoneVerifiedAt(timestamp);
          setVerifiedPhoneNumber(normalizePhone(phone));
          setShowOtpModal(false);
          setOtpCode("");
          setOtpError(null);
          setCurrentStep(2);
        } else {
          setOtpError(data.message || "Incorrect verification code. Please check your email and try again.");
        }
      } catch (err: any) {
        setOtpError("Network error while verifying code. Please try again.");
      } finally {
        setOtpVerifying(false);
      }
      return;
    }

    // Default: SMS verification
    const norm = normalizePhone(phone);
    try {
      const res = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: norm, otp: cleanCode }),
      });

      const data = await res.json();
      if (data.success && data.verified) {
        setIsPhoneVerified(true);
        const timestamp = new Date().toISOString();
        setPhoneVerifiedAt(timestamp);
        setVerifiedPhoneNumber(norm);
        setShowOtpModal(false);
        setOtpCode("");
        setOtpError(null);
        setCurrentStep(2);
      } else {
        setOtpError(data.message || "Incorrect verification code. Please check your SMS and try again.");
      }
    } catch (err: any) {
      setOtpError("Network error while verifying code. Please try again.");
    } finally {
      setOtpVerifying(false);
    }
  };

  // Step 1 Navigation with OTP Gate
  const handleStep1Continue = () => {
    if (!isStep1Valid) return;
    const norm = normalizePhone(phone);

    const isAlreadyVerified =
      (existingAttendee && existingAttendee.phoneVerified && existingAttendee.normalizedPhone === norm) ||
      (isPhoneVerified && verifiedPhoneNumber === norm);

    if (isAlreadyVerified) {
      setCurrentStep(2);
      return;
    }

    // First-time or unverified guest: open OTP verification modal
    setShowOtpModal(true);
    setOtpCode("");
    setOtpError(null);
    handleSendOtp(phone);
  };

  if (!event) {
    if (!eventLoaded) {
      return (
        <div className="min-h-screen bg-[#F8FAF9] flex items-center justify-center p-4">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#0B6B3A] mx-auto" />
            <p className="text-xs text-gray-500 mt-2">Loading event registration details...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#F8FAF9] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl border border-gray-200 text-center max-w-md space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-[#F58220] flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black text-[#111827]">Event Registration Not Found</h2>
          <p className="text-xs text-[#64748B] leading-relaxed">
            The event or conference you are trying to register for could not be found or registration is currently unavailable.
          </p>
          <div className="pt-2">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0B6B3A] text-white text-xs font-bold rounded-xl shadow-xs"
            >
              <ChevronLeft className="w-4 h-4" />
              View Active Conferences
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Step 1 Validation Rules
  const isFirstNameValid = firstName.trim().length >= 2 && /^[a-zA-Z\s'-]+$/.test(firstName.trim());
  const isLastNameValid = lastName.trim().length >= 2 && /^[a-zA-Z\s'-]+$/.test(lastName.trim());
  const isNrcValid = isValidNrc(nrcNumber);
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const isPhoneValid = isValidZambianPhone(phone);
  const isChurchValid = churchOrganization.trim().length >= 2;
  const isCityValid = city.trim().length >= 2;

  const isStep1Valid =
    isFirstNameValid &&
    isLastNameValid &&
    isNrcValid &&
    isEmailValid &&
    isPhoneValid &&
    isChurchValid &&
    isCityValid &&
    consentUpdates;

  // Bedspace Availability Check for Selected Gender
  const roomsForEvent = getRooms().filter(
    (r) => r.eventId === event.id && r.isActive && r.genderRestriction === gender
  );
  const availableBedspacesCount = roomsForEvent.reduce(
    (acc, room) => acc + Math.max(0, room.capacity - room.currentOccupancy),
    0
  );
  const isBedspaceAvailable = availableBedspacesCount > 0;

  // Fee calculation
  const baseFee = 350;
  const accommodationFee = accommodationRequested ? 100 : 0;
  const mealTicketFee = mealTicketRequested ? 50 : 0;
  const normalCalculatedTotal = baseFee + accommodationFee + mealTicketFee;

  const isPriceOverride = Boolean(event.priceOverrideEnabled && typeof event.priceOverrideAmount === "number");
  const finalAmountDue = isPriceOverride ? (event.priceOverrideAmount as number) : normalCalculatedTotal;
  const priceOverrideDiscount = isPriceOverride ? finalAmountDue - normalCalculatedTotal : 0;
  const totalAmountDue = finalAmountDue;

  // Final DPO Payment Submission Handler
  const handleProceedToPayment = async () => {
    setSubmitting(true);
    setSubmitError(null);

    try {
      const normNrc = normalizeNrc(nrcNumber);
      const normPhone = normalizePhone(phone);
      const cleanEmail = email.trim().toLowerCase();

      // 1. Create or update attendee profile by NRC
      const attendees = getAttendees();
      let matchedAttendee = existingAttendee || findAttendeeByNrc(nrcNumber);
      let attendeeId = matchedAttendee?.id;

      if (!attendeeId) {
        attendeeId = `att-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const newAttendee: Attendee = {
          id: attendeeId,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          fullName: `${firstName.trim()} ${lastName.trim()}`,
          nrcNumber,
          normalizedNrcNumber: normNrc,
          email: cleanEmail,
          phone: normPhone,
          normalizedPhone: normPhone,
          gender,
          churchOrganization: churchOrganization.trim(),
          city: city.trim(),
          country: country.trim() || "Zambia",
          phoneVerified: true,
          phoneVerifiedAt: phoneVerifiedAt || new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        attendees.push(newAttendee);
        saveAttendees(attendees);
      } else {
        // Update existing attendee record with any updated contact information and verified status
        const existingIdx = attendees.findIndex((a) => a.id === attendeeId);
        if (existingIdx !== -1) {
          attendees[existingIdx].firstName = firstName.trim();
          attendees[existingIdx].lastName = lastName.trim();
          attendees[existingIdx].fullName = `${firstName.trim()} ${lastName.trim()}`;
          attendees[existingIdx].email = cleanEmail;
          attendees[existingIdx].phone = normPhone;
          attendees[existingIdx].normalizedPhone = normPhone;
          attendees[existingIdx].gender = gender;
          attendees[existingIdx].churchOrganization = churchOrganization.trim();
          attendees[existingIdx].city = city.trim();
          attendees[existingIdx].country = country.trim() || "Zambia";
          attendees[existingIdx].phoneVerified = true;
          if (!attendees[existingIdx].phoneVerifiedAt) {
            attendees[existingIdx].phoneVerifiedAt = phoneVerifiedAt || new Date().toISOString();
          }
          attendees[existingIdx].updatedAt = new Date().toISOString();
          saveAttendees(attendees);
        }
      }

      // 2. Generate References
      const registrationReference = generateRegistrationReference(event.code);
      const registrationId = `reg-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const transactionReference = `CABU-EVENT-${registrationReference}-${Date.now()}`;

      // 3. Assign Bedspace if requested
      if (accommodationRequested) {
        assignBedspace(event.id, registrationId, attendeeId, gender);
      }

      // 4. Save Meal Ticket if requested
      if (mealTicketRequested) {
        const mealTickets = getMealTickets();
        mealTickets.push({
          id: `mt-${Date.now()}`,
          eventId: event.id,
          registrationId,
          attendeeId,
          mealTicketFee: 50,
          status: "reserved",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        saveMealTickets(mealTickets);
      }

      // 5. Create Registration Record
      const newRegistration: Registration = {
        id: registrationId,
        eventId: event.id,
        attendeeId,
        trackId: selectedTrackId,
        registrationReference,
        baseRegistrationFee: baseFee,
        accommodationRequested,
        accommodationFee,
        mealTicketRequested,
        mealTicketFee,
        totalAmountDue: finalAmountDue,
        normalCalculatedTotal,
        priceOverrideApplied: isPriceOverride,
        priceOverrideReason: isPriceOverride ? event.priceOverrideReason : undefined,
        priceOverrideDiscount,
        isReturningAttendee: Boolean(existingAttendee),
        registrationStatus: "pending_payment",
        paymentStatus: "pending_dpo_payment",
        dpoTransactionReference: transactionReference,
        specialNotes: specialNotes.trim() || undefined,
        consentUpdates,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const registrations = getRegistrations();
      registrations.push(newRegistration);
      saveRegistrations(registrations);

      // 6. Create Initial Payment Record
      const paymentId = `pay-${Date.now()}`;
      const newPayment: Payment = {
        id: paymentId,
        registrationId,
        amountDue: finalAmountDue,
        currency: "ZMW",
        paymentProvider: "DPO",
        paymentReference: `DPO-PENDING-${Date.now()}`,
        dpoTransactionReference: transactionReference,
        paymentStatus: "pending_dpo_payment",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const payments = getPayments();
      payments.push(newPayment);
      savePayments(payments);

      // Save Active Session in localStorage so user can access dashboard
      setCurrentGuestSession(attendeeId, registrationId, registrationReference);

      // Log DPO Create Token Attempt
      logDpoTransaction({
        registrationId,
        transactionReference,
        eventType: "create_token",
        normalCalculatedAmount: normalCalculatedTotal,
        finalDpoAmount: finalAmountDue,
        priceOverrideStatus: isPriceOverride,
        priceOverrideReason: isPriceOverride ? event.priceOverrideReason : undefined,
        requestPayload: {
          registrationReference,
          transactionReference,
          amount: finalAmountDue,
          normalCalculatedTotal,
          currency: "ZMW",
          firstName,
          lastName,
          email: cleanEmail,
          phone: normPhone,
          eventName: event.name,
          eventCode: event.code,
        },
        localStatusBefore: "pending_dpo_payment",
      });

      // 7. Call Server API `/api/dpo/create-token`
      const selectedTrack = tracks.find((t) => t.id === selectedTrackId);
      const apiRes = await fetch("/api/dpo/create-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrationReference,
          transactionReference,
          amount: finalAmountDue,
          normalCalculatedTotal,
          priceOverrideStatus: isPriceOverride,
          priceOverrideReason: isPriceOverride ? event.priceOverrideReason : undefined,
          currency: "ZMW",
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: cleanEmail,
          phone: normPhone,
          eventName: event.name,
          eventCode: event.code,
          selectedTrack: selectedTrack?.name || "",
          accommodationRequested,
          mealTicketRequested,
        }),
      });

      const rawText = await apiRes.text();
      let responseData: any;
      try {
        responseData = JSON.parse(rawText);
      } catch {
        responseData = {
          success: false,
          result: "NON_JSON_RESPONSE",
          resultCode: "NON_JSON_RESPONSE",
          resultExplanation: "The API returned non-JSON content.",
          friendlyMessage: "Frontend received HTML instead of JSON from the API route. This means the backend route is not being reached or Vite/React fallback is handling the request.",
          httpStatus: apiRes.status,
          rawResponse: rawText.slice(0, 2000),
          errorType: "non_json_response",
        };
      }

      if (responseData.success && responseData.result === "000" && responseData.paymentUrl) {
        // Update payment record with DPO TransToken
        const currentPayments = getPayments();
        const pIndex = currentPayments.findIndex((p) => p.id === paymentId);
        if (pIndex !== -1) {
          currentPayments[pIndex].dpoTransToken = responseData.transToken;
          currentPayments[pIndex].dpoTransRef = responseData.transRef;
          currentPayments[pIndex].paymentStatus = "dpo_redirected";
          currentPayments[pIndex].rawCreateTokenResponse = responseData.rawResponse;
          savePayments(currentPayments);
        }

        logDpoTransaction({
          registrationId,
          transactionReference,
          dpoTransToken: responseData.transToken,
          dpoTransRef: responseData.transRef,
          eventType: "redirect",
          resultCode: responseData.result,
          resultExplanation: responseData.resultExplanation,
          maskedXmlRequest: responseData.maskedXmlRequest,
          rawXmlResponse: responseData.rawResponse,
          httpStatus: responseData.httpStatus || 200,
          responsePayload: responseData,
          parsedResult: {
            result: responseData.result,
            explanation: responseData.resultExplanation,
          },
          localStatusAfter: "dpo_redirected",
        });

        // Redirect Guest to DPO Hosted Checkout Page
        window.location.href = responseData.paymentUrl;
      } else {
        // Capture real DPO error response details
        const rCode = responseData.result || (responseData.errorType === "missing_env" ? "MISSING_ENV" : "ERR");
        const rExplanation =
          responseData.resultExplanation ||
          responseData.message ||
          (responseData.missing ? `Missing environment variables: ${responseData.missing.join(", ")}` : "DPO Token generation failed.");

        setSubmitError({
          resultCode: rCode,
          resultExplanation: rExplanation,
          friendlyMessage: "The payment gateway request could not be processed. Please check the DPO response details below or notify the administrator.",
          details: responseData,
        });
        setSubmitting(false);

        logDpoTransaction({
          registrationId,
          transactionReference,
          eventType: "error",
          resultCode: rCode,
          resultExplanation: rExplanation,
          maskedXmlRequest: responseData.maskedXmlRequest,
          rawXmlResponse: responseData.rawResponse,
          frontendErrorMessage: rExplanation,
          missingEnvVars: responseData.missing,
          httpStatus: responseData.httpStatus || apiRes.status,
          responsePayload: responseData,
          parsedResult: responseData,
          localStatusAfter: "payment_failed",
        });
      }
    } catch (err: any) {
      console.error("Error creating DPO payment token:", err);
      setSubmitError({
        resultCode: "NET_ERR",
        resultExplanation: err.message || "Failed to communicate with DPO Gateway server route",
        friendlyMessage: "A network error occurred while attempting to initialize DPO payment.",
      });
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAF9] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Navigation header */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-4">
          <Link
            to={`/event/${event.slug}`}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0B6B3A] hover:underline"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Event Info
          </Link>

          <span className="text-xs font-bold bg-[#0B6B3A]/10 text-[#0B6B3A] px-3 py-1 rounded-full">
            {event.name}
          </span>
        </div>

        {/* Wizard Progress Bar */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {[
              { num: 1, label: "Attendee Details" },
              { num: 2, label: "Track & Bedspace" },
              { num: 3, label: "Billing Summary" },
              { num: 4, label: "Review & Pay" },
            ].map((step, idx) => (
              <React.Fragment key={step.num}>
                <div className="flex flex-col items-center gap-1.5 z-10">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                      currentStep === step.num
                        ? "bg-[#F58220] text-black shadow-md ring-4 ring-[#F58220]/20"
                        : currentStep > step.num
                        ? "bg-[#0B6B3A] text-white"
                        : "bg-gray-100 text-gray-400 border border-gray-200"
                    }`}
                  >
                    {currentStep > step.num ? <CheckCircle2 className="w-5 h-5" /> : step.num}
                  </div>
                  <span
                    className={`text-[11px] font-semibold hidden sm:block ${
                      currentStep === step.num ? "text-[#111827] font-extrabold" : "text-[#64748B]"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>

                {idx < 3 && (
                  <div
                    className={`flex-1 h-1 mx-2 rounded transition-colors ${
                      currentStep > idx + 1 ? "bg-[#0B6B3A]" : "bg-gray-200"
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* STEP 1: ATTENDEE DETAILS */}
        {currentStep === 1 && (
          <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm space-y-6">
            <div className="border-b border-gray-100 pb-4">
              <h2 className="text-2xl font-black text-[#111827]">
                Step 1: Attendee Details
              </h2>
              <p className="text-xs text-[#64748B] mt-1">
                Please provide your full personal details. Returning attendees will be automatically identified by NRC number.
              </p>
            </div>

            {/* Existing Attendee Banner Notice */}
            {existingAttendee && (
              <div className="bg-[#0B6B3A]/10 border border-[#0B6B3A]/30 p-4 rounded-xl flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#0B6B3A] shrink-0 mt-0.5" />
                <div className="text-xs text-[#064E2A]">
                  <p className="font-bold">Existing Attendee Profile Found!</p>
                  <p className="mt-0.5">
                    Welcome back, <strong>{existingAttendee.fullName}</strong>. We will attach this registration to your existing CABU records.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* First Name */}
              <div>
                <label className="block text-xs font-bold text-[#111827] mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value);
                    markTouched("firstName");
                  }}
                  placeholder="e.g. Emmanuel"
                  className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-[#F8FAF9] focus:bg-white focus:outline-none transition-all ${
                    touchedFields.firstName && !isFirstNameValid
                      ? "border-red-400 focus:ring-2 focus:ring-red-200"
                      : "border-gray-200 focus:border-[#0B6B3A] focus:ring-2 focus:ring-[#0B6B3A]/20"
                  }`}
                />
                {touchedFields.firstName && !isFirstNameValid && (
                  <p className="text-[11px] text-red-500 mt-1">
                    First name must contain at least 2 valid letters.
                  </p>
                )}
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-xs font-bold text-[#111827] mb-1">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value);
                    markTouched("lastName");
                  }}
                  placeholder="e.g. Banda"
                  className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-[#F8FAF9] focus:bg-white focus:outline-none transition-all ${
                    touchedFields.lastName && !isLastNameValid
                      ? "border-red-400 focus:ring-2 focus:ring-red-200"
                      : "border-gray-200 focus:border-[#0B6B3A] focus:ring-2 focus:ring-[#0B6B3A]/20"
                  }`}
                />
                {touchedFields.lastName && !isLastNameValid && (
                  <p className="text-[11px] text-red-500 mt-1">
                    Last name must contain at least 2 valid letters.
                  </p>
                )}
              </div>

              {/* NRC Number */}
              <div>
                <label className="block text-xs font-bold text-[#111827] mb-1">
                  NRC Number (9 Digits) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={nrcNumber}
                  onChange={handleNrcChange}
                  placeholder="123456/78/9"
                  maxLength={11}
                  className={`w-full px-3.5 py-2.5 text-sm font-mono tracking-wider rounded-xl border bg-[#F8FAF9] focus:bg-white focus:outline-none transition-all ${
                    touchedFields.nrcNumber && !isNrcValid
                      ? "border-red-400 focus:ring-2 focus:ring-red-200"
                      : "border-gray-200 focus:border-[#0B6B3A] focus:ring-2 focus:ring-[#0B6B3A]/20"
                  }`}
                />
                {touchedFields.nrcNumber && !isNrcValid && (
                  <p className="text-[11px] text-red-500 mt-1">
                    {nrcNumber.length === 0
                      ? "NRC number is required."
                      : "Please enter a valid NRC number in the format 123456/78/9."}
                  </p>
                )}
                {isNrcValid && (
                  <p className="text-[11px] text-[#0B6B3A] font-semibold mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Valid Zambian NRC format
                  </p>
                )}
              </div>

              {/* Gender */}
              <div>
                <label className="block text-xs font-bold text-[#111827] mb-1">
                  Gender <span className="text-red-500">*</span>
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as "Male" | "Female")}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 bg-[#F8FAF9] focus:bg-white focus:outline-none focus:border-[#0B6B3A]"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
                <p className="text-[11px] text-[#64748B] mt-1">
                  Used for gender-restricted dormitory bedspace allocation.
                </p>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-[#111827] mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    markTouched("email");
                  }}
                  placeholder="name@example.com"
                  className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-[#F8FAF9] focus:bg-white focus:outline-none transition-all ${
                    touchedFields.email && !isEmailValid
                      ? "border-red-400 focus:ring-2 focus:ring-red-200"
                      : "border-gray-200 focus:border-[#0B6B3A] focus:ring-2 focus:ring-[#0B6B3A]/20"
                  }`}
                />
                {touchedFields.email && !isEmailValid && (
                  <p className="text-[11px] text-red-500 mt-1">
                    Please enter a valid email address.
                  </p>
                )}
              </div>

              {/* Phone / WhatsApp */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-[#111827]">
                    Zambian Mobile Number <span className="text-red-500">*</span>
                  </label>
                  {isPhoneVerified && verifiedPhoneNumber === normalizePhone(phone) && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0B6B3A] bg-[#0B6B3A]/10 px-2.5 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3 text-[#0B6B3A]" />
                      Verified
                    </span>
                  )}
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPhone(val);
                    markTouched("phone");
                    if (isPhoneVerified && normalizePhone(val) !== verifiedPhoneNumber) {
                      setIsPhoneVerified(false);
                    }
                  }}
                  placeholder="0977123456 or +260977123456"
                  className={`w-full px-3.5 py-2.5 text-sm font-mono rounded-xl border bg-[#F8FAF9] focus:bg-white focus:outline-none transition-all ${
                    touchedFields.phone && !isPhoneValid
                      ? "border-red-400 focus:ring-2 focus:ring-red-200"
                      : isPhoneVerified && verifiedPhoneNumber === normalizePhone(phone)
                      ? "border-[#0B6B3A]/40 bg-emerald-50/20 focus:border-[#0B6B3A] focus:ring-2 focus:ring-[#0B6B3A]/20"
                      : "border-gray-200 focus:border-[#0B6B3A] focus:ring-2 focus:ring-[#0B6B3A]/20"
                  }`}
                />
                {touchedFields.phone && !isPhoneValid && (
                  <p className="text-[11px] text-red-500 mt-1">
                    Please enter a valid Zambian mobile number.
                  </p>
                )}
              </div>

              {/* Church / Organization */}
              <div>
                <label className="block text-xs font-bold text-[#111827] mb-1">
                  Church / Organization <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={churchOrganization}
                  onChange={(e) => {
                    setChurchOrganization(e.target.value);
                    markTouched("churchOrganization");
                  }}
                  placeholder="e.g. Grace Baptist Church or Central Academy"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 bg-[#F8FAF9] focus:bg-white focus:outline-none focus:border-[#0B6B3A]"
                />
              </div>

              {/* City / Town */}
              <div>
                <label className="block text-xs font-bold text-[#111827] mb-1">
                  City / Town <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => {
                    setCity(e.target.value);
                    markTouched("city");
                  }}
                  placeholder="e.g. Kitwe, Ndola, Lusaka"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 bg-[#F8FAF9] focus:bg-white focus:outline-none focus:border-[#0B6B3A]"
                />
              </div>
            </div>

            {/* Consent Checkbox */}
            <div className="pt-2">
              <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl bg-[#F8FAF9] border border-gray-200">
                <input
                  type="checkbox"
                  checked={consentUpdates}
                  onChange={(e) => setConsentUpdates(e.target.checked)}
                  className="mt-0.5 rounded text-[#0B6B3A] focus:ring-[#0B6B3A]"
                />
                <span className="text-xs text-[#111827] leading-relaxed">
                  I authorize Central Africa Baptist University to store my information and contact me regarding this and future events. <span className="text-red-500">*</span>
                </span>
              </label>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-end pt-4 border-t border-gray-100">
              <button
                type="button"
                disabled={!isStep1Valid}
                onClick={handleStep1Continue}
                className={`px-8 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${
                  isStep1Valid
                    ? "bg-[#F58220] hover:bg-[#C65F12] text-black shadow-md"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
              >
                Continue to Track & Accommodation
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: TRACK & ACCOMMODATION */}
        {currentStep === 2 && (
          <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm space-y-8">
            <div className="border-b border-gray-100 pb-4">
              <h2 className="text-2xl font-black text-[#111827]">
                Step 2: Track & Accommodation
              </h2>
              <p className="text-xs text-[#64748B] mt-1">
                Select your specialized conference track and optionally request on-campus bedspace or meal tickets.
              </p>
            </div>

            {/* Track Selection */}
            <div className="space-y-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#111827]">
                Select Event Track <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {tracks.map((t) => {
                  const isSelected = selectedTrackId === t.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTrackId(t.id)}
                      className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                        isSelected
                          ? "border-[#0B6B3A] bg-[#0B6B3A]/5 ring-2 ring-[#0B6B3A]"
                          : "border-gray-200 bg-[#F8FAF9] hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-extrabold text-sm text-[#111827]">{t.name}</h3>
                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                            isSelected ? "bg-[#0B6B3A] border-[#0B6B3A] text-white" : "border-gray-300"
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                      <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                        {t.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Accommodation Selection */}
            <div className="p-6 rounded-2xl bg-[#F8FAF9] border border-gray-200 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#F58220]/10 text-[#F58220] flex items-center justify-center shrink-0">
                    <BedDouble className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[#111827]">
                      On-Campus Dormitory Bedspace
                    </h3>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      On-campus bedspace for the event period. A room will be assigned automatically based on gender ({gender}) and availability.
                    </p>
                    <span className="inline-block mt-2 text-xs font-black text-[#F58220] bg-[#F58220]/10 px-2.5 py-0.5 rounded">
                      + ZMW 100
                    </span>
                  </div>
                </div>

                {isBedspaceAvailable ? (
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                    <input
                      type="checkbox"
                      checked={accommodationRequested}
                      onChange={(e) => setAccommodationRequested(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0B6B3A]" />
                  </label>
                ) : (
                  <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-3 py-1 rounded-lg shrink-0">
                    Accommodation Full ({gender})
                  </span>
                )}
              </div>

              {!isBedspaceAvailable && (
                <p className="text-xs text-red-600 font-medium bg-red-50 p-3 rounded-lg border border-red-100">
                  Dormitory bedspaces for {gender} attendees are fully booked for {event.name}.
                </p>
              )}
            </div>

            {/* Meal Ticket Selection */}
            <div className="p-6 rounded-2xl bg-[#F8FAF9] border border-gray-200 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0B6B3A]/10 text-[#0B6B3A] flex items-center justify-center shrink-0">
                    <Utensils className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[#111827]">
                      Event Meal Ticket Pass
                    </h3>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      Adds event meal access to your conference badge for all dining sessions.
                    </p>
                    <span className="inline-block mt-2 text-xs font-black text-[#0B6B3A] bg-[#0B6B3A]/10 px-2.5 py-0.5 rounded">
                      + ZMW 50
                    </span>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={mealTicketRequested}
                    onChange={(e) => setMealTicketRequested(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0B6B3A]" />
                </label>
              </div>
            </div>

            {/* Step 2 Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-6 py-3 border border-gray-300 rounded-xl font-bold text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to Details
              </button>

              <button
                type="button"
                disabled={!selectedTrackId}
                onClick={() => setCurrentStep(3)}
                className="px-8 py-3 bg-[#F58220] hover:bg-[#C65F12] text-black font-bold text-sm rounded-xl flex items-center gap-2 shadow-md"
              >
                Continue to Payment & Billing
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: PAYMENT & BILLING */}
        {currentStep === 3 && (
          <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm space-y-8">
            <div className="border-b border-gray-100 pb-4">
              <h2 className="text-2xl font-black text-[#111827]">
                Step 3: Payment & Billing
              </h2>
              <p className="text-xs text-[#64748B] mt-1">
                Review your registration items and payment gateway configuration.
              </p>
            </div>

            {/* Billing Breakdown */}
            <div className="p-6 rounded-2xl bg-[#F8FAF9] border border-gray-200 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748B] border-b border-gray-200 pb-2">
                Itemized Billing Summary
              </h3>

              <div className="space-y-2 text-sm text-[#111827]">
                <div className="flex justify-between items-center py-1">
                  <span>Standard Registration Fee ({event.name})</span>
                  <span className="font-mono font-bold">ZMW 350.00</span>
                </div>

                {accommodationRequested && (
                  <div className="flex justify-between items-center py-1 text-xs">
                    <span className="text-[#64748B]">Dormitory Bedspace Fee ({gender})</span>
                    <span className="font-mono font-bold text-[#F58220]">ZMW 100.00</span>
                  </div>
                )}

                {mealTicketRequested && (
                  <div className="flex justify-between items-center py-1 text-xs">
                    <span className="text-[#64748B]">Meal Ticket Pass</span>
                    <span className="font-mono font-bold text-[#0B6B3A]">ZMW 50.00</span>
                  </div>
                )}

                {isPriceOverride ? (
                  <>
                    <div className="flex justify-between items-center py-1 text-xs font-semibold text-gray-600 border-t border-gray-200/80 pt-2">
                      <span>Normal Registration Amount</span>
                      <span className="font-mono font-bold">ZMW {normalCalculatedTotal.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between items-center py-2 text-xs text-amber-900 bg-amber-50 p-3 rounded-xl border border-amber-300">
                      <div>
                        <span className="font-extrabold block text-amber-950">DPO Sandbox Test Override</span>
                        {event.priceOverrideReason && (
                          <span className="text-[10px] text-amber-800 font-medium block mt-0.5">
                            Reason: {event.priceOverrideReason}
                          </span>
                        )}
                      </div>
                      <span className="font-mono font-black text-amber-900 text-sm">
                        - ZMW {Math.abs(priceOverrideDiscount).toFixed(2)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t border-gray-200 text-lg font-black text-[#111827]">
                      <span>Amount Sent to DPO</span>
                      <span className="font-mono text-[#F58220]">
                        ZMW {finalAmountDue.toFixed(2)}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between items-center pt-3 border-t border-gray-200 text-lg font-black text-[#111827]">
                    <span>Total Amount Due</span>
                    <span className="font-mono text-[#F58220]">
                      ZMW {totalAmountDue.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* DPO Provider Card */}
            <div className="p-6 rounded-2xl border border-green-200 bg-green-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-[#0B6B3A]" />
                  <span className="font-bold text-sm text-[#064E2A]">
                    Pay Securely via Direct Pay Online (DPO)
                  </span>
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider bg-[#0B6B3A] text-white px-2.5 py-0.5 rounded">
                  Currency: ZMW
                </span>
              </div>
              <p className="text-xs text-[#064E2A]/90 leading-relaxed">
                You will be redirected to DPO’s secure hosted payment page. CABU EventHub does not collect or store card details. All transactions are authorized directly by DPO 3G Direct Pay API v6.
              </p>
            </div>

            {/* Special Notes / Needs */}
            <div>
              <label className="block text-xs font-bold text-[#111827] mb-1">
                Special Notes / Dietary or Medical Needs (Optional)
              </label>
              <textarea
                rows={3}
                value={specialNotes}
                onChange={(e) => setSpecialNotes(e.target.value)}
                placeholder="Let us know if you have specific accessibility requirements, dietary requests, or notes."
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 bg-[#F8FAF9] focus:bg-white focus:outline-none focus:border-[#0B6B3A]"
              />
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-6 py-3 border border-gray-300 rounded-xl font-bold text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to Tracks
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="px-8 py-3 bg-[#F58220] hover:bg-[#C65F12] text-black font-bold text-sm rounded-xl flex items-center gap-2 shadow-md"
              >
                Continue to Final Review
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: REVIEW & PAY */}
        {currentStep === 4 && (
          <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm space-y-8">
            <div className="border-b border-gray-100 pb-4">
              <h2 className="text-2xl font-black text-[#111827]">
                Step 4: Review & Pay
              </h2>
              <p className="text-xs text-[#64748B] mt-1">
                Confirm your registration details before launching the DPO sandbox payment page.
              </p>
            </div>

            {/* Error Message Display if DPO token generation fails */}
            {submitError && (
              <div className="bg-rose-50 border border-rose-200 p-5 rounded-2xl space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-sm text-rose-950">DPO Payment Error</span>
                        <span className="text-xs font-black bg-rose-200 text-rose-900 px-2.5 py-0.5 rounded-md font-mono">
                          Result Code: {submitError.resultCode || "ERR"}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-rose-800">
                        Result Explanation: {submitError.resultExplanation || "DPO token generation failed."}
                      </p>
                      <p className="text-xs text-rose-700 leading-relaxed">
                        {submitError.friendlyMessage || "The payment authorization token could not be created."}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowDiagnosticsModal(true)}
                    className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shrink-0 transition-colors shadow-2xs cursor-pointer"
                  >
                    View DPO Diagnostics
                  </button>
                </div>
              </div>
            )}

            {/* Review Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Attendee Summary */}
              <div className="p-5 rounded-2xl bg-[#F8FAF9] border border-gray-200 space-y-2 text-xs">
                <h3 className="font-bold uppercase tracking-wider text-[#64748B]">
                  Attendee Profile
                </h3>
                <p className="text-sm font-bold text-[#111827]">
                  {firstName} {lastName}
                </p>
                <p className="text-gray-600">NRC: <span className="font-mono">{maskNrc(nrcNumber)}</span></p>
                <p className="text-gray-600">Email: {email}</p>
                <p className="text-gray-600">Phone: <span className="font-mono">{normalizePhone(phone)}</span></p>
                <p className="text-gray-600">Gender: {gender}</p>
                <p className="text-gray-600">Church: {churchOrganization}</p>
              </div>

              {/* Event & Selections Summary */}
              <div className="p-5 rounded-2xl bg-[#F8FAF9] border border-gray-200 space-y-2 text-xs">
                <h3 className="font-bold uppercase tracking-wider text-[#64748B]">
                  Registration Selections
                </h3>
                <p className="text-sm font-bold text-[#111827]">{event.name}</p>
                <p className="text-gray-600">
                  Track: <span className="font-semibold text-[#0B6B3A]">{tracks.find((t) => t.id === selectedTrackId)?.name}</span>
                </p>
                <p className="text-gray-600">
                  Accommodation Bedspace:{" "}
                  <span className="font-bold text-[#111827]">
                    {accommodationRequested ? "Yes (K100)" : "No"}
                  </span>
                </p>
                {accommodationRequested && (
                  <p className="text-[11px] text-[#0B6B3A] italic">
                    Status: Room assigned automatically after clicking Proceed to DPO Payment
                  </p>
                )}
                <p className="text-gray-600">
                  Meal Ticket: <span className="font-bold text-[#111827]">{mealTicketRequested ? "Yes (K50)" : "No"}</span>
                </p>
              </div>
            </div>

            {/* Final Total Box */}
            <div className="bg-[#0B0B0B] text-white p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-xs text-gray-400 block">Total Due for Authorization</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-[#F58220]">
                    ZMW {totalAmountDue.toFixed(2)}
                  </span>
                  {isPriceOverride && (
                    <span className="text-xs font-bold text-gray-400 line-through">
                      Normal ZMW {normalCalculatedTotal.toFixed(2)}
                    </span>
                  )}
                </div>
                {isPriceOverride && (
                  <span className="text-[11px] text-amber-400 font-medium block mt-1">
                    DPO Sandbox Test Override Applied (Amount sent to DPO: ZMW {totalAmountDue.toFixed(2)})
                  </span>
                )}
              </div>
              <div className="text-right text-xs text-gray-400 hidden sm:block">
                <span>DPO Direct Pay Online Hosted Gateway</span>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setCurrentStep(3)}
                className="px-6 py-3 border border-gray-300 rounded-xl font-bold text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to Billing
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={handleProceedToPayment}
                className="w-full sm:w-auto px-10 py-4 bg-[#F58220] hover:bg-[#C65F12] text-black font-extrabold text-base rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Connecting to DPO Gateway...
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5" />
                    Proceed to DPO Payment
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* DPO Diagnostics Modal */}
        {showDiagnosticsModal && submitError && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-slate-900 text-slate-100 w-full max-w-3xl rounded-3xl border border-slate-700 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
              {/* Modal Header */}
              <div className="p-5 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    <Terminal className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-white">DPO Gateway Diagnostics</h3>
                    <p className="text-[11px] text-slate-400">
                      HTTP Status: {submitError.details?.httpStatus || "N/A"} | Result Code: {submitError.resultCode}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDiagnosticsModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6 overflow-y-auto font-sans text-xs">
                {/* Summary Box */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">DPO Result Code</span>
                    <span className="font-mono font-bold text-rose-400 text-sm">{submitError.resultCode}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">HTTP Response Code</span>
                    <span className="font-mono font-bold text-amber-400 text-sm">{submitError.details?.httpStatus || "400"}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Result Explanation</span>
                    <span className="text-slate-200 font-medium">{submitError.resultExplanation}</span>
                  </div>
                  {submitError.details?.missing && (
                    <div className="sm:col-span-2 p-2.5 rounded-xl bg-rose-950/40 border border-rose-800/40 text-rose-300">
                      <span className="font-bold block text-[11px]">Missing Environment Variables:</span>
                      <code className="text-xs font-mono">{submitError.details.missing.join(", ")}</code>
                    </div>
                  )}
                </div>

                {/* Masked XML Request */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-300 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-indigo-400" />
                      Masked XML Request Payload (CompanyToken Masked)
                    </span>
                  </div>
                  <pre className="p-4 rounded-xl bg-slate-950 text-emerald-400 font-mono text-[11px] leading-relaxed overflow-x-auto border border-slate-800 max-h-48 whitespace-pre-wrap">
                    {submitError.details?.maskedXmlRequest || "XML Request not generated."}
                  </pre>
                </div>

                {/* Raw XML Response */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-300 flex items-center gap-1.5">
                      <Terminal className="w-4 h-4 text-emerald-400" />
                      Raw DPO XML Response
                    </span>
                  </div>
                  <pre className="p-4 rounded-xl bg-slate-950 text-amber-300 font-mono text-[11px] leading-relaxed overflow-x-auto border border-slate-800 max-h-48 whitespace-pre-wrap">
                    {submitError.details?.rawResponse || "No raw XML response received from server."}
                  </pre>
                </div>

                {/* Full Parsed Response JSON */}
                <div className="space-y-2">
                  <span className="font-bold text-slate-300">Full API Diagnostic Object</span>
                  <pre className="p-4 rounded-xl bg-slate-950 text-sky-300 font-mono text-[10px] overflow-x-auto border border-slate-800 max-h-40">
                    {JSON.stringify(submitError.details || submitError, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-800/80 border-t border-slate-700 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowDiagnosticsModal(false)}
                  className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs rounded-xl transition-colors"
                >
                  Close Diagnostics
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SMS / Email OTP Verification Modal */}
        {showOtpModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-md w-full p-8 border border-gray-200 shadow-2xl space-y-6 relative animate-in fade-in zoom-in-95 duration-150">
              {/* Top-Right X Close Button */}
              <button
                type="button"
                onClick={() => {
                  setShowOtpModal(false);
                  setOtpError(null);
                  setOtpCode("");
                  setOtpSuccessMessage(null);
                }}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-900 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close OTP verification modal"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-[#0B6B3A]/10 text-[#0B6B3A] flex items-center justify-center mx-auto">
                  {otpDeliveryMethod === "email" ? (
                    <Mail className="w-6 h-6" />
                  ) : (
                    <KeyRound className="w-6 h-6" />
                  )}
                </div>
                <h3 className="text-2xl font-black text-[#111827]">
                  {otpDeliveryMethod === "email" ? "Verify Your Email" : "Verify Your Phone Number"}
                </h3>

                {/* Channel Switcher Tabs */}
                {email && email.includes("@") && (
                  <div className="flex items-center justify-center p-1 bg-slate-100 rounded-xl max-w-xs mx-auto text-xs font-bold mt-2">
                    <button
                      type="button"
                      onClick={() => handleSendOtp("sms")}
                      className={`flex-1 py-1.5 px-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        otpDeliveryMethod === "sms"
                          ? "bg-white text-[#0B6B3A] shadow-xs"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>SMS</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSendOtp("email")}
                      className={`flex-1 py-1.5 px-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        otpDeliveryMethod === "email"
                          ? "bg-white text-[#0B6B3A] shadow-xs"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Email</span>
                    </button>
                  </div>
                )}

                {otpSending ? (
                  <p className="text-xs text-[#64748B] leading-relaxed flex items-center justify-center gap-1.5 pt-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0B6B3A]" />
                    Sending verification code to{" "}
                    <strong className="text-[#111827] font-mono">
                      {otpDeliveryMethod === "email" ? email : phone}
                    </strong>...
                  </p>
                ) : otpSuccessMessage && !otpError ? (
                  <p className="text-xs text-[#64748B] leading-relaxed pt-1">
                    We sent a 6-digit verification code to{" "}
                    <strong className="text-[#111827] font-mono">
                      {otpDeliveryMethod === "email" ? email : phone}
                    </strong>{" "}
                    via {otpDeliveryMethod === "email" ? "noreply@cabuniversity.com" : "SMS"}.
                  </p>
                ) : (
                  <p className="text-xs text-[#64748B] leading-relaxed pt-1">
                    Verification required for{" "}
                    <strong className="text-[#111827] font-mono">
                      {otpDeliveryMethod === "email" ? email : phone}
                    </strong>.
                  </p>
                )}
              </div>

              {otpSuccessMessage && !otpError && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-xs text-[#064E2A] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#0B6B3A] shrink-0" />
                  <span>{otpSuccessMessage}</span>
                </div>
              )}

              {otpError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-bold">Verification Error</strong>
                      <span>{otpError}</span>
                    </div>
                  </div>
                  {/* Fallback Option */}
                  {otpDeliveryMethod === "sms" && email && email.includes("@") && (
                    <div className="pt-2 border-t border-red-200">
                      <button
                        type="button"
                        onClick={() => handleSendOtp("email")}
                        className="text-xs font-bold text-[#0B6B3A] bg-white px-3 py-1.5 rounded-lg border border-emerald-300 hover:bg-emerald-50 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>Send verification code to my email instead</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#111827] mb-2 text-center">
                    Enter 6-Digit Code
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
                      setOtpError(null);
                    }}
                    placeholder="······"
                    className="w-full text-center font-mono text-2xl tracking-[0.5em] py-3 px-4 border-2 border-gray-300 rounded-2xl focus:outline-none focus:border-[#0B6B3A] focus:ring-4 focus:ring-[#0B6B3A]/10 transition-all bg-[#F8FAF9] focus:bg-white"
                  />
                </div>

                <div className="space-y-3 pt-2">
                  <button
                    type="submit"
                    disabled={otpVerifying || otpCode.trim().length !== 6}
                    className={`w-full py-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                      otpCode.trim().length === 6 && !otpVerifying
                        ? "bg-[#0B6B3A] hover:bg-[#064E2A] text-white shadow-md cursor-pointer"
                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {otpVerifying ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Verifying Code...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        Verify & Continue
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <button
                      type="button"
                      disabled={resendCooldown > 0 || otpSending}
                      onClick={() => handleSendOtp(otpDeliveryMethod)}
                      className={`font-bold transition-colors ${
                        resendCooldown > 0 || otpSending
                          ? "text-gray-400 cursor-not-allowed"
                          : "text-[#0B6B3A] hover:underline cursor-pointer"
                      }`}
                    >
                      {otpSending
                        ? "Sending code..."
                        : resendCooldown > 0
                        ? `Resend in ${resendCooldown}s`
                        : "Resend Code"}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowOtpModal(false);
                        setOtpError(null);
                        setOtpCode("");
                      }}
                      className="text-[#64748B] hover:text-[#111827] font-semibold cursor-pointer"
                    >
                      Change phone or email
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
