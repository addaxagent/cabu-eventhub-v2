import React from "react";
import { Link } from "react-router-dom";
import { MapPin, Phone, Mail, ShieldCheck, Heart } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="bg-gradient-to-b from-[#212121] to-black text-slate-400 border-t border-neutral-800 pt-12 pb-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Col 1: About */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-3">
              <img
                src="https://imguser.free.nf/uploads/0_1786960332_6a82d9cc2e709_image-Photoroom5.png"
                alt="Central Africa Baptist University"
                className="h-10 w-auto object-contain shrink-0 brightness-110"
                referrerPolicy="no-referrer"
              />
              <span className="font-extrabold text-lg text-white tracking-tight">
                CABU EventHub
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Official event registration, accommodation booking, DPO payment gateway, and attendee history portal for Central Africa Baptist University.
            </p>
            <div className="flex items-center gap-2 text-xs text-indigo-400 font-medium bg-slate-800/60 p-2.5 rounded-xl border border-slate-800 w-fit">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Secured with DPO Direct Pay Online
            </div>
          </div>

          {/* Col 2: Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest">
              Navigation
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/" className="hover:text-indigo-400 transition-colors">
                  Active Events
                </Link>
              </li>
              <li>
                <Link to="/returning-guest" className="hover:text-indigo-400 transition-colors">
                  Returning Guest Lookup
                </Link>
              </li>
              <li>
                <Link to="/registration/status" className="hover:text-indigo-400 transition-colors">
                  Check Registration Status
                </Link>
              </li>
              <li>
                <Link to="/guest/dashboard" className="hover:text-indigo-400 transition-colors">
                  Guest Dashboard
                </Link>
              </li>
              <li>
                <Link to="/admin/login" className="hover:text-indigo-400 transition-colors">
                  Admin Login
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Key Events */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest">
              Featured Conferences
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/event/equip-2026" className="hover:text-indigo-400 transition-colors">
                  Equip Conference 2026
                </Link>
              </li>
              <li>
                <Link to="/event/cec-2027" className="hover:text-indigo-400 transition-colors">
                  Christian Educators Conference (CEC27)
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Contact */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest">
              University Campus
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <span>Plot 30, Kwacha Road, Kitwe, Zambia</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>+260 97 7123456 / +260 212 223344</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <span>events@cabuniversity.com</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} Central Africa Baptist University. All rights reserved.</p>
          <p className="flex items-center gap-1 text-slate-500">
            <span>CABU EventHub</span> • <span className="text-emerald-400 font-medium">DPO Gateway Integration Active</span>
          </p>
        </div>
      </div>
    </footer>
  );
};
