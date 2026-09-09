import React, { useState, useEffect, useRef } from "react";
import { Link as RouterLink, useLocation as useRouterLocation, useNavigate as useRouterNavigate } from "react-router-dom";
import {
  Calendar,
  UserCheck,
  Search,
  Lock,
  LayoutDashboard,
  LogOut,
  BedDouble,
  CreditCard,
  Award,
  BarChart3,
  Terminal,
  Settings,
  Menu,
  X,
  Users,
  CheckCircle2,
  ChevronDown,
  Wrench,
  ShieldCheck,
} from "lucide-react";
import {
  getCurrentGuestSession,
  clearGuestSession,
  isAdminLoggedIn,
  setAdminLoggedIn,
} from "../lib/storage";

// --- Color Constants ---
// CABU Brand Palette:
// Black/Charcoal: #111827
// CABU Green: #0B6B3A
// CABU Orange: #F58220
// Light Background: #F8FAF9
// Border: #E5E7EB
// Muted Text: #64748B

export interface NavItemConfig {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}

// 1. Top System Status Bar Component
export const StatusBar: React.FC = () => {
  return (
    <div className="bg-[#F8FAF9] border-b border-[#E5E7EB] text-xs py-1.5 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0B6B3A] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0B6B3A]"></span>
          </span>
          <span className="font-semibold text-[#0B6B3A] text-[11px] sm:text-xs">
            DPO Sandbox Active
          </span>
        </div>
        <div className="text-[#64748B] text-[11px] sm:text-xs font-medium">
          Server-side payment routing enabled
        </div>
      </div>
    </div>
  );
};

// 2. NavItem Component for single link item
export const NavItem: React.FC<{
  item: NavItemConfig;
  isActive: boolean;
  onClick?: () => void;
}> = ({ item, isActive, onClick }) => {
  const Icon = item.icon;
  return (
    <RouterLink
      to={item.path}
      onClick={onClick}
      className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all relative ${
        isActive
          ? "text-[#0B6B3A] bg-[#0B6B3A]/10 border-b-2 border-[#0B6B3A]"
          : "text-[#64748B] hover:text-[#111827] hover:bg-[#E5E7EB]/40 border-b-2 border-transparent"
      }`}
    >
      <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#0B6B3A]" : "text-[#64748B]"}`} />
      <span>{item.label}</span>
    </RouterLink>
  );
};

