"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Case, Document, ComplianceStatus } from "@/types";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { IntegrityModal } from "@/components/integrity-modal";
import {
  Briefcase,
  FolderArchive,
  FileUp,
  ShieldCheck,
  AlertTriangle,
  Scale,
  Cpu,
  Layers,
  CheckCircle2,
  Lock,
  ArrowRight,
  RefreshCw,
  FileText,
  AlertOctagon,
} from "lucide-react";

export default function JurisdictionalDashboard() {
  const { user } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [compliance, setCompliance] = useState<ComplianceStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Verification Modal State
  const [verifyDoc, setVerifyDoc] = useState<Document | null>(null);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [casesData, docsData, compData] = await Promise.all([
        apiRequest<Case[]>("/api/v1/cases"),
        apiRequest<Document[]>("/api/v1/documents"),
        apiRequest<ComplianceStatus>("/api/v1/compliance/checklist").catch(() => null),
      ]);
      setCases(casesData || []);
      setDocuments(docsData || []);
      setCompliance(compData);
    } catch (err) {
      console.error("Error loading jurisdictional dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const totalExhibits = documents.length;
  const tamperedCount = documents.filter((d) => d.status === "INCIDENT_LOCKED" || d.is_simulated_tampered).length;
  const verifiedCount = documents.filter((d) => d.status === "ACTIVE" && !d.is_simulated_tampered).length;

  return (
    <div className="space-y-6 font-sans">
      {/* Official Government Emblem Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-300 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-600 bg-slate-200 px-2 py-0.5 rounded-xs">
              ICJS SECURE EVIDENCE GATEWAY
            </span>
            <span className="text-xs font-mono text-slate-500">
              BHARATIYA SAKSHYA ADHINIYAM (BSA 2023) • SEC 63 COMPLIANT
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-serif font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <Scale className="w-5 h-5 text-amber-700" />
            NyayRaksha — Jurisdictional Evidence & Case Repository
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Tamper-evident legal and investigation document management with verifiable chain of custody
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link
            href="/documents/upload"
            className="px-3.5 py-2 bg-[#1b437c] hover:bg-[#23569c] text-white rounded-xs text-xs font-mono font-bold uppercase tracking-wider shadow-xs transition-colors flex items-center gap-1.5 border border-blue-400/40"
          >
            <FileUp className="w-3.5 h-3.5" /> Ingest New Exhibit
          </Link>
          <button
            onClick={loadDashboardData}
            title="Refresh Ledger Telemetry"
            className="p-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xs text-xs transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Hero Telemetry Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xs border border-slate-300 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider">
              Active Case Dockets
            </span>
            <Briefcase className="w-4 h-4 text-blue-700" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-2">
            {cases.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-mono">
            Under Investigation / In Trial
          </div>
        </div>

        <div className="bg-white rounded-xs border border-slate-300 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider">
              Total Evidence Exhibits
            </span>
            <FolderArchive className="w-4 h-4 text-teal-700" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-2">
            {totalExhibits}
          </div>
          <div className="text-[11px] text-emerald-700 font-mono font-semibold">
            {verifiedCount} Encrypted & Anchored
          </div>
        </div>

        <div className="bg-white rounded-xs border border-slate-300 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider">
              Ledger Consensus State
            </span>
            <Cpu className="w-4 h-4 text-amber-700" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700 mt-2 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            ACTIVE
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-mono">
            Hyperledger Fabric / Mock Synced
          </div>
        </div>

        <div className="bg-white rounded-xs border border-slate-300 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider">
              Integrity Incidents
            </span>
            <AlertOctagon className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-red-600 mt-2">
            {tamperedCount}
          </div>
          <div className="text-[11px] text-red-700 font-mono font-semibold">
            {tamperedCount > 0 ? "Compromised & Locked" : "Zero Breaches"}
          </div>
        </div>
      </div>

      {/* Tamper Demonstration Showcase Card */}
      <div className="p-4 bg-gradient-to-r from-[#0c182c] to-[#162744] text-white rounded-xs border border-slate-700 shadow-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold uppercase rounded-xs">
                JUDGE EVALUATION DEMO
              </span>
              <span className="text-xs font-mono text-slate-300">
                Mathematical Tampering Proof
              </span>
            </div>
            <h3 className="text-base font-bold tracking-tight text-white flex items-center gap-2 font-serif">
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              Live 3-Way Cryptographic Reconciliation & Lockdown
            </h3>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Experience the core security engine: verify an authentic exhibit to see instant proof validation, or test the deliberately tampered exhibit (<code className="text-amber-300 bg-slate-900/60 px-1 py-0.2 rounded-xs">DOC-005</code>) to watch the system detect a byte mismatch, shift to <strong className="text-red-400">INCIDENT_LOCKED</strong>, and freeze downloads.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {documents.find((d) => d.is_simulated_tampered) && (
              <button
                onClick={() => setVerifyDoc(documents.find((d) => d.is_simulated_tampered)!)}
                className="px-3.5 py-2 bg-red-700 hover:bg-red-800 text-white rounded-xs text-xs font-mono font-bold uppercase tracking-wider shadow-xs transition-colors flex items-center gap-1.5 border border-red-500"
              >
                <AlertTriangle className="w-3.5 h-3.5" /> Test Tamper Detection
              </button>
            )}
            {documents[0] && (
              <button
                onClick={() => setVerifyDoc(documents[0])}
                className="px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xs text-xs font-mono font-bold uppercase tracking-wider shadow-xs transition-colors flex items-center gap-1.5 border border-teal-500"
              >
                <ShieldCheck className="w-3.5 h-3.5" /> Test Authentic Verification
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Dual Column: Active Cases and Recent Exhibits */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Active Cases (1/3) */}
        <div className="bg-white rounded-xs border border-slate-300 shadow-xs p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-blue-700" /> Case Dockets
            </h2>
            <Link
              href="/cases"
              className="text-[11px] font-mono text-blue-700 hover:text-blue-900 font-semibold"
            >
              View All &rarr;
            </Link>
          </div>

          <div className="space-y-2.5">
            {cases.slice(0, 4).map((c) => (
              <Link
                key={c.id}
                href={`/cases/${c.id}`}
                className="block p-3 rounded-xs border border-slate-200 hover:border-blue-700 hover:bg-slate-50 transition-all"
              >
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="font-bold text-blue-800">{c.fir_number || c.id}</span>
                  <span className="px-1.5 py-0.2 rounded-xs text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                    {c.status}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-900 mt-1 line-clamp-1">
                  {c.title}
                </h4>
                <p className="text-[10px] text-slate-500 font-mono mt-1">
                  {c.jurisdiction}
                </p>
              </Link>
            ))}
          </div>
        </div>

        {/* Right Column: Evidence Exhibits Repository (2/3) */}
        <div className="lg:col-span-2 bg-white rounded-xs border border-slate-300 shadow-xs p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <FolderArchive className="w-3.5 h-3.5 text-teal-700" /> Evidence Exhibits & Chains of Custody
            </h2>
            <Link
              href="/documents"
              className="text-[11px] font-mono text-blue-700 hover:text-blue-900 font-semibold"
            >
              View Repository &rarr;
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-300 text-[10px] text-slate-500 uppercase bg-slate-50">
                  <th className="p-2">Exhibit / Title</th>
                  <th className="p-2">Docket</th>
                  <th className="p-2">Type</th>
                  <th className="p-2">Integrity Status</th>
                  <th className="p-2 text-right">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {documents.slice(0, 6).map((doc) => {
                  const isTampered = doc.status === "INCIDENT_LOCKED" || doc.is_simulated_tampered;
                  return (
                    <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-2">
                        <Link
                          href={`/documents/${doc.id}`}
                          className="font-bold text-slate-900 hover:text-blue-700 block truncate max-w-[200px]"
                        >
                          {doc.title}
                        </Link>
                        <span className="text-[10px] text-slate-400 block truncate">
                          {doc.id}
                        </span>
                      </td>
                      <td className="p-2 text-blue-700 font-bold">{doc.case_id}</td>
                      <td className="p-2 text-slate-600">{doc.document_type}</td>
                      <td className="p-2">
                        {isTampered ? (
                          <span className="px-2 py-0.5 rounded-xs text-[10px] font-bold bg-red-100 text-red-800 border border-red-300">
                            INCIDENT LOCKED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-xs text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            ACTIVE ANCHOR
                          </span>
                        )}
                      </td>
                      <td className="p-2 text-right">
                        <button
                          onClick={() => setVerifyDoc(doc)}
                          className={`px-2.5 py-1 rounded-xs text-[10px] font-bold uppercase transition-colors border ${
                            isTampered
                              ? "bg-red-50 text-red-800 border-red-300 hover:bg-red-100"
                              : "bg-teal-50 text-teal-800 border-teal-300 hover:bg-teal-100"
                          }`}
                        >
                          Verify Hash
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Interactive Integrity Modal */}
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
