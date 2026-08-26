import React, { useState, useEffect } from "react";
import {
  BedDouble,
  Building2,
  Plus,
  Users,
  XCircle,
  CheckCircle2,
} from "lucide-react";
import {
  getRooms,
  saveRooms,
  getEvents,
  getAccommodationBookings,
  saveAccommodationBookings,
  getAttendees,
  getRegistrations,
  initializeStorage,
} from "../../lib/storage";
import { Room, Event, AccommodationBooking, Attendee, Registration } from "../../types";

export const AdminAccommodation: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("ALL");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<AccommodationBooking[]>([]);
  const [attendeesMap, setAttendeesMap] = useState<Record<string, Attendee>>({});
  const [registrationsMap, setRegistrationsMap] = useState<Record<string, Registration>>({});

  // Add Room Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [targetEventId, setTargetEventId] = useState<string>("");
  const [blockName, setBlockName] = useState("Block A");
  const [roomNumber, setRoomNumber] = useState("A4");
  const [genderRestriction, setGenderRestriction] = useState<"Male" | "Female">("Male");
  const [capacity, setCapacity] = useState(8);

  useEffect(() => {
    initializeStorage();
    loadData();
  }, []);

  const loadData = () => {
    const loadedEvts = getEvents();
    setEvents(loadedEvts);

    if (loadedEvts.length > 0 && targetEventId === "") {
      setTargetEventId(loadedEvts[0].id);
    }

    setRooms(getRooms());
    setBookings(getAccommodationBookings());

    const atts = getAttendees().reduce((acc, a) => ({ ...acc, [a.id]: a }), {});
    setAttendeesMap(atts);

    const regs = getRegistrations().reduce((acc, r) => ({ ...acc, [r.id]: r }), {});
    setRegistrationsMap(regs);
  };

  const handleAddRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const newRoom: Room = {
      id: `rm-${Date.now()}`,
      eventId: targetEventId,
      blockName: blockName.trim(),
      roomNumber: roomNumber.trim(),
      genderRestriction,
      capacity: Number(capacity),
      currentOccupancy: 0,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [...rooms, newRoom];
    saveRooms(updated);
    setRooms(updated);
    setShowAddModal(false);
  };

  const handleCancelBooking = (bookingId: string) => {
    if (confirm("Are you sure you want to cancel this bedspace reservation?")) {
      const allBookings = getAccommodationBookings();
      const bk = allBookings.find((b) => b.id === bookingId);
      if (bk) {
        bk.bookingStatus = "cancelled";
        saveAccommodationBookings(allBookings);

        // Reduce room occupancy
        const allRooms = getRooms();
        const rm = allRooms.find((r) => r.id === bk.roomId);
        if (rm && rm.currentOccupancy > 0) {
          rm.currentOccupancy -= 1;
          saveRooms(allRooms);
        }
      }
      loadData();
    }
  };

  const filteredRooms = selectedEventId === "ALL" ? rooms : rooms.filter((r) => r.eventId === selectedEventId);
  const filteredBookings = selectedEventId === "ALL" ? bookings : bookings.filter((b) => b.eventId === selectedEventId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#111827]">
            Accommodation & Dormitory Management
          </h1>
          <p className="text-xs text-[#64748B] mt-1">
            Campus bedspace allocations are strictly gender-restricted and event-isolated.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-5 py-2.5 bg-[#0B6B3A] hover:bg-[#064E2A] text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Dormitory Room
        </button>
      </div>

      {/* Event Selector Filter */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-3 text-xs">
        <label className="font-bold text-[#111827] shrink-0">Filter Event Rooms:</label>
        <select
          value={selectedEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
          className="px-3 py-2 rounded-xl border border-gray-200 bg-[#F8FAF9] font-bold text-[#0B6B3A] focus:outline-none"
        >
          <option value="ALL">All Events Campus Rooms</option>
          {events.map((e) => (
            <option key={e.id} value={e.id}>{e.name} ({e.code})</option>
          ))}
        </select>
      </div>

      {/* Rooms Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRooms.map((room) => {
          const roomBookings = filteredBookings.filter(
            (b) => b.roomId === room.id && b.bookingStatus !== "cancelled"
          );
          const availableCount = room.capacity - room.currentOccupancy;

          return (
            <div
              key={room.id}
              className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <span className="text-[10px] font-extrabold uppercase bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                    {room.blockName}
                  </span>
                  <h3 className="text-xl font-black text-[#111827] mt-1">
                    Room {room.roomNumber}
                  </h3>
                </div>

                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase ${
                    room.genderRestriction === "Male"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-pink-100 text-pink-800"
                  }`}
                >
                  {room.genderRestriction} Only
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Bedspace Capacity:</span>
                <span className="font-mono font-bold text-[#111827]">{room.capacity} beds</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Occupancy State:</span>
                <span
                  className={`font-bold px-2 py-0.5 rounded ${
                    availableCount > 0 ? "bg-green-100 text-[#0B6B3A]" : "bg-red-100 text-red-800"
                  }`}
                >
                  {room.currentOccupancy} / {room.capacity} occupied ({availableCount} available)
                </span>
              </div>

              {/* Occupant List */}
              <div className="pt-2 border-t border-gray-100 space-y-2 text-xs">
                <span className="font-bold text-gray-500 uppercase text-[10px] block">
                  Assigned Guests ({roomBookings.length})
                </span>

                {roomBookings.length === 0 ? (
                  <p className="text-gray-400 italic text-[11px]">No guests currently assigned.</p>
                ) : (
                  <div className="space-y-1.5">
                    {roomBookings.map((bk) => {
                      const att = attendeesMap[bk.attendeeId];
                      return (
                        <div
                          key={bk.id}
                          className="p-2 rounded-lg bg-[#F8FAF9] border border-gray-100 flex items-center justify-between text-[11px]"
                        >
                          <div>
                            <span className="font-bold text-[#111827] block">{att?.fullName || "Guest"}</span>
                            <span className="text-gray-400">Bed #{bk.bedspaceNumber}</span>
                          </div>
                          <button
                            onClick={() => handleCancelBooking(bk.id)}
                            className="text-red-500 hover:text-red-700 font-semibold"
                            title="Release bedspace"
                          >
                            Cancel
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Room Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 space-y-6 shadow-2xl">
            <h2 className="text-xl font-black text-[#111827]">Add Campus Dormitory Room</h2>

            <form onSubmit={handleAddRoom} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Target Event</label>
                <select
                  value={targetEventId}
                  onChange={(e) => setTargetEventId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm"
                >
                  {events.map((e) => (
                    <option key={e.id} value={e.id}>{e.name} ({e.code})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Block Name</label>
                  <input
                    type="text"
                    required
                    value={blockName}
                    onChange={(e) => setBlockName(e.target.value)}
                    placeholder="Block A"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Room Number</label>
                  <input
                    type="text"
                    required
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    placeholder="A4"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Gender Restriction</label>
                  <select
                    value={genderRestriction}
                    onChange={(e) => setGenderRestriction(e.target.value as "Male" | "Female")}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Capacity (Beds)</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-xl font-bold text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#0B6B3A] text-white font-bold rounded-xl"
                >
                  Save Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
