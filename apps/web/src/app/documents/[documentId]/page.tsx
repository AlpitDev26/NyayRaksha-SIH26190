"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Document, CustodyEvent, DigitalSignature, AISuggestion } from "@/types";
import { apiRequest } from "@/lib/api";
import { ClassificationBadge, IntegrityBadge } from "@/components/ui/badges";
import { CustodyTimeline } from "@/components/custody-timeline";
import { IntegrityModal } from "@/components/integrity-modal";
import {
  ArrowLeft,
  FileText,
  ShieldCheck,
  Eye,
  History,
  PenTool,
  Sparkles,
  Lock,
  Download,
  CheckCircle2,
  AlertTriangle,
  FileSignature,
} from "lucide-react";

export default function DocumentDetailPage() {
  const { documentId } = useParams();
  const { user } = useAuth();

  const [document, setDocument] = useState<Document | null>(null);
  const [custodyEvents, setCustodyEvents] = useState<CustodyEvent[]>([]);
  const [signatures, setSignatures] = useState<DigitalSignature[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion | null>(null);
  const [previewData, setPreviewData] = useState<{ preview_url: string; watermark: string } | null>(null);

  const [activeTab, setActiveTab] = useState<"overview" | "custody" | "signatures" | "ai">("overview");
  const [loading, setLoading] = useState<boolean>(true);
  const [verifyModal, setVerifyModal] = useState<boolean>(false);
  const [signingStatement, setSigningStatement] = useState<string>("");
  const [signingLoading, setSigningLoading] = useState<boolean>(false);
  const [redactionLoading, setRedactionLoading] = useState<boolean>(false);
  const [redactionSuccess, setRedactionSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!documentId) return;
      try {
        const [doc, custody, sigs] = await Promise.all([
          apiRequest<Document>(`/api/v1/documents/${documentId}`),
          apiRequest<CustodyEvent[]>(`/api/v1/documents/${documentId}/custody`),
          apiRequest<DigitalSignature[]>(`/api/v1/documents/${documentId}/signatures`),
        ]);
        setDocument(doc);
        setCustodyEvents(custody);
        setSignatures(sigs);

        // Fetch secure preview URL
        try {
          const prev = await apiRequest<{ preview_url: string; watermark: string }>(
            `/api/v1/documents/${documentId}/preview`
          );
          setPreviewData(prev);
        } catch {
          // Access restricted without grant
        }
      } catch (err) {
        console.error("Error loading document:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [documentId]);

  const handleRunAiAnalysis = async () => {
    if (!documentId) return;
    try {
      const data = await apiRequest<AISuggestion>(`/api/v1/documents/${documentId}/ai-analyze`, {
        method: "POST",
      });
      setAiSuggestions(data);
    } catch (err) {
      console.error("AI Analysis error:", err);
    }
  };

  const handleSignDocument = async () => {
    if (!documentId) return;
    setSigningLoading(true);
    try {
      const statement =
        signingStatement ||
        `I hereby attest that I have reviewed version ${document?.current_version} with SHA-256 hash ${document?.current_hash} and certify its legal authenticity.`;

      const newSig = await apiRequest<DigitalSignature>(`/api/v1/documents/${documentId}/sign`, {
        method: "POST",
        body: JSON.stringify({
          version_number: document?.current_version || 1,
          statement,
        }),
      });
      setSignatures([newSig, ...signatures]);
      setSigningStatement("");
      // Refresh custody
      const updatedCustody = await apiRequest<CustodyEvent[]>(`/api/v1/documents/${documentId}/custody`);
      setCustodyEvents(updatedCustody);
    } catch (err: any) {
      alert(err.message || "Failed to digitally sign document.");
    } finally {
      setSigningLoading(false);
    }
  };

  const handleApplyRedaction = async () => {
    if (!documentId || !aiSuggestions) return;
    setRedactionLoading(true);
    try {
      const res = await apiRequest<Document>(`/api/v1/documents/${documentId}/redaction`, {
        method: "POST",
        body: JSON.stringify({
          items_to_redact: aiSuggestions.pii_redaction_targets,
          justification: "PII redaction applied for public court filing under statutory privacy provisions.",
          derived_title: `[REDACTED] ${document?.title}`,
        }),
      });
      setRedactionSuccess(`Redacted derivative created successfully! ID: ${res.id}`);
    } catch (err: any) {
      alert(err.message || "Redaction failed.");
    } finally {
      setRedactionLoading(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-500 font-mono">Loading document exhibit...</div>;
  }

  if (!document) {
    return <div className="p-8 text-center text-slate-700">Document exhibit not found.</div>;
  }

  const isJudicialOfficer = user?.roles.some((r) => ["JUDGE", "PROSECUTOR", "ADMIN"].includes(r));

  return (
    <div className="space-y-6 font-sans">
      {/* Breadcrumbs */}
      <div className="flex items-center justify-between">
        <Link
          href="/documents"
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Document Repository
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={`/documents/${document.id}/custody`}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <History className="w-3.5 h-3.5" /> Full Custody Report
          </Link>
        </div>
      </div>

      {/* Exhibit Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                Case: {document.case_id}
              </span>
              <ClassificationBadge classification={document.classification} />
              <IntegrityBadge status={document.status} isTampered={document.is_simulated_tampered} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{document.title}</h1>
            <p className="text-xs text-slate-500 font-mono mt-1">
              Exhibit ID: {document.id} &bull; Type: {document.document_type} &bull; Current Version: v{document.current_version}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setVerifyModal(true)}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" /> Verify Integrity Live
            </button>
          </div>
        </div>

        {/* Cryptographic Hash Bar */}
        <div className="bg-slate-900 text-white rounded-xl p-3 font-mono text-xs flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">SHA-256:</span>
            <span className="text-teal-300 font-bold break-all">{document.current_hash}</span>
          </div>
          {document.blockchain_tx_id && (
            <span className="text-blue-400 text-[11px]">Tx: {document.blockchain_tx_id}</span>
          )}
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="border-b border-slate-200 flex items-center gap-4 text-xs font-semibold">
        <button
          onClick={() => setActiveTab("overview")}
          className={`pb-3 border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === "overview"
              ? "border-blue-600 text-blue-600 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Eye className="w-4 h-4" /> Secure Preview & Versions
        </button>

        <button
          onClick={() => setActiveTab("custody")}
          className={`pb-3 border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === "custody"
              ? "border-blue-600 text-blue-600 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <History className="w-4 h-4" /> Chain of Custody ({custodyEvents.length})
        </button>

        <button
          onClick={() => setActiveTab("signatures")}
          className={`pb-3 border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === "signatures"
              ? "border-blue-600 text-blue-600 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <PenTool className="w-4 h-4" /> Judicial Signatures ({signatures.length})
        </button>

        <button
          onClick={() => {
            setActiveTab("ai");
            if (!aiSuggestions) handleRunAiAnalysis();
          }}
          className={`pb-3 border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === "ai"
              ? "border-blue-600 text-blue-600 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-500" /> AI OCR & Redaction
        </button>
      </div>

      {/* Tab 1: Overview & Secure Preview */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-600" /> Authorized Secure Preview
            </h3>

            {previewData ? (
              <div className="relative border border-slate-200 rounded-xl overflow-hidden bg-slate-50 min-h-[380px] p-6 flex flex-col justify-between">
                {/* Dynamic Security Watermark */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-10 select-none rotate-[-25deg] text-center font-mono text-slate-900 text-xl font-extrabold leading-loose">
                  {previewData.watermark}
                </div>

                <div className="relative z-10 font-mono text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {`GOVERNMENT OF NCT OF DELHI / LAW ENFORCEMENT EXHIBIT\nDOCUMENT: ${document.title.toUpperCase()}\nCASE REFERENCE: ${document.case_id}\nCLASSIFICATION: ${document.classification}\nSTATUS: ${document.status}\n\nCERTIFIED DIGITAL EVIDENCE COPY\nThis file is encrypted at rest with AES-256-GCM in accordance with Rule 65B.\nCryptographic Integrity is anchored to Hyperledger Fabric Block Store.\nAll read accesses are appended to the immutable custody log.\n\nDescription:\n${document.description || "Official evidence exhibit deposited by investigating officer."}`}
                </div>

                <div className="pt-4 border-t border-slate-200 text-xs text-slate-500 font-mono flex items-center justify-between">
                  <span>Authorized Viewer: {user?.full_name}</span>
                  <span className="text-teal-600 font-bold">Encrypted Stream Active</span>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-xs">
                Restricted document. Access grant required to preview file contents.
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider font-mono">
              Version History
            </h3>
            <div className="space-y-3 font-mono text-xs">
              {document.versions?.map((v) => (
                <div
                  key={v.id}
                  className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1"
                >
                  <div className="flex items-center justify-between font-bold text-slate-800">
                    <span>Version {v.version_number}</span>
                    <span className="text-emerald-600 font-mono text-[11px]">COMMITTED</span>
                  </div>
                  <p className="text-slate-500 text-[11px] truncate">Hash: {v.sha256_hash}</p>
                  <p className="text-slate-400 text-[10px]">
                    {new Date(v.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Chain of Custody */}
      {activeTab === "custody" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="mb-4">
            <h3 className="font-bold text-base text-slate-900">Unbroken Custody Trail</h3>
            <p className="text-xs text-slate-500">
              Every access, download, verification, and handover is permanently anchored.
            </p>
          </div>
          <CustodyTimeline events={custodyEvents} />
        </div>
      )}

      {/* Tab 3: Judicial Signatures */}
      {activeTab === "signatures" && (
        <div className="space-y-6">
          {/* Sign Action Box for Judicial Roles */}
          {isJudicialOfficer && (
            <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white rounded-2xl p-6 shadow-md space-y-4">
              <h3 className="font-bold text-base flex items-center gap-2">
                <FileSignature className="w-5 h-5 text-teal-400" />
                Affix Judicial Digital Signature
              </h3>
              <p className="text-xs text-slate-300">
                You are signing version {document.current_version} with SHA-256 fingerprint:{" "}
                <span className="font-mono text-teal-300">{document.current_hash}</span>.
              </p>
              <textarea
                rows={2}
                value={signingStatement}
                onChange={(e) => setSigningStatement(e.target.value)}
                placeholder="Confirmation statement: I hereby attest that I have reviewed version 1 and confirm its evidentiary validity under Section 65B..."
                className="w-full px-3 py-2 bg-slate-800/90 border border-slate-700 rounded-lg text-xs font-mono text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
              />
              <button
                onClick={handleSignDocument}
                disabled={signingLoading}
                className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-lg shadow-sm transition-all flex items-center gap-1.5"
              >
                <PenTool className="w-4 h-4" />
                {signingLoading ? "Anchoring Signature..." : "Sign & Anchor to Ledger"}
              </button>
            </div>
          )}

          {/* List of Attached Signatures */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="font-bold text-base text-slate-900">Registered Digital Signatures</h3>
            {signatures.length === 0 ? (
              <p className="text-xs text-slate-500 font-mono">No judicial signatures affixed yet.</p>
            ) : (
              <div className="space-y-4 font-mono text-xs">
                {signatures.map((sig) => (
                  <div key={sig.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm">{sig.signer_name || sig.signer_id}</span>
                      <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[11px]">
                        {sig.signer_role}
                      </span>
                    </div>
                    <p className="text-slate-600 font-sans text-xs italic">&ldquo;{sig.statement}&rdquo;</p>
                    <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500 space-y-0.5">
                      <p>Signed Hash: <span className="text-teal-700">{sig.signed_hash}</span></p>
                      <p>Cert Thumb: <span className="text-slate-700">{sig.certificate_thumbprint}</span></p>
                      {sig.blockchain_tx_id && <p>Ledger TxID: <span className="text-blue-700">{sig.blockchain_tx_id}</span></p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: AI OCR & Redaction */}
      {activeTab === "ai" && (
        <div className="space-y-6">
          <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">AI Advisory Notice — Human Review Mandatory</p>
              <p className="mt-0.5">
                All AI OCR and entity detection models provide suggestions only. Original legal
                evidence is NEVER altered. Applying redaction produces an independent DERIVED DOCUMENT
                with its own verifiable hash and version trail.
              </p>
            </div>
          </div>

          {redactionSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-900 font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              {redactionSuccess}
            </div>
          )}

          {aiSuggestions ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Extracted Entities */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider font-mono">
                  Identified Legal Entities
                </h3>
                <div className="space-y-2 font-mono text-xs">
                  {aiSuggestions.entities.map((ent, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200"
                    >
                      <div>
                        <span className="text-slate-400 text-[10px] block">{ent.category}</span>
                        <span className="font-bold text-slate-800">{ent.text}</span>
                      </div>
                      {ent.is_sensitive && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-700">
                          SENSITIVE PII
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Redaction Suggestion Module */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider font-mono">
                  PII Redaction Targets
                </h3>
                <p className="text-xs text-slate-600">
                  The AI module flagged the following tokens for privacy masking prior to public disclosure:
                </p>

                <div className="flex flex-wrap gap-2 font-mono text-xs">
                  {aiSuggestions.pii_redaction_targets.map((token, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded bg-slate-800 text-teal-300 font-bold border border-slate-700"
                    >
                      {token}
                    </span>
                  ))}
                </div>

                <div className="pt-4 border-t border-slate-200 space-y-3">
                  <p className="text-xs text-slate-500 font-sans">
                    Generating a redacted derivative preserves the original exhibit intact while creating
                    a derived copy for public or defense disclosure.
                  </p>
                  <button
                    onClick={handleApplyRedaction}
                    disabled={redactionLoading}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    {redactionLoading ? "Creating Derivative..." : "Confirm & Generate Redacted Copy"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 font-mono bg-white rounded-2xl border border-slate-200">
              Running OCR and Entity Extraction...
            </div>
          )}
        </div>
      )}

      {verifyModal && (
        <IntegrityModal
          documentId={document.id}
          documentTitle={document.title}
          onClose={() => setVerifyModal(false)}
        />
      )}
    </div>
  );
}
