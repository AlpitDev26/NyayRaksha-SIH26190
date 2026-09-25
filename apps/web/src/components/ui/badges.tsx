import React from "react";
import { ShieldCheck, AlertOctagon, Clock, Lock, FileCheck } from "lucide-react";

export function ClassificationBadge({ classification }: { classification: string }) {
  const norm = (classification || "RESTRICTED").toUpperCase();

  switch (norm) {
    case "PUBLIC":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs text-[10px] font-mono font-bold tracking-wider uppercase bg-slate-100 text-slate-700 border border-slate-300">
          PUBLIC DOCKET
        </span>
      );
    case "INTERNAL":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs text-[10px] font-mono font-bold tracking-wider uppercase bg-blue-50 text-blue-900 border border-blue-300">
          INTERNAL USE
        </span>
      );
    case "CONFIDENTIAL":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs text-[10px] font-mono font-bold tracking-wider uppercase bg-amber-50 text-amber-900 border border-amber-400">
          CONFIDENTIAL
        </span>
      );
    case "RESTRICTED":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs text-[10px] font-mono font-bold tracking-wider uppercase bg-orange-50 text-orange-950 border border-orange-400">
          RESTRICTED // INVESTIGATION SENSITIVE
        </span>
      );
    case "SEALED":
    case "HIGHLY RESTRICTED":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs text-[10px] font-mono font-bold tracking-wider uppercase bg-red-50 text-red-950 border border-red-400 shadow-xs">
          <Lock className="w-2.5 h-2.5 text-red-700" /> COURT SEALED
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs text-[10px] font-mono font-bold tracking-wider uppercase bg-slate-100 text-slate-700 border border-slate-300">
          {norm}
        </span>
      );
  }
}

export function IntegrityBadge({
  status,
  isTampered,
}: {
  status?: string;
  isTampered?: boolean;
}) {
  if (isTampered || status === "FAILED" || status === "INCIDENT_LOCKED") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-xs text-[11px] font-mono font-bold tracking-wider uppercase bg-red-100 text-red-900 border-2 border-red-600 shadow-xs">
        <AlertOctagon className="w-3.5 h-3.5 text-red-700 shrink-0" />
        INTEGRITY BREACH (TAMPERED)
      </span>
    );
  }

  if (status === "PENDING_ANCHOR" || status === "WARNING") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-xs text-[10px] font-mono font-bold tracking-wider uppercase bg-amber-100 text-amber-900 border border-amber-400">
        <Clock className="w-3 h-3 text-amber-700 shrink-0" />
        PENDING LEDGER COMMIT
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-xs text-[10px] font-mono font-bold tracking-wider uppercase bg-emerald-50 text-emerald-900 border border-emerald-500 shadow-xs">
      <ShieldCheck className="w-3 h-3 text-emerald-700 shrink-0" />
      SEALED ON LEDGER (SEC 63 BSA)
    </span>
  );
}
