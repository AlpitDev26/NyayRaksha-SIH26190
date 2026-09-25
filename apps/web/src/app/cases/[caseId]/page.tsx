"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Case, Document } from "@/types";
import { apiRequest } from "@/lib/api";
import { ClassificationBadge, IntegrityBadge } from "@/components/ui/badges";
import { IntegrityModal } from "@/components/integrity-modal";
import {
  Briefcase,
  ArrowLeft,
  FileText,
  Clock,
  ShieldCheck,
  UserCheck,
  FileUp,
  Tag,
  AlertOctagon,
} from "lucide-react";

export default function CaseDetailPage() {
  const { caseId } = useParams();
  const [caseItem, setCaseItem] = useState<Case | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [verifyDoc, setVerifyDoc] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    async function loadCaseData() {
      if (!caseId) return;
      try {
        const [cData, dData] = await Promise.all([
          apiRequest<Case>(`/api/v1/cases/${caseId}`),
          apiRequest<Document[]>(`/api/v1/documents?case_id=${caseId}`),
        ]);
        setCaseItem(cData);
        setDocuments(dData);
      } catch (err) {
        console.error("Error loading case:", err);
      } finally {
        setLoading(false);
      }
    }
    loadCaseData();
  }, [caseId]);

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 font-mono">
        Retrieving case dossier from registry...
      </div>
    );
  }

  if (!caseItem) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
        <h2 className="text-base font-bold text-slate-900">Case Not Found</h2>
        <Link href="/cases" className="text-blue-600 text-xs font-semibold mt-2 inline-block">
          &larr; Back to Case Registry
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/cases"
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Cases
        </Link>
        <Link
          href={`/cases/${caseItem.id}/timeline`}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <Clock className="w-3.5 h-3.5" /> View Case Timeline
        </Link>
      </div>

      {/* Case Dossier Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                {caseItem.id}
              </span>
              {caseItem.fir_number && (
                <span className="font-mono text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                  FIR: {caseItem.fir_number}
                </span>
              )}
              <ClassificationBadge classification={caseItem.classification} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{caseItem.title}</h1>
          </div>

          <Link
            href={`/documents/upload?caseId=${caseItem.id}`}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
          >
            <FileUp className="w-4 h-4" /> Add Evidence to Case
          </Link>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed">{caseItem.summary}</p>

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100 text-xs font-mono">
          <div>
            <span className="text-slate-400 block">Category:</span>
            <span className="font-bold text-slate-800">{caseItem.category}</span>
          </div>
          <div>
            <span className="text-slate-400 block">Status:</span>
            <span className="font-bold text-slate-800">{caseItem.status}</span>
          </div>
          <div>
            <span className="text-slate-400 block">Priority:</span>
            <span className="font-bold text-red-600">{caseItem.priority}</span>
          </div>
          <div>
            <span className="text-slate-400 block">Jurisdiction:</span>
            <span className="font-bold text-slate-800">{caseItem.jurisdiction}</span>
          </div>
        </div>
      </div>

      {/* Case Document Manifest Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-base text-slate-900">Case Evidence Manifest</h2>
            <p className="text-xs text-slate-500">
              {documents.length} verified digital items cataloged for judicial custody
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-sans text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-mono uppercase border-b border-slate-200">
                <th className="py-3 px-4 font-semibold">Exhibit Title</th>
                <th className="py-3 px-4 font-semibold">Type</th>
                <th className="py-3 px-4 font-semibold">Classification</th>
                <th className="py-3 px-4 font-semibold">SHA-256 Fingerprint</th>
                <th className="py-3 px-4 font-semibold">Integrity</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-slate-900">
                    <Link href={`/documents/${doc.id}`} className="hover:text-blue-600">
                      {doc.title}
                    </Link>
                    {doc.is_simulated_tampered && (
                      <span className="ml-2 text-[10px] bg-red-100 text-red-700 px-1.5 py-0.2 rounded font-mono font-bold">
                        DEMO TAMPERED
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-xs text-slate-500">{doc.document_type}</td>
                  <td className="py-3.5 px-4">
                    <ClassificationBadge classification={doc.classification} />
                  </td>
                  <td className="py-3.5 px-4 font-mono text-xs text-slate-400">
                    {doc.current_hash ? `${doc.current_hash.slice(0, 16)}...` : "Genesis"}
                  </td>
                  <td className="py-3.5 px-4">
                    <IntegrityBadge
                      status={doc.status}
                      isTampered={doc.is_simulated_tampered}
                    />
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-2">
                    <button
                      onClick={() => setVerifyDoc({ id: doc.id, title: doc.title })}
                      className="px-2.5 py-1 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-300 rounded-lg transition-colors inline-flex items-center gap-1"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" /> Verify
                    </button>
                    <Link
                      href={`/documents/${doc.id}/custody`}
                      className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors inline-flex items-center gap-1"
                    >
                      Custody
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
