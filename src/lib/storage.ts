import {
  Event,
  Track,
  Attendee,
  Registration,
  Payment,
  Room,
  AccommodationBooking,
  MealTicket,
  ResultCertificate,
  DpoTransactionLog,
  CheckIn,
} from "../types";
import { normalizeNrc } from "./nrc";
import { normalizePhone } from "./phone";

const VERSION_KEY = "cabu_eventhub_data_version";
const CURRENT_VERSION = "1.3.0";

const KEYS = {
  EVENTS: "cabu_eventhub_events",
  TRACKS: "cabu_eventhub_tracks",
  ATTENDEES: "cabu_eventhub_attendees",
  REGISTRATIONS: "cabu_eventhub_registrations",
  PAYMENTS: "cabu_eventhub_payments",
  ROOMS: "cabu_eventhub_rooms",
  BOOKINGS: "cabu_eventhub_bookings",
  MEAL_TICKETS: "cabu_eventhub_meal_tickets",
  RESULTS_CERTIFICATES: "cabu_eventhub_results_certificates",
  DPO_LOGS: "cabu_eventhub_dpo_logs",
  CHECKINS: "cabu_eventhub_checkins",
  CURRENT_ATTENDEE_ID: "cabu_eventhub_current_attendee_id",
  CURRENT_REGISTRATION_ID: "cabu_eventhub_current_registration_id",
  CURRENT_REG_REF: "cabu_eventhub_current_reg_ref",
  ADMIN_LOGGED_IN: "cabu_eventhub_admin_logged_in",
};

