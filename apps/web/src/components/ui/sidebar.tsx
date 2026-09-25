"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  FileText,
  Briefcase,
  FileUp,
  FolderArchive,
  Share2,
  FileCheck2,
  ShieldAlert,
  ClipboardList,
  QrCode,
  Layers,
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const role = user?.roles[0] || "GUEST";

  const navigation = [
    {
      group: "I. INVESTIGATION WORKSPACE",
      items: [
        { name: "Jurisdictional Dashboard", href: "/", icon: Layers },
        { name: "Active Case Dockets", href: "/cases", icon: Briefcase },
        {
          name: "Evidence Ingestion Vault",
          href: "/documents/upload",
          icon: FileUp,
          allowed: [
            "ADMIN",
            "POLICE_OFFICER",
            "INVESTIGATING_OFFICER",
            "FORENSIC_ANALYST",
            "PROSECUTOR",
            "COURT_CLERK",
          ],
        },
        { name: "Electronic Case Files", href: "/documents", icon: FolderArchive },
      ],
    },
    {
      group: "II. MALKHANA & INTEROPERABILITY",
      items: [
        { name: "Inter-Agency Access Requests", href: "/access-requests", icon: Share2 },
        { name: "Statutory Compliance (BNSS)", href: "/compliance", icon: ClipboardList },
      ],
    },
    {
      group: "III. REGISTRY AUDIT & SECURITY",
      items: [
        {
          name: "Chain of Custody Audit Ledger",
          href: "/audit",
          icon: ShieldAlert,
          allowed: ["ADMIN", "AUDITOR", "JUDGE"],
        },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-[#0a162c] border-r border-slate-800/90 min-h-[calc(100vh-7rem)] p-3 flex flex-col justify-between hidden md:flex font-sans">
      <div className="space-y-4">
        {navigation.map((sec, idx) => (
          <div key={idx} className="space-y-1">
            <div className="px-2.5 py-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase font-mono border-b border-slate-800/80 mb-1.5 pb-1">
              {sec.group}
            </div>
            {sec.items.map((item) => {
              if (item.allowed && !item.allowed.includes(role) && role !== "ADMIN") {
                return null;
              }
              const isActive =
                pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xs text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-[#18315b] text-white border-l-2 border-amber-400 shadow-xs"
                      : "text-slate-300 hover:bg-[#122240] hover:text-white"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-amber-400" : "text-slate-400"}`} />
                  <span className="truncate">{item.name}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* Official Blockchain Peer & Node Telemetry */}
      <div className="p-2.5 bg-[#070f1e] rounded-xs border border-slate-800 text-[11px] font-mono space-y-1 text-slate-400 shadow-inner">
        <div className="flex items-center justify-between text-slate-200 font-bold border-b border-slate-800 pb-1">
          <span className="text-[10px] uppercase tracking-wider text-slate-400">LEDGER STATUS</span>
          <span className="flex items-center gap-1 text-[10px] text-emerald-400">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            PEER SYNCED
          </span>
        </div>
        <p className="text-[10px] text-slate-400">Node: Peer0.PoliceMSP</p>
        <p className="text-[10px] text-slate-400">Channel: nyayavaultchannel</p>
        <p className="text-[10px] text-amber-300/80">Proof: SHA-256 + Ed25519</p>
      </div>
    </aside>
  );
}
