import React from "react";
import { Award, CheckCircle2, AlertTriangle, XCircle, Clock, ShieldCheck } from "lucide-react";
import { formatSafeDate } from "../lib/storage";
import { EventResult, ResultCertificate, Event, Track, Registration } from "../types";

export interface UnifiedResultData {
  id: string;
  eventName: string;
  eventCode?: string;
  trackName?: string;
  registrationRef?: string;
  score?: number;
  maxScore?: number;
  percentage?: number;
  grade?: string;
  status: string;
  remarks?: string;
  publishedDate?: string;
  certificateNumber?: string;
}

export interface ResultCardProps {
  result: EventResult | ResultCertificate | UnifiedResultData;
  events?: Event[];
  tracks?: Track[];
  registrations?: Registration[];
}

/**
 * Calculates percentage from score and maxScore or extracts provided percentage.
 */
export function getResultPercentage(result: EventResult | ResultCertificate | UnifiedResultData): number | undefined {
  if ("percentage" in result && result.percentage !== undefined && result.percentage !== null && !isNaN(Number(result.percentage))) {
    return Number(result.percentage);
  }

  const score = result.score !== undefined ? Number(result.score) : undefined;
  const maxScore = ("maxScore" in result && result.maxScore !== undefined) ? Number(result.maxScore) : (score !== undefined ? 100 : undefined);

  if (score !== undefined && maxScore && maxScore > 0) {
    return Math.round((score / maxScore) * 100);
  }

  if (score !== undefined && score >= 0 && score <= 100) {
    return Math.round(score);
  }

  return undefined;
}

/**
 * Returns color category based on strictly defined CABU score ranges:
 * 0–49%   = RED
 * 50–79%  = ORANGE
 * 80–100% = GREEN
 */
export function getScoreColorCategory(percentage?: number): "red" | "orange" | "green" | "neutral" {
  if (percentage === undefined || isNaN(percentage)) {
    return "neutral";
  }

  if (percentage < 50) {
    return "red";
  } else if (percentage < 80) {
    return "orange";
  } else {
    return "green";
  }
}

