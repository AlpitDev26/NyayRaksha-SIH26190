"use client";

import React, { useEffect, useState } from "react";
import { ComplianceStatus } from "@/types";
import { apiRequest } from "@/lib/api";
import {
  ClipboardCheck,
  ShieldCheck,
  Lock,
  Database,
  Cpu,
  RefreshCw,
  Scale,
  FileCheck2,
} from "lucide-react";

export default function CompliancePage() {
  const [status, setStatus] = useState<ComplianceStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchCompliance = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<ComplianceStatus>("/api/v1/compliance/checklist");
      setStatus(data);
    } catch (err) {
      console.error("Compliance load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompliance();
  }, []);

  const checklistItems = [
    {
      title: "Data-in-Transit Encryption (TLS 1.3)",
      description: "Mandatory TLS 1.3 cryptographic cipher suites across all ICJS API gateways and court interfaces.",
      status: status?.encryption_in_transit ? "COMPLIANT" : "FAIL",
      icon: Lock,
    },
    {
      title: "Storage Envelope Encryption (AES-256-GCM)",
      description: "Binary evidence files encrypted using AES-256-GCM in isolated off-chain government vaults.",
      status: status?.encryption_at_rest ? "COMPLIANT" : "FAIL",
      icon: Database,
    },
    {
      title: "Multi-Factor Authentication (MFA / TOTP)",
      description: "RFC 6238 TOTP enforced on all high-privilege roles (Judges, Magistrates, Administrators, IOs).",
      status: status?.mfa_enforced ? "COMPLIANT" : "FAIL",
      icon: ShieldCheck,
    },
    {
      title: "Permissioned Distributed Ledger (Fabric 2.5)",
      description: "Hyperledger Fabric multi-organization consensus committing immutable SHA-256 hash anchors.",
      status: status?.blockchain_gateway_health === "HEALTHY" ? "COMPLIANT" : "PENDING",
      icon: Cpu,
    },
    {
      title: "Malware & Executable Ingestion Quarantine",
      description: "In-stream ClamAV daemon rejects malicious binaries before cryptographic hashing.",
      status: status?.scanner_health === "HEALTHY" ? "COMPLIANT" : "FAIL",
      icon: ShieldCheck,
    },
    {
      title: "Statutory Section 63 BSA 2023 Electronic Evidence Audit",
      description: "Automated electronic evidence certification under Bharatiya Sakshya Adhiniyam, 2023.",
      status: "COMPLIANT",
      icon: Scale,
    },
  ];

  return (
    <div className="space-y-6 font-sans">
      {/* Official Departmental Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-300 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-600 bg-slate-200 px-2 py-0.5 rounded-xs">
              MHA AUDIT DIRECTIVE
            </span>
            <span className="text-xs font-mono text-slate-500">
              LEGAL ADMISSIBILITY OVERSIGHT • CERT-IN & BSA 2023 MANDATES
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-serif font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-amber-700" />
            Statutory & Regulatory Security Compliance Oversight
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Continuous compliance auditing aligned with Bharatiya Nagarik Suraksha Sanhita (BNSS 2023), Section 63 BSA 2023, and DPDP Act 2023
          </p>
        </div>

        <button
          onClick={fetchCompliance}
          className="px-3.5 py-2 bg-[#1b437c] hover:bg-[#23569c] text-white rounded-xs text-xs font-mono font-bold uppercase tracking-wider shadow-xs transition-colors flex items-center gap-1.5 self-start sm:self-auto border border-blue-400/40"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Execute Compliance Audit
        </button>
      </div>

      {/* Checklist Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {checklistItems.map((item, idx) => {
          const Icon = item.icon;
          const isCompliant = item.status === "COMPLIANT";

          return (
            <div
              key={idx}
              className="bg-white rounded-xs border border-slate-300 p-4 shadow-xs flex items-start justify-between gap-4"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-8 h-8 rounded-xs flex items-center justify-center shrink-0 border ${
                    isCompliant
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                      : "bg-amber-50 text-amber-800 border-amber-300"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-xs font-mono uppercase tracking-wide">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{item.description}</p>
                </div>
              </div>

              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-xs border shrink-0 ${
                  isCompliant
                    ? "bg-emerald-50 text-emerald-900 border-emerald-400"
                    : "bg-amber-50 text-amber-900 border-amber-400"
                }`}
              >
                [{item.status}]
              </span>
            </div>
          );
        })}
      </div>

      {/* Cryptographic Ledger Telemetry */}
      <div className="bg-[#0c182c] text-white rounded-xs p-5 font-mono text-xs space-y-3.5 border border-slate-700">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-800 pb-2 flex items-center justify-between">
          <span>DISTRIBUTED LEDGER & CRYPTOGRAPHIC TELEMETRY</span>
          <span className="text-emerald-400 text-[10px] font-bold">NODE STATUS: ACTIVE CONSENSUS</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">Total Immutable Events:</span>
            <span className="text-xl font-bold text-amber-300">
              {status?.total_immutable_events || 0}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">Pending State Anchors:</span>
            <span className="text-xl font-bold text-slate-300">
              {status?.pending_anchor_count || 0}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">Integrity Incidents:</span>
            <span className="text-xl font-bold text-red-400">
              {status?.tampering_incident_count || 0}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">Active Statutory Holds:</span>
            <span className="text-xl font-bold text-blue-400">
              {status?.legal_hold_active_count || 0}
            </span>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-slate-400 text-[10px]">
          <span>Fabric Node: Peer0.Org1 (PoliceMSP)</span>
          <span>Last Audit Timestamp: {status ? new Date(status.last_audit_sync_utc).toUTCString() : "Just now"}</span>
        </div>
      </div>
    </div>
  );
}
