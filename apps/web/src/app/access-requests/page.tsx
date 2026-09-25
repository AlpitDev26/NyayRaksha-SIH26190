"use client";

import React, { useEffect, useState } from "react";
import { AccessRequest, Case, Document } from "@/types";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  Share2,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Lock,
  Plus,
  AlertCircle,
  Scale,
} from "lucide-react";

export default function AccessRequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // New Request Form
  const [showModal, setShowModal] = useState<boolean>(false);
  const [selectedCase, setSelectedCase] = useState<string>("");
  const [selectedDoc, setSelectedDoc] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [accessType, setAccessType] = useState<string>("VIEW");
  const [expiryDays, setExpiryDays] = useState<number>(7);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fetchRequests = async () => {
    try {
      const data = await apiRequest<AccessRequest[]>("/api/v1/access-requests");
      setRequests(data);
    } catch (err) {
      console.error("Error fetching access requests:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    async function loadMetadata() {
      try {
        const [cData, dData] = await Promise.all([
          apiRequest<Case[]>("/api/v1/cases"),
          apiRequest<Document[]>("/api/v1/documents"),
        ]);
        setCases(cData);
        setDocuments(dData);
        if (cData.length > 0) setSelectedCase(cData[0].id);
        if (dData.length > 0) setSelectedDoc(dData[0].id);
      } catch (err) {
        console.error("Metadata load error:", err);
      }
    }
    loadMetadata();
  }, []);

  const handleReview = async (requestId: string, status: "APPROVED" | "REJECTED") => {
    try {
      await apiRequest(`/api/v1/access-requests/${requestId}/review`, {
        method: "POST",
        body: JSON.stringify({
          status,
          notes: `Official order issued by ${user?.full_name} (${user?.roles[0]})`,
        }),
      });
      fetchRequests();
    } catch (err: any) {
      alert(err.message || "Review action failed.");
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    try {
      await apiRequest("/api/v1/access-requests", {
        method: "POST",
        body: JSON.stringify({
          case_id: selectedCase,
          document_id: selectedDoc,
          reason,
          access_type: accessType,
          requested_expiry_days: expiryDays,
        }),
      });
      setShowModal(false);
      setReason("");
      fetchRequests();
    } catch (err: any) {
      setSubmitError(err.message || "Failed to submit clearance request.");
    }
  };

  const isReviewer = user?.roles.some((r) =>
    ["ADMIN", "INVESTIGATING_OFFICER", "POLICE_OFFICER", "JUDGE"].includes(r)
  );

  return (
    <div className="space-y-6 font-sans">
      {/* Official Departmental Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-300 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-600 bg-slate-200 px-2 py-0.5 rounded-xs">
              ICJS INTEROPERABILITY
            </span>
            <span className="text-xs font-mono text-slate-500">
              INTER-AGENCY CLEARANCE & CONTROLLED TIME-BOUND EVIDENTIARY ACCESS
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-serif font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <Share2 className="w-5 h-5 text-amber-700" />
            Inter-Agency Evidentiary Clearance & Access Registry
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Role-based and attribute-based clearance authorizations between Police, Prosecution, Judiciary, and Forensics (ABAC Enforced)
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-3.5 py-2 bg-[#1b437c] hover:bg-[#23569c] text-white rounded-xs text-xs font-mono font-bold uppercase tracking-wider shadow-xs transition-colors flex items-center gap-1.5 self-start sm:self-auto border border-blue-400/40"
        >
          <Plus className="w-3.5 h-3.5" /> Submit Evidentiary Requisition
        </button>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-xs border border-slate-300 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-sans text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-700 text-[10px] font-mono uppercase tracking-wider border-b border-slate-300">
                <th className="py-2.5 px-3.5 font-bold border-r border-slate-200">TARGET EXHIBIT / DOCUMENT</th>
                <th className="py-2.5 px-3.5 font-bold border-r border-slate-200">DOCKET REF (CASE)</th>
                <th className="py-2.5 px-3.5 font-bold border-r border-slate-200">REQUISITIONING OFFICER</th>
                <th className="py-2.5 px-3.5 font-bold border-r border-slate-200">STATUTORY PURPOSE / GROUNDS</th>
                <th className="py-2.5 px-3.5 font-bold border-r border-slate-200">CLEARANCE SCOPE</th>
                <th className="py-2.5 px-3.5 font-bold border-r border-slate-200">STATUS</th>
                {isReviewer && <th className="py-2.5 px-3.5 font-bold text-right">MAGISTERIAL ACTION</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {requests.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 px-3.5 font-bold text-slate-900 border-r border-slate-200">
                    {r.document_title || r.document_id}
                  </td>
                  <td className="py-2.5 px-3.5 font-mono text-[11px] font-bold text-blue-900 border-r border-slate-200">
                    {r.case_id}
                  </td>
                  <td className="py-2.5 px-3.5 text-xs text-slate-700 border-r border-slate-200">
                    {r.requester_name || r.requester_id}
                  </td>
                  <td className="py-2.5 px-3.5 text-xs text-slate-600 max-w-xs truncate border-r border-slate-200">
                    {r.reason}
                  </td>
                  <td className="py-2.5 px-3.5 font-mono text-[11px] border-r border-slate-200">
                    <span className="font-bold text-slate-800 uppercase">{r.access_type}</span> ({r.requested_expiry_days} DAYS)
                  </td>
                  <td className="py-2.5 px-3.5 border-r border-slate-200">
                    {r.status === "APPROVED" && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-900 bg-emerald-50 border border-emerald-400 px-2 py-0.5 rounded-xs uppercase">
                        <CheckCircle2 className="w-3 h-3 text-emerald-700" /> ORDER APPROVED
                      </span>
                    )}
                    {r.status === "REJECTED" && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-red-900 bg-red-50 border border-red-400 px-2 py-0.5 rounded-xs uppercase">
                        <XCircle className="w-3 h-3 text-red-700" /> REJECTED
                      </span>
                    )}
                    {r.status === "PENDING" && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-amber-900 bg-amber-50 border border-amber-400 px-2 py-0.5 rounded-xs uppercase">
                        <Clock className="w-3 h-3 text-amber-700" /> SCRUTINY PENDING
                      </span>
                    )}
                  </td>
                  {isReviewer && (
                    <td className="py-2.5 px-3.5 text-right space-x-1.5 whitespace-nowrap">
                      {r.status === "PENDING" ? (
                        <>
                          <button
                            onClick={() => handleReview(r.id, "APPROVED")}
                            className="px-2 py-1 text-[10px] font-mono font-bold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-400 rounded-xs transition-colors uppercase"
                          >
                            Grant Clearance
                          </button>
                          <button
                            onClick={() => handleReview(r.id, "REJECTED")}
                            className="px-2 py-1 text-[10px] font-mono font-bold text-red-900 bg-red-50 hover:bg-red-100 border border-red-400 rounded-xs transition-colors uppercase"
                          >
                            Reject
                          </button>
                        </>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-mono uppercase">ORDER LOGGED</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Official Requisition Submission Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xs shadow-2xl max-w-lg w-full border border-slate-400 overflow-hidden font-sans">
            <div className="px-5 py-3.5 bg-[#0d1d36] text-white flex items-center justify-between border-b border-slate-700">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-amber-400" />
                <h3 className="font-serif font-bold text-sm tracking-wide uppercase text-slate-100">
                  Submit Evidentiary Access Requisition
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white text-xs font-mono font-bold px-2 py-1 bg-slate-800 border border-slate-700 rounded-xs"
              >
                [CLOSE]
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="p-5 space-y-3.5">
              {submitError && (
                <div className="p-2.5 bg-red-50 text-red-800 border border-red-300 rounded-xs text-xs font-mono">
                  [REQUISITION ERROR]: {submitError}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-mono font-bold text-slate-700 uppercase mb-1">
                  Target Case Docket Reference
                </label>
                <select
                  value={selectedCase}
                  onChange={(e) => setSelectedCase(e.target.value)}
                  className="w-full p-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-xs"
                >
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.id} — {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono font-bold text-slate-700 uppercase mb-1">
                  Specific Document / Forensic Exhibit
                </label>
                <select
                  value={selectedDoc}
                  onChange={(e) => setSelectedDoc(e.target.value)}
                  className="w-full p-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-xs"
                >
                  {documents.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title} ({d.document_type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono font-bold text-slate-700 uppercase mb-1">
                  Statutory Grounds / Justification for Access
                </label>
                <textarea
                  required
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="State legal provisions, case diary reference, or court subpoena order..."
                  className="w-full p-2 text-xs font-sans bg-slate-50 border border-slate-300 rounded-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono font-bold text-slate-700 uppercase mb-1">
                    Clearance Scope
                  </label>
                  <select
                    value={accessType}
                    onChange={(e) => setAccessType(e.target.value)}
                    className="w-full p-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-xs"
                  >
                    <option value="VIEW">SCRUTINY VIEW ONLY</option>
                    <option value="DOWNLOAD">CERTIFIED COURT EXPORT</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-mono font-bold text-slate-700 uppercase mb-1">
                    Validity Period
                  </label>
                  <select
                    value={expiryDays}
                    onChange={(e) => setExpiryDays(Number(e.target.value))}
                    className="w-full p-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-xs"
                  >
                    <option value={3}>3 DAYS (EXPEDITED)</option>
                    <option value={7}>7 DAYS (STANDARD TRIAL)</option>
                    <option value={14}>14 DAYS (CFSL EXAMINATION)</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 border border-slate-300 text-xs font-mono text-slate-700 hover:bg-slate-50 rounded-xs uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#1b437c] hover:bg-[#23569c] text-white font-mono font-bold text-xs uppercase tracking-wider rounded-xs shadow-xs border border-blue-400/40"
                >
                  Submit Official Requisition
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
