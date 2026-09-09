import React from "react";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";

// Guest Pages
import { HomePage } from "./pages/HomePage";
import { EventDetailsPage } from "./pages/EventDetailsPage";
import { EventRegisterPage } from "./pages/EventRegisterPage";
import { DpoReturnPage } from "./pages/DpoReturnPage";
import { DpoCancelPage } from "./pages/DpoCancelPage";
import { GuestDashboardPage } from "./pages/GuestDashboardPage";
import { CheckStatusPage } from "./pages/CheckStatusPage";
import { ReturningGuestPage } from "./pages/ReturningGuestPage";

// Admin Pages
import { AdminLoginPage } from "./pages/AdminLoginPage";
import { AdminResetPasswordPage } from "./pages/AdminResetPasswordPage";
import { AdminLayout } from "./components/AdminLayout";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { AdminEvents } from "./pages/admin/AdminEvents";
import { AdminRegistrations } from "./pages/admin/AdminRegistrations";
import { AdminPayments } from "./pages/admin/AdminPayments";
import { AdminAccommodation } from "./pages/admin/AdminAccommodation";
import { AdminResultsPage } from "./pages/admin/AdminResultsPage";
import { AdminResultsCertificates } from "./pages/admin/AdminResultsCertificates";
import { AdminCheckIn } from "./pages/admin/AdminCheckIn";
import { AdminReports } from "./pages/admin/AdminReports";
import { AdminDpoLogs } from "./pages/admin/AdminDpoLogs";
import { AdminDpoTestPage } from "./pages/admin/AdminDpoTestPage";
import { AdminSmsDiagnostics } from "./pages/admin/AdminSmsDiagnostics";
import { AdminEmailDiagnostics } from "./pages/admin/AdminEmailDiagnostics";
import { AdminSettings } from "./pages/admin/AdminSettings";

// Public Guest Layout Component
const GuestLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAF9] font-sans antialiased text-[#111827]">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Guest Public & Portal Routes */}
        <Route element={<GuestLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/event/:slug" element={<EventDetailsPage />} />
          <Route path="/events/:slug" element={<EventDetailsPage />} />
          <Route path="/event/:slug/register" element={<EventRegisterPage />} />
          <Route path="/events/:slug/register" element={<EventRegisterPage />} />
          <Route path="/events" element={<HomePage />} />
          <Route path="/payment/dpo/return" element={<DpoReturnPage />} />
          <Route path="/payment/dpo/cancel" element={<DpoCancelPage />} />
          <Route path="/guest/dashboard" element={<GuestDashboardPage />} />
          <Route path="/registration/status" element={<CheckStatusPage />} />
          <Route path="/returning-guest" element={<ReturningGuestPage />} />
        </Route>

        {/* Admin Login & Password Recovery Routes */}
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin/reset-password" element={<AdminResetPasswordPage />} />

        {/* Admin Protected Dashboard Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="events" element={<AdminEvents />} />
          <Route path="registrations" element={<AdminRegistrations />} />
          <Route path="payments" element={<AdminPayments />} />
          <Route path="accommodation" element={<AdminAccommodation />} />
          <Route path="results" element={<AdminResultsPage />} />
          <Route path="results-certificates" element={<AdminResultsCertificates />} />
          <Route path="checkin" element={<AdminCheckIn />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="dpo-logs" element={<AdminDpoLogs />} />
          <Route path="dpo-test" element={<AdminDpoTestPage />} />
          <Route path="sms-diagnostics" element={<AdminSmsDiagnostics />} />
          <Route path="email-diagnostics" element={<AdminEmailDiagnostics />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
