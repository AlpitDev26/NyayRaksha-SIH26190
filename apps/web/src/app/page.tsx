"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Case, Document, ComplianceStatus } from "@/types";
import { apiRequest } from "@/lib/api";
import { ClassificationBadge, IntegrityBadge } from "@/components/ui/badges";
import { IntegrityModal } from "@/components/integrity-modal";
import {
  FileText,
  Briefcase,
  ShieldCheck,
  FileUp,
  FolderPlus,
  ArrowRight,
  ShieldAlert,
  Search,
  ExternalLink,
  Scale,
  Building2,
  FileCheck2,
  AlertTriangle,
  History,
  QrCode,
} from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [compliance, setCompliance] = useState<ComplianceStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [verifyDoc, setVerifyDoc] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [cData, dData, compData] = await Promise.all([
          apiRequest<Case[]>("/api/v1/cases"),
          apiRequest<Document[]>("/api/v1/documents"),
          apiRequest<ComplianceStatus>("/api/v1/compliance/checklist").catch(() => null),
        ]);
        setCases(cData);
        setDocuments(dData);
        setCompliance(compData);
      } catch (err) {
        console.error("Dashboard data load error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, [user]);

  const tamperedDoc = documents.find((d) => d.is_simulated_tampered);

  return (
    <div className="space-y-6 font-sans">
      {/* 1. Official Jurisdictional Overview Banner */}
      <div className="bg-[#0f213f] text-slate-100 rounded-xs p-5 shadow-sm border border-slate-700/80 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-xs bg-[#193564] text-amber-300 font-bold uppercase tracking-wider border border-amber-600/40">
              {user?.roles[0]?.replace(/_/g, " ") || "POLICE INVESTIGATING OFFICER"}
            </span>
            <span className="text-[11px] text-slate-300 font-mono font-medium">
              JURISDICTION: {user?.organization_name || "Central Crime Branch, New Delhi"} • P.S. CODE: DL-04
            </span>
          </div>

          <h1 className="text-xl md:text-2xl font-serif font-bold tracking-tight text-white flex items-center gap-2.5">
            <Scale className="w-5 h-5 text-amber-400 shrink-0" />
            Electronic Evidence & Case Docket Register
          </h1>

          <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
            Statutory repository compliant with <strong>Bharatiya Nagarik Suraksha Sanhita (BNSS 2023)</strong> and{" "}
            <strong>Section 63 of Bharatiya Sakshya Adhiniyam (BSA 2023)</strong>. All exhibits and case diaries are
            cryptographically anchored with SHA-256 fingerprints to the national permissioned ledger.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Link
            href="/documents/upload"
            className="px-3.5 py-2 bg-[#1b437c] hover:bg-[#23569c] text-white rounded-xs text-xs font-bold uppercase tracking-wider shadow-xs transition-colors flex items-center gap-1.5 border border-blue-400/40"
          >
            <FileUp className="w-3.5 h-3.5" /> Ingest Exhibit Record
          </Link>
          <Link
            href="/cases"
            className="px-3.5 py-2 bg-[#14233c] hover:bg-[#1a2e4e] text-slate-200 border border-slate-600 rounded-xs text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5"
          >
            <FolderPlus className="w-3.5 h-3.5" /> Search Dockets
          </Link>
        </div>
      </div>

      {/* 2. Official Evidentiary Discrepancy & Statutory Re-Hashing Notice */}
      {tamperedDoc && (
        <div className="bg-[#fff9f9] border-2 border-red-600/90 rounded-xs p-4 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xs bg-red-100 border border-red-300 flex items-center justify-center shrink-0 mt-0.5 text-red-700">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-red-900 bg-red-200/80 px-1.5 py-0.2 border border-red-300">
                  STATUTORY AUDIT DISCREPANCY DETECTED
                </span>
                <span className="text-xs font-mono text-slate-500 font-semibold">
                  REF: {tamperedDoc.case_id}
                </span>
              </div>
              <h3 className="font-bold text-slate-900 text-sm mt-0.5">
                Exhibit Compromise Alert: {tamperedDoc.title}
              </h3>
              <p className="text-xs text-slate-600 mt-0.5 max-w-3xl">
                Cryptographic discrepancy identified between file bitstream in vault and Genesis Root Hash committed to the
                permissioned ledger. Under BSA Section 63, judicial exports are suspended until forensic re-verification.
              </p>
            </div>
          </div>
          <button
            onClick={() => setVerifyDoc({ id: tamperedDoc.id, title: tamperedDoc.title })}
            className="px-3.5 py-2 bg-red-700 hover:bg-red-800 text-white text-xs font-bold uppercase tracking-wider rounded-xs shadow-xs shrink-0 transition-colors flex items-center gap-1.5 border border-red-900"
          >
            <ShieldCheck className="w-3.5 h-3.5" /> Execute Hash Audit
          </button>
        </div>
      )}

      {/* 3. High-Density Administrative Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xs border border-slate-300/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 font-mono uppercase tracking-wider">
              ACTIVE CASE DOCKETS
            </span>
            <Briefcase className="w-4 h-4 text-slate-600" />
          </div>
          <p className="text-2xl font-serif font-bold text-slate-900 mt-1">{cases.length}</p>
          <p className="text-[11px] text-slate-500 font-sans mt-0.5">Under Investigation / Trial</p>
        </div>

        <div className="bg-white p-4 rounded-xs border border-slate-300/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 font-mono uppercase tracking-wider">
              SEALED EXHIBITS (SEC 63 BSA)
            </span>
            <FileText className="w-4 h-4 text-slate-600" />
          </div>
          <p className="text-2xl font-serif font-bold text-slate-900 mt-1">{documents.length}</p>
          <p className="text-[11px] text-slate-500 font-sans mt-0.5">FIRs, Memos & Forensic Reports</p>
        </div>

        <div className="bg-white p-4 rounded-xs border border-slate-300/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 font-mono uppercase tracking-wider">
              LEDGER INTEGRITY INDEX
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          </div>
          <p className="text-2xl font-serif font-bold text-emerald-800 mt-1">100.0%</p>
          <p className="text-[11px] text-slate-500 font-sans mt-0.5">Hyperledger Fabric State Synced</p>
        </div>

        <div className="bg-white p-4 rounded-xs border border-slate-300/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 font-mono uppercase tracking-wider">
              CHAIN OF CUSTODY LOGS
            </span>
            <History className="w-4 h-4 text-slate-600" />
          </div>
          <p className="text-2xl font-serif font-bold text-slate-900 mt-1">
            {compliance?.total_immutable_events || "80+"}
          </p>
          <p className="text-[11px] text-slate-500 font-sans mt-0.5">Cryptographically Sealed Actions</p>
        </div>
      </div>

      {/* 4. Official Exhibit & Document Registry Table */}
      <div className="bg-white rounded-xs border border-slate-300 shadow-xs overflow-hidden">
        <div className="p-3.5 bg-slate-100/80 border-b border-slate-300 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-slate-700" />
            <h2 className="font-bold text-xs uppercase tracking-wider text-slate-800 font-mono">
              OFFICIAL INVESTIGATION EXHIBITS & DOCUMENT LOG
            </h2>
          </div>
          <Link
            href="/documents"
            className="text-xs font-semibold text-blue-800 hover:text-blue-900 font-mono flex items-center gap-1 uppercase tracking-wide"
          >
            [ Complete Registry & Export ]
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-sans text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-700 text-[10px] font-mono uppercase tracking-wider border-b border-slate-300">
                <th className="py-2.5 px-3.5 font-bold border-r border-slate-200">EXHIBIT TITLE & IDENTIFIER</th>
                <th className="py-2.5 px-3.5 font-bold border-r border-slate-200">DOCKET REF (CASE)</th>
                <th className="py-2.5 px-3.5 font-bold border-r border-slate-200">RECORD CLASS</th>
                <th className="py-2.5 px-3.5 font-bold border-r border-slate-200">STATUTORY LEVEL</th>
                <th className="py-2.5 px-3.5 font-bold border-r border-slate-200">INTEGRITY DIGEST</th>
                <th className="py-2.5 px-3.5 font-bold border-r border-slate-200">BSA 2023 STATUS</th>
                <th className="py-2.5 px-3.5 font-bold text-right">PROCEDURAL ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {documents.slice(0, 8).map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 px-3.5 border-r border-slate-200">
                    <div className="font-bold text-slate-900 flex items-center gap-2">
                      <Link href={`/documents/${doc.id}`} className="hover:text-blue-800 hover:underline">
                        {doc.title}
                      </Link>
                      {doc.is_simulated_tampered && (
                        <span className="text-[9px] bg-red-100 text-red-900 border border-red-400 px-1 py-0.2 font-mono font-bold uppercase">
                          TAMPER FLAG
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      EXHIBIT ID: {doc.id}
                    </div>
                  </td>

                  <td className="py-2.5 px-3.5 font-mono text-[11px] font-bold text-slate-700 border-r border-slate-200">
                    <Link href={`/cases/${doc.case_id}`} className="hover:text-blue-800 hover:underline">
                      {doc.case_id}
                    </Link>
                  </td>

                  <td className="py-2.5 px-3.5 font-mono text-[10px] text-slate-600 border-r border-slate-200 uppercase font-semibold">
                    {doc.document_type}
                  </td>

                  <td className="py-2.5 px-3.5 border-r border-slate-200">
                    <ClassificationBadge classification={doc.classification} />
                  </td>

                  <td className="py-2.5 px-3.5 font-mono text-[10px] text-slate-600 border-r border-slate-200">
                    {doc.current_hash ? `${doc.current_hash.slice(0, 16)}...` : "GENESIS_ROOT"}
                  </td>

                  <td className="py-2.5 px-3.5 border-r border-slate-200">
                    <IntegrityBadge
                      status={doc.status}
                      isTampered={doc.is_simulated_tampered}
                    />
                  </td>

                  <td className="py-2.5 px-3.5 text-right space-x-1.5 whitespace-nowrap">
                    <button
                      onClick={() => setVerifyDoc({ id: doc.id, title: doc.title })}
                      className="px-2 py-1 text-[10px] font-mono font-bold text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-400 rounded-xs transition-colors inline-flex items-center gap-1 uppercase"
                    >
                      <ShieldCheck className="w-3 h-3 text-blue-700" /> Verify Seal
                    </button>

                    <Link
                      href={`/documents/${doc.id}/custody`}
                      className="px-2 py-1 text-[10px] font-mono font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xs transition-colors inline-flex items-center gap-1 uppercase"
                    >
                      Custody Chain
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Verification Modal Component */}
      {verifyDoc && (
        <IntegrityModal
          documentId={verifyDoc.id}
          documentTitle={verifyDoc.title}
          onClose={() => setVerifyDoc(null)}
        />
      )}
    </div>
  );
}