export const ResultCard: React.FC<ResultCardProps> = ({
  result,
  events = [],
  tracks = [],
  registrations = [],
}) => {
  // Normalize fields
  let eventName = "CABU Event";
  let eventCode: string | undefined = undefined;
  let trackName = "General Track";
  let registrationRef: string | undefined = undefined;
  let score = result.score;
  let maxScore: number | undefined = ("maxScore" in result) ? result.maxScore : 100;
  let percentage = getResultPercentage(result);
  let grade = result.grade;
  let status = "COMPLETED";
  let remarks: string | undefined = undefined;
  let publishedDate: string | undefined = undefined;
  let certificateNumber: string | undefined = undefined;

  // Check if it's an EventResult
  if ("published" in result && "eventId" in result) {
    const ev = events.find((e) => e.id === result.eventId);
    const reg = registrations.find((r) => r.id === result.registrationId);
    const tr = tracks.find((t) => t.id === result.trackId);

    eventName = ev?.name || "CABU Event";
    eventCode = ev?.code;
    trackName = tr?.name || "General Track";
    registrationRef = reg?.registrationReference;
    status = result.status || "PASS";
    remarks = result.remarks;
    publishedDate = result.publishedAt ? formatSafeDate(result.publishedAt) : formatSafeDate(result.updatedAt);
  } 
  // Check if it's a ResultCertificate
  else if ("assessmentName" in result) {
    const ev = events.find((e) => e.id === result.eventId);
    const reg = registrations.find((r) => r.id === result.registrationId);
    const tr = tracks.find((t) => t.id === result.trackId);

    eventName = result.assessmentName || ev?.name || "CABU Assessment";
    eventCode = ev?.code;
    trackName = result.moduleName || tr?.name || "General Track";
    registrationRef = reg?.registrationReference;
    status = (result.resultStatus || "PASSED").toUpperCase();
    remarks = result.adminComments;
    publishedDate = result.certificateIssuedDate ? formatSafeDate(result.certificateIssuedDate) : formatSafeDate(result.recordedAt || result.updatedAt);
    certificateNumber = result.certificateNumber;
  }
  // Unified generic data
  else {
    eventName = (result as UnifiedResultData).eventName || "CABU Event";
    eventCode = (result as UnifiedResultData).eventCode;
    trackName = (result as UnifiedResultData).trackName || "General Track";
    registrationRef = (result as UnifiedResultData).registrationRef;
    status = ((result as UnifiedResultData).status || "PASS").toUpperCase();
    remarks = (result as UnifiedResultData).remarks;
    publishedDate = (result as UnifiedResultData).publishedDate;
    certificateNumber = (result as UnifiedResultData).certificateNumber;
  }

  // Determine color scheme based strictly on the score percentage
  const colorCat = getScoreColorCategory(percentage);

  const colorStyles = {
    green: {
      cardBg: "bg-gradient-to-br from-emerald-50/40 via-white to-white",
      cardBorder: "border-emerald-200 shadow-2xs hover:border-emerald-300",
      badge: "bg-emerald-100 text-emerald-800 border border-emerald-300",
      percentageText: "text-[#0B6B3A]",
      scorePill: "text-[#0B6B3A] bg-emerald-50 border border-emerald-200",
      icon: CheckCircle2,
    },
    orange: {
      cardBg: "bg-gradient-to-br from-amber-50/40 via-white to-white",
      cardBorder: "border-amber-200 shadow-2xs hover:border-amber-300",
      badge: "bg-amber-100 text-amber-900 border border-amber-300",
      percentageText: "text-[#F58220]",
      scorePill: "text-[#F58220] bg-amber-50 border border-amber-200",
      icon: CheckCircle2,
    },
    red: {
      cardBg: "bg-gradient-to-br from-rose-50/40 via-white to-white",
      cardBorder: "border-rose-200 shadow-2xs hover:border-rose-300",
      badge: "bg-rose-100 text-rose-800 border border-rose-300",
      percentageText: "text-rose-600",
      scorePill: "text-rose-600 bg-rose-50 border border-rose-200",
      icon: AlertTriangle,
    },
    neutral: {
      cardBg: "bg-white",
      cardBorder: "border-slate-200 hover:border-slate-300",
      badge: "bg-slate-100 text-slate-700 border border-slate-300",
      percentageText: "text-slate-800",
      scorePill: "text-slate-700 bg-slate-50 border border-slate-200",
      icon: Clock,
    },
  }[colorCat];

  const StatusIcon = colorStyles.icon;

  return (
    <div
      className={`p-5 sm:p-6 rounded-3xl border ${colorStyles.cardBorder} ${colorStyles.cardBg} space-y-4 transition-all`}
    >
      {/* Header row: Event info & Status Badge */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3.5 border-b border-slate-100">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            {registrationRef && (
              <span className="font-mono text-xs font-bold text-[#0B6B3A] bg-emerald-100/60 px-2 py-0.5 rounded">
                {registrationRef}
              </span>
            )}
            {eventCode && (
              <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded uppercase">
                {eventCode}
              </span>
            )}
            {certificateNumber && (
              <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-100/70 border border-amber-200 px-2 py-0.5 rounded flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-amber-700" />
                <span>{certificateNumber}</span>
              </span>
            )}
          </div>
          <h4 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
            {eventName}
          </h4>
          <p className="text-xs text-slate-500 font-medium">
            Track / Module: <span className="text-slate-700 font-semibold">{trackName}</span>
          </p>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <span
            className={`px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase inline-flex items-center gap-1.5 ${colorStyles.badge}`}
          >
            <StatusIcon className="w-3.5 h-3.5" />
            <span>{status}</span>
          </span>
        </div>
      </div>

      {/* Performance Metric Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        {/* Score */}
        <div className="p-3.5 bg-white rounded-2xl border border-slate-100 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Score</span>
          <span className="text-base sm:text-lg font-extrabold text-slate-900 block mt-0.5 font-mono">
            {score !== undefined ? `${score} / ${maxScore || 100}` : "—"}
          </span>
        </div>

        {/* Percentage */}
        <div className="p-3.5 bg-white rounded-2xl border border-slate-100 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Percentage</span>
          <span className={`text-base sm:text-lg font-extrabold block mt-0.5 font-mono ${colorStyles.percentageText}`}>
            {percentage !== undefined ? `${percentage}%` : "—"}
          </span>
        </div>

        {/* Grade */}
        <div className="p-3.5 bg-white rounded-2xl border border-slate-100 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Grade</span>
          <span className="text-base sm:text-lg font-extrabold text-slate-900 block mt-0.5">
            {grade || (percentage !== undefined && percentage >= 50 ? "Pass" : "Completed")}
          </span>
        </div>

        {/* Published Date */}
        <div className="p-3.5 bg-white rounded-2xl border border-slate-100 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Published Date</span>
          <span className="text-xs font-semibold text-slate-700 font-mono block mt-1">
            {publishedDate || "Recorded"}
          </span>
        </div>
      </div>

      {/* Faculty Evaluation Remarks */}
      {remarks && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white/90 border border-slate-100 text-xs space-y-1 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Faculty Evaluation Remarks
          </span>
          <p className="text-slate-800 italic font-medium leading-relaxed">
            "{remarks}"
          </p>
        </div>
      )}
    </div>
  );
};
