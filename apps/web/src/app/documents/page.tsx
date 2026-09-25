"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Document } from "@/types";
import { apiRequest } from "@/lib/api";
import { ClassificationBadge, IntegrityBadge } from "@/components/ui/badges";
import { IntegrityModal } from "@/components/integrity-modal";
import {
  FileText,
  Search,
  Filter,
  ShieldCheck,
  FileUp,
  ExternalLink,
  Eye,
  History,
  Scale,
  FolderArchive,
} from "lucide-react";

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [classFilter, setClassFilter] = useState<string>("");
  const [verifyDoc, setVerifyDoc] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    async function fetchDocuments() {
      try {
        let query = "/api/v1/documents?";
        if (typeFilter) query += `doc_type=${typeFilter}&`;
        if (classFilter) query += `classification=${classFilter}&`;
        if (search) query += `search=${search}&`;
        const data = await apiRequest<Document[]>(query);
        setDocuments(data);
      } catch (err) {
        console.error("Error fetching documents:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchDocuments();
  }, [search, typeFilter, classFilter]);

  return (
    <div className="space-y-6 font-sans">
      {/* Official Departmental Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-300 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-600 bg-slate-200 px-2 py-0.5 rounded-xs">
              SEC 63 BSA 2023 VAULT
            </span>
            <span className="text-xs font-mono text-slate-500">
              NATIONAL EVIDENCE & CASE EXHIBIT REPOSITORY • HYPERLEDGER FABRIC ANCHORED
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-serif font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <FolderArchive className="w-5 h-5 text-amber-700" />
            Electronic Evidence & Case Exhibit Repository
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Cryptographically anchored First Information Reports, seizure memos, CFSL examination reports, and judicial filings
          </p>
        </div>

        <Link
          href="/documents/upload"
          className="px-3.5 py-2 bg-[#1b437c] hover:bg-[#23569c] text-white rounded-xs text-xs font-bold uppercase tracking-wider shadow-xs transition-colors flex items-center gap-1.5 self-start sm:self-auto border border-blue-400/40"
        >
          <FileUp className="w-3.5 h-3.5" /> Ingest Exhibit Record
        </Link>
      </div>

      {/* High-Density Filter & Query Bar */}
      <div className="bg-white p-3.5 rounded-xs border border-slate-300 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by Exhibit Name, Case ID, SHA-256 Digest, or Tag..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xs focus:outline-none focus:ring-1 focus:ring-blue-700 font-mono"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 text-slate-800 rounded-xs px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-700"
          >
            <option value="">ALL RECORD NATURES</option>
            <option value="FIR">FIRST INFORMATION REPORT (FIR)</option>
            <option value="WITNESS_STATEMENT">WITNESS DEPOSITION (SEC 180 BNSS)</option>
            <option value="FORENSIC_REPORT">CFSL FORENSIC REPORT</option>
            <option value="EVIDENCE_ITEM">SEIZURE MEMO / PHYSICAL EXHIBIT</option>
            <option value="CHARGE_SHEET">FINAL REPORT / CHARGE SHEET (SEC 193 BNSS)</option>
            <option value="COURT_ORDER">JUDICIAL ORDER / BENCH NOTICE</option>
          </select>

          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 text-slate-800 rounded-xs px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-700"
          >
            <option value="">ALL CLASSIFICATIONS</option>
            <option value="PUBLIC">PUBLIC DOCKET</option>
            <option value="INTERNAL">INTERNAL DEPARTMENTAL</option>
            <option value="CONFIDENTIAL">CONFIDENTIAL</option>
            <option value="RESTRICTED">RESTRICTED (INVESTIGATION)</option>
            <option value="SEALED">COURT SEALED EXHIBIT</option>
          </select>
        </div>
      </div>

      {/* Official Exhibits Register Table */}
      <div className="bg-white rounded-xs border border-slate-300 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-sans text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-700 text-[10px] font-mono uppercase tracking-wider border-b border-slate-300">
                <th className="py-2.5 px-3.5 font-bold border-r border-slate-200">EXHIBIT TITLE & IDENTIFIER</th>
                <th className="py-2.5 px-3.5 font-bold border-r border-slate-200">DOCKET REF (CASE)</th>
                <th className="py-2.5 px-3.5 font-bold border-r border-slate-200">RECORD CLASS</th>
                <th className="py-2.5 px-3.5 font-bold border-r border-slate-200">STATUTORY LEVEL</th>
                <th className="py-2.5 px-3.5 font-bold border-r border-slate-200">REVISION</th>
                <th className="py-2.5 px-3.5 font-bold border-r border-slate-200">BSA 2023 INTEGRITY SEAL</th>
                <th className="py-2.5 px-3.5 font-bold text-right">PROCEDURAL ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {documents.map((doc) => (
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
                      EXHIBIT ID: {doc.id} • SHA-256: {doc.current_hash ? `${doc.current_hash.slice(0, 16)}...` : "GENESIS_ROOT"}
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

                  <td className="py-2.5 px-3.5 font-mono text-[10px] font-bold text-slate-800 border-r border-slate-200">
                    REV-0{doc.current_version}
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

                    <Link
                      href={`/documents/${doc.id}`}
                      className="px-2 py-1 text-[10px] font-mono font-bold text-slate-700 hover:text-slate-900 border border-slate-300 rounded-xs transition-colors inline-flex items-center gap-1 uppercase"
                    >
                      <Eye className="w-3 h-3 text-slate-600" /> Inspect
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
