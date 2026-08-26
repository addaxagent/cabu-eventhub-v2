import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  Users,
  CreditCard,
  BedDouble,
  Award,
  CheckCircle2,
  AlertCircle,
  Clock,
  TrendingUp,
  Building2,
  CheckSquare,
  FileText,
  Terminal,
} from "lucide-react";
import {
  getEvents,
  getRegistrations,
  getPayments,
  getRooms,
  getAccommodationBookings,
  getMealTickets,
  getResultsCertificates,
  getCheckIns,
  initializeStorage,
} from "../../lib/storage";

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalEvents: 0,
    activeEvents: 0,
    totalRegistrations: 0,
    confirmedRegistrations: 0,
    pendingPayments: 0,
    failedCancelledPayments: 0,
    totalBookings: 0,
    maleBedspacesAvailable: 0,
    femaleBedspacesAvailable: 0,
    mealTicketsRequested: 0,
    checkedInGuests: 0,
    resultsCertificatesCount: 0,
    expectedRevenue: 0,
    verifiedRevenue: 0,
  });

  useEffect(() => {
    initializeStorage();

    const events = getEvents();
    const registrations = getRegistrations();
    const payments = getPayments();
    const rooms = getRooms();
    const bookings = getAccommodationBookings();
    const mealTickets = getMealTickets();
    const certs = getResultsCertificates();
    const checkins = getCheckIns();

    const activeEvts = events.filter((e) => e.status === "published" && e.isActive);
    const confirmedRegs = registrations.filter((r) => r.registrationStatus === "confirmed");
    const pendingPays = registrations.filter((r) => r.paymentStatus.includes("pending") || r.paymentStatus === "dpo_redirected");
    const failedPays = registrations.filter((r) => r.paymentStatus === "payment_failed" || r.paymentStatus === "payment_cancelled");

    const maleRooms = rooms.filter((r) => r.genderRestriction === "Male" && r.isActive);
    const maleAvail = maleRooms.reduce((acc, r) => acc + Math.max(0, r.capacity - r.currentOccupancy), 0);

    const femaleRooms = rooms.filter((r) => r.genderRestriction === "Female" && r.isActive);
    const femaleAvail = femaleRooms.reduce((acc, r) => acc + Math.max(0, r.capacity - r.currentOccupancy), 0);

    const checkedIn = checkins.filter((c) => c.checkedIn).length;

    const expectedRev = registrations.reduce((acc, r) => acc + r.totalAmountDue, 0);
    const verifiedRev = registrations
      .filter((r) => r.paymentStatus === "verified" || r.paymentStatus === "payment_successful")
      .reduce((acc, r) => acc + r.totalAmountDue, 0);

    setStats({
      totalEvents: events.length,
      activeEvents: activeEvts.length,
      totalRegistrations: registrations.length,
      confirmedRegistrations: confirmedRegs.length,
      pendingPayments: pendingPays.length,
      failedCancelledPayments: failedPays.length,
      totalBookings: bookings.length,
      maleBedspacesAvailable: maleAvail,
      femaleBedspacesAvailable: femaleAvail,
      mealTicketsRequested: mealTickets.length,
      checkedInGuests: checkedIn,
      resultsCertificatesCount: certs.length,
      expectedRevenue: expectedRev,
      verifiedRevenue: verifiedRev,
    });
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-[#111827]">
          Administrator Dashboard
        </h1>
        <p className="text-xs text-[#64748B] mt-1">
          High-level overview of active events, DPO payments, dormitory bedspaces, and attendee stats.
        </p>
      </div>

      {/* Primary Financial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-[#0B6B3A]">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Verified Revenue</span>
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="text-2xl font-black text-[#0B6B3A]">
            ZMW {stats.verifiedRevenue.toFixed(2)}
          </div>
          <p className="text-[11px] text-gray-500">DPO authorized & verified payments</p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-[#F58220]">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Expected Revenue</span>
            <CreditCard className="w-5 h-5" />
          </div>
          <div className="text-2xl font-black text-[#F58220]">
            ZMW {stats.expectedRevenue.toFixed(2)}
          </div>
          <p className="text-[11px] text-gray-500">Total includes pending payments</p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-[#0B6B3A]">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Total Registrations</span>
            <Users className="w-5 h-5" />
          </div>
          <div className="text-2xl font-black text-[#111827]">
            {stats.totalRegistrations}
          </div>
          <p className="text-[11px] text-gray-500">{stats.confirmedRegistrations} confirmed</p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-blue-600">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Check-In Desk</span>
            <CheckSquare className="w-5 h-5 text-[#0B6B3A]" />
          </div>
          <div className="text-2xl font-black text-[#111827]">
            {stats.checkedInGuests}
          </div>
          <p className="text-[11px] text-gray-500">Attendees checked in on campus</p>
        </div>
      </div>

      {/* Secondary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 text-xs">
        <div className="p-4 bg-white rounded-xl border border-gray-200 flex items-center justify-between">
          <div>
            <span className="text-gray-500 block">Published Events</span>
            <span className="text-lg font-black text-[#111827]">{stats.activeEvents} / {stats.totalEvents}</span>
          </div>
          <Calendar className="w-5 h-5 text-[#0B6B3A]" />
        </div>

        <div className="p-4 bg-white rounded-xl border border-gray-200 flex items-center justify-between">
          <div>
            <span className="text-gray-500 block">Pending DPO Payments</span>
            <span className="text-lg font-black text-amber-600">{stats.pendingPayments}</span>
          </div>
          <Clock className="w-5 h-5 text-amber-500" />
        </div>

        <div className="p-4 bg-white rounded-xl border border-gray-200 flex items-center justify-between">
          <div>
            <span className="text-gray-500 block">Failed / Cancelled</span>
            <span className="text-lg font-black text-red-600">{stats.failedCancelledPayments}</span>
          </div>
          <AlertCircle className="w-5 h-5 text-red-500" />
        </div>

        <div className="p-4 bg-white rounded-xl border border-gray-200 flex items-center justify-between">
          <div>
            <span className="text-gray-500 block">Bedspaces Reserved</span>
            <span className="text-lg font-black text-[#111827]">{stats.totalBookings}</span>
          </div>
          <BedDouble className="w-5 h-5 text-[#F58220]" />
        </div>

        <div className="p-4 bg-white rounded-xl border border-gray-200 flex items-center justify-between">
          <div>
            <span className="text-gray-500 block">Male Bedspaces Available</span>
            <span className="text-lg font-black text-[#0B6B3A]">{stats.maleBedspacesAvailable}</span>
          </div>
          <BedDouble className="w-5 h-5 text-[#0B6B3A]" />
        </div>

        <div className="p-4 bg-white rounded-xl border border-gray-200 flex items-center justify-between">
          <div>
            <span className="text-gray-500 block">Female Bedspaces Available</span>
            <span className="text-lg font-black text-[#0B6B3A]">{stats.femaleBedspacesAvailable}</span>
          </div>
          <BedDouble className="w-5 h-5 text-[#0B6B3A]" />
        </div>

        <div className="p-4 bg-white rounded-xl border border-gray-200 flex items-center justify-between">
          <div>
            <span className="text-gray-500 block">Meal Tickets Requested</span>
            <span className="text-lg font-black text-[#111827]">{stats.mealTicketsRequested}</span>
          </div>
          <CheckCircle2 className="w-5 h-5 text-[#0B6B3A]" />
        </div>

        <div className="p-4 bg-white rounded-xl border border-gray-200 flex items-center justify-between">
          <div>
            <span className="text-gray-500 block">Results & Certificates</span>
            <span className="text-lg font-black text-[#F58220]">{stats.resultsCertificatesCount}</span>
          </div>
          <Award className="w-5 h-5 text-[#F58220]" />
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-3">
        <h3 className="font-bold text-sm text-[#111827]">Quick Admin Actions</h3>
        <div className="flex flex-wrap gap-2 text-xs font-bold">
          <Link to="/admin/registrations" className="px-4 py-2 bg-[#0B6B3A] text-white rounded-lg hover:bg-[#064E2A]">
            Manage Registrations
          </Link>
          <Link to="/admin/payments" className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800">
            Verify Payments
          </Link>
          <Link to="/admin/accommodation" className="px-4 py-2 border border-gray-300 text-gray-800 rounded-lg hover:bg-gray-50">
            Room Allocations
          </Link>
          <Link to="/admin/results-certificates" className="px-4 py-2 bg-[#F58220] text-black rounded-lg hover:bg-[#C65F12]">
            Results & Certificates
          </Link>
          <Link to="/admin/dpo-logs" className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
            Inspect DPO Logs
          </Link>
        </div>
      </div>
    </div>
  );
};
