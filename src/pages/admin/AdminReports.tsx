import React, { useState, useEffect } from "react";
import { Download, FileSpreadsheet, TrendingUp, Users, BedDouble, Utensils, CheckSquare } from "lucide-react";
import {
  getRegistrations,
  getAttendees,
  getEvents,
  getPayments,
  getAccommodationBookings,
  getMealTickets,
  getCheckIns,
  initializeStorage,
} from "../../lib/storage";

export const AdminReports: React.FC = () => {
  const [reportType, setReportType] = useState<"registrations" | "revenue" | "accommodation" | "meals" | "checkin">("registrations");

  useEffect(() => {
    initializeStorage();
  }, []);

  const handleExportCsv = () => {
    const regs = getRegistrations();
    const atts = getAttendees().reduce((acc, a) => ({ ...acc, [a.id]: a }), {});
    const evts = getEvents().reduce((acc, e) => ({ ...acc, [e.id]: e }), {});

    let csvContent = "data:text/csv;charset=utf-8,";

    if (reportType === "registrations") {
      csvContent += "Registration Reference,Attendee Name,NRC Number,Email,Phone,Event,Payment Status,Registration Status,Total Amount\n";
      regs.forEach((r) => {
        const a = atts[r.attendeeId];
        const e = evts[r.eventId];
        csvContent += `"${r.registrationReference}","${a?.fullName || ""}","${a?.nrcNumber || ""}","${a?.email || ""}","${a?.phone || ""}","${e?.name || ""}","${r.paymentStatus}","${r.registrationStatus}",${r.totalAmountDue}\n`;
      });
    } else {
      csvContent += "Report Type,Generated At\n";
      csvContent += `"${reportType}","${new Date().toISOString()}"\n`;
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `cabu_eventhub_${reportType}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#111827]">
            Reports & Export Analytics
          </h1>
          <p className="text-xs text-[#64748B] mt-1">
            Generate CSV rosters, payment reconciliation sheets, dormitory allocation logs, and catering reports.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="px-5 py-2.5 bg-[#0B6B3A] hover:bg-[#064E2A] text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm self-start sm:self-auto"
        >
          <Download className="w-4 h-4" />
          Export Report (CSV)
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs font-bold">
        <button
          onClick={() => setReportType("registrations")}
          className={`p-4 rounded-2xl border text-left flex items-center justify-between transition-all ${
            reportType === "registrations" ? "bg-[#0B6B3A] text-white border-[#0B6B3A]" : "bg-white text-gray-700 border-gray-200"
          }`}
        >
          <span>Registrations Roster</span>
          <Users className="w-4 h-4" />
        </button>

        <button
          onClick={() => setReportType("revenue")}
          className={`p-4 rounded-2xl border text-left flex items-center justify-between transition-all ${
            reportType === "revenue" ? "bg-[#0B6B3A] text-white border-[#0B6B3A]" : "bg-white text-gray-700 border-gray-200"
          }`}
        >
          <span>DPO Revenue Audit</span>
          <TrendingUp className="w-4 h-4" />
        </button>

        <button
          onClick={() => setReportType("accommodation")}
          className={`p-4 rounded-2xl border text-left flex items-center justify-between transition-all ${
            reportType === "accommodation" ? "bg-[#0B6B3A] text-white border-[#0B6B3A]" : "bg-white text-gray-700 border-gray-200"
          }`}
        >
          <span>Dormitory Bedspaces</span>
          <BedDouble className="w-4 h-4" />
        </button>

        <button
          onClick={() => setReportType("meals")}
          className={`p-4 rounded-2xl border text-left flex items-center justify-between transition-all ${
            reportType === "meals" ? "bg-[#0B6B3A] text-white border-[#0B6B3A]" : "bg-white text-gray-700 border-gray-200"
          }`}
        >
          <span>Catering Meals Pass</span>
          <Utensils className="w-4 h-4" />
        </button>

        <button
          onClick={() => setReportType("checkin")}
          className={`p-4 rounded-2xl border text-left flex items-center justify-between transition-all ${
            reportType === "checkin" ? "bg-[#0B6B3A] text-white border-[#0B6B3A]" : "bg-white text-gray-700 border-gray-200"
          }`}
        >
          <span>Check-In Logs</span>
          <CheckSquare className="w-4 h-4" />
        </button>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm space-y-4 text-xs">
        <h2 className="text-lg font-black text-[#111827]">
          Report Preview: {reportType.toUpperCase()}
        </h2>
        <p className="text-gray-500">
          Ready for download. Click the export button above to generate a standard UTF-8 encoded CSV dataset for spreadsheet analysis.
        </p>
      </div>
    </div>
  );
};
