"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CustodyEvent } from "@/types";
import { apiRequest } from "@/lib/api";
import { CustodyTimeline } from "@/components/custody-timeline";
import { ArrowLeft, Clock, ShieldCheck, Download } from "lucide-react";

export default function CaseTimelinePage() {
  const { caseId } = useParams();
  const [events, setEvents] = useState<CustodyEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchTimeline() {
      if (!caseId) return;
      try {
        const data = await apiRequest<CustodyEvent[]>(`/api/v1/cases/${caseId}/timeline`);
        setEvents(data);
      } catch (err) {
        console.error("Timeline load error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchTimeline();
  }, [caseId]);

  return (
    <div className="space-y-6 font-sans">
      <div className="flex items-center justify-between">
        <Link
          href={`/cases/${caseId}`}
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Case Dossier
        </Link>
        <button
          onClick={() => window.print()}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <Download className="w-3.5 h-3.5" /> Export Custody Trail
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="border-b border-slate-100 pb-4 mb-6">
          <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
            Case: {caseId}
          </span>
          <h1 className="text-xl font-bold text-slate-900 mt-2">
            Verifiable Chain-of-Custody Chronology
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Tamper-evident sequence of evidence intake, cryptographic hashing, virus checks,
            custodial handovers, and judicial signatures.
          </p>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 font-mono">
            Loading custody ledger from node...
          </div>
        ) : (
          <CustodyTimeline events={events} />
        )}
      </div>
    </div>
  );
}
