import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Filter,
  Users,
  CheckCircle2,
  XCircle,
  Eye,
  BedDouble,
  CreditCard,
  UserCheck,
} from "lucide-react";
import {
  getRegistrations,
  getAttendees,
  getEvents,
  getTracks,
  getAccommodationBookings,
  saveRegistrations,
  initializeStorage,
} from "../../lib/storage";
import { maskNrc } from "../../lib/nrc";
import { Registration, Attendee, Event, Track, AccommodationBooking } from "../../types";

export const AdminRegistrations: React.FC = () => {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [attendeesMap, setAttendeesMap] = useState<Record<string, Attendee>>({});
  const [eventsMap, setEventsMap] = useState<Record<string, Event>>({});
  const [tracksMap, setTracksMap] = useState<Record<string, Track>>({});
  const [bookingsMap, setBookingsMap] = useState<Record<string, AccommodationBooking>>({});

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterEventId, setFilterEventId] = useState("ALL");
  const [filterPaymentStatus, setFilterPaymentStatus] = useState("ALL");
  const [filterRegistrationStatus, setFilterRegistrationStatus] = useState("ALL");
  const [filterGender, setFilterGender] = useState("ALL");
  const [filterAccommodation, setFilterAccommodation] = useState("ALL");

  useEffect(() => {
    initializeStorage();
    loadAllData();
  }, []);

  const loadAllData = () => {
    const regs = getRegistrations();
    setRegistrations(regs);

    const atts = getAttendees().reduce((acc, a) => ({ ...acc, [a.id]: a }), {});
    setAttendeesMap(atts);

    const evts = getEvents().reduce((acc, e) => ({ ...acc, [e.id]: e }), {});
    setEventsMap(evts);

    const trks = getTracks().reduce((acc, t) => ({ ...acc, [t.id]: t }), {});
    setTracksMap(trks);

    const bks = getAccommodationBookings().reduce((acc, b) => ({ ...acc, [b.registrationId]: b }), {});
    setBookingsMap(bks);
  };

  const handleUpdateStatus = (regId: string, status: Registration["registrationStatus"]) => {
    const updated = registrations.map((r) => (r.id === regId ? { ...r, registrationStatus: status } : r));
    saveRegistrations(updated);
    setRegistrations(updated);
  };

  // Filter logic
  const filteredRegistrations = registrations.filter((reg) => {
    const att = attendeesMap[reg.attendeeId];
    const evt = eventsMap[reg.eventId];
    const trk = tracksMap[reg.trackId];

    if (filterEventId !== "ALL" && reg.eventId !== filterEventId) return false;
    if (filterPaymentStatus !== "ALL" && reg.paymentStatus !== filterPaymentStatus) return false;
    if (filterRegistrationStatus !== "ALL" && reg.registrationStatus !== filterRegistrationStatus) return false;
    if (filterGender !== "ALL" && att?.gender !== filterGender) return false;
    if (filterAccommodation === "YES" && !reg.accommodationRequested) return false;
    if (filterAccommodation === "NO" && reg.accommodationRequested) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchRef = reg.registrationReference.toLowerCase().includes(q);
      const matchName = att?.fullName.toLowerCase().includes(q);
      const matchEmail = att?.email.toLowerCase().includes(q);
      const matchPhone = att?.phone.toLowerCase().includes(q);
      const matchNrc = att?.nrcNumber.toLowerCase().includes(q);

      if (!matchRef && !matchName && !matchEmail && !matchPhone && !matchNrc) {
        return false;
      }
    }

    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#111827]">
            Registrations Directory
          </h1>
          <p className="text-xs text-[#64748B] mt-1">
            Search, filter, and manage attendee registrations, DPO authorization states, and bedspace assignments.
          </p>
        </div>

        <span className="text-xs font-bold bg-[#0B6B3A] text-white px-3 py-1.5 rounded-full self-start sm:self-auto">
          {filteredRegistrations.length} Matching Record(s)
        </span>
      </div>

      {/* Filter Control Panel */}
      <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4 text-xs">
        <div className="flex items-center gap-2 font-bold text-[#111827]">
          <Filter className="w-4 h-4 text-[#0B6B3A]" />
          Filter Registrations
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Search Query */}
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-bold text-gray-600 mb-1">Search Keyword</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Name, NRC, Phone, Email, Reference..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:border-[#0B6B3A]"
              />
            </div>
          </div>

          {/* Filter Event */}
          <div>
            <label className="block text-[11px] font-bold text-gray-600 mb-1">Event</label>
            <select
              value={filterEventId}
              onChange={(e) => setFilterEventId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white"
            >
              <option value="ALL">All Events</option>
              {Object.values(eventsMap).map((e: Event) => (
                <option key={e.id} value={e.id}>{e.code}</option>
              ))}
            </select>
          </div>

          {/* Filter Payment Status */}
          <div>
            <label className="block text-[11px] font-bold text-gray-600 mb-1">Payment Status</label>
            <select
              value={filterPaymentStatus}
              onChange={(e) => setFilterPaymentStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white"
            >
              <option value="ALL">All Payment States</option>
              <option value="verified">Verified / Paid</option>
              <option value="pending_dpo_payment">Pending DPO</option>
              <option value="payment_failed">Failed</option>
              <option value="payment_cancelled">Cancelled</option>
            </select>
          </div>

          {/* Filter Gender */}
          <div>
            <label className="block text-[11px] font-bold text-gray-600 mb-1">Gender</label>
            <select
              value={filterGender}
              onChange={(e) => setFilterGender(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white"
            >
              <option value="ALL">All Genders</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>

          {/* Filter Accommodation */}
          <div>
            <label className="block text-[11px] font-bold text-gray-600 mb-1">Bedspace</label>
            <select
              value={filterAccommodation}
              onChange={(e) => setFilterAccommodation(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white"
            >
              <option value="ALL">All Bedspaces</option>
              <option value="YES">Requested</option>
              <option value="NO">Not Requested</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-[#F8FAF9] text-gray-600 uppercase font-bold">
                <th className="p-3">Reference</th>
                <th className="p-3">Attendee</th>
                <th className="p-3">NRC (Masked)</th>
                <th className="p-3">Phone</th>
                <th className="p-3">Event / Track</th>
                <th className="p-3">Gender</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Payment</th>
                <th className="p-3">Status</th>
                <th className="p-3">Room / Bed</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRegistrations.map((reg) => {
                const att = attendeesMap[reg.attendeeId];
                const evt = eventsMap[reg.eventId];
                const trk = tracksMap[reg.trackId];
                const bk = bookingsMap[reg.id];

                return (
                  <tr key={reg.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="p-3 font-mono font-bold text-[#0B6B3A]">
                      {reg.registrationReference}
                    </td>
                    <td className="p-3 font-bold text-[#111827]">
                      {att?.fullName || "N/A"}
                    </td>
                    <td className="p-3 font-mono text-gray-600">
                      {att ? maskNrc(att.nrcNumber) : "N/A"}
                    </td>
                    <td className="p-3 font-mono text-gray-600">
                      {att?.phone || "N/A"}
                    </td>
                    <td className="p-3">
                      <span className="font-bold block">{evt?.code || "EVENT"}</span>
                      <span className="text-[10px] text-gray-500 truncate max-w-[120px] block">
                        {trk?.name || "Standard"}
                      </span>
                    </td>
                    <td className="p-3 font-semibold">{att?.gender || "N/A"}</td>
                    <td className="p-3 font-mono font-bold text-[#F58220]">
                      ZMW {reg.totalAmountDue.toFixed(2)}
                    </td>
                    <td className="p-3">
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                          reg.paymentStatus === "verified" || reg.paymentStatus === "payment_successful"
                            ? "bg-green-100 text-[#0B6B3A]"
                            : reg.paymentStatus.includes("pending")
                            ? "bg-amber-100 text-amber-800"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {reg.paymentStatus.replace("_", " ")}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-gray-700">
                      {reg.registrationStatus}
                    </td>
                    <td className="p-3">
                      {bk ? (
                        <span className="font-bold text-[#0B6B3A] bg-green-50 px-2 py-0.5 rounded border border-green-200">
                          R-{bk.roomNumber} (#{bk.bedspaceNumber})
                        </span>
                      ) : (
                        <span className="text-gray-400 font-normal">None</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/guest/dashboard?ref=${reg.registrationReference}`}
                          className="p-1.5 text-gray-600 hover:text-[#0B6B3A] hover:bg-gray-100 rounded-lg"
                          title="View Guest Dashboard"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        {reg.registrationStatus !== "confirmed" && (
                          <button
                            onClick={() => handleUpdateStatus(reg.id, "confirmed")}
                            className="px-2 py-1 bg-green-100 text-[#0B6B3A] font-bold rounded text-[10px]"
                          >
                            Confirm
                          </button>
                        )}
                      </div>
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
