"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Case, DocumentReceipt } from "@/types";
import { apiRequest } from "@/lib/api";
import { IntegrityModal } from "@/components/integrity-modal";
import {
  FileUp,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ArrowRight,
  FileText,
  Lock,
} from "lucide-react";

export default function DocumentUploadPageWrapped() { return <React.Suspense fallback={<div>Loading...</div>}><DocumentUploadPage /></React.Suspense>; }

function DocumentUploadPage() {
  const searchParams = useSearchParams();
  const preselectedCase = searchParams.get("caseId") || "";

  const [cases, setCases] = useState<Case[]>([]);
  const [caseId, setCaseId] = useState<string>(preselectedCase);
  const [title, setTitle] = useState<string>("");
  const [docType, setDocType] = useState<string>("FIR");
  const [classification, setClassification] = useState<string>("RESTRICTED");
  const [description, setDescription] = useState<string>("");
  const [tags, setTags] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<DocumentReceipt | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [verifyModal, setVerifyModal] = useState<boolean>(false);

  useEffect(() => {
    async function loadCases() {
      try {
        const data = await apiRequest<Case[]>("/api/v1/cases");
        setCases(data);
        if (!caseId && data.length > 0) {
          setCaseId(data[0].id);
        }
      } catch (err) {
        console.error("Error loading cases:", err);
      }
    }
    loadCases();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      if (!title) {
        setTitle(selected.name.replace(/\.[^/.]+$/, "").replace(/_/g, " "));
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a valid document file to upload.");
      return;
    }
    if (!caseId) {
      setError("Please designate a target case reference.");
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("case_id", caseId);
    formData.append("title", title);
    formData.append("document_type", docType);
    formData.append("classification", classification);
    if (description) formData.append("description", description);
    if (tags) formData.append("tags", tags);

    try {
      const result = await apiRequest<DocumentReceipt>("/api/v1/documents/upload", {
        method: "POST",
        body: formData,
      });
      setReceipt(result);
    } catch (err: any) {
      setError(err.message || "Upload and cryptographic anchoring failed.");
    } finally {
      setLoading(false);
    }
  };

  const copyReceiptData = () => {
    if (receipt) {
      navigator.clipboard.writeText(
        `NyayRaksha Ingestion Receipt:\nID: ${receipt.document_id}\nSHA-256: ${receipt.sha256_hash}\nTxID: ${receipt.blockchain_tx_id}\nTimestamp: ${receipt.timestamp_utc}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 font-sans">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <FileUp className="w-6 h-6 text-teal-600" /> Secure Evidence Ingestion & Anchoring
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Files are virus scanned in-stream, encrypted at rest (AES-256-GCM), and cryptographically anchored to Hyperledger Fabric.
        </p>
      </div>

      {!receipt ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2 mb-4">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleUpload} className="space-y-5 text-sm">
            {/* File Dropzone */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Evidence Document File * (PDF, DOCX, TXT, PNG, JPG, TIFF)
              </label>
              <div className="border-2 border-dashed border-slate-300 hover:border-teal-500 rounded-xl p-6 text-center bg-slate-50/60 transition-colors">
                <input
                  type="file"
                  id="evidence-file"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="evidence-file" className="cursor-pointer space-y-2 block">
                  <div className="w-10 h-10 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mx-auto">
                    <FileText className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-slate-700">
                    {file ? file.name : "Click to select or drag and drop exhibit file"}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Max size: 25MB &bull; Automatic MIME validation & antivirus scanning
                  </p>
                </label>
              </div>
            </div>

            {/* Case Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Target Case Reference *
              </label>
              <select
                value={caseId}
                onChange={(e) => setCaseId(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-mono"
              >
                {cases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.id} — {c.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Document / Exhibit Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., FIR Supplementary Statement No. 3"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
              />
            </div>

            {/* Type & Classification */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Document Type *
                </label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                >
                  <option value="FIR">FIR</option>
                  <option value="WITNESS_STATEMENT">Witness Statement</option>
                  <option value="FORENSIC_REPORT">Forensic Report</option>
                  <option value="EVIDENCE_ITEM">Evidence Item</option>
                  <option value="CHARGE_SHEET">Charge Sheet</option>
                  <option value="COURT_ORDER">Court Order</option>
                  <option value="POLICE_REPORT">Police Report</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Security Classification *
                </label>
                <select
                  value={classification}
                  onChange={(e) => setClassification(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                >
                  <option value="PUBLIC">Public</option>
                  <option value="INTERNAL">Internal</option>
                  <option value="CONFIDENTIAL">Confidential</option>
                  <option value="RESTRICTED">Restricted</option>
                  <option value="SEALED">Sealed</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Custodial Description / Chain of Intake Notes
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Details of evidence acquisition, officer badge number, location of seizure..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Tags (Comma separated)
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g., fir, statement, cyber, seizure"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
              />
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <Link
                href="/documents"
                className="px-4 py-2 border border-slate-300 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg shadow-md transition-all flex items-center gap-2"
              >
                {loading ? "Processing & Anchoring Proof..." : "Ingest & Anchor to Blockchain"}
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Ingestion Receipt Screen */
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xl space-y-6">
          <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-bold text-emerald-950 text-base">
                Cryptographic Ingestion Complete & Anchored!
              </h2>
              <p className="text-xs text-emerald-800 mt-1">
                The document has been securely stored with AES-256-GCM encryption. Its SHA-256 fingerprint
                is permanently committed to the permissioned blockchain ledger.
              </p>
            </div>
          </div>

          <div className="bg-slate-900 text-white rounded-xl p-5 font-mono text-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-slate-400">INGESTION PROOF RECEIPT</span>
              <button
                onClick={copyReceiptData}
                className="text-teal-400 hover:text-teal-300 flex items-center gap-1"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied" : "Copy Receipt"}</span>
              </button>
            </div>

            <div className="space-y-2">
              <div>
                <span className="text-slate-400 block text-[11px]">Document Exhibit ID:</span>
                <span className="text-slate-200 font-bold">{receipt.document_id}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Assigned Case Reference:</span>
                <span className="text-blue-400 font-bold">{receipt.case_id}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">SHA-256 Cryptographic Fingerprint:</span>
                <span className="text-teal-300 break-all">{receipt.sha256_hash}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Hyperledger Fabric Transaction ID:</span>
                <span className="text-blue-300 break-all">{receipt.blockchain_tx_id}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                <div>
                  <span className="text-slate-400 block text-[11px]">Storage Engine:</span>
                  <span className="text-emerald-400 font-bold">{receipt.storage_status}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Malware Scan:</span>
                  <span className="text-emerald-400 font-bold">{receipt.virus_scan_status}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              onClick={() => setVerifyModal(true)}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" /> Verify Integrity Live
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setReceipt(null);
                  setFile(null);
                  setTitle("");
                }}
                className="px-3 py-2 border border-slate-300 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 transition-colors"
              >
                Upload Another Document
              </button>
              <Link
                href={`/documents/${receipt.document_id}`}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1"
              >
                Inspect Document <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {verifyModal && receipt && (
        <IntegrityModal
          documentId={receipt.document_id}
          documentTitle={receipt.title}
          onClose={() => setVerifyModal(false)}
        />
      )}
    </div>
  );
}
