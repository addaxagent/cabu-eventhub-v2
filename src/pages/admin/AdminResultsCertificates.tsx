import React, { useState, useEffect } from "react";
import {
  Award,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  Search,
  Filter,
} from "lucide-react";
import {
  getResultsCertificates,
  saveResultsCertificates,
  getEvents,
  getAttendees,
  getRegistrations,
  initializeStorage,
} from "../../lib/storage";
import { ResultCertificate, Event, Attendee, Registration } from "../../types";

export const AdminResultsCertificates: React.FC = () => {
  const [records, setRecords] = useState<ResultCertificate[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);

  // Filter
  const [selectedEventId, setSelectedEventId] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ResultCertificate | null>(null);

  // Form
  const [formAttendeeId, setFormAttendeeId] = useState("");
  const [formEventId, setFormEventId] = useState("");
  const [assessmentName, setAssessmentName] = useState("Expository Preaching Practicum");
  const [moduleName, setModuleName] = useState("Pastors Track");
  const [score, setScore] = useState<number | "">(88);
  const [grade, setGrade] = useState("Pass with Merit");
  const [resultStatus, setResultStatus] = useState<ResultCertificate["resultStatus"]>("passed");
  const [certificateEligibility, setCertificateEligibility] = useState<ResultCertificate["certificateEligibility"]>("eligible");
  const [certificateStatus, setCertificateStatus] = useState<ResultCertificate["certificateStatus"]>("issued");
  const [certificateNumber, setCertificateNumber] = useState("CABU-EQUIP26-CERT-0102");
  const [adminComments, setAdminComments] = useState("Completed all module lectures and practicum requirement.");

  useEffect(() => {
    initializeStorage();
    loadData();
  }, []);

  const loadData = () => {
    setRecords(getResultsCertificates());
    const evts = getEvents();
    setEvents(evts);
    const atts = getAttendees();
    setAttendees(atts);
    const regs = getRegistrations();
    setRegistrations(regs);

    if (atts.length > 0 && formAttendeeId === "") {
      setFormAttendeeId(atts[0].id);
    }
    if (evts.length > 0 && formEventId === "") {
      setFormEventId(evts[0].id);
    }
  };

  const handleSaveRecord = (e: React.FormEvent) => {
    e.preventDefault();
    const allRecords = getResultsCertificates();

    const matchedReg = registrations.find(
      (r) => r.attendeeId === formAttendeeId && r.eventId === formEventId
    );

    const newRecord: ResultCertificate = {
      id: editingRecord ? editingRecord.id : `rc-${Date.now()}`,
      attendeeId: formAttendeeId,
      eventId: formEventId,
      registrationId: matchedReg?.id || "reg-manual",
      trackId: matchedReg?.trackId || "track-manual",
      assessmentName: assessmentName.trim(),
      moduleName: moduleName.trim(),
      score: score !== "" ? Number(score) : undefined,
      grade: grade.trim() || undefined,
      resultStatus,
      certificateEligibility,
      certificateStatus,
      certificateNumber: certificateNumber.trim() || undefined,
      certificateIssuedDate: new Date().toISOString().slice(0, 10),
      adminComments: adminComments.trim() || undefined,
      recordedBy: "admin@cabuniversity.com",
      recordedAt: new Date().toISOString(),
      createdAt: editingRecord ? editingRecord.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (editingRecord) {
      const idx = allRecords.findIndex((r) => r.id === editingRecord.id);
      if (idx !== -1) allRecords[idx] = newRecord;
    } else {
      allRecords.push(newRecord);
    }

    saveResultsCertificates(allRecords);
    setShowModal(false);
    setEditingRecord(null);
    loadData();
  };

  const handleDeleteRecord = (id: string) => {
    if (confirm("Are you sure you want to delete this result/certificate record?")) {
      const allRecords = getResultsCertificates().filter((r) => r.id !== id);
      saveResultsCertificates(allRecords);
      loadData();
    }
  };

  const filteredRecords = records.filter((rec) => {
    if (selectedEventId !== "ALL" && rec.eventId !== selectedEventId) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const att = attendees.find((a) => a.id === rec.attendeeId);
      const matchName = att?.fullName.toLowerCase().includes(q);
      const matchModule = rec.moduleName.toLowerCase().includes(q);
      const matchCert = rec.certificateNumber?.toLowerCase().includes(q);
      if (!matchName && !matchModule && !matchCert) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#111827]">
            Results & Certificates
          </h1>
          <p className="text-xs text-[#64748B] mt-1">
            Record module completion assessments, grade evaluations, and official certificate issuance numbers.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingRecord(null);
            setShowModal(true);
          }}
          className="px-5 py-2.5 bg-[#0B6B3A] hover:bg-[#064E2A] text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Record Result / Certificate
        </button>
      </div>

      {/* Filter bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-center gap-3 text-xs">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label className="font-bold text-gray-700">Event Filter:</label>
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 bg-[#F8FAF9]"
          >
            <option value="ALL">All Events</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>{e.code}</option>
            ))}
          </select>
        </div>

        <div className="w-full sm:w-auto flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search attendee name, module, certificate number..."
            className="w-full px-3.5 py-2 rounded-xl border border-gray-200 bg-[#F8FAF9]"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-[#F8FAF9] text-gray-600 uppercase font-bold">
                <th className="p-3">Attendee</th>
                <th className="p-3">Assessment & Module</th>
                <th className="p-3">Score / Grade</th>
                <th className="p-3">Result Status</th>
                <th className="p-3">Certificate Number</th>
                <th className="p-3">Cert Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRecords.map((rec) => {
                const att = attendees.find((a) => a.id === rec.attendeeId);
                return (
                  <tr key={rec.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="p-3 font-bold text-[#111827]">
                      {att?.fullName || "Attendee"}
                    </td>
                    <td className="p-3">
                      <span className="font-bold block">{rec.assessmentName}</span>
                      <span className="text-[10px] text-gray-500">{rec.moduleName}</span>
                    </td>
                    <td className="p-3 font-mono font-bold">
                      {rec.score !== undefined ? `${rec.score}%` : "N/A"} ({rec.grade || "N/A"})
                    </td>
                    <td className="p-3 font-extrabold uppercase text-[#0B6B3A]">
                      {rec.resultStatus}
                    </td>
                    <td className="p-3 font-mono font-bold text-[#F58220]">
                      {rec.certificateNumber || "Eligible"}
                    </td>
                    <td className="p-3">
                      <span className="bg-green-100 text-[#0B6B3A] font-extrabold px-2 py-0.5 rounded text-[10px]">
                        {rec.certificateStatus.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3 text-right space-x-1">
                      <button
                        onClick={() => handleDeleteRecord(rec.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                        title="Delete record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 space-y-6 shadow-2xl">
            <h2 className="text-xl font-black text-[#111827]">Record Results & Certificate</h2>

            <form onSubmit={handleSaveRecord} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Attendee</label>
                  <select
                    value={formAttendeeId}
                    onChange={(e) => setFormAttendeeId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm"
                  >
                    {attendees.map((a) => (
                      <option key={a.id} value={a.id}>{a.fullName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Event</label>
                  <select
                    value={formEventId}
                    onChange={(e) => setFormEventId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm"
                  >
                    {events.map((e) => (
                      <option key={e.id} value={e.id}>{e.code}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Assessment Name</label>
                <input
                  type="text"
                  required
                  value={assessmentName}
                  onChange={(e) => setAssessmentName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Module Name</label>
                <input
                  type="text"
                  required
                  value={moduleName}
                  onChange={(e) => setModuleName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Score %</label>
                  <input
                    type="number"
                    value={score}
                    onChange={(e) => setScore(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Grade</label>
                  <input
                    type="text"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Result Status</label>
                  <select
                    value={resultStatus}
                    onChange={(e) => setResultStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm"
                  >
                    <option value="passed">Passed</option>
                    <option value="failed">Failed</option>
                    <option value="completed">Completed</option>
                    <option value="attended">Attended</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Certificate Number</label>
                  <input
                    type="text"
                    value={certificateNumber}
                    onChange={(e) => setCertificateNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Admin Comments</label>
                <textarea
                  rows={2}
                  value={adminComments}
                  onChange={(e) => setAdminComments(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-xl font-bold text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#0B6B3A] text-white font-bold rounded-xl"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
