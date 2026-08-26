import React, { useState, useEffect } from "react";
import { Terminal, RefreshCw, Eye, FileText, Code, CheckCircle, AlertTriangle, X, ShieldAlert } from "lucide-react";
import { getDpoLogs, initializeStorage, formatSafeDate, maskToken } from "../../lib/storage";
import { DpoTransactionLog } from "../../types";

export const AdminDpoLogs: React.FC = () => {
  const [logs, setLogs] = useState<DpoTransactionLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<DpoTransactionLog | null>(null);

  useEffect(() => {
    initializeStorage();
    setLogs(getDpoLogs());
  }, []);

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#111827] flex items-center gap-2">
            <Terminal className="w-6 h-6 text-indigo-600" />
            DPO Audit & Gateway Diagnostics
          </h1>
          <p className="text-xs text-[#64748B] mt-1">
            Real-time XML request payloads, DPO v6 result codes, masked tokens, and complete audit history.
          </p>
        </div>

        <button
          onClick={() => setLogs(getDpoLogs())}
          className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 font-bold text-xs rounded-xl flex items-center gap-2 shadow-2xs transition-colors cursor-pointer"
        >
          <RefreshCw className="w-4 h-4 text-gray-600" />
          Refresh Logs
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-[#F8FAF9] text-gray-600 uppercase font-bold text-[11px] tracking-wider">
                <th className="p-3.5">Timestamp</th>
                <th className="p-3.5">Event Type</th>
                <th className="p-3.5">CompanyRef</th>
                <th className="p-3.5">Result Code & Explanation</th>
                <th className="p-3.5">TransToken</th>
                <th className="p-3.5">HTTP</th>
                <th className="p-3.5">Local Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-mono text-[11px]">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-400 italic">
                    No DPO API transaction events recorded in local audit log yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isSuccess = log.resultCode === "000" || log.parsedResult?.result === "000";
                  const displayCode = log.resultCode || log.parsedResult?.result || "N/A";
                  const displayExplanation = log.resultExplanation || log.parsedResult?.resultExplanation || log.frontendErrorMessage || "N/A";

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 text-gray-600 whitespace-nowrap font-sans font-medium text-[11px]">
                        {formatSafeDate(log.createdAt || log.timestamp)}
                      </td>
                      <td className="p-3.5">
                        <span className={`inline-block px-2 py-0.5 rounded font-extrabold text-[10px] uppercase ${
                          log.eventType === "redirect" || log.eventType === "success"
                            ? "bg-emerald-100 text-emerald-800"
                            : log.eventType === "error" || log.eventType === "failed"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-indigo-100 text-indigo-800"
                        }`}>
                          {log.eventType}
                        </span>
                      </td>
                      <td className="p-3.5 font-bold text-slate-800 whitespace-nowrap">
                        {log.transactionReference || "N/A"}
                      </td>
                      <td className="p-3.5 max-w-[220px]">
                        <div className="flex items-center gap-1.5 flex-wrap font-sans">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-black ${
                            isSuccess ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                          }`}>
                            {displayCode}
                          </span>
                          <span className="text-[11px] text-gray-700 truncate max-w-[150px]" title={displayExplanation}>
                            {displayExplanation}
                          </span>
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                        {maskToken(log.dpoTransToken)}
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                          log.httpStatus === 200 ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}>
                          {log.httpStatus || "200"}
                        </span>
                      </td>
                      <td className="p-3.5 font-sans whitespace-nowrap">
                        <div className="text-[10px] text-gray-500">
                          {log.localStatusBefore && <span className="line-through mr-1">{log.localStatusBefore}</span>}
                          <span className="font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                            {log.localStatusAfter || "N/A"}
                          </span>
                        </div>
                      </td>
                      <td className="p-3.5 text-right font-sans">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] rounded-lg inline-flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 text-slate-100 w-full max-w-4xl rounded-3xl border border-slate-700 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-5 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">DPO Audit Record: {selectedLog.id}</h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Timestamp: {formatSafeDate(selectedLog.createdAt || selectedLog.timestamp)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 overflow-y-auto text-xs font-sans">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-800/60 border border-slate-700">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Event Type</span>
                  <span className="font-bold text-indigo-300 uppercase">{selectedLog.eventType}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Result Code</span>
                  <span className="font-mono font-bold text-amber-400">
                    {selectedLog.resultCode || selectedLog.parsedResult?.result || "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">HTTP Status</span>
                  <span className="font-mono font-bold text-emerald-400">{selectedLog.httpStatus || 200}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">CompanyRef</span>
                  <span className="font-mono font-bold text-slate-200">{selectedLog.transactionReference}</span>
                </div>
              </div>

              {selectedLog.priceOverrideStatus && (
                <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/80 flex items-center justify-between flex-wrap gap-2 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-extrabold text-amber-400 block">DPO Sandbox Price Override Active</span>
                    <span className="text-amber-200 font-medium">
                      Reason: {selectedLog.priceOverrideReason || "DPO sandbox payment testing"}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Calculated vs DPO Amount</span>
                    <span className="font-mono font-bold text-amber-300">
                      Normal ZMW {(selectedLog.normalCalculatedAmount || 350).toFixed(2)} → DPO Sent ZMW {(selectedLog.finalDpoAmount || 1.00).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {selectedLog.resultExplanation && (
                <div className="p-3 rounded-xl bg-slate-800 border border-slate-700">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Result Explanation</span>
                  <p className="text-slate-200 text-xs font-medium">{selectedLog.resultExplanation}</p>
                </div>
              )}

              {selectedLog.missingEnvVars && selectedLog.missingEnvVars.length > 0 && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300">
                  <span className="font-bold block text-[11px] mb-1 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    Missing Environment Variables
                  </span>
                  <code className="font-mono text-xs">{selectedLog.missingEnvVars.join(", ")}</code>
                </div>
              )}

              {/* Masked XML Request */}
              <div className="space-y-2">
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  <Code className="w-4 h-4 text-indigo-400" />
                  Masked XML Request (CompanyToken Masked)
                </span>
                <pre className="p-4 rounded-xl bg-slate-950 text-emerald-400 font-mono text-[11px] leading-relaxed overflow-x-auto border border-slate-800 max-h-52 whitespace-pre-wrap">
                  {selectedLog.maskedXmlRequest || selectedLog.requestPayload?.xml || "No XML request logged."}
                </pre>
              </div>

              {/* Raw XML Response */}
              <div className="space-y-2">
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-amber-400" />
                  Raw DPO XML Response
                </span>
                <pre className="p-4 rounded-xl bg-slate-950 text-amber-300 font-mono text-[11px] leading-relaxed overflow-x-auto border border-slate-800 max-h-52 whitespace-pre-wrap">
                  {selectedLog.rawXmlResponse || selectedLog.responsePayload?.rawResponse || "No raw XML response recorded."}
                </pre>
              </div>

              {/* Parsed Response Object */}
              <div className="space-y-2">
                <span className="font-bold text-slate-300">Full JSON Audit Object</span>
                <pre className="p-4 rounded-xl bg-slate-950 text-sky-300 font-mono text-[10px] overflow-x-auto border border-slate-800 max-h-48">
                  {JSON.stringify(selectedLog, null, 2)}
                </pre>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-800/90 border-t border-slate-700 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Close Audit Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
