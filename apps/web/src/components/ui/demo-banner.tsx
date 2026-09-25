"use client";

import React from "react";
import { DEMO_ACCOUNTS, useAuth } from "@/lib/auth-context";
import { Shield, KeyRound, Building2 } from "lucide-react";

export function DemoBanner() {
  const { user, switchRole } = useAuth();

  return (
    <div className="bg-[#0b1526] border-b border-slate-800 text-slate-300 text-xs sticky top-0 z-50 shadow-sm font-sans">
      {/* Tricolor Official Indian Portal Indicator */}
      <div className="h-[2.5px] w-full bg-gradient-to-r from-[#FF9933] via-[#FFFFFF] to-[#138808]" />

      <div className="max-w-7xl mx-auto px-4 py-1.5 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Administrative Security Header */}
        <div className="flex items-center gap-2.5">
          <span className="bg-amber-950/80 text-amber-300 border border-amber-700/60 px-2 py-0.5 rounded-sm font-mono text-[10px] font-bold tracking-wider uppercase flex items-center gap-1">
            <Shield className="w-3 h-3 text-amber-400" /> OFFICIAL USE ONLY
          </span>
          <span className="text-slate-300 text-[11px] font-medium hidden sm:inline tracking-wide">
            GOVERNMENT OF INDIA • INTER-OPERABLE CRIMINAL JUSTICE SYSTEM (ICJS) • DOCKET VAULT
          </span>
          <span className="text-slate-500 text-[11px] hidden lg:inline">
            | BNSS & BSA 2023 STATUTORY COMPLIANT
          </span>
        </div>

        {/* Right: Institutional Impersonation / Credential Switcher */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-300 text-[11px]">
            <KeyRound className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline text-slate-400">Jurisdiction Credential:</span>
          </div>

          <div className="relative">
            <select
              value={user?.email || ""}
              onChange={(e) => switchRole(e.target.value)}
              className="bg-[#121f38] text-slate-200 border border-slate-700 rounded-sm px-2.5 py-1 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer hover:border-slate-600 transition-colors"
              title="Switch Active Institutional Role & Jurisdiction"
            >
              {DEMO_ACCOUNTS.map((acc) => (
                <option key={acc.email} value={acc.email} className="bg-[#0b1526] text-slate-200 py-1">
                  [{acc.role}] {acc.name} — {acc.label}
                </option>
              ))}
            </select>
          </div>

          <div className="hidden xl:flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-emerald-950/60 text-emerald-300 border border-emerald-800/80 font-mono text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            NIC-CA DSC TOKEN ACTIVE
          </div>
        </div>
      </div>
    </div>
  );
}
