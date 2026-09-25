"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Case } from "@/types";
import { apiRequest } from "@/lib/api";
import { ClassificationBadge } from "@/components/ui/badges";
import { Briefcase, Plus, Search, Filter, ArrowRight, UserCheck, Scale, Building } from "lucide-react";

export default function CasesPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  useEffect(() => {
    async function fetchCases() {
      try {
        let query = "/api/v1/cases?";
        if (statusFilter) query += `status=${statusFilter}&`;
        if (search) query += `search=${search}&`;
        const data = await apiRequest<Case[]>(query);
        setCases(data);
      } catch (err) {
        console.error("Error fetching cases:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchCases();
  }, [search, statusFilter]);

  return (
    <div className="space-y-6 font-sans">
      {/* Official Government Docket Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-300 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-600 bg-slate-200 px-2 py-0.5 rounded-xs">
              BNSS 2023 REGISTRY
            </span>
            <span className="text-xs font-mono text-slate-500">
              NATIONAL CRIME DOCKET REPOSITORY • ICJS LINKED
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-serif font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <Scale className="w-5 h-5 text-amber-700" />
            Criminal Investigation & Court Docket Register
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Official repository of First Information Reports (FIRs), General Diary entries, and court transmittal charge sheets
          </p>
        </div>

        <Link
          href="/cases/new"
          className="px-3.5 py-2 bg-[#1b437c] hover:bg-[#23569c] text-white rounded-xs text-xs font-bold uppercase tracking-wider shadow-xs transition-colors flex items-center gap-1.5 self-start sm:self-auto border border-blue-400/40"
        >
          <Plus className="w-3.5 h-3.5" /> Register New Case Docket
        </Link>
      </div>

      {/* High-Utility Filter & Search Bar */}
      <div className="bg-white p-3.5 rounded-xs border border-slate-300 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by Crime No., FIR ID, Accused, or Legal Section..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xs focus:outline-none focus:ring-1 focus:ring-blue-700 font-mono"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-bold text-slate-600 uppercase">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 text-slate-800 text-xs font-mono rounded-xs px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-700"
          >
            <option value="">ALL DOCKET STAGES</option>
            <option value="OPEN">STAGE 1: OPEN (FIR REGISTERED)</option>
            <option value="UNDER_INVESTIGATION">STAGE 2: ACTIVE INVESTIGATION</option>
            <option value="UNDER_REVIEW">STAGE 3: SUPERVISORY REVIEW</option>
            <option value="FILED_IN_COURT">STAGE 4: FILED IN COURT</option>
            <option value="CLOSED">STAGE 5: JUDICIALLY DISPOSED</option>
          </select>
        </div>
      </div>

      {/* Official Case Docket Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cases.map((c) => (
          <div
            key={c.id}
            className="bg-white rounded-xs border border-slate-300 shadow-xs hover:border-slate-500 transition-all p-4 flex flex-col justify-between"
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-mono font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded-xs border border-blue-300">
                  {c.id}
                </span>
                <ClassificationBadge classification={c.classification} />
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-sm line-clamp-1">{c.title}</h3>
                <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">{c.summary}</p>
              </div>

              <div className="pt-2 border-t border-slate-200 space-y-1 text-[11px] text-slate-600 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">POLICE STATION:</span>
                  <span className="font-semibold text-slate-800">{c.police_station || "PS Connaught Place (DL-04)"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">PROCEDURAL STATUS:</span>
                  <span className="font-bold text-amber-900">{c.status.replace(/_/g, " ")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">INVESTIGATING OFFICER:</span>
                  <span className="text-slate-800 font-semibold">{c.investigating_officer_id || "ACP Priya Nair"}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-mono">
                LAST UPDATED: {new Date(c.updated_at).toLocaleDateString("en-IN")}
              </span>
              <Link
                href={`/cases/${c.id}`}
                className="text-xs font-mono font-bold text-blue-800 hover:text-blue-950 flex items-center gap-1 uppercase tracking-wide"
              >
                Inspect Case File <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
