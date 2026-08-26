import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  MapPin,
  ArrowRight,
  UserCheck,
  CreditCard,
  BedDouble,
  Award,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Users,
} from "lucide-react";
import { getEvents, getTracks, initializeStorage } from "../lib/storage";
import { Event } from "../types";

export const HomePage: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    initializeStorage();
    const loaded = getEvents().filter((e) => e.status === "published" && e.isActive);
    setEvents(loaded);
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-[#212121] to-black text-white py-16 sm:py-20 px-4 sm:px-6 lg:px-8 border-b border-neutral-800 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#0B6B3A_1px,transparent_1px)] [background-size:20px_20px]" />
        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0B6B3A]/20 border border-[#0B6B3A]/40 text-[#4ade80] text-xs font-bold uppercase tracking-widest">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#0B6B3A]" />
            Central Africa Baptist University
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight text-white">
            CABU <span className="text-[#F58220]">EventHub</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed">
            Register for CABU conferences, manage DPO payments, reserve accommodation, and access your event records in one place.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <a
              href="#active-events"
              className="w-full sm:w-auto px-7 py-3.5 bg-[#F58220] hover:bg-[#e07318] text-white font-bold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <Calendar className="w-4 h-4" />
              View Active Events
            </a>
            <Link
              to="/returning-guest"
              className="w-full sm:w-auto px-7 py-3.5 bg-transparent hover:bg-[#0B6B3A]/20 text-white font-bold text-sm rounded-xl border-2 border-[#0B6B3A] transition-all flex items-center justify-center gap-2"
            >
              <UserCheck className="w-4 h-4 text-[#4ade80]" />
              Returning Guest
            </Link>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
        {/* Active Events List */}
        <section id="active-events" className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-slate-200/80 pb-4 gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Upcoming Conferences & Events
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Select an event to view details, available tracks, on-campus accommodation options, and begin registration.
              </p>
            </div>
            <span className="text-xs font-extrabold text-[#0B6B3A] bg-[#0B6B3A]/10 border border-[#0B6B3A]/20 px-3.5 py-1.5 rounded-full self-start sm:self-auto">
              {events.length} Published Event{events.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {events.map((evt) => {
              const tracks = getTracks().filter((t) => t.eventId === evt.id && t.isActive);
              return (
                <div
                  key={evt.id}
                  className="bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300 transition-all overflow-hidden flex flex-col justify-between"
                >
                  <div className="p-6 sm:p-8 space-y-5">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="bg-[#0B6B3A] text-white text-xs font-extrabold px-3 py-1 rounded-xl uppercase tracking-wider shadow-2xs">
                          {evt.code}
                        </span>
                        {(evt.isTestEvent || evt.priceOverrideEnabled) && (
                          <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-black px-2.5 py-1 rounded-xl uppercase tracking-wider">
                            DPO Test Event
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-3 py-1 rounded-full flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Registration Open
                      </span>
                    </div>

                    <div>
                      <h3 className="text-2xl font-bold text-slate-900 leading-snug">
                        {evt.name}
                      </h3>
                      <p className="text-xs font-bold text-[#0B6B3A] mt-1 uppercase tracking-wide">
                        Theme: {evt.theme}
                      </p>
                    </div>

                    <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed">
                      {evt.description}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs font-medium text-slate-700">
                      <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <Calendar className="w-4 h-4 text-[#0B6B3A] shrink-0" />
                        <span>{evt.startDate} to {evt.endDate}</span>
                      </div>
                      <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <MapPin className="w-4 h-4 text-[#0B6B3A] shrink-0" />
                        <span className="truncate">{evt.venue}</span>
                      </div>
                    </div>

                    {/* Tracks Preview */}
                    {tracks.length > 0 && (
                      <div className="pt-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                          Available Tracks ({tracks.length}):
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {tracks.map((t) => (
                            <span
                              key={t.id}
                              className="text-xs font-semibold bg-slate-100 text-slate-700 px-3 py-1 rounded-lg"
                            >
                              {t.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Pricing Footer Action */}
                  <div className="bg-slate-50/80 border-t border-slate-100 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <span className="text-xs font-medium text-slate-500 block">Registration Fee</span>
                      {evt.priceOverrideEnabled && typeof evt.priceOverrideAmount === "number" ? (
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="text-2xl font-black text-[#F58220]">
                            ZMW {evt.priceOverrideAmount.toFixed(2)}
                          </span>
                          <span className="text-xs font-bold text-slate-400 line-through">
                            ZMW 350.00
                          </span>
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                            DPO Sandbox Test
                          </span>
                        </div>
                      ) : (
                        <span className="text-2xl font-black text-slate-900">
                          ZMW 350
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <Link
                        to={`/event/${evt.slug}`}
                        className="w-1/2 sm:w-auto px-4 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 text-center transition-colors shadow-2xs"
                      >
                        Details
                      </Link>
                      <Link
                        to={`/event/${evt.slug}/register`}
                        className="w-1/2 sm:w-auto px-5 py-2.5 text-xs font-extrabold text-white bg-[#0B6B3A] hover:bg-[#08522d] rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
                      >
                        Register
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Feature Overview Section */}
        <section className="bg-white rounded-3xl border border-slate-200/80 p-8 sm:p-12 shadow-xs space-y-10">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Complete Event & Accommodation Portal
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              CABU EventHub provides seamless registration, bedspace allocation, payment verification, and attendee history services for all university-hosted events.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#0B6B3A]/10 text-[#0B6B3A] flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-slate-900">1. Fast Registration</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Enter your attendee details with automatic Zambian NRC formatting and mobile verification. Returning guests are recognized instantly.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#0B6B3A]/10 text-[#0B6B3A] flex items-center justify-center font-bold">
                <BedDouble className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-slate-900">2. Gender Bedspaces</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Add K100 dormitory bedspace. Male and female attendees are assigned to gender-restricted campus dormitories automatically.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <CreditCard className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-slate-900">3. DPO Payments</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Pay securely using Direct Pay Online (DPO Sandbox). Real server-side token generation and verification ensure complete transaction safety.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#0B6B3A]/10 text-[#0B6B3A] flex items-center justify-center font-bold">
                <Award className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-slate-900">4. Guest Records</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Access your personal dashboard anytime to view assigned room/bedspace, meal tickets, check-in status, and permanent Results & Certificates.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
