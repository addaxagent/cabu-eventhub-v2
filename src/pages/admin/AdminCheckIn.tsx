import React, { useState, useEffect } from "react";
import { CheckSquare, Search, CheckCircle2, User, BedDouble, Utensils } from "lucide-react";
import {
  getRegistrations,
  getAttendees,
  getEvents,
  getCheckIns,
  saveCheckIns,
  getAccommodationBookings,
  getMealTickets,
  initializeStorage,
} from "../../lib/storage";
import { Registration, Attendee, Event, CheckIn, AccommodationBooking, MealTicket } from "../../types";

export const AdminCheckIn: React.FC = () => {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [attendeesMap, setAttendeesMap] = useState<Record<string, Attendee>>({});
  const [eventsMap, setEventsMap] = useState<Record<string, Event>>({});
  const [bookingsMap, setBookingsMap] = useState<Record<string, AccommodationBooking>>({});
  const [mealTicketsMap, setMealTicketsMap] = useState<Record<string, MealTicket>>({});
  const [checkInsMap, setCheckInsMap] = useState<Record<string, CheckIn>>({});

  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    initializeStorage();
    loadData();
  }, []);

  const loadData = () => {
    const regs = getRegistrations();
    setRegistrations(regs);

    const atts = getAttendees().reduce((acc, a) => ({ ...acc, [a.id]: a }), {});
    setAttendeesMap(atts);

    const evts = getEvents().reduce((acc, e) => ({ ...acc, [e.id]: e }), {});
    setEventsMap(evts);

    const bks = getAccommodationBookings().reduce((acc, b) => ({ ...acc, [b.registrationId]: b }), {});
    setBookingsMap(bks);

    const mts = getMealTickets().reduce((acc, m) => ({ ...acc, [m.registrationId]: m }), {});
    setMealTicketsMap(mts);

    const chks = getCheckIns().reduce((acc, c) => ({ ...acc, [c.registrationId]: c }), {});
    setCheckInsMap(chks);
  };

  const toggleCheckIn = (reg: Registration) => {
    const allCheckIns = getCheckIns();
    const existingIdx = allCheckIns.findIndex((c) => c.registrationId === reg.id);

    if (existingIdx !== -1) {
      allCheckIns[existingIdx].checkedIn = !allCheckIns[existingIdx].checkedIn;
      allCheckIns[existingIdx].checkedInAt = allCheckIns[existingIdx].checkedIn
        ? new Date().toISOString()
        : undefined;
      allCheckIns[existingIdx].checkedInBy = "admin@cabuniversity.com";
    } else {
      allCheckIns.push({
        id: `chk-${Date.now()}`,
        registrationId: reg.id,
        attendeeId: reg.attendeeId,
        eventId: reg.eventId,
        checkedIn: true,
        checkedInAt: new Date().toISOString(),
        checkedInBy: "admin@cabuniversity.com",
        materialsCollected: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    saveCheckIns(allCheckIns);
    loadData();
  };

  const filteredRegistrations = registrations.filter((reg) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const att = attendeesMap[reg.attendeeId];
      const matchRef = reg.registrationReference.toLowerCase().includes(q);
      const matchName = att?.fullName.toLowerCase().includes(q);
      const matchNrc = att?.nrcNumber.toLowerCase().includes(q);
      if (!matchRef && !matchName && !matchNrc) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-[#111827]">
          On-Campus Check-In Desk
        </h1>
        <p className="text-xs text-[#64748B] mt-1">
          Issue attendee badges, verify dormitory bedspace keys, confirm meal pass entitlements, and record arrival timestamps.
        </p>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-3 text-xs">
        <Search className="w-4 h-4 text-[#0B6B3A]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search attendee name, NRC, or registration reference for instant check-in..."
          className="w-full bg-transparent focus:outline-none text-sm"
        />
      </div>

      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-[#F8FAF9] text-gray-600 uppercase font-bold">
                <th className="p-3">Reference</th>
                <th className="p-3">Attendee Name</th>
                <th className="p-3">Event Code</th>
                <th className="p-3">Payment</th>
                <th className="p-3">Bedspace</th>
                <th className="p-3">Meals Pass</th>
                <th className="p-3">Check-In Status</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRegistrations.map((reg) => {
                const att = attendeesMap[reg.attendeeId];
                const evt = eventsMap[reg.eventId];
                const bk = bookingsMap[reg.id];
                const chk = checkInsMap[reg.id];
                const isCheckedIn = chk?.checkedIn;

                return (
                  <tr key={reg.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="p-3 font-mono font-bold text-[#0B6B3A]">
                      {reg.registrationReference}
                    </td>
                    <td className="p-3 font-bold text-[#111827]">
                      {att?.fullName || "N/A"}
                    </td>
                    <td className="p-3 font-bold">{evt?.code || "EVENT"}</td>
                    <td className="p-3">
                      <span className="bg-green-100 text-[#0B6B3A] font-extrabold px-2 py-0.5 rounded text-[10px]">
                        {reg.paymentStatus}
                      </span>
                    </td>
                    <td className="p-3">
                      {bk ? (
                        <span className="font-bold text-[#0B6B3A] text-[11px]">
                          Room {bk.roomNumber} (#{bk.bedspaceNumber})
                        </span>
                      ) : (
                        <span className="text-gray-400">None</span>
                      )}
                    </td>
                    <td className="p-3 font-bold text-gray-700">
                      {reg.mealTicketRequested ? "Included" : "None"}
                    </td>
                    <td className="p-3">
                      <span
                        className={`font-black px-2.5 py-1 rounded text-[10px] uppercase ${
                          isCheckedIn ? "bg-green-100 text-[#0B6B3A]" : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {isCheckedIn ? "CHECKED IN" : "PENDING"}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => toggleCheckIn(reg)}
                        className={`px-3 py-1 rounded font-bold text-[11px] ${
                          isCheckedIn
                            ? "bg-gray-200 text-gray-800 hover:bg-gray-300"
                            : "bg-[#0B6B3A] text-white hover:bg-[#064E2A]"
                        }`}
                      >
                        {isCheckedIn ? "Undo Check-In" : "Check In Attendee"}
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
