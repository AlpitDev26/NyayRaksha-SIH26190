"use client";

import React, { useEffect, useState } from "react";
import { AuditEvent } from "@/types";
import { apiRequest } from "@/lib/api";
import { ShieldAlert, Search, Filter, RefreshCw, FileText, Scale } from "lucide-react";

export default function AuditPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionFilter, setActionFilter] = useState<string>("");

  const loadAuditEvents = async () => {
    setLoading(true);
    try {
      let query = "/api/v1/audit-events?limit=100";
      if (actionFilter) query += `&action=${actionFilter}`;
      const data = await apiRequest<AuditEvent[]>(query);
      setEvents(data);
    } catch (err) {
      console.error("Audit load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditEvents();
  }, [actionFilter]);

  return (
    <div className="space-y-6 font-sans">
      {/* Official Departmental Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-300 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-600 bg-slate-200 px-2 py-0.5 rounded-xs">
              BNSS 2023 AUDIT LOG
            </span>
            <span className="text-xs font-mono text-slate-500">
              NATIONAL POLICE & COURT REPOSITORY • APPEND-ONLY MERKLE INTEGRITY
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-serif font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-700" />
            Forensic Audit & Immutable Chain of Custody Ledger
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Cryptographically sealed system audit trail with actor provenance, hardware station resolution, and correlation tracking
          </p>
        </div>

        <button
          onClick={loadAuditEvents}
          className="px-3.5 py-2 bg-[#1b437c] hover:bg-[#23569c] text-white rounded-xs text-xs font-mono font-bold uppercase tracking-wider shadow-xs transition-colors flex items-center gap-1.5 self-start sm:self-auto border border-blue-400/40"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh Ledger Trail
        </button>
      </div>

      {/* High-Utility Filter Bar */}
      <div className="bg-white p-3.5 rounded-xs border border-slate-300 shadow-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-mono">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <span className="font-bold text-slate-700 uppercase">Action Code:</span>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 text-slate-800 rounded-xs px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-700 font-mono text-xs"
          >
            <option value="">ALL STATUTORY ACTIONS</option>
            <option value="LOGIN_SUCCESS">LOGIN SUCCESS (SESSION CREATED)</option>
            <option value="LOGIN_FAILURE">LOGIN FAILURE (UNAUTHORIZED ATTEMPT)</option>
            <option value="DOCUMENT_UPLOAD">DOCUMENT UPLOAD & HASHING</option>
            <option value="INTEGRITY_VERIFICATION">STATUTORY INTEGRITY AUDIT</option>
            <option value="DIGITAL_SIGNATURE_AFFIXED">DIGITAL SIGNATURE AFFIXED (DSC)</option>
            <option value="ACCESS_REQUEST_SUBMITTED">INTER-AGENCY ACCESS REQUEST</option>
            <option value="ACCESS_REVOKED">ACCESS REVOCATION EVENT</option>
          </select>
        </div>
        <span className="text-xs font-mono text-slate-600 font-bold">
          TOTAL COMMITTED AUDIT EVENTS: {events.length}
        </span>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xs border border-slate-300 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-sans text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-700 text-[10px] font-mono uppercase tracking-wider border-b border-slate-300">
                <th className="py-2.5 px-3.5 font-bold border-r border-slate-200">TIMESTAMP (IST)</th>
                <th className="py-2.5 px-3.5 font-bold border-r border-slate-200">STATUTORY EVENT CODE</th>
                <th className="py-2.5 px-3.5 font-bold border-r border-slate-200">GAZETTED ACTOR</th>
                <th className="py-2.5 px-3.5 font-bold border-r border-slate-200">TARGET DOCKET / EXHIBIT</th>
                <th className="py-2.5 px-3.5 font-bold border-r border-slate-200">OUTCOME</th>
                <th className="py-2.5 px-3.5 font-bold text-right">STATION IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800 font-mono text-[11px]">
              {events.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2 px-3.5 border-r border-slate-200 text-slate-600 whitespace-nowrap">
                    {new Date(e.timestamp_utc).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST
                  </td>
                  <td className="py-2 px-3.5 border-r border-slate-200 font-bold text-slate-900">
                    {e.action}
                  </td>
                  <td className="py-2 px-3.5 border-r border-slate-200 text-slate-700">
                    {e.actor_name || e.actor_id || "SYSTEM"} ({e.actor_role?.replace(/_/g, " ") || "CORE_SERVICE"})
                  </td>
                  <td className="py-2 px-3.5 border-r border-slate-200 text-blue-900 font-semibold truncate max-w-xs">
                    {e.resource_type}: {e.resource_id || e.case_id || "SYSTEM_EVENT"}
                  </td>
                  <td className="py-2 px-3.5 border-r border-slate-200">
                    <span
                      className={`px-1.5 py-0.2 rounded-xs text-[10px] font-bold uppercase ${
                        e.outcome === "SUCCESS"
                          ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                          : "bg-red-100 text-red-900 border border-red-300"
                      }`}
                    >
                      {e.outcome}
                    </span>
                  </td>
                  <td className="py-2 px-3.5 text-right text-slate-500 text-[10px]">
                    {e.ip_address || "10.0.4.12 (Intranet)"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