// 3. UserMenu Component (Right Side)
export const UserMenu: React.FC<{
  adminActive: boolean;
  guestSessionPresent: boolean;
  onAdminLogout: () => void;
  onGuestLogout: () => void;
}> = ({ adminActive, guestSessionPresent, onAdminLogout, onGuestLogout }) => {
  return (
    <div className="flex items-center gap-3">
      {adminActive ? (
        <>
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-[#0B6B3A] bg-[#0B6B3A]/10 border border-[#0B6B3A]/20 px-2.5 py-1 rounded-md">
            <ShieldCheck className="w-3.5 h-3.5 text-[#0B6B3A]" />
            <span>Admin</span>
          </div>
          <button
            onClick={onAdminLogout}
            className="border border-[#E5E7EB] text-[#111827] hover:border-rose-300 hover:text-rose-600 hover:bg-rose-50 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Sign Out of Admin Console"
          >
            <LogOut className="w-3.5 h-3.5 text-[#64748B] group-hover:text-rose-600" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </>
      ) : guestSessionPresent ? (
        <button
          onClick={onGuestLogout}
          className="border border-[#E5E7EB] text-[#111827] hover:border-rose-300 hover:text-rose-600 hover:bg-rose-50 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          title="Sign Out of Guest Session"
        >
          <LogOut className="w-3.5 h-3.5 text-[#64748B] group-hover:text-rose-600" />
          <span>Sign Out</span>
        </button>
      ) : (
        <RouterLink
          to="/admin/login"
          className="border border-[#E5E7EB] text-[#64748B] hover:text-[#111827] hover:border-[#0B6B3A] hover:bg-[#F8FAF9] text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all"
        >
          <Lock className="w-3.5 h-3.5 text-[#64748B]" />
          <span className="hidden sm:inline">Admin Portal</span>
        </RouterLink>
      )}
    </div>
  );
};

// 4. Mobile Navigation Menu Drawer
export const MobileNav: React.FC<{
  isOpen: boolean;
  adminActive: boolean;
  guestSessionPresent: boolean;
  activePath: string;
  onClose: () => void;
  onAdminLogout: () => void;
  onGuestLogout: () => void;
  adminNavItems: NavItemConfig[];
  guestNavItems: NavItemConfig[];
}> = ({
  isOpen,
  adminActive,
  guestSessionPresent,
  activePath,
  onClose,
  onAdminLogout,
  onGuestLogout,
  adminNavItems,
  guestNavItems,
}) => {
  if (!isOpen) return null;

  const isActivePath = (path: string, exact?: boolean) => {
    if (exact) return activePath === path;
    return activePath === path || (path !== "/admin" && activePath.startsWith(path));
  };

  return (
    <div className="lg:hidden bg-white border-b border-[#E5E7EB] px-4 pt-3 pb-6 space-y-3 shadow-lg">
      {adminActive ? (
        <>
          <div className="flex items-center justify-between pb-2 border-b border-[#E5E7EB]">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0B6B3A]">
              Admin Navigation
            </span>
            <span className="text-[10px] font-semibold text-[#64748B] bg-[#F8FAF9] px-2 py-0.5 rounded border border-[#E5E7EB]">
              Administrator
            </span>
          </div>
          <div className="grid grid-cols-1 gap-1">
            {adminNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActivePath(item.path, item.exact);
              return (
                <RouterLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    active
                      ? "bg-[#0B6B3A]/10 text-[#0B6B3A] font-bold"
                      : "text-[#111827] hover:bg-[#F8FAF9]"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? "text-[#0B6B3A]" : "text-[#64748B]"}`} />
                  <span>{item.label}</span>
                </RouterLink>
              );
            })}
          </div>
          <div className="pt-3 border-t border-[#E5E7EB]">
            <button
              onClick={() => {
                onAdminLogout();
                onClose();
              }}
              className="w-full text-left flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </div>
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="space-y-1">
            {guestNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActivePath(item.path, item.exact);
              return (
                <RouterLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    active
                      ? "bg-[#0B6B3A]/10 text-[#0B6B3A] font-bold"
                      : "text-[#111827] hover:bg-[#F8FAF9]"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? "text-[#0B6B3A]" : "text-[#64748B]"}`} />
                  <span>{item.label}</span>
                </RouterLink>
              );
            })}
          </div>
          {guestSessionPresent ? (
            <div className="pt-3 border-t border-[#E5E7EB]">
              <button
                onClick={() => {
                  onGuestLogout();
                  onClose();
                }}
                className="w-full text-left flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </div>
              </button>
            </div>
          ) : (
            <div className="pt-2 border-t border-[#E5E7EB]">
              <RouterLink
                to="/admin/login"
                onClick={onClose}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-[#64748B] hover:text-[#0B6B3A]"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Admin Portal Login</span>
              </RouterLink>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// 5. Main Header Component
export const MainHeader: React.FC = () => {
  const location = useRouterLocation();
  const navigate = useRouterNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [guestSession, setGuestSession] = useState<{ attendeeId?: string; registrationId?: string }>(
    getCurrentGuestSession()
  );
  const [adminActive, setAdminActive] = useState<boolean>(isAdminLoggedIn());

  useEffect(() => {
    setGuestSession(getCurrentGuestSession());
    setAdminActive(isAdminLoggedIn());
    setMobileMenuOpen(false);
    setMoreDropdownOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setMoreDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAdminLogout = () => {
    setAdminLoggedIn(false);
    setAdminActive(false);
    navigate("/");
  };

  const handleGuestLogout = () => {
    clearGuestSession();
    setGuestSession({});
    navigate("/returning-guest");
  };

  const isGuestAuthenticated = Boolean(guestSession.registrationId || guestSession.attendeeId);

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return location.pathname === path;
    if (path === "/admin") return location.pathname === "/admin";
    return location.pathname === path || location.pathname.startsWith(path);
  };

  // Nav Configurations
  const adminPrimaryNav: NavItemConfig[] = [
    { label: "Dashboard", path: "/admin", icon: LayoutDashboard, exact: true },
    { label: "Events", path: "/admin/events", icon: Calendar },
    { label: "Registrations", path: "/admin/registrations", icon: Users },
    { label: "Payments", path: "/admin/payments", icon: CreditCard },
    { label: "Accommodation", path: "/admin/accommodation", icon: BedDouble },
    { label: "Check-In", path: "/admin/checkin", icon: CheckCircle2 },
    { label: "Reports", path: "/admin/reports", icon: BarChart3 },
  ];

  const adminMoreNav: NavItemConfig[] = [
    { label: "Results", path: "/admin/results", icon: Award },
    { label: "Certificates", path: "/admin/results-certificates", icon: ShieldCheck },
    { label: "DPO Logs", path: "/admin/dpo-logs", icon: Terminal },
    { label: "DPO Test Utility", path: "/admin/dpo-test", icon: Wrench },
    { label: "Settings", path: "/admin/settings", icon: Settings },
  ];

  const guestNavItems: NavItemConfig[] = isGuestAuthenticated
    ? [
        { label: "Active Events", path: "/", icon: Calendar, exact: true },
        { label: "My Dashboard", path: "/guest/dashboard", icon: LayoutDashboard },
      ]
    : [
        { label: "Active Events", path: "/", icon: Calendar, exact: true },
        { label: "Returning Guest", path: "/returning-guest", icon: UserCheck },
        { label: "Check Status", path: "/registration/status", icon: Search },
      ];

  const isMoreActive = adminMoreNav.some((item) => isActive(item.path));

  return (
    <div className="bg-white border-b border-[#E5E7EB]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[72px]">
          {/* Brand Area */}
          <RouterLink to="/" className="flex items-center gap-3 group">
            <img
              src="https://imguser.free.nf/uploads/0_1786960332_6a82d9cc2e709_image-Photoroom5.png"
              alt="Central Africa Baptist University"
              className="h-10 w-auto object-contain shrink-0"
              referrerPolicy="no-referrer"
            />
            <div className="flex flex-col">
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-[#111827] leading-tight group-hover:text-[#0B6B3A] transition-colors">
                CABU EventHub
              </span>
              <span className="text-[11px] text-[#64748B] font-medium hidden sm:block leading-tight">
                Central Africa Baptist University
              </span>
            </div>
          </RouterLink>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {adminActive ? (
              <>
                {adminPrimaryNav.map((item) => (
                  <NavItem
                    key={item.path}
                    item={item}
                    isActive={isActive(item.path, item.exact)}
                  />
                ))}

                {/* More Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setMoreDropdownOpen(!moreDropdownOpen)}
                    className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                      isMoreActive
                        ? "text-[#0B6B3A] bg-[#0B6B3A]/10 border-b-2 border-[#0B6B3A]"
                        : "text-[#64748B] hover:text-[#111827] hover:bg-[#E5E7EB]/40 border-b-2 border-transparent"
                    }`}
                  >
                    <span>More</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${moreDropdownOpen ? "rotate-180" : ""}`} />
                  </button>

                  {moreDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white border border-[#E5E7EB] rounded-xl shadow-lg py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="px-3 py-1 text-[10px] font-extrabold text-[#64748B] uppercase tracking-wider border-b border-[#E5E7EB] mb-1">
                        System Tools & Logs
                      </div>
                      {adminMoreNav.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.path);
                        return (
                          <RouterLink
                            key={item.path}
                            to={item.path}
                            onClick={() => setMoreDropdownOpen(false)}
                            className={`flex items-center gap-2.5 px-3 py-2 text-xs font-semibold transition-colors ${
                              active
                                ? "bg-[#0B6B3A]/10 text-[#0B6B3A] font-bold"
                                : "text-[#111827] hover:bg-[#F8FAF9]"
                            }`}
                          >
                            <Icon className={`w-3.5 h-3.5 ${active ? "text-[#0B6B3A]" : "text-[#64748B]"}`} />
                            <span>{item.label}</span>
                          </RouterLink>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : (
              // Guest Links (Public or Authenticated)
              guestNavItems.map((item) => (
                <NavItem
                  key={item.path}
                  item={item}
                  isActive={isActive(item.path, item.exact)}
                />
              ))
            )}
          </nav>

          {/* User Menu / Right Actions */}
          <div className="hidden lg:flex items-center">
            <UserMenu
              adminActive={adminActive}
              guestSessionPresent={isGuestAuthenticated}
              onAdminLogout={handleAdminLogout}
              onGuestLogout={handleGuestLogout}
            />
          </div>

          {/* Mobile Menu Button */}
          <div className="lg:hidden flex items-center gap-2">
            <UserMenu
              adminActive={adminActive}
              guestSessionPresent={isGuestAuthenticated}
              onAdminLogout={handleAdminLogout}
              onGuestLogout={handleGuestLogout}
            />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-[#F8FAF9] text-[#111827] hover:bg-[#E5E7EB] border border-[#E5E7EB] cursor-pointer"
              aria-label="Toggle Mobile Navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      <MobileNav
        isOpen={mobileMenuOpen}
        adminActive={adminActive}
        guestSessionPresent={isGuestAuthenticated}
        activePath={location.pathname}
        onClose={() => setMobileMenuOpen(false)}
        onAdminLogout={handleAdminLogout}
        onGuestLogout={handleGuestLogout}
        adminNavItems={[...adminPrimaryNav, ...adminMoreNav]}
        guestNavItems={guestNavItems}
      />
    </div>
  );
};

// Main Exported Header Wrapper
export const Header: React.FC = () => {
  return (
    <header className="sticky top-0 z-50 shadow-xs">
      <StatusBar />
      <MainHeader />
    </header>
  );
};

export default Header;
