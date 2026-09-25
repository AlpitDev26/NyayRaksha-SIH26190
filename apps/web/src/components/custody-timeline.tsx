"use client";

import React from "react";
import { CustodyEvent } from "@/types";
import {
  FileCheck,
  FileUp,
  Hash,
  ShieldAlert,
  Eye,
  Send,
  PenTool,
  Lock,
  Database,
  CheckCircle2,
  XCircle,
} from "lucide-react";

export function CustodyTimeline({ events }: { events: CustodyEvent[] }) {
  if (!events || events.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
        No custody records registered for this asset yet.
      </div>
    );
  }

  const getEventIcon = (action: string, outcome: string) => {
    if (outcome === "FAILED" || action === "INTEGRITY_FAILURE") {
      return <XCircle className="w-5 h-5 text-red-500" />;
    }
    switch (action) {
      case "UPLOADED":
        return <FileUp className="w-5 h-5 text-blue-500" />;
      case "HASHED":
        return <Hash className="w-5 h-5 text-teal-500" />;
      case "STORED":
        return <Database className="w-5 h-5 text-indigo-500" />;
      case "PREVIEWED":
      case "VIEWED":
        return <Eye className="w-5 h-5 text-sky-500" />;
      case "SIGNED":
        return <PenTool className="w-5 h-5 text-emerald-500" />;
      case "VERIFIED":
        return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case "TRANSFERRED":
      case "ACCESS_GRANTED":
        return <Send className="w-5 h-5 text-amber-500" />;
      default:
        return <FileCheck className="w-5 h-5 text-slate-500" />;
    }
  };

  return (
    <div className="relative pl-6 border-l-2 border-slate-200 space-y-6 my-4 font-sans">
      {events.map((event, idx) => {
        const isFailure = event.outcome === "FAILED" || event.action === "INTEGRITY_FAILURE";

        return (
          <div key={event.id || idx} className="relative group">
            {/* Timeline Node Dot */}
            <div
              className={`absolute -left-[35px] top-1 w-8 h-8 rounded-full flex items-center justify-center bg-white border-2 ${
                isFailure
                  ? "border-red-500 shadow-md shadow-red-100 animate-pulse"
                  : "border-slate-300 group-hover:border-blue-500 shadow-sm"
              } transition-colors`}
            >
              {getEventIcon(event.action, event.outcome)}
            </div>

            {/* Event Card */}
            <div
              className={`p-4 rounded-xl border transition-all ${
                isFailure
                  ? "bg-red-50/70 border-red-200"
                  : "bg-white hover:bg-slate-50 border-slate-200 shadow-xs"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                      isFailure
                        ? "bg-red-200 text-red-900"
                        : "bg-slate-100 text-slate-800"
                    }`}
                  >
                    {event.action}
                  </span>
                  <span className="text-xs font-semibold text-slate-700">
                    Version {event.version_number}
                  </span>
                </div>
                <time className="text-xs text-slate-400 font-mono">
                  {new Date(event.timestamp_utc).toLocaleString()} (UTC)
                </time>
              </div>

              <p className="text-sm text-slate-800 font-medium">{event.reason || "Standard intake lifecycle event"}</p>

              <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 font-mono">
                <div>
                  <span className="text-slate-400">Custodian: </span>
                  <span className="font-semibold text-slate-700">
                    {event.actor_name || event.actor_id} ({event.actor_role})
                  </span>
                </div>

                {event.blockchain_tx_id && (
                  <div className="flex items-center gap-1 text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                    <span className="text-slate-400">Tx:</span>
                    <span className="font-bold text-blue-600">{event.blockchain_tx_id.slice(0, 14)}...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
