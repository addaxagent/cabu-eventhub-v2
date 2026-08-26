import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  Calendar,
  MapPin,
  ArrowRight,
  BedDouble,
  Utensils,
  CheckCircle2,
  Users,
  ShieldCheck,
  ChevronLeft,
} from "lucide-react";
import { getEvents, getTracks, findEventBySlugOrId, initializeStorage } from "../lib/storage";
import { Event, Track } from "../types";

export const EventDetailsPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);

  useEffect(() => {
    initializeStorage();
    const found = findEventBySlugOrId(slug);
    if (found) {
      setEvent(found);
      const loadedTracks = getTracks().filter((t) => t.eventId === found.id && t.isActive);
      setTracks(loadedTracks);
    } else {
      setEvent(null);
    }
  }, [slug]);

  if (!event) {
    return (
      <div className="min-h-screen bg-[#F8FAF9] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl border border-gray-200 text-center max-w-md space-y-4">
          <h2 className="text-xl font-bold text-[#111827]">Event Not Found</h2>
          <p className="text-sm text-[#64748B]">
            The conference or event you requested could not be located or is no longer published.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0B6B3A] text-white text-xs font-bold rounded-lg"
          >
            <ChevronLeft className="w-4 h-4" />
            Return to Active Events
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAF9] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0B6B3A] hover:underline"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Active Events
        </Link>

        {/* Admin/Test Notice Banner if applicable */}
        {event.priceOverrideEnabled && (
          <div className="bg-amber-50 border border-amber-300 p-4 rounded-2xl flex items-center gap-3 text-amber-900 shadow-2xs">
            <ShieldCheck className="w-6 h-6 text-amber-600 shrink-0" />
            <div className="text-xs">
              <span className="font-black text-sm text-amber-950 block">DPO Sandbox Payment Test Event</span>
              <p className="mt-0.5 text-amber-800 font-medium">
                This event is configured for DPO sandbox testing. Final payable amount is ZMW {event.priceOverrideAmount?.toFixed(2) || "1.00"}.
              </p>
            </div>
          </div>
        )}

        {/* Header Hero */}
        <div className="bg-[#0B0B0B] text-white p-8 sm:p-10 rounded-3xl border border-gray-800 space-y-6">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="bg-[#0B6B3A] text-white text-xs font-extrabold px-3 py-1 rounded-md uppercase tracking-wider">
              {event.code}
            </span>
            {(event.isTestEvent || event.priceOverrideEnabled) && (
              <span className="bg-amber-100 text-amber-950 border border-amber-300 text-xs font-black px-3 py-1 rounded-md uppercase tracking-wider">
                DPO SANDBOX TEST
              </span>
            )}
            <span className="text-xs font-bold text-green-400 bg-green-950/80 border border-green-800 px-2.5 py-1 rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
              Registration Open
            </span>
          </div>

          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-white">
              {event.name}
            </h1>
            <p className="text-[#F58220] text-lg font-bold mt-2">
              Theme: {event.theme}
            </p>
          </div>

          <p className="text-gray-300 text-sm leading-relaxed max-w-3xl">
            {event.description}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-800 text-xs font-semibold text-gray-300">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#0B6B3A]" />
              <span>Dates: {event.startDate} — {event.endDate}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#F58220]" />
              <span>Venue: {event.venue}</span>
            </div>
          </div>
        </div>

        {/* Tracks Section */}
        <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm space-y-6">
          <div>
            <h2 className="text-xl font-black text-[#111827]">
              Available Ministry & Educational Tracks
            </h2>
            <p className="text-xs text-[#64748B] mt-1">
              Select one specialized track when completing your registration form.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {tracks.map((t) => (
              <div
                key={t.id}
                className="p-5 rounded-2xl bg-[#F8FAF9] border border-gray-200 space-y-2 hover:border-[#0B6B3A] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#0B6B3A]" />
                  <h3 className="font-bold text-base text-[#111827]">{t.name}</h3>
                </div>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  {t.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Accommodation & Pricing Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F58220]/10 text-[#F58220] flex items-center justify-center font-bold">
                <BedDouble className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-[#111827]">
                  Dormitory Bedspace Accommodation
                </h3>
                <span className="text-xs font-black text-[#F58220]">
                  ZMW 100 Optional
                </span>
              </div>
            </div>
            <p className="text-xs text-[#64748B] leading-relaxed">
              On-campus dormitory bedspace for the entire conference period. Bedspaces are automatically assigned by gender (Male Block A/C or Female Block B/D) upon payment authorization.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0B6B3A]/10 text-[#0B6B3A] flex items-center justify-center font-bold">
                <Utensils className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-[#111827]">
                  Event Meal Ticket Pass
                </h3>
                <span className="text-xs font-black text-[#0B6B3A]">
                  ZMW 50 Optional
                </span>
              </div>
            </div>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Provides full campus cafeteria meal access for all conference dining sessions. Added directly to your registration badge.
            </p>
          </div>
        </div>

        {/* Final CTA Bar */}
        <div className="bg-[#0B6B3A] text-white p-8 rounded-3xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <span className="text-xs text-green-100 uppercase font-bold tracking-wider block">
              {event.priceOverrideEnabled ? "DPO Test Event Special Fee" : "Standard Conference Fee"}
            </span>
            {event.priceOverrideEnabled && typeof event.priceOverrideAmount === "number" ? (
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-black text-[#F58220]">
                  ZMW {event.priceOverrideAmount.toFixed(2)}
                </div>
                <span className="text-sm font-bold text-green-200 line-through">
                  ZMW 350.00
                </span>
                <span className="text-xs text-green-100 font-medium">(DPO Sandbox Override)</span>
              </div>
            ) : (
              <div className="text-3xl font-black text-white">
                ZMW 350 <span className="text-xs font-medium text-green-100">+ Optional Add-ons</span>
              </div>
            )}
          </div>

          <Link
            to={`/event/${event.slug}/register`}
            className="w-full sm:w-auto px-8 py-4 bg-[#F58220] hover:bg-[#C65F12] text-black font-extrabold text-base rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            Register Now
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </div>
  );
};
