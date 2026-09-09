import React, { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Calendar,
  Users,
  CreditCard,
  BedDouble,
  Award,
  CheckSquare,
  FileSpreadsheet,
  Terminal,
  Wrench,
  MessageSquare,
  Mail,
  Settings,
  LogOut,
  ShieldCheck,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import { isAdminLoggedIn, setAdminLoggedIn, initializeStorage } from "../lib/storage";

export const AdminLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    initializeStorage();
    if (!isAdminLoggedIn()) {
      navigate("/admin/login");
    }
  }, [navigate]);

  const handleSignOut = () => {
    setAdminLoggedIn(false);
    navigate("/admin/login");
  };

  const navItems = [
    { label: "Dashboard", path: "/admin", icon: LayoutDashboard },
    { label: "Events & Tracks", path: "/admin/events", icon: Calendar },
    { label: "Registrations", path: "/admin/registrations", icon: Users },
    { label: "DPO Payments", path: "/admin/payments", icon: CreditCard },
    { label: "Accommodation", path: "/admin/accommodation", icon: BedDouble },
    { label: "Results", path: "/admin/results", icon: Award },
    { label: "Certificates", path: "/admin/results-certificates", icon: ShieldCheck },
    { label: "Check-In Desk", path: "/admin/checkin", icon: CheckSquare },
    { label: "Reports & CSV", path: "/admin/reports", icon: FileSpreadsheet },
    { label: "Airtel SMS & OTP", path: "/admin/sms-diagnostics", icon: MessageSquare },
    { label: "Email & SMTP", path: "/admin/email-diagnostics", icon: Mail },
    { label: "DPO Audit Logs", path: "/admin/dpo-logs", icon: Terminal },
    { label: "DPO Test Utility", path: "/admin/dpo-test", icon: Wrench },
    { label: "Settings", path: "/admin/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row font-sans">
      {/* Mobile Header Bar */}
      <div className="md:hidden bg-white text-slate-900 p-4 flex items-center justify-between border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <img
            src="https://imguser.free.nf/uploads/0_1786960332_6a82d9cc2e709_image-Photoroom5.png"
            alt="CABU Logo"
            className="h-8 w-auto object-contain shrink-0"
            referrerPolicy="no-referrer"
          />
          <span className="font-extrabold text-sm tracking-tight text-[#111827]">CABU Admin Console</span>
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-slate-500 hover:text-slate-900 cursor-pointer"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`w-full md:w-64 bg-white text-slate-800 shrink-0 flex flex-col justify-between p-6 border-r border-slate-200/80 ${
          mobileMenuOpen ? "block" : "hidden md:flex"
        }`}
      >
        <div className="space-y-6">
          {/* Admin Header */}
          <div className="hidden md:flex items-center gap-3 border-b border-slate-100 pb-5">
            <img
              src="https://imguser.free.nf/uploads/0_1786960332_6a82d9cc2e709_image-Photoroom5.png"
              alt="CABU Logo"
              className="h-10 w-auto object-contain shrink-0"
              referrerPolicy="no-referrer"
            />
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#0B6B3A] block">
                CABU EventHub
              </span>
              <span className="font-extrabold text-base text-[#111827] block leading-tight">
                Admin Console
              </span>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="space-y-1 text-xs font-semibold">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.path === "/admin"
                  ? location.pathname === "/admin"
                  : location.pathname.startsWith(item.path);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
                    isActive
                      ? "bg-[#0B6B3A]/10 text-[#0B6B3A] font-bold shadow-2xs"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? "text-[#0B6B3A]" : "text-slate-400"}`} />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-[#0B6B3A]" />}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Pro / Security Card & Footer Sign Out */}
        <div className="pt-6 border-t border-slate-100 space-y-4">
          <div className="bg-[#111827] rounded-2xl p-4 text-white">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#F58220] mb-1">DPO Integration</p>
            <p className="text-xs font-medium text-slate-300 leading-snug">Production-grade payments & instant audit logs ready.</p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium px-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="truncate">itmanger@cabuniversity.com</span>
          </div>

          <button
            onClick={handleSignOut}
            className="w-full py-2.5 px-3.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-700 rounded-xl font-bold text-xs flex items-center justify-between transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <LogOut className="w-4 h-4 text-rose-500" />
              <span>Sign Out</span>
            </div>
          </button>
        </div>
      </aside>

      {/* Main Content View Container */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};