// Seed Data Definition
const SEED_EVENTS: Event[] = [
  {
    id: "event-block-class-2026",
    name: "Chaplains & Pastors Block Class",
    slug: "chaplains-pastors-block-class",
    code: "BLOCK",
    theme: "Equipping Servants for Faithful Ministry",
    description:
      "A focused CABU block class designed to equip chaplains, pastors, and ministry workers for faithful service in the local church, institutional ministry, and community contexts. This test event is used to validate the CABU EventHub registration, accommodation, guest dashboard, and DPO sandbox payment flow before using the system for larger conferences.",
    shortDescription:
      "A CABU block class for chaplains, pastors, and ministry workers, created as a ZMW 1.00 DPO sandbox payment test event.",
    startDate: "2026-08-10",
    endDate: "2026-08-14",
    venue: "Central Africa Baptist University, Kitwe",
    registrationOpenDate: "2026-01-01",
    registrationCloseDate: "2026-12-31",
    status: "published",
    isActive: true,
    isTestEvent: true,
    priceOverrideEnabled: true,
    priceOverrideAmount: 1.00,
    priceOverrideReason: "DPO sandbox payment testing",
    eventType: "DPO Sandbox Test Event",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "event-equip-2026",
    name: "Equip Conference 2026",
    slug: "equip-conference-2026",
    code: "EQUIP",
    theme: "Equipping the Church for Faithful Ministry",
    description:
      "Central Africa Baptist University annual equipping conference for church leaders, pastors, youth ministry workers, women leaders, and gospel workers.",
    startDate: "2026-08-18",
    endDate: "2026-08-21",
    venue: "Central Africa Baptist University, Kitwe",
    registrationOpenDate: "2026-01-01",
    registrationCloseDate: "2026-08-17",
    status: "published",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "event-cec27",
    name: "CEC27",
    slug: "cec27",
    code: "CEC27",
    theme: "Strengthening Gospel Partnerships in Education",
    description:
      "Christian Educators Conference 2027 focusing on biblical integration, school leadership, teacher discipleship, and admin best practices.",
    startDate: "2027-04-12",
    endDate: "2027-04-15",
    venue: "Central Africa Baptist University, Kitwe",
    registrationOpenDate: "2026-09-01",
    registrationCloseDate: "2027-04-11",
    status: "published",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const SEED_TRACKS: Track[] = [
  // Block Class Tracks
  { id: "track-block-1", eventId: "event-block-class-2026", name: "Chaplaincy Ministry Track", description: "For chaplains serving in institutional, military, school, hospital, and community contexts.", isActive: true, sortOrder: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "track-block-2", eventId: "event-block-class-2026", name: "Pastors Ministry Track", description: "For pastors, elders, Bible teachers, and church leaders seeking practical and biblical ministry training.", isActive: true, sortOrder: 2, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "track-block-3", eventId: "event-block-class-2026", name: "Biblical Counselling Track", description: "For ministry workers who desire Scripture-based tools for wise and compassionate care.", isActive: true, sortOrder: 3, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "track-block-4", eventId: "event-block-class-2026", name: "Expository Ministry Track", description: "For those seeking to grow in faithful Bible interpretation, teaching, and preaching.", isActive: true, sortOrder: 4, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },

  // Equip Tracks
  { id: "track-eq-1", eventId: "event-equip-2026", name: "Pastors Track", description: "Expository preaching, pastoral theology, and church leadership.", isActive: true, sortOrder: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "track-eq-2", eventId: "event-equip-2026", name: "Youth Ministry Track", description: "Reaching, discipling, and mentoring young people in biblical truth.", isActive: true, sortOrder: 2, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "track-eq-3", eventId: "event-equip-2026", name: "Women’s Ministry Track", description: "Titus 2 discipleship, women in local church ministry, and practical theology.", isActive: true, sortOrder: 3, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "track-eq-4", eventId: "event-equip-2026", name: "Missions Track", description: "Cross-cultural church planting and biblical missiology in Central Africa.", isActive: true, sortOrder: 4, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "track-eq-5", eventId: "event-equip-2026", name: "Media & Communications Track", description: "Utilizing modern media, sound, and technology for church outreach.", isActive: true, sortOrder: 5, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },

  // CEC27 Tracks
  { id: "track-cec-1", eventId: "event-cec27", name: "Primary Education Methods", description: "Classroom management, early childhood literacy, and gospel integration.", isActive: true, sortOrder: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "track-cec-2", eventId: "event-cec27", name: "Secondary School Leadership", description: "Academic excellence, secondary administration, and student discipline.", isActive: true, sortOrder: 2, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "track-cec-3", eventId: "event-cec27", name: "Christian Education Administration", description: "Governance, budgeting, regulatory compliance, and staff development.", isActive: true, sortOrder: 3, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "track-cec-4", eventId: "event-cec27", name: "Curriculum & Discipleship", description: "Building worldview-centric school curricula and mentoring educators.", isActive: true, sortOrder: 4, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

const SEED_ROOMS: Room[] = [
  // Block Class Male Rooms
  { id: "rm-block-m1", eventId: "event-block-class-2026", blockName: "Block T", roomNumber: "T1", genderRestriction: "Male", capacity: 8, currentOccupancy: 0, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "rm-block-m2", eventId: "event-block-class-2026", blockName: "Block T", roomNumber: "T2", genderRestriction: "Male", capacity: 8, currentOccupancy: 0, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },

  // Block Class Female Rooms
  { id: "rm-block-f1", eventId: "event-block-class-2026", blockName: "Block U", roomNumber: "U1", genderRestriction: "Female", capacity: 8, currentOccupancy: 0, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "rm-block-f2", eventId: "event-block-class-2026", blockName: "Block U", roomNumber: "U2", genderRestriction: "Female", capacity: 8, currentOccupancy: 0, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },

  // Equip Male Rooms
  { id: "rm-eq-m1", eventId: "event-equip-2026", blockName: "Block A", roomNumber: "A1", genderRestriction: "Male", capacity: 8, currentOccupancy: 1, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "rm-eq-m2", eventId: "event-equip-2026", blockName: "Block A", roomNumber: "A2", genderRestriction: "Male", capacity: 8, currentOccupancy: 0, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "rm-eq-m3", eventId: "event-equip-2026", blockName: "Block A", roomNumber: "A3", genderRestriction: "Male", capacity: 8, currentOccupancy: 0, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },

  // Equip Female Rooms
  { id: "rm-eq-f1", eventId: "event-equip-2026", blockName: "Block B", roomNumber: "B1", genderRestriction: "Female", capacity: 8, currentOccupancy: 1, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "rm-eq-f2", eventId: "event-equip-2026", blockName: "Block B", roomNumber: "B2", genderRestriction: "Female", capacity: 8, currentOccupancy: 0, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "rm-eq-f3", eventId: "event-equip-2026", blockName: "Block B", roomNumber: "B3", genderRestriction: "Female", capacity: 8, currentOccupancy: 0, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },

  // CEC27 Male Rooms
  { id: "rm-cec-m1", eventId: "event-cec27", blockName: "Block C", roomNumber: "C1", genderRestriction: "Male", capacity: 8, currentOccupancy: 0, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "rm-cec-m2", eventId: "event-cec27", blockName: "Block C", roomNumber: "C2", genderRestriction: "Male", capacity: 8, currentOccupancy: 0, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },

  // CEC27 Female Rooms
  { id: "rm-cec-f1", eventId: "event-cec27", blockName: "Block D", roomNumber: "D1", genderRestriction: "Female", capacity: 8, currentOccupancy: 0, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "rm-cec-f2", eventId: "event-cec27", blockName: "Block D", roomNumber: "D2", genderRestriction: "Female", capacity: 8, currentOccupancy: 0, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

const SEED_ATTENDEES: Attendee[] = [
  {
    id: "att-demo-1",
    firstName: "Emmanuel",
    lastName: "Banda",
    fullName: "Emmanuel Banda",
    nrcNumber: "123456/11/1",
    normalizedNrcNumber: "123456111",
    email: "emmanuel.banda@example.com",
    phone: "+260977123456",
    normalizedPhone: "+260977123456",
    gender: "Male",
    churchOrganization: "Grace Baptist Church, Ndola",
    city: "Ndola",
    country: "Zambia",
    phoneVerified: true,
    phoneVerifiedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "att-demo-2",
    firstName: "Chipo",
    lastName: "Phiri",
    fullName: "Chipo Phiri",
    nrcNumber: "654321/22/2",
    normalizedNrcNumber: "654321222",
    email: "chipo.phiri@example.com",
    phone: "+260966987654",
    normalizedPhone: "+260966987654",
    gender: "Female",
    churchOrganization: "Central Baptist Academy",
    city: "Kitwe",
    country: "Zambia",
    phoneVerified: true,
    phoneVerifiedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const SEED_REGISTRATIONS: Registration[] = [
  {
    id: "reg-demo-1",
    eventId: "event-equip-2026",
    attendeeId: "att-demo-1",
    trackId: "track-eq-1",
    registrationReference: "EQUIP-2026-0001",
    baseRegistrationFee: 350,
    accommodationRequested: true,
    accommodationFee: 100,
    mealTicketRequested: true,
    mealTicketFee: 50,
    totalAmountDue: 500,
    isReturningAttendee: false,
    registrationStatus: "confirmed",
    paymentStatus: "verified",
    dpoTransactionReference: "CABU-EVENT-EQUIP-2026-0001-DEMO1",
    consentUpdates: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "reg-demo-2",
    eventId: "event-equip-2026",
    attendeeId: "att-demo-2",
    trackId: "track-eq-3",
    registrationReference: "EQUIP-2026-0002",
    baseRegistrationFee: 350,
    accommodationRequested: true,
    accommodationFee: 100,
    mealTicketRequested: false,
    mealTicketFee: 0,
    totalAmountDue: 450,
    isReturningAttendee: false,
    registrationStatus: "confirmed",
    paymentStatus: "verified",
    dpoTransactionReference: "CABU-EVENT-EQUIP-2026-0002-DEMO2",
    consentUpdates: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const SEED_PAYMENTS: Payment[] = [
  {
    id: "pay-demo-1",
    registrationId: "reg-demo-1",
    amountDue: 500,
    amountVerified: 500,
    currency: "ZMW",
    paymentProvider: "DPO",
    paymentReference: "DPO-REF-001",
    dpoTransactionReference: "CABU-EVENT-EQUIP-2026-0001-DEMO1",
    dpoTransToken: "DEMO-TOKEN-001",
    dpoTransRef: "DPO-TRANS-1001",
    paymentStatus: "verified",
    verifiedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "pay-demo-2",
    registrationId: "reg-demo-2",
    amountDue: 450,
    amountVerified: 450,
    currency: "ZMW",
    paymentProvider: "DPO",
    paymentReference: "DPO-REF-002",
    dpoTransactionReference: "CABU-EVENT-EQUIP-2026-0002-DEMO2",
    dpoTransToken: "DEMO-TOKEN-002",
    dpoTransRef: "DPO-TRANS-1002",
    paymentStatus: "verified",
    verifiedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const SEED_BOOKINGS: AccommodationBooking[] = [
  {
    id: "bk-demo-1",
    eventId: "event-equip-2026",
    registrationId: "reg-demo-1",
    attendeeId: "att-demo-1",
    roomId: "rm-eq-m1",
    roomNumber: "A1",
    bedspaceNumber: 1,
    gender: "Male",
    accommodationFee: 100,
    bookingStatus: "confirmed",
    assignedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "bk-demo-2",
    eventId: "event-equip-2026",
    registrationId: "reg-demo-2",
    attendeeId: "att-demo-2",
    roomId: "rm-eq-f1",
    roomNumber: "B1",
    bedspaceNumber: 1,
    gender: "Female",
    accommodationFee: 100,
    bookingStatus: "confirmed",
    assignedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const SEED_MEAL_TICKETS: MealTicket[] = [
  {
    id: "mt-demo-1",
    eventId: "event-equip-2026",
    registrationId: "reg-demo-1",
    attendeeId: "att-demo-1",
    mealTicketFee: 50,
    status: "confirmed",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const SEED_RESULTS_CERTIFICATES: ResultCertificate[] = [
  {
    id: "rc-demo-1",
    attendeeId: "att-demo-1",
    eventId: "event-equip-2026",
    registrationId: "reg-demo-1",
    trackId: "track-eq-1",
    assessmentName: "Expository Preaching Module 1",
    moduleName: "Pastors Track",
    score: 92,
    grade: "Distinction",
    resultStatus: "passed",
    certificateEligibility: "eligible",
    certificateStatus: "issued",
    certificateNumber: "CABU-EQUIP26-CERT-0089",
    certificateIssuedDate: "2026-08-21",
    adminComments: "Completed all lectures and practical preaching practicum.",
    recordedBy: "admin@cabuniversity.com",
    recordedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Helper to check and initialize storage
export function initializeStorage() {
  if (typeof window === "undefined") return;
  const version = localStorage.getItem(VERSION_KEY);
  if (!version || version !== CURRENT_VERSION) {
    seedDemoData();
    localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
  }
}

export function seedDemoData() {
  localStorage.setItem(KEYS.EVENTS, JSON.stringify(SEED_EVENTS));
  localStorage.setItem(KEYS.TRACKS, JSON.stringify(SEED_TRACKS));
  localStorage.setItem(KEYS.ROOMS, JSON.stringify(SEED_ROOMS));
  localStorage.setItem(KEYS.ATTENDEES, JSON.stringify(SEED_ATTENDEES));
  localStorage.setItem(KEYS.REGISTRATIONS, JSON.stringify(SEED_REGISTRATIONS));
  localStorage.setItem(KEYS.PAYMENTS, JSON.stringify(SEED_PAYMENTS));
  localStorage.setItem(KEYS.BOOKINGS, JSON.stringify(SEED_BOOKINGS));
  localStorage.setItem(KEYS.MEAL_TICKETS, JSON.stringify(SEED_MEAL_TICKETS));
  localStorage.setItem(KEYS.RESULTS_CERTIFICATES, JSON.stringify(SEED_RESULTS_CERTIFICATES));
  if (!localStorage.getItem(KEYS.DPO_LOGS)) {
    localStorage.setItem(KEYS.DPO_LOGS, JSON.stringify([]));
  }
  if (!localStorage.getItem(KEYS.CHECKINS)) {
    localStorage.setItem(KEYS.CHECKINS, JSON.stringify([]));
  }
}

export function resetDemoData() {
  seedDemoData();
}

// Events
export function getEvents(): Event[] {
  initializeStorage();
  const data = localStorage.getItem(KEYS.EVENTS);
  let events: Event[] = data ? JSON.parse(data) : [];
  
  const blockIndex = events.findIndex(
    (e) => e.code === "BLOCK" || e.slug === "chaplains-pastors-block-class" || e.id === "event-block-class-2026"
  );
  
  const seedBlockEvent = SEED_EVENTS.find((e) => e.code === "BLOCK");

  if (blockIndex === -1) {
    if (seedBlockEvent) {
      events = [seedBlockEvent, ...events];
      localStorage.setItem(KEYS.EVENTS, JSON.stringify(events));
    }
  } else {
    events[blockIndex] = {
      ...events[blockIndex],
      name: "Chaplains & Pastors Block Class",
      slug: "chaplains-pastors-block-class",
      code: "BLOCK",
      isTestEvent: true,
      priceOverrideEnabled: true,
      priceOverrideAmount: 1.00,
      priceOverrideReason: "DPO sandbox payment testing",
    };
    localStorage.setItem(KEYS.EVENTS, JSON.stringify(events));
  }
  return events;
}

export function saveEvents(events: Event[]): void {
  localStorage.setItem(KEYS.EVENTS, JSON.stringify(events));
}

// Global Reusable Event Lookup Helper
export function findEventBySlugOrId(slugOrCode?: string): Event | undefined {
  if (!slugOrCode) return undefined;
  const events = getEvents();
  const raw = slugOrCode.trim().toLowerCase();
  
  // 1. Direct exact slug match
  const exactSlug = events.find((e) => e.slug?.toLowerCase() === raw);
  if (exactSlug) return exactSlug;

  // 2. Direct exact code match (e.g., "EQUIP", "BLOCK", "CEC27")
  const exactCode = events.find((e) => e.code?.toLowerCase() === raw);
  if (exactCode) return exactCode;

  // 3. Direct exact id match
  const exactId = events.find((e) => e.id?.toLowerCase() === raw);
  if (exactId) return exactId;

  // 4. Normalized slug comparison (ignoring dashes, underscores, spaces)
  const clean = raw.replace(/[^a-z0-9]/g, "");
  const normMatch = events.find((e) => {
    const eSlugClean = (e.slug || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const eCodeClean = (e.code || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    return (
      eSlugClean === clean ||
      eCodeClean === clean ||
      (clean.length >= 4 && (eSlugClean.includes(clean) || clean.includes(eSlugClean))) ||
      (clean.length >= 3 && (eCodeClean.includes(clean) || clean.includes(eCodeClean)))
    );
  });
  if (normMatch) return normMatch;

  // 5. Common shorthand aliases
  if (clean.includes("equip")) {
    const equip = events.find((e) => e.code?.toUpperCase() === "EQUIP" || e.slug?.toLowerCase().includes("equip"));
    if (equip) return equip;
  }
  if (clean.includes("cec")) {
    const cec = events.find((e) => e.code?.toUpperCase() === "CEC27" || e.slug?.toLowerCase().includes("cec"));
    if (cec) return cec;
  }
  if (clean.includes("block") || clean.includes("chaplain") || clean.includes("pastor")) {
    const block = events.find((e) => e.code?.toUpperCase() === "BLOCK" || e.slug?.toLowerCase().includes("block") || e.slug?.toLowerCase().includes("chaplain"));
    if (block) return block;
  }

  return undefined;
}

// Tracks
export function getTracks(): Track[] {
  initializeStorage();
  const data = localStorage.getItem(KEYS.TRACKS);
  let tracks: Track[] = data ? JSON.parse(data) : [];
  if (!tracks.some((t) => t.eventId === "event-block-class-2026")) {
    const blockTracks = SEED_TRACKS.filter((t) => t.eventId === "event-block-class-2026");
    tracks = [...blockTracks, ...tracks];
    localStorage.setItem(KEYS.TRACKS, JSON.stringify(tracks));
  }
  return tracks;
}

export function saveTracks(tracks: Track[]): void {
  localStorage.setItem(KEYS.TRACKS, JSON.stringify(tracks));
}

// Attendees
export function getAttendees(): Attendee[] {
  initializeStorage();
  const data = localStorage.getItem(KEYS.ATTENDEES);
  return data ? JSON.parse(data) : [];
}

export function saveAttendees(attendees: Attendee[]): void {
  localStorage.setItem(KEYS.ATTENDEES, JSON.stringify(attendees));
}

export function findAttendeeByNrc(nrc: string): Attendee | undefined {
  const normNrc = normalizeNrc(nrc);
  if (normNrc.length !== 9) return undefined;
  const attendees = getAttendees();
  return attendees.find((a) => a.normalizedNrcNumber === normNrc);
}

export function findAttendeeByNrcOrPhone(nrc: string, phone?: string): Attendee | undefined {
  const attendees = getAttendees();
  const normNrc = normalizeNrc(nrc);
  const normPhone = phone ? normalizePhone(phone) : "";

  let found = attendees.find((a) => a.normalizedNrcNumber === normNrc);
  if (!found && normPhone) {
    found = attendees.find((a) => a.normalizedPhone === normPhone);
  }
  return found;
}

export function findAttendeeByLastNameAndNrc(lastName: string, nrc: string): Attendee | undefined {
  const attendees = getAttendees();
  const normNrc = normalizeNrc(nrc);
  const cleanLastName = lastName.trim().toLowerCase();

  return attendees.find(
    (a) =>
      a.normalizedNrcNumber === normNrc &&
      a.lastName.trim().toLowerCase() === cleanLastName
  );
}

// Registrations
export function getRegistrations(): Registration[] {
  initializeStorage();
  const data = localStorage.getItem(KEYS.REGISTRATIONS);
  return data ? JSON.parse(data) : [];
}

export function saveRegistrations(registrations: Registration[]): void {
  localStorage.setItem(KEYS.REGISTRATIONS, JSON.stringify(registrations));
}

export function generateRegistrationReference(eventCode: string): string {
  const registrations = getRegistrations();
  const year = new Date().getFullYear();
  const prefix = `${eventCode}-${year}-`;
  
  const matching = registrations.filter((r) => r.registrationReference.startsWith(prefix));
  const seq = matching.length + 1;
  const seqStr = seq.toString().padStart(4, "0");
  return `${prefix}${seqStr}`;
}

// Payments
export function getPayments(): Payment[] {
  initializeStorage();
  const data = localStorage.getItem(KEYS.PAYMENTS);
  return data ? JSON.parse(data) : [];
}

export function savePayments(payments: Payment[]): void {
  localStorage.setItem(KEYS.PAYMENTS, JSON.stringify(payments));
}

// Rooms
export function getRooms(): Room[] {
  initializeStorage();
  const data = localStorage.getItem(KEYS.ROOMS);
  let rooms: Room[] = data ? JSON.parse(data) : [];
  if (!rooms.some((r) => r.eventId === "event-block-class-2026")) {
    const blockRooms = SEED_ROOMS.filter((r) => r.eventId === "event-block-class-2026");
    rooms = [...blockRooms, ...rooms];
    localStorage.setItem(KEYS.ROOMS, JSON.stringify(rooms));
  }
  return rooms;
}

export function saveRooms(rooms: Room[]): void {
  localStorage.setItem(KEYS.ROOMS, JSON.stringify(rooms));
}

// Accommodation Bookings
export function getAccommodationBookings(): AccommodationBooking[] {
  initializeStorage();
  const data = localStorage.getItem(KEYS.BOOKINGS);
  return data ? JSON.parse(data) : [];
}

export function saveAccommodationBookings(bookings: AccommodationBooking[]): void {
  localStorage.setItem(KEYS.BOOKINGS, JSON.stringify(bookings));
}

// Automatic Room Assignment
export function assignBedspace(
  eventId: string,
  registrationId: string,
  attendeeId: string,
  gender: "Male" | "Female"
): AccommodationBooking | null {
  const rooms = getRooms();
  const bookings = getAccommodationBookings();

  // Filter available rooms strictly by eventId, active status, gender restriction, and occupancy < capacity
  const availableRoom = rooms.find(
    (r) =>
      r.eventId === eventId &&
      r.isActive &&
      r.genderRestriction === gender &&
      r.currentOccupancy < r.capacity
  );

  if (!availableRoom) {
    return null;
  }

  // Update Room occupancy
  availableRoom.currentOccupancy += 1;
  saveRooms(rooms);

  // Create Accommodation Booking
  const booking: AccommodationBooking = {
    id: `bk-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    eventId,
    registrationId,
    attendeeId,
    roomId: availableRoom.id,
    roomNumber: availableRoom.roomNumber,
    bedspaceNumber: availableRoom.currentOccupancy,
    gender,
    accommodationFee: 100,
    bookingStatus: "reserved",
    assignedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  bookings.push(booking);
  saveAccommodationBookings(bookings);

  return booking;
}

export function releaseBedspaceForRegistration(registrationId: string): void {
  const bookings = getAccommodationBookings();
  const rooms = getRooms();

  const bookingIndex = bookings.findIndex((b) => b.registrationId === registrationId);
  if (bookingIndex !== -1) {
    const booking = bookings[bookingIndex];
    booking.bookingStatus = "cancelled";
    booking.updatedAt = new Date().toISOString();

    const room = rooms.find((r) => r.id === booking.roomId);
    if (room && room.currentOccupancy > 0) {
      room.currentOccupancy -= 1;
      saveRooms(rooms);
    }
    saveAccommodationBookings(bookings);
  }
}

// Meal Tickets
export function getMealTickets(): MealTicket[] {
  initializeStorage();
  const data = localStorage.getItem(KEYS.MEAL_TICKETS);
  return data ? JSON.parse(data) : [];
}

export function saveMealTickets(tickets: MealTicket[]): void {
  localStorage.setItem(KEYS.MEAL_TICKETS, JSON.stringify(tickets));
}

// Results & Certificates
export function getResultsCertificates(): ResultCertificate[] {
  initializeStorage();
  const data = localStorage.getItem(KEYS.RESULTS_CERTIFICATES);
  return data ? JSON.parse(data) : [];
}

export function saveResultsCertificates(records: ResultCertificate[]): void {
  localStorage.setItem(KEYS.RESULTS_CERTIFICATES, JSON.stringify(records));
}

// Helper to format timestamps safely without ever returning "Invalid Date"
export function formatSafeDate(value?: string | number): string {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString();
}

// Helper to mask token strings for safe display
export function maskToken(token?: string): string {
  if (!token || token === "N/A") return "N/A";
  if (token.length <= 10) return token;
  return `${token.slice(0, 6)}...${token.slice(-4)}`;
}

// DPO Logs
export function getDpoLogs(): DpoTransactionLog[] {
  initializeStorage();
  const data = localStorage.getItem(KEYS.DPO_LOGS);
  return data ? JSON.parse(data) : [];
}

export function logDpoTransaction(log: Omit<DpoTransactionLog, "id" | "createdAt">): void {
  const logs = getDpoLogs();
  const nowIso = new Date().toISOString();
  const newLog: DpoTransactionLog = {
    ...log,
    id: `dpo-log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    createdAt: nowIso,
    timestamp: nowIso,
  };
  logs.unshift(newLog);
  localStorage.setItem(KEYS.DPO_LOGS, JSON.stringify(logs));
}

// Check-ins
export function getCheckIns(): CheckIn[] {
  initializeStorage();
  const data = localStorage.getItem(KEYS.CHECKINS);
  return data ? JSON.parse(data) : [];
}

export function saveCheckIns(checkins: CheckIn[]): void {
  localStorage.setItem(KEYS.CHECKINS, JSON.stringify(checkins));
}

export function generateReceiptNumber(regRef?: string): string {
  const year = new Date().getFullYear();
  const randomSuffix = Math.floor(100000 + Math.random() * 900000);
  if (regRef) {
    const cleanRef = regRef.replace(/[^a-zA-Z0-9]/g, "");
    return `REC-${cleanRef}-${randomSuffix.toString().slice(-4)}`;
  }
  return `CABU-REC-${year}-${randomSuffix}`;
}

// Active guest state session helpers
export function setCurrentGuestSession(attendeeId: string, registrationId: string, regRef: string) {
  localStorage.setItem(KEYS.CURRENT_ATTENDEE_ID, attendeeId);
  localStorage.setItem(KEYS.CURRENT_REGISTRATION_ID, registrationId);
  localStorage.setItem(KEYS.CURRENT_REG_REF, regRef);
}

export function clearGuestSession(): void {
  localStorage.removeItem(KEYS.CURRENT_ATTENDEE_ID);
  localStorage.removeItem(KEYS.CURRENT_REGISTRATION_ID);
  localStorage.removeItem(KEYS.CURRENT_REG_REF);
}

export function getCurrentGuestSession(): { attendeeId?: string; registrationId?: string; regRef?: string } {
  if (typeof window === "undefined") return {};
  return {
    attendeeId: localStorage.getItem(KEYS.CURRENT_ATTENDEE_ID) || undefined,
    registrationId: localStorage.getItem(KEYS.CURRENT_REGISTRATION_ID) || undefined,
    regRef: localStorage.getItem(KEYS.CURRENT_REG_REF) || undefined,
  };
}

// Admin session helpers
export function setAdminLoggedIn(loggedIn: boolean) {
  if (loggedIn) {
    localStorage.setItem(KEYS.ADMIN_LOGGED_IN, "true");
  } else {
    localStorage.removeItem(KEYS.ADMIN_LOGGED_IN);
  }
}

export function isAdminLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(KEYS.ADMIN_LOGGED_IN) === "true";
}

// Backup & Restore
export function exportAllData(): string {
  initializeStorage();
  const backup = {
    version: CURRENT_VERSION,
    exportedAt: new Date().toISOString(),
    events: getEvents(),
    tracks: getTracks(),
    rooms: getRooms(),
    attendees: getAttendees(),
    registrations: getRegistrations(),
    payments: getPayments(),
    bookings: getAccommodationBookings(),
    mealTickets: getMealTickets(),
    resultsCertificates: getResultsCertificates(),
    dpoLogs: getDpoLogs(),
    checkIns: getCheckIns(),
  };
  return JSON.stringify(backup, null, 2);
}

export function importAllData(jsonStr: string): boolean {
  try {
    const data = JSON.parse(jsonStr);
    if (data.events) localStorage.setItem(KEYS.EVENTS, JSON.stringify(data.events));
    if (data.tracks) localStorage.setItem(KEYS.TRACKS, JSON.stringify(data.tracks));
    if (data.rooms) localStorage.setItem(KEYS.ROOMS, JSON.stringify(data.rooms));
    if (data.attendees) localStorage.setItem(KEYS.ATTENDEES, JSON.stringify(data.attendees));
    if (data.registrations) localStorage.setItem(KEYS.REGISTRATIONS, JSON.stringify(data.registrations));
    if (data.payments) localStorage.setItem(KEYS.PAYMENTS, JSON.stringify(data.payments));
    if (data.bookings) localStorage.setItem(KEYS.BOOKINGS, JSON.stringify(data.bookings));
    if (data.mealTickets) localStorage.setItem(KEYS.MEAL_TICKETS, JSON.stringify(data.mealTickets));
    if (data.resultsCertificates) localStorage.setItem(KEYS.RESULTS_CERTIFICATES, JSON.stringify(data.resultsCertificates));
    if (data.dpoLogs) localStorage.setItem(KEYS.DPO_LOGS, JSON.stringify(data.dpoLogs));
    if (data.checkIns) localStorage.setItem(KEYS.CHECKINS, JSON.stringify(data.checkIns));
    return true;
  } catch (e) {
    console.error("Failed to import JSON data", e);
    return false;
  }
}
