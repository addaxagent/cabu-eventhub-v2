import React, { useState, useEffect } from "react";
import {
  Calendar,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Archive,
  Layers,
  BedDouble,
} from "lucide-react";
import {
  getEvents,
  saveEvents,
  getTracks,
  saveTracks,
  getRooms,
  saveRooms,
  initializeStorage,
} from "../../lib/storage";
import { Event, Track, Room } from "../../types";

export const AdminEvents: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // New Event Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [code, setCode] = useState("");
  const [theme, setTheme] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("2026-10-10");
  const [endDate, setEndDate] = useState("2026-10-13");
  const [venue, setVenue] = useState("Central Africa Baptist University, Kitwe");

  useEffect(() => {
    initializeStorage();
    loadAllData();
  }, []);

  const loadAllData = () => {
    const loadedEvts = getEvents();
    setEvents(loadedEvts);
    setTracks(getTracks());
    setRooms(getRooms());
    if (loadedEvts.length > 0 && !selectedEventId) {
      setSelectedEventId(loadedEvts[0].id);
    }
  };

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase() || "EVENT";
    const cleanSlug = slug.trim().toLowerCase() || cleanCode.toLowerCase();

    const newEvt: Event = {
      id: `evt-${Date.now()}`,
      name: name.trim(),
      slug: cleanSlug,
      code: cleanCode,
      theme: theme.trim(),
      description: description.trim(),
      startDate,
      endDate,
      venue,
      registrationOpenDate: new Date().toISOString().slice(0, 10),
      registrationCloseDate: endDate,
      status: "published",
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [...events, newEvt];
    saveEvents(updated);

    // Add default tracks for new event
    const newTracks: Track[] = [
      { id: `tr-${Date.now()}-1`, eventId: newEvt.id, name: "General Leadership Track", description: "Leadership and ministry training.", isActive: true, sortOrder: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: `tr-${Date.now()}-2`, eventId: newEvt.id, name: "Specialized Workshop Track", description: "Practical hands-on workshops.", isActive: true, sortOrder: 2, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ];
    saveTracks([...getTracks(), ...newTracks]);

    // Add default rooms for new event
    const newRooms: Room[] = [
      { id: `rm-${Date.now()}-m1`, eventId: newEvt.id, blockName: "Block A", roomNumber: "A1", genderRestriction: "Male", capacity: 8, currentOccupancy: 0, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: `rm-${Date.now()}-f1`, eventId: newEvt.id, blockName: "Block B", roomNumber: "B1", genderRestriction: "Female", capacity: 8, currentOccupancy: 0, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ];
    saveRooms([...getRooms(), ...newRooms]);

    setShowAddModal(false);
    loadAllData();
  };

  const toggleStatus = (eventId: string, newStatus: Event["status"]) => {
    const updated = events.map((e) => (e.id === eventId ? { ...e, status: newStatus } : e));
    saveEvents(updated);
    setEvents(updated);
  };

  const deleteEvent = (eventId: string) => {
    if (confirm("Are you sure you want to delete this event in demo mode?")) {
      const updated = events.filter((e) => e.id !== eventId);
      saveEvents(updated);
      setEvents(updated);
    }
  };

  const selectedEvent = events.find((e) => e.id === selectedEventId);
  const selectedTracks = tracks.filter((t) => t.eventId === selectedEventId);
  const selectedRooms = rooms.filter((r) => r.eventId === selectedEventId);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#111827]">
            Event & Conference Management
          </h1>
          <p className="text-xs text-[#64748B] mt-1">
            Configure published events, tracks, venue details, and campus dormitory rooms.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-5 py-2.5 bg-[#0B6B3A] hover:bg-[#064E2A] text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create New Event
        </button>
      </div>

      {/* Events List Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Event List Column */}
        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">
            All Events ({events.length})
          </h2>

          <div className="space-y-3">
            {events.map((evt) => (
              <div
                key={evt.id}
                onClick={() => setSelectedEventId(evt.id)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  selectedEventId === evt.id
                    ? "border-[#0B6B3A] bg-[#0B6B3A]/5 ring-2 ring-[#0B6B3A]"
                    : "border-gray-200 bg-[#F8FAF9] hover:border-gray-300"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-extrabold text-xs text-[#0B6B3A] uppercase">
                    {evt.code}
                  </span>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                      evt.status === "published"
                        ? "bg-green-100 text-[#0B6B3A]"
                        : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    {evt.status}
                  </span>
                </div>

                <h3 className="font-black text-sm text-[#111827] mt-1">{evt.name}</h3>
                <p className="text-xs text-gray-500 mt-0.5 truncate">{evt.theme}</p>
                <p className="text-[11px] text-gray-400 mt-1">{evt.startDate} to {evt.endDate}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Event Details & Configuration Column */}
        {selectedEvent && (
          <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-gray-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-4 gap-4">
              <div>
                <span className="text-xs font-bold text-[#0B6B3A] uppercase">
                  Selected Event Details
                </span>
                <h2 className="text-2xl font-black text-[#111827]">{selectedEvent.name}</h2>
                <p className="text-xs text-[#F58220] font-bold mt-0.5">Theme: {selectedEvent.theme}</p>
              </div>

              <div className="flex items-center gap-2">
                {selectedEvent.status !== "published" && (
                  <button
                    onClick={() => toggleStatus(selectedEvent.id, "published")}
                    className="px-3 py-1.5 bg-green-100 text-[#0B6B3A] text-xs font-bold rounded-lg"
                  >
                    Publish
                  </button>
                )}
                {selectedEvent.status === "published" && (
                  <button
                    onClick={() => toggleStatus(selectedEvent.id, "closed")}
                    className="px-3 py-1.5 bg-amber-100 text-amber-800 text-xs font-bold rounded-lg"
                  >
                    Close Registration
                  </button>
                )}
                <button
                  onClick={() => deleteEvent(selectedEvent.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                  title="Delete Event"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Event Description */}
            <div className="text-xs text-gray-600 space-y-1">
              <span className="font-bold text-gray-800 uppercase block">Description</span>
              <p>{selectedEvent.description}</p>
              <p className="pt-2 text-gray-500">
                Venue: <strong>{selectedEvent.venue}</strong> • Dates: <strong>{selectedEvent.startDate}</strong> to <strong>{selectedEvent.endDate}</strong>
              </p>
            </div>

            {/* DPO Price Override Settings */}
            <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="font-extrabold text-xs text-amber-950 uppercase tracking-wider">
                  DPO Sandbox Pricing & Override Settings
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  selectedEvent.priceOverrideEnabled ? "bg-amber-200 text-amber-900" : "bg-gray-200 text-gray-700"
                }`}>
                  {selectedEvent.priceOverrideEnabled ? "PRICE OVERRIDE ACTIVE (ZMW 1.00)" : "NORMAL PRICING ACTIVE (ZMW 350)"}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Price Override Status</label>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = events.map((e) =>
                        e.id === selectedEvent.id
                          ? { ...e, priceOverrideEnabled: !e.priceOverrideEnabled, isTestEvent: !e.priceOverrideEnabled }
                          : e
                      );
                      saveEvents(updated);
                      setEvents(updated);
                    }}
                    className={`w-full py-2 px-3 rounded-xl font-bold text-xs cursor-pointer transition-colors ${
                      selectedEvent.priceOverrideEnabled
                        ? "bg-amber-600 text-white hover:bg-amber-700"
                        : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                    }`}
                  >
                    {selectedEvent.priceOverrideEnabled ? "Disable Price Override" : "Enable ZMW 1.00 Override"}
                  </button>
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Final Payable Amount (ZMW)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={selectedEvent.priceOverrideAmount ?? 1.00}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      const updated = events.map((evt) =>
                        evt.id === selectedEvent.id ? { ...evt, priceOverrideAmount: val } : evt
                      );
                      saveEvents(updated);
                      setEvents(updated);
                    }}
                    className="w-full px-3 py-1.5 rounded-xl border border-amber-300 bg-white font-mono font-bold text-xs focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Override Reason</label>
                  <input
                    type="text"
                    value={selectedEvent.priceOverrideReason ?? "DPO sandbox payment testing"}
                    onChange={(e) => {
                      const val = e.target.value;
                      const updated = events.map((evt) =>
                        evt.id === selectedEvent.id ? { ...evt, priceOverrideReason: val } : evt
                      );
                      saveEvents(updated);
                      setEvents(updated);
                    }}
                    className="w-full px-3 py-1.5 rounded-xl border border-amber-300 bg-white text-xs focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Configured Tracks */}
            <div className="space-y-3 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#111827] flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-[#0B6B3A]" />
                  Configured Tracks ({selectedTracks.length})
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedTracks.map((t) => (
                  <div key={t.id} className="p-3 bg-[#F8FAF9] rounded-xl border border-gray-200 text-xs">
                    <span className="font-bold text-[#111827] block">{t.name}</span>
                    <span className="text-gray-500 block text-[11px] mt-0.5">{t.description}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Configured Rooms for Selected Event */}
            <div className="space-y-3 pt-4 border-t border-gray-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#111827] flex items-center gap-1.5">
                <BedDouble className="w-4 h-4 text-[#F58220]" />
                Event Dormitory Allocation Rooms ({selectedRooms.length})
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {selectedRooms.map((r) => (
                  <div key={r.id} className="p-3 bg-[#F8FAF9] rounded-xl border border-gray-200 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-[#111827]">{r.blockName}, Room {r.roomNumber}</span>
                      <span className="block text-[11px] text-gray-500">Gender: {r.genderRestriction}</span>
                    </div>
                    <span className="font-bold text-[#0B6B3A] bg-green-100 px-2 py-0.5 rounded">
                      Occupancy: {r.currentOccupancy} / {r.capacity}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal to Add New Event */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 space-y-6 shadow-2xl">
            <h2 className="text-xl font-black text-[#111827]">Create New Event</h2>

            <form onSubmit={handleCreateEvent} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Event Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Pastors Seminar 2026"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-[#0B6B3A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Event Code</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. SEMINAR26"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">URL Slug</label>
                  <input
                    type="text"
                    required
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="pastors-seminar-2026"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Theme</label>
                <input
                  type="text"
                  required
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  placeholder="e.g. Faithful Shepherd Leadership"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Conference overview..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
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
                  Save & Publish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
