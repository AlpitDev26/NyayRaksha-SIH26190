"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Document } from "@/types";
import { apiRequest } from "@/lib/api";
import { IntegrityModal } from "@/components/integrity-modal";
import { FolderArchive, Search, ShieldCheck, AlertOctagon } from "lucide-react";

export default function EvidenceRepositoryPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [verifyDoc, setVerifyDoc] = useState<Document | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadDocuments() {
      try {
        const data = await apiRequest<Document[]>("/api/v1/documents");
        setDocuments(data);
      } catch (err) {
        console.error("Documents fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDocuments();
  }, []);

  const filteredDocuments = documents.filter(
    (d) =>
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.case_id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 space-y-6 font-sans">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <FolderArchive className="w-6 h-6 text-teal-700" />
          Electronic Case Files (Evidence Repository)
        </h1>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by title or case ID..."
            className="pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 font-mono">Loading repository...</div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-xs font-bold text-slate-500 uppercase">
                <th className="p-4">Exhibit / Title</th>
                <th className="p-4">Docket</th>
                <th className="p-4">Type</th>
                <th className="p-4">Classification</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Integrity Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDocuments.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50">
                  <td className="p-4 font-medium text-slate-900">
                    <Link href={`/documents/${doc.id}`} className="hover:text-blue-700 hover:underline">
                      {doc.title}
                    </Link>
                  </td>
                  <td className="p-4 text-blue-700 font-mono">{doc.case_id}</td>
                  <td className="p-4 text-slate-600">{doc.document_type}</td>
                  <td className="p-4">
                    <span className="px-2 py-1 rounded bg-slate-100 text-slate-700 text-xs font-mono">
                      {doc.classification}
                    </span>
                  </td>
                  <td className="p-4">
                    {doc.is_simulated_tampered ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700">
                        <AlertOctagon className="w-3.5 h-3.5" />
                        INCIDENT_LOCKED
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        ACTIVE
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => setVerifyDoc(doc)}
                      className="px-3 py-1.5 bg-slate-900 text-white rounded text-xs font-bold hover:bg-slate-800 transition"
                    >
                      Verify
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
