import React, { useState, useEffect, useMemo } from "react";
import {
  Award,
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  FileSpreadsheet,
  Globe,
  EyeOff,
  History,
  Check,
  X,
  ChevronRight,
  ShieldAlert,
  Calendar,
  Layers,
  Sparkles,
  Info,
} from "lucide-react";
import {
  getEventResults,
  saveEventResults,
  saveOrUpdateEventResult,
  togglePublishEventResult,
  deleteEventResult,
  getEvents,
  getTracks,
  getAttendees,
  getRegistrations,
  getResultAuditLogs,
  formatSafeDate,
  isAdminLoggedIn,
} from "../../lib/storage";
import { maskNrc } from "../../lib/nrc";
import { Event, Track, Attendee, Registration, EventResult, ResultStatus, ResultAuditLog } from "../../types";

export const AdminResultsPage: React.FC = () => {
  const [results, setResults] = useState<EventResult[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [auditLogs, setAuditLogs] = useState<ResultAuditLog[]>([]);

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEventId, setSelectedEventId] = useState<string>("ALL");
  const [selectedTrackId, setSelectedTrackId] = useState<string>("ALL");
  const [publishedFilter, setPublishedFilter] = useState<string>("ALL"); // ALL, PUBLISHED, DRAFT
  const [statusFilter, setStatusFilter] = useState<string>("ALL"); // ALL, PASS, FAIL, COMPLETED, INCOMPLETE, PENDING

  // Modals & Panels
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [viewingResult, setViewingResult] = useState<EventResult | null>(null);
  const [editingResult, setEditingResult] = useState<EventResult | null>(null);

  // Form State for Add / Edit
  const [formData, setFormData] = useState<{
    id?: string;
    eventId: string;
    registrationId: string;
    attendeeId: string;
    trackId: string;
    score: string;
    maxScore: string;
    grade: string;
    status: ResultStatus;
    remarks: string;
    published: boolean;
  }>({
    eventId: "",
    registrationId: "",
    attendeeId: "",
    trackId: "",
    score: "",
    maxScore: "100",
    grade: "",
    status: "PASS",
    remarks: "",
    published: false,
  });

  // Bulk Entry Form State
  const [bulkEventId, setBulkEventId] = useState<string>("");
  const [bulkTrackId, setBulkTrackId] = useState<string>("ALL");
  const [bulkRows, setBulkRows] = useState<
    Array<{
      attendeeId: string;
      attendeeName: string;
      nrc: string;
      registrationId: string;
      registrationReference: string;
      trackId?: string;
      trackName: string;
      resultId?: string;
      score: string;
      maxScore: string;
      grade: string;
      status: ResultStatus;
      remarks: string;
      published: boolean;
    }>
  >([]);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  const showToast = (text: string, type: "success" | "error" | "info" = "success") => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Reload data
  const loadData = () => {
    setResults(getEventResults());
    setEvents(getEvents());
    setTracks(getTracks());
    setAttendees(getAttendees());
    setRegistrations(getRegistrations());
    setAuditLogs(getResultAuditLogs());
  };

  useEffect(() => {
    loadData();
  }, []);

  // Quick lookup maps
  const eventMap = useMemo(() => {
    const map = new Map<string, Event>();
    events.forEach((e) => map.set(e.id, e));
    return map;
  }, [events]);

  const trackMap = useMemo(() => {
    const map = new Map<string, Track>();
    tracks.forEach((t) => map.set(t.id, t));
    return map;
  }, [tracks]);

  const attendeeMap = useMemo(() => {
    const map = new Map<string, Attendee>();
    attendees.forEach((a) => map.set(a.id, a));
    return map;
  }, [attendees]);

  const registrationMap = useMemo(() => {
    const map = new Map<string, Registration>();
    registrations.forEach((r) => map.set(r.id, r));
    return map;
  }, [registrations]);

  // Filtered tracks for Event Filter
  const availableTracksForFilter = useMemo(() => {
    if (selectedEventId === "ALL") return tracks;
    return tracks.filter((t) => t.eventId === selectedEventId);
  }, [selectedEventId, tracks]);

  // Filtered results list
  const filteredResults = useMemo(() => {
    return results.filter((res) => {
      const att = attendeeMap.get(res.attendeeId);
      const reg = registrationMap.get(res.registrationId);
      const ev = eventMap.get(res.eventId);
      const tr = res.trackId ? trackMap.get(res.trackId) : null;

      // Event Filter
      if (selectedEventId !== "ALL" && res.eventId !== selectedEventId) return false;

      // Track Filter
      if (selectedTrackId !== "ALL" && res.trackId !== selectedTrackId) return false;

      // Published Filter
      if (publishedFilter === "PUBLISHED" && !res.published) return false;
      if (publishedFilter === "DRAFT" && res.published) return false;

      // Status Filter
      if (statusFilter !== "ALL" && res.status !== statusFilter) return false;

      // Search Query (Attendee Name, Registration Ref, NRC, Event Name)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = att?.fullName?.toLowerCase().includes(q);
        const refMatch = reg?.registrationReference?.toLowerCase().includes(q);
        const nrcMatch = att?.nrcNumber?.toLowerCase().includes(q) || att?.normalizedNrcNumber?.includes(q);
        const eventMatch = ev?.name?.toLowerCase().includes(q) || ev?.code?.toLowerCase().includes(q);
        const trackMatch = tr?.name?.toLowerCase().includes(q);

        if (!nameMatch && !refMatch && !nrcMatch && !eventMatch && !trackMatch) {
          return false;
        }
      }

      return true;
    });
  }, [results, selectedEventId, selectedTrackId, publishedFilter, statusFilter, searchQuery, attendeeMap, registrationMap, eventMap, trackMap]);

  // Statistics Summary
  const stats = useMemo(() => {
    const total = results.length;
    const published = results.filter((r) => r.published).length;
    const drafts = total - published;
    const passed = results.filter((r) => r.status === "PASS" || r.status === "COMPLETED").length;
    const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
    return { total, published, drafts, passed, passRate };
  }, [results]);

  // Handle Open Add Modal
  const handleOpenAddModal = () => {
    const defaultEvent = events[0]?.id || "";
    setFormData({
      eventId: defaultEvent,
      registrationId: "",
      attendeeId: "",
      trackId: "",
      score: "",
      maxScore: "100",
      grade: "",
      status: "PASS",
      remarks: "",
      published: false,
    });
    setEditingResult(null);
    setIsAddModalOpen(true);
  };

  // Handle Open Edit Modal
  const handleOpenEditModal = (res: EventResult) => {
    setFormData({
      id: res.id,
      eventId: res.eventId,
      registrationId: res.registrationId,
      attendeeId: res.attendeeId,
      trackId: res.trackId || "",
      score: res.score !== undefined ? String(res.score) : "",
      maxScore: res.maxScore !== undefined ? String(res.maxScore) : "100",
      grade: res.grade || "",
      status: res.status,
      remarks: res.remarks || "",
      published: res.published,
    });
    setEditingResult(res);
    setIsAddModalOpen(true);
  };

  // Attendees available for selected event in Add/Edit modal
  const attendeesForSelectedEvent = useMemo(() => {
    if (!formData.eventId) return [];
    const eventRegs = registrations.filter((r) => r.eventId === formData.eventId);
    return eventRegs.map((reg) => {
      const att = attendeeMap.get(reg.attendeeId);
      const tr = reg.trackId ? trackMap.get(reg.trackId) : null;
      return {
        registrationId: reg.id,
        registrationReference: reg.registrationReference,
        attendeeId: reg.attendeeId,
        attendeeName: att?.fullName || "Unknown Attendee",
        nrc: att?.nrcNumber || "",
        trackId: reg.trackId,
        trackName: tr?.name || "General Track",
      };
    });
  }, [formData.eventId, registrations, attendeeMap, trackMap]);

  // When event changes in modal, auto-update registration and attendee selections
  const handleEventChangeInModal = (newEventId: string) => {
    const eventRegs = registrations.filter((r) => r.eventId === newEventId);
    const firstReg = eventRegs[0];
    setFormData((prev) => ({
      ...prev,
      eventId: newEventId,
      registrationId: firstReg?.id || "",
      attendeeId: firstReg?.attendeeId || "",
      trackId: firstReg?.trackId || "",
    }));
  };

  // When registration/attendee changes in modal
  const handleRegistrationChangeInModal = (regId: string) => {
    const reg = registrations.find((r) => r.id === regId);
    if (reg) {
      setFormData((prev) => ({
        ...prev,
        registrationId: reg.id,
        attendeeId: reg.attendeeId,
        trackId: reg.trackId || prev.trackId,
      }));
    }
  };

  // Save Single Result
  const handleSaveResult = (publishDirectly?: boolean) => {
    if (!formData.eventId || !formData.attendeeId || !formData.registrationId) {
      showToast("Please select an event and registered attendee.", "error");
      return;
    }

    const scoreNum = formData.score.trim() !== "" ? parseFloat(formData.score) : undefined;
    const maxScoreNum = formData.maxScore.trim() !== "" ? parseFloat(formData.maxScore) : 100;
    let percentageNum: number | undefined;

    if (scoreNum !== undefined && maxScoreNum && maxScoreNum > 0) {
      percentageNum = Math.round((scoreNum / maxScoreNum) * 100 * 10) / 10;
    }

    const shouldPublish = publishDirectly !== undefined ? publishDirectly : formData.published;

    const resultPayload: EventResult = {
      id: formData.id || `res-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      eventId: formData.eventId,
      registrationId: formData.registrationId,
      attendeeId: formData.attendeeId,
      trackId: formData.trackId || undefined,
      score: scoreNum,
      maxScore: maxScoreNum,
      percentage: percentageNum,
      grade: formData.grade.trim() || undefined,
      status: formData.status,
      remarks: formData.remarks.trim() || undefined,
      published: shouldPublish,
      createdAt: editingResult?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveOrUpdateEventResult(resultPayload, "itmanger@cabuniversity.com");
    loadData();
    setIsAddModalOpen(false);
    showToast(
      shouldPublish
        ? `Result for ${attendeeMap.get(formData.attendeeId)?.fullName || "Attendee"} published to Guest Dashboard!`
        : `Result saved as draft (unpublished).`
    );
  };

  // Toggle Publish / Unpublish 1-click
  const handleTogglePublish = (res: EventResult) => {
    const newStatus = !res.published;
    const updated = togglePublishEventResult(res.id, newStatus, "itmanger@cabuniversity.com");
    if (updated) {
      loadData();
      const att = attendeeMap.get(res.attendeeId);
      showToast(
        newStatus
          ? `Result for ${att?.fullName || "Attendee"} published live!`
          : `Result for ${att?.fullName || "Attendee"} unpublished (returned to draft).`,
        newStatus ? "success" : "info"
      );
    }
  };

  // Delete Result
  const handleDeleteResult = (res: EventResult) => {
    const att = attendeeMap.get(res.attendeeId);
    if (window.confirm(`Are you sure you want to permanently delete the evaluation record for ${att?.fullName || "this attendee"}?`)) {
      deleteEventResult(res.id, "itmanger@cabuniversity.com");
      loadData();
      showToast(`Result record deleted.`, "info");
    }
  };

  // Prepare Bulk Entry
  const handleOpenBulkModal = () => {
    const defaultEv = events[0]?.id || "";
    setBulkEventId(defaultEv);
    setBulkTrackId("ALL");
    prepareBulkRows(defaultEv, "ALL");
    setIsBulkModalOpen(true);
  };

  const prepareBulkRows = (evId: string, trId: string) => {
    if (!evId) {
      setBulkRows([]);
      return;
    }

    const currentResults = getEventResults();
    const eventRegs = registrations.filter((r) => {
      if (r.eventId !== evId) return false;
      if (trId !== "ALL" && r.trackId !== trId) return false;
      return true;
    });

    const rows = eventRegs.map((reg) => {
      const att = attendeeMap.get(reg.attendeeId);
      const tr = reg.trackId ? trackMap.get(reg.trackId) : null;
      const existingRes = currentResults.find((r) => r.registrationId === reg.id);

      return {
        attendeeId: reg.attendeeId,
        attendeeName: att?.fullName || "Unknown Attendee",
        nrc: att?.nrcNumber || "",
        registrationId: reg.id,
        registrationReference: reg.registrationReference,
        trackId: reg.trackId,
        trackName: tr?.name || "General Track",
        resultId: existingRes?.id,
        score: existingRes?.score !== undefined ? String(existingRes.score) : "",
        maxScore: existingRes?.maxScore !== undefined ? String(existingRes.maxScore) : "100",
        grade: existingRes?.grade || "",
        status: existingRes?.status || "PASS",
        remarks: existingRes?.remarks || "",
        published: existingRes ? existingRes.published : false,
      };
    });

    setBulkRows(rows);
  };

  const handleBulkRowChange = (index: number, field: string, value: any) => {
    setBulkRows((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSaveBulkResults = (publishAll?: boolean) => {
    let savedCount = 0;
    bulkRows.forEach((row) => {
      const scoreNum = row.score.trim() !== "" ? parseFloat(row.score) : undefined;
      const maxScoreNum = row.maxScore.trim() !== "" ? parseFloat(row.maxScore) : 100;
      let percentageNum: number | undefined;

      if (scoreNum !== undefined && maxScoreNum && maxScoreNum > 0) {
        percentageNum = Math.round((scoreNum / maxScoreNum) * 100 * 10) / 10;
      }

      const isPub = publishAll !== undefined ? publishAll : row.published;

      const resultPayload: EventResult = {
        id: row.resultId || `res-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        eventId: bulkEventId,
        registrationId: row.registrationId,
        attendeeId: row.attendeeId,
        trackId: row.trackId,
        score: scoreNum,
        maxScore: maxScoreNum,
        percentage: percentageNum,
        grade: row.grade.trim() || undefined,
        status: row.status,
        remarks: row.remarks.trim() || undefined,
        published: isPub,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      saveOrUpdateEventResult(resultPayload, "itmanger@cabuniversity.com");
      savedCount++;
    });

    loadData();
    setIsBulkModalOpen(false);
    showToast(`Successfully saved ${savedCount} attendee evaluations!`);
  };

  // Helper for Status Badge styling
  const renderStatusBadge = (status: ResultStatus) => {
    switch (status) {
      case "PASS":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            PASS
          </span>
        );
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[#0B6B3A]/10 text-[#0B6B3A] border border-[#0B6B3A]/20">
            <Award className="w-3.5 h-3.5 text-[#0B6B3A]" />
            COMPLETED
          </span>
        );
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            PENDING
          </span>
        );
      case "INCOMPLETE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
            <AlertCircle className="w-3.5 h-3.5 text-slate-500" />
            INCOMPLETE
          </span>
        );
      case "FAIL":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            FAIL
          </span>
        );
      default:
        return <span className="px-2 py-0.5 text-xs text-slate-600 bg-slate-100 rounded">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium transition-all ${
            toastMessage.type === "success"
              ? "bg-emerald-900 text-white border-emerald-700"
              : toastMessage.type === "error"
              ? "bg-rose-900 text-white border-rose-700"
              : "bg-[#111827] text-white border-slate-700"
          }`}
        >
          {toastMessage.type === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
          {toastMessage.type === "error" && <ShieldAlert className="w-5 h-5 text-rose-400" />}
          {toastMessage.type === "info" && <Info className="w-5 h-5 text-blue-400" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-extrabold uppercase tracking-wider bg-[#0B6B3A]/10 text-[#0B6B3A]">
                Academic & Event Evaluations
              </span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs font-semibold text-slate-500">Central Africa Baptist University</span>
            </div>
            <h1 className="text-2xl font-extrabold text-[#111827] tracking-tight">Results Management</h1>
            <p className="text-sm text-slate-500 max-w-2xl">
              Record, evaluate, publish, and manage official results, grades, and event completion statuses for registered attendees.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsAuditModalOpen(true)}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer border border-slate-200"
            >
              <History className="w-4 h-4 text-slate-500" />
              <span>Audit History</span>
            </button>

            <button
              onClick={handleOpenBulkModal}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#F58220]" />
              <span>Bulk Results Entry</span>
            </button>

            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2.5 bg-[#0B6B3A] hover:bg-[#08522d] text-white rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Single Result</span>
            </button>
          </div>
        </div>

        {/* Metric Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="bg-[#F8FAF9] rounded-xl p-3.5 border border-slate-100">
            <span className="text-xs font-semibold text-slate-500 block">Total Evaluations</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-[#111827]">{stats.total}</span>
              <span className="text-xs text-slate-400">recorded</span>
            </div>
          </div>

          <div className="bg-emerald-50/60 rounded-xl p-3.5 border border-emerald-100">
            <span className="text-xs font-bold text-emerald-800 block">Published (Live to Guests)</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-emerald-700">{stats.published}</span>
              <span className="text-xs font-semibold text-emerald-600">visible</span>
            </div>
          </div>

          <div className="bg-amber-50/60 rounded-xl p-3.5 border border-amber-100">
            <span className="text-xs font-bold text-amber-800 block">Draft / Unpublished</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-amber-700">{stats.drafts}</span>
              <span className="text-xs font-semibold text-amber-600">internal only</span>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
            <span className="text-xs font-semibold text-slate-500 block">Passing / Completion Rate</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-[#0B6B3A]">{stats.passRate}%</span>
              <span className="text-xs text-slate-500">{stats.passed} passed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Keyword Search */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Attendee Name, Reg Ref, NRC..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B6B3A] focus:border-transparent transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Event Filter */}
          <div>
            <select
              value={selectedEventId}
              onChange={(e) => {
                setSelectedEventId(e.target.value);
                setSelectedTrackId("ALL");
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B6B3A] cursor-pointer"
            >
              <option value="ALL">All Events</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name} ({ev.code})
                </option>
              ))}
            </select>
          </div>

          {/* Track Filter */}
          <div>
            <select
              value={selectedTrackId}
              onChange={(e) => setSelectedTrackId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B6B3A] cursor-pointer"
            >
              <option value="ALL">All Tracks / Modules</option>
              {availableTracksForFilter.map((tr) => (
                <option key={tr.id} value={tr.id}>
                  {tr.name}
                </option>
              ))}
            </select>
          </div>

          {/* Published Filter */}
          <div>
            <select
              value={publishedFilter}
              onChange={(e) => setPublishedFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B6B3A] cursor-pointer"
            >
              <option value="ALL">All Visibility (Draft & Published)</option>
              <option value="PUBLISHED">Published Only (Live to Guests)</option>
              <option value="DRAFT">Drafts Only (Unpublished)</option>
            </select>
          </div>
        </div>

        {/* Secondary Filter Row: Status Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-slate-500 mr-1">Status:</span>
            {["ALL", "PASS", "COMPLETED", "PENDING", "INCOMPLETE", "FAIL"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  statusFilter === st
                    ? "bg-[#111827] text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="text-slate-500 font-medium">
            Showing <strong className="text-slate-900">{filteredResults.length}</strong> of {results.length} results
          </div>
        </div>
      </div>

      {/* Main Results Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {filteredResults.length === 0 ? (
          <div className="text-center py-16 px-4 space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Award className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-800">No evaluation records found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              No results match your current search and filter criteria. You can add a new result or adjust the filters above.
            </p>
            <div className="pt-2">
              <button
                onClick={handleOpenAddModal}
                className="px-4 py-2 bg-[#0B6B3A] text-white rounded-xl text-xs font-bold hover:bg-[#08522d] transition-all cursor-pointer"
              >
                Add Result Record
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Reg Reference</th>
                  <th className="py-3 px-4">Attendee & NRC</th>
                  <th className="py-3 px-4">Event</th>
                  <th className="py-3 px-4">Track / Module</th>
                  <th className="py-3 px-4">Score & Grade</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Publication</th>
                  <th className="py-3 px-4">Updated</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredResults.map((res) => {
                  const att = attendeeMap.get(res.attendeeId);
                  const reg = registrationMap.get(res.registrationId);
                  const ev = eventMap.get(res.eventId);
                  const tr = res.trackId ? trackMap.get(res.trackId) : null;

                  return (
                    <tr key={res.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Reg Ref */}
                      <td className="py-3.5 px-4 font-mono font-bold text-[#0B6B3A]">
                        {reg?.registrationReference || "N/A"}
                      </td>

                      {/* Attendee Name & NRC */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{att?.fullName || "Unknown Attendee"}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          NRC: {att?.nrcNumber ? maskNrc(att.nrcNumber) : "N/A"}
                        </div>
                      </td>

                      {/* Event */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 max-w-[180px] truncate" title={ev?.name}>
                          {ev?.name || "Unknown Event"}
                        </div>
                        {ev?.code && (
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            {ev.code}
                          </span>
                        )}
                      </td>

                      {/* Track */}
                      <td className="py-3.5 px-4 text-slate-600">
                        <span className="max-w-[160px] truncate block" title={tr?.name}>
                          {tr?.name || "General Track"}
                        </span>
                      </td>

                      {/* Score & Grade */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          {res.score !== undefined ? (
                            <span className="font-bold text-slate-900">
                              {res.score}
                              {res.maxScore ? ` / ${res.maxScore}` : ""}
                              {res.percentage !== undefined ? ` (${res.percentage}%)` : ""}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal">—</span>
                          )}

                          {res.grade && (
                            <span className="px-1.5 py-0.5 text-[11px] font-extrabold bg-[#F58220]/10 text-[#F58220] rounded border border-[#F58220]/20">
                              {res.grade}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">{renderStatusBadge(res.status)}</td>

                      {/* Publication Status */}
                      <td className="py-3.5 px-4">
                        {res.published ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                            Published
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                            Draft
                          </span>
                        )}
                      </td>

                      {/* Updated Date */}
                      <td className="py-3.5 px-4 text-[11px] text-slate-400 font-mono whitespace-nowrap">
                        {formatSafeDate(res.updatedAt)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* 1-Click Publish / Unpublish Toggle */}
                          <button
                            onClick={() => handleTogglePublish(res)}
                            title={res.published ? "Unpublish (Make Draft)" : "Publish to Guest Dashboard"}
                            className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                              res.published
                                ? "border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100"
                                : "border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                            }`}
                          >
                            {res.published ? <EyeOff className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
                            <span className="hidden xl:inline">{res.published ? "Unpublish" : "Publish"}</span>
                          </button>

                          {/* View Details */}
                          <button
                            onClick={() => setViewingResult(res)}
                            title="View Full Evaluation"
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => handleOpenEditModal(res)}
                            title="Edit Result"
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteResult(res)}
                            title="Delete Record"
                            className="p-1.5 rounded-lg border border-slate-200 text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 1. ADD / EDIT SINGLE RESULT MODAL */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#0B6B3A]/10 text-[#0B6B3A] flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900">
                    {editingResult ? "Edit Academic Result" : "Add Academic Result"}
                  </h3>
                  <p className="text-xs text-slate-500">Record scores and event evaluations linked to registered attendees.</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <div className="space-y-4 text-xs font-semibold">
              {/* Event Picker */}
              <div>
                <label className="block text-slate-700 mb-1 font-bold">1. Select Event *</label>
                <select
                  value={formData.eventId}
                  onChange={(e) => handleEventChangeInModal(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B6B3A]"
                >
                  <option value="">-- Choose Event --</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.name} ({ev.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Attendee Picker */}
              <div>
                <label className="block text-slate-700 mb-1 font-bold">2. Select Registered Attendee *</label>
                {attendeesForSelectedEvent.length === 0 ? (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                    No confirmed attendees registered for this event yet.
                  </div>
                ) : (
                  <select
                    value={formData.registrationId}
                    onChange={(e) => handleRegistrationChangeInModal(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B6B3A]"
                  >
                    <option value="">-- Choose Attendee --</option>
                    {attendeesForSelectedEvent.map((item) => (
                      <option key={item.registrationId} value={item.registrationId}>
                        {item.attendeeName} · {item.registrationReference} ({item.trackName})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Track / Course */}
              <div>
                <label className="block text-slate-700 mb-1 font-bold">3. Track / Module</label>
                <select
                  value={formData.trackId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, trackId: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B6B3A]"
                >
                  <option value="">General Track / Default</option>
                  {tracks
                    .filter((t) => t.eventId === formData.eventId)
                    .map((tr) => (
                      <option key={tr.id} value={tr.id}>
                        {tr.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Score & Maximum Score & Grade */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-bold">Score</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 82"
                    value={formData.score}
                    onChange={(e) => setFormData((prev) => ({ ...prev, score: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B6B3A]"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-1 font-bold">Max Score</label>
                  <input
                    type="number"
                    step="1"
                    placeholder="100"
                    value={formData.maxScore}
                    onChange={(e) => setFormData((prev) => ({ ...prev, maxScore: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B6B3A]"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-1 font-bold">Grade</label>
                  <input
                    type="text"
                    placeholder="e.g. A, Distinction"
                    value={formData.grade}
                    onChange={(e) => setFormData((prev) => ({ ...prev, grade: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B6B3A]"
                  />
                </div>
              </div>

              {/* Result Status */}
              <div>
                <label className="block text-slate-700 mb-1 font-bold">Result Status *</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value as ResultStatus }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B6B3A]"
                >
                  <option value="PASS">PASS — Satisfactory Course Completion</option>
                  <option value="COMPLETED">COMPLETED — Attended and Completed Requirements</option>
                  <option value="PENDING">PENDING — Evaluation in Progress</option>
                  <option value="INCOMPLETE">INCOMPLETE — Did Not Fulfill Requirements</option>
                  <option value="FAIL">FAIL — Did Not Pass Practicum/Evaluation</option>
                </select>
              </div>

              {/* Remarks / Comments */}
              <div>
                <label className="block text-slate-700 mb-1 font-bold">Remarks / Faculty Feedback</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Successfully completed the course with high marks in preaching practicum."
                  value={formData.remarks}
                  onChange={(e) => setFormData((prev) => ({ ...prev, remarks: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B6B3A]"
                />
              </div>

              {/* Publication Controls */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="block text-slate-900 font-bold">Visibility on Guest Dashboard</span>
                <div className="grid grid-cols-2 gap-2">
                  <label
                    onClick={() => setFormData((prev) => ({ ...prev, published: false }))}
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                      !formData.published
                        ? "bg-amber-50 border-amber-300 text-amber-900 font-bold"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="publishedOption"
                      checked={!formData.published}
                      onChange={() => {}}
                      className="mt-0.5 text-amber-600"
                    />
                    <div>
                      <span className="block text-xs">Save as Draft</span>
                      <span className="text-[10px] font-normal text-slate-500 block leading-tight">
                        Hidden from guest dashboard until approved.
                      </span>
                    </div>
                  </label>

                  <label
                    onClick={() => setFormData((prev) => ({ ...prev, published: true }))}
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                      formData.published
                        ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-bold"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="publishedOption"
                      checked={formData.published}
                      onChange={() => {}}
                      className="mt-0.5 text-emerald-600"
                    />
                    <div>
                      <span className="block text-xs">Publish Live</span>
                      <span className="text-[10px] font-normal text-slate-500 block leading-tight">
                        Instantly visible on the guest's dashboard.
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-all cursor-pointer"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveResult(false)}
                  className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs transition-all cursor-pointer"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveResult(true)}
                  className="px-4 py-2 bg-[#0B6B3A] hover:bg-[#08522d] text-white rounded-xl font-bold text-xs transition-all cursor-pointer shadow-xs"
                >
                  Publish Result
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. BULK RESULTS ENTRY MODAL */}
      {/* ========================================================================= */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-5xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-150">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-800 text-white flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5 text-[#F58220]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900">Bulk Academic Results Entry</h3>
                  <p className="text-xs text-slate-500">
                    Efficiently enter scores, grades, and completion statuses for all registered attendees in an event.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBulkModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Event & Track Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 shrink-0">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Event</label>
                <select
                  value={bulkEventId}
                  onChange={(e) => {
                    setBulkEventId(e.target.value);
                    prepareBulkRows(e.target.value, bulkTrackId);
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                >
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.name} ({ev.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Filter by Track / Module</label>
                <select
                  value={bulkTrackId}
                  onChange={(e) => {
                    setBulkTrackId(e.target.value);
                    prepareBulkRows(bulkEventId, e.target.value);
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                >
                  <option value="ALL">All Tracks</option>
                  {tracks
                    .filter((t) => t.eventId === bulkEventId)
                    .map((tr) => (
                      <option key={tr.id} value={tr.id}>
                        {tr.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Bulk Table */}
            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl">
              {bulkRows.length === 0 ? (
                <div className="text-center py-12 px-4 space-y-2">
                  <Award className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="font-bold text-sm text-slate-700">No registered attendees in this event</p>
                  <p className="text-xs text-slate-500">Attendees will appear here once registered for the event.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Attendee</th>
                      <th className="py-2.5 px-3">Track</th>
                      <th className="py-2.5 px-3 w-20">Score</th>
                      <th className="py-2.5 px-3 w-20">Max</th>
                      <th className="py-2.5 px-3 w-20">Grade</th>
                      <th className="py-2.5 px-3 w-32">Status</th>
                      <th className="py-2.5 px-3">Remarks</th>
                      <th className="py-2.5 px-3 text-center w-20">Publish</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {bulkRows.map((row, idx) => (
                      <tr key={row.registrationId} className="hover:bg-slate-50">
                        {/* Attendee */}
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900">{row.attendeeName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{row.registrationReference}</div>
                        </td>

                        {/* Track */}
                        <td className="py-2.5 px-3 text-slate-600 text-[11px]">{row.trackName}</td>

                        {/* Score */}
                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            step="0.1"
                            placeholder="Score"
                            value={row.score}
                            onChange={(e) => handleBulkRowChange(idx, "score", e.target.value)}
                            className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:border-[#0B6B3A] focus:outline-none"
                          />
                        </td>

                        {/* Max Score */}
                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            step="1"
                            value={row.maxScore}
                            onChange={(e) => handleBulkRowChange(idx, "maxScore", e.target.value)}
                            className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:border-[#0B6B3A] focus:outline-none"
                          />
                        </td>

                        {/* Grade */}
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            placeholder="Grade"
                            value={row.grade}
                            onChange={(e) => handleBulkRowChange(idx, "grade", e.target.value)}
                            className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:border-[#0B6B3A] focus:outline-none"
                          />
                        </td>

                        {/* Status */}
                        <td className="py-2.5 px-3">
                          <select
                            value={row.status}
                            onChange={(e) => handleBulkRowChange(idx, "status", e.target.value)}
                            className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:border-[#0B6B3A] focus:outline-none"
                          >
                            <option value="PASS">PASS</option>
                            <option value="COMPLETED">COMPLETED</option>
                            <option value="PENDING">PENDING</option>
                            <option value="INCOMPLETE">INCOMPLETE</option>
                            <option value="FAIL">FAIL</option>
                          </select>
                        </td>

                        {/* Remarks */}
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            placeholder="Optional notes"
                            value={row.remarks}
                            onChange={(e) => handleBulkRowChange(idx, "remarks", e.target.value)}
                            className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:border-[#0B6B3A] focus:outline-none"
                          />
                        </td>

                        {/* Publish */}
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={row.published}
                            onChange={(e) => handleBulkRowChange(idx, "published", e.target.checked)}
                            className="rounded text-[#0B6B3A] focus:ring-[#0B6B3A] w-4 h-4 cursor-pointer"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-all cursor-pointer"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveBulkResults(false)}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs transition-all cursor-pointer"
                >
                  Save All as Drafts
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveBulkResults(true)}
                  className="px-4 py-2 bg-[#0B6B3A] hover:bg-[#08522d] text-white rounded-xl font-bold text-xs transition-all cursor-pointer shadow-xs"
                >
                  Publish All to Guests
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. VIEW RESULT DETAILS MODAL */}
      {/* ========================================================================= */}
      {viewingResult && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in duration-150">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#0B6B3A]/10 text-[#0B6B3A] flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Academic Evaluation Record</h3>
                  <p className="text-xs text-slate-400 font-mono">{viewingResult.id}</p>
                </div>
              </div>
              <button
                onClick={() => setViewingResult(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Details */}
            {(() => {
              const att = attendeeMap.get(viewingResult.attendeeId);
              const reg = registrationMap.get(viewingResult.registrationId);
              const ev = eventMap.get(viewingResult.eventId);
              const tr = viewingResult.trackId ? trackMap.get(viewingResult.trackId) : null;

              return (
                <div className="space-y-4 text-xs">
                  {/* Attendee Card */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                      Attendee
                    </span>
                    <div className="font-extrabold text-sm text-slate-900">{att?.fullName}</div>
                    <div className="text-slate-500 font-mono">
                      NRC: {att?.nrcNumber ? maskNrc(att.nrcNumber) : "N/A"} · Reg Ref: {reg?.registrationReference}
                    </div>
                  </div>

                  {/* Event & Track */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 block">Event</span>
                      <span className="font-bold text-slate-900 block mt-0.5">{ev?.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{ev?.code}</span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 block">Track / Course</span>
                      <span className="font-bold text-slate-900 block mt-0.5">{tr?.name || "General Track"}</span>
                    </div>
                  </div>

                  {/* Evaluation Metrics */}
                  <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-emerald-900">Evaluation Result</span>
                      {renderStatusBadge(viewingResult.status)}
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-emerald-100 text-center">
                      <div>
                        <span className="text-[10px] text-emerald-800 font-semibold block">Score</span>
                        <span className="text-base font-extrabold text-slate-900 block">
                          {viewingResult.score !== undefined ? `${viewingResult.score} / ${viewingResult.maxScore || 100}` : "—"}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-emerald-800 font-semibold block">Percentage</span>
                        <span className="text-base font-extrabold text-[#0B6B3A] block">
                          {viewingResult.percentage !== undefined ? `${viewingResult.percentage}%` : "—"}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-emerald-800 font-semibold block">Grade</span>
                        <span className="text-base font-extrabold text-[#F58220] block">
                          {viewingResult.grade || "—"}
                        </span>
                      </div>
                    </div>

                    {viewingResult.remarks && (
                      <div className="pt-2 border-t border-emerald-100">
                        <span className="text-[10px] font-bold text-emerald-900 block">Faculty Remarks:</span>
                        <p className="text-slate-700 italic mt-0.5">{viewingResult.remarks}</p>
                      </div>
                    )}
                  </div>

                  {/* Metadata */}
                  <div className="space-y-1 text-[11px] text-slate-400 font-mono">
                    <div className="flex justify-between">
                      <span>Publication Status:</span>
                      <span className={`font-bold ${viewingResult.published ? "text-emerald-600" : "text-amber-600"}`}>
                        {viewingResult.published ? "Published (Live)" : "Draft (Hidden)"}
                      </span>
                    </div>
                    {viewingResult.publishedAt && (
                      <div className="flex justify-between">
                        <span>Published Date:</span>
                        <span>{formatSafeDate(viewingResult.publishedAt)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Last Updated:</span>
                      <span>{formatSafeDate(viewingResult.updatedAt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Recorded By:</span>
                      <span>{viewingResult.createdBy || "Administrator"}</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => setViewingResult(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer"
              >
                Close
              </button>

              <button
                onClick={() => {
                  const target = viewingResult;
                  setViewingResult(null);
                  handleOpenEditModal(target);
                }}
                className="px-4 py-2 bg-[#0B6B3A] text-white rounded-xl font-bold text-xs hover:bg-[#08522d] cursor-pointer"
              >
                Edit Result
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. AUDIT HISTORY MODAL */}
      {/* ========================================================================= */}
      {isAuditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] flex flex-col animate-in fade-in zoom-in duration-150">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                  <History className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Academic Results Audit Trail</h3>
                  <p className="text-xs text-slate-500">Immutable record of all evaluations entered, modified, or published.</p>
                </div>
              </div>
              <button
                onClick={() => setIsAuditModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Audit Log Table */}
            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl">
              {auditLogs.length === 0 ? (
                <div className="text-center py-10 px-4 text-xs text-slate-400">
                  No audit logs recorded yet. All results creation and publication actions will be tracked here.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="p-3 text-xs space-y-1 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <span
                          className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                            log.action === "RESULT_PUBLISHED"
                              ? "bg-emerald-100 text-emerald-800"
                              : log.action === "RESULT_UNPUBLISHED"
                              ? "bg-amber-100 text-amber-800"
                              : log.action === "RESULT_CREATED"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-slate-100 text-slate-800"
                          }`}
                        >
                          {log.action}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">{formatSafeDate(log.timestamp)}</span>
                      </div>
                      <p className="text-slate-800 font-medium">{log.details}</p>
                      <div className="text-[11px] text-slate-400 flex items-center gap-3">
                        <span>Admin: {log.adminEmail}</span>
                        {log.eventCode && <span>Event: {log.eventCode}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-100 flex justify-end shrink-0">
              <button
                onClick={() => setIsAuditModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer"
              >
                Close Audit History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
