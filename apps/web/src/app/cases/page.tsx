"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Case } from "@/types";
import { apiRequest } from "@/lib/api";
import { ClassificationBadge } from "@/components/ui/badges";
import { Briefcase, ArrowRight, ShieldCheck, Scale } from "lucide-react";

export default function CasesRegistryPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadCases() {
      try {
        const data = await apiRequest<Case[]>("/api/v1/cases");
        setCases(data);
      } catch (err) {
        console.error("Error loading cases:", err);
      } finally {
        setLoading(false);
      }
    }
    loadCases();
  }, []);

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-blue-700" /> Case Registry
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage jurisdictions and electronic dockets</p>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500 font-mono">Loading cases...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cases.map((caseItem) => (
            <Link
              key={caseItem.id}
              href={`/cases/${caseItem.id}`}
              className="block bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:border-blue-400 hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-3">
                <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md">
                  {caseItem.id}
                </span>
                <ClassificationBadge classification={caseItem.classification} />
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-blue-700 transition-colors">
                {caseItem.title}
              </h2>
              <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed mb-4">
                {caseItem.summary}
              </p>
              
              <div className="flex items-center justify-between text-xs font-mono">
                <div className="space-y-1">
                  <div className="text-slate-500">Status: <span className="font-semibold text-slate-800">{caseItem.status}</span></div>
                  <div className="text-slate-500">Jurisdiction: <span className="font-semibold text-slate-800">{caseItem.jurisdiction}</span></div>
                </div>
                <div className="flex items-center gap-1 text-blue-600 font-bold group-hover:translate-x-1 transition-transform">
                  View Docket <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
