export interface Event {
  id: string;
  name: string;
  slug: string;
  code: string;
  theme: string;
  description: string;
  startDate: string;
  endDate: string;
  venue: string;
  registrationOpenDate: string;
  registrationCloseDate: string;
  status: "draft" | "published" | "closed" | "archived";
  isActive: boolean;
  isTestEvent?: boolean;
  priceOverrideEnabled?: boolean;
  priceOverrideAmount?: number;
  priceOverrideReason?: string;
  shortDescription?: string;
  eventType?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Track {
  id: string;
  eventId: string;
  name: string;
  description: string;
  capacityLimit?: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Attendee {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  nrcNumber: string;
  normalizedNrcNumber: string;
  email: string;
  phone: string;
  normalizedPhone: string;
  gender: "Male" | "Female";
  churchOrganization: string;
  city: string;
  country: string;
  phoneVerified?: boolean;
  phoneVerifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OtpSendResponse {
  success: boolean;
  message: string;
  cooldownSeconds?: number;
  errorType?: string;
}

export interface OtpVerifyResponse {
  success: boolean;
  verified?: boolean;
  message: string;
  phone?: string;
  normalizedPhone?: string;
  errorType?: string;
}

export interface Registration {
  id: string;
  eventId: string;
  attendeeId: string;
  trackId: string;
  registrationReference: string;
  receiptNumber?: string;
  baseRegistrationFee: number;
  accommodationRequested: boolean;
  accommodationFee: number;
  mealTicketRequested: boolean;
  mealTicketFee: number;
  totalAmountDue: number;
  normalCalculatedTotal?: number;
  priceOverrideApplied?: boolean;
  priceOverrideReason?: string;
  priceOverrideDiscount?: number;
  isReturningAttendee: boolean;
  registrationStatus: "pending_payment" | "confirmed" | "cancelled" | "checked_in" | "no_show";
  paymentStatus: "pending_dpo_payment" | "dpo_redirected" | "payment_successful" | "payment_failed" | "payment_cancelled" | "verification_pending" | "verified" | "rejected";
  dpoTransactionReference?: string;
  specialNotes?: string;
  consentUpdates: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  registrationId: string;
  receiptNumber?: string;
  amountDue: number;
  amountVerified?: number;
  currency: string;
  paymentProvider: "DPO";
  paymentReference: string;
  dpoTransactionReference: string;
  dpoTransToken?: string;
  dpoTransRef?: string;
  paymentStatus: Registration["paymentStatus"];
  rawCreateTokenResponse?: any;
  rawVerifyTokenResponse?: any;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Room {
  id: string;
  eventId: string;
  blockName: string;
  roomNumber: string;
  genderRestriction: "Male" | "Female";
  capacity: number;
  currentOccupancy: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AccommodationBooking {
  id: string;
  eventId: string;
  registrationId: string;
  attendeeId: string;
  roomId: string;
  roomNumber: string;
  bedspaceNumber: number;
  gender: "Male" | "Female";
  accommodationFee: number;
  bookingStatus: "reserved" | "confirmed" | "cancelled" | "checked_in" | "checked_out";
  assignedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface MealTicket {
  id: string;
  eventId: string;
  registrationId: string;
  attendeeId: string;
  mealTicketFee: number;
  status: "reserved" | "confirmed" | "cancelled" | "used";
  createdAt: string;
  updatedAt: string;
}

export type ResultStatus = "PASS" | "FAIL" | "COMPLETED" | "INCOMPLETE" | "PENDING";

export interface EventResult {
  id: string;
  attendeeId: string;
  registrationId: string;
  eventId: string;
  trackId?: string;
  score?: number;
  maxScore?: number;
  percentage?: number;
  grade?: string;
  status: ResultStatus;
  remarks?: string;
  published: boolean;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface ResultAuditLog {
  id: string;
  action: "RESULT_CREATED" | "RESULT_UPDATED" | "RESULT_PUBLISHED" | "RESULT_UNPUBLISHED" | "RESULT_DELETED";
  adminEmail: string;
  resultId: string;
  attendeeId: string;
  attendeeName?: string;
  eventId: string;
  eventCode?: string;
  details?: string;
  timestamp: string;
}

export interface ResultCertificate {
  id: string;
  attendeeId: string;
  eventId: string;
  registrationId: string;
  trackId: string;
  assessmentName: string;
  moduleName: string;
  score?: number;
  grade?: string;
  resultStatus: "passed" | "failed" | "completed" | "incomplete" | "attended";
  certificateEligibility: "eligible" | "not_eligible";
  certificateStatus: "not_issued" | "issued" | "revoked";
  certificateNumber?: string;
  certificateIssuedDate?: string;
  adminComments?: string;
  recordedBy: string;
  recordedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface DpoTransactionLog {
  id: string;
  registrationId?: string;
  transactionReference: string;
  dpoTransToken?: string;
  dpoTransRef?: string;
  eventType: "create_token" | "redirect" | "return" | "verify" | "success" | "failed" | "cancelled" | "error" | "test_token";
  requestPayload?: any;
  responsePayload?: any;
  parsedResult?: any;
  resultCode?: string;
  resultExplanation?: string;
  maskedXmlRequest?: string;
  rawXmlResponse?: string;
  frontendErrorMessage?: string;
  missingEnvVars?: string[];
  httpStatus?: number;
  normalCalculatedAmount?: number;
  finalDpoAmount?: number;
  priceOverrideStatus?: boolean;
  priceOverrideReason?: string;
  localStatusBefore?: string;
  localStatusAfter?: string;
  createdAt: string;
  timestamp?: string;
}

export interface CheckIn {
  id: string;
  eventId: string;
  registrationId: string;
  attendeeId: string;
  checkedIn: boolean;
  checkedInAt?: string;
  checkedInBy?: string;
  materialsCollected: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
