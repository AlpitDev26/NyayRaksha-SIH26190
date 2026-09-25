"use client";

import React, { useState } from "react";
import { VerificationResult } from "@/types";
import { apiRequest } from "@/lib/api";
import {
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  Copy,
  Check,
  Loader2,
  RefreshCw,
  Scale,
  FileCheck2,
} from "lucide-react";

export function IntegrityModal({
  documentId,
  documentTitle,
  onClose,
}: {
  documentId: string;
  documentTitle: string;
  onClose: () => void;
  }) {
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const runVerification = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<VerificationResult>(
        `/api/v1/documents/${documentId}/verify`,
        { method: "POST" }
      );
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to execute statutory integrity verification.");
    } finally {
      setLoading(false);
    }
  };

  const copyReference = () => {
    if (result) {
      navigator.clipboard.writeText(
        `STATUTORY HASH PROOF (BSA SEC 63): Exhibit=${result.document_id} | SHA256=${result.calculated_hash} | BlockTx=${result.blockchain_tx_id || "N/A"} | Status=${result.status}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xs shadow-2xl max-w-2xl w-full border border-slate-400 overflow-hidden font-sans">
        {/* Official Judicial Scrutiny Header */}
        <div className="px-5 py-3.5 bg-[#0d1d36] text-white flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-2.5">
            <Scale className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-serif font-bold text-sm tracking-wide uppercase text-slate-100">
                Statutory Evidentiary Hash Audit • Section 63 BSA 2023
              </h3>
              <p className="text-[10px] text-slate-400 font-mono">
                MATHEMATICAL ADMISSIBILITY VERIFICATION AGAINST PERMISSIONED LEDGER
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xs font-mono font-bold px-2 py-1 bg-slate-800 border border-slate-700 rounded-xs"
          >
            [CLOSE]
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="border-b border-slate-200 pb-3">
            <p className="text-[10px] font-mono uppercase text-slate-500 font-bold tracking-wider">
              TARGET INVESTIGATION EXHIBIT
            </p>
            <h4 className="text-sm font-bold text-slate-900 mt-0.5">{documentTitle}</h4>
            <p className="text-[11px] text-slate-500 font-mono">EXHIBIT IDENTIFIER: {documentId}</p>
          </div>

          {!result && !loading && !error && (
            <div className="p-5 bg-slate-50 rounded-xs border border-slate-300 text-center space-y-3">
              <p className="text-xs text-slate-700 leading-relaxed max-w-lg mx-auto">
                Under <strong>Section 63 of Bharatiya Sakshya Adhiniyam, 2023</strong>, click below to compute
                a live byte-level SHA-256 hash over the encrypted evidence bitstream and compare it with the
                tamper-evident anchor committed to the state distributed ledger.
              </p>
              <button
                onClick={runVerification}
                className="px-4 py-2 bg-[#1b437c] hover:bg-[#23569c] text-white font-mono font-bold text-xs uppercase tracking-wider rounded-xs shadow-xs transition-colors inline-flex items-center gap-2 border border-blue-500/50"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Execute Statutory Verification
              </button>
            </div>
          )}

          {loading && (
            <div className="p-6 text-center space-y-2 bg-slate-50 rounded-xs border border-slate-300">
              <Loader2 className="w-6 h-6 text-blue-900 animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-800 font-mono uppercase">
                Streaming encrypted bytes & computing SHA-256 fingerprint...
              </p>
              <p className="text-[10px] text-slate-500 font-mono">
                Querying Hyperledger Fabric state consensus (Channel: nyayavaultchannel)...
              </p>
            </div>
          )}

          {error && (
            <div className="p-3.5 bg-red-50 text-red-800 border border-red-300 rounded-xs text-xs font-mono">
              [SYSTEM ERROR]: {error}
            </div>
          )}

          {result && (
            <div className="space-y-3.5">
              {/* Official Status Seal */}
              {result.status === "VERIFIED" ? (
                <div className="p-3.5 bg-emerald-50 border-2 border-emerald-600 rounded-xs flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-mono font-bold text-emerald-950 text-xs uppercase tracking-wide">
                      COURT ADMISSIBLE // INTEGRITY VERIFIED (BSA SEC 63 COMPLIANT)
                    </h5>
                    <p className="text-xs text-emerald-900 mt-0.5">{result.message}</p>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 bg-red-50 border-2 border-red-600 rounded-xs flex items-start gap-3">
                  <AlertOctagon className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-mono font-bold text-red-950 text-xs uppercase tracking-wide">
                      EVIDENTIARY COMPROMISE DETECTED // INTEGRITY BREACH
                    </h5>
                    <p className="text-xs text-red-900 mt-0.5">{result.message}</p>
                    {result.incident_number && (
                      <p className="text-[11px] font-mono font-bold text-red-950 mt-1">
                        Vigilance Incident Docket: {result.incident_number} • Downloads Quarantined
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Hash Comparison Matrix */}
              <div className="bg-[#0b172a] rounded-xs p-3.5 text-white font-mono text-[11px] space-y-2.5 border border-slate-700">
                <div>
                  <div className="text-slate-400 mb-0.5 flex items-center justify-between text-[10px]">
                    <span className="uppercase tracking-wider">1. Live Recomputed Bitstream SHA-256 Digest:</span>
                    <span className="text-amber-400 font-bold">[ COMPUTED NOW ]</span>
                  </div>
                  <p className="bg-[#050c18] p-1.5 rounded-xs text-amber-300 break-all border border-slate-800 text-[10px]">
                    {result.calculated_hash}
                  </p>
                </div>

                <div>
                  <div className="text-slate-400 mb-0.5 flex items-center justify-between text-[10px]">
                    <span className="uppercase tracking-wider">2. Genesis State Ledger Anchor Hash:</span>
                    <span className="text-blue-400 font-bold">[ HYPERLEDGER FABRIC ]</span>
                  </div>
                  <p className="bg-[#050c18] p-1.5 rounded-xs text-blue-300 break-all border border-slate-800 text-[10px]">
                    {result.blockchain_hash}
                  </p>
                </div>

                {result.blockchain_tx_id && (
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                    <span>LEDGER TX: {result.blockchain_tx_id}</span>
                    <span className="text-emerald-400 font-bold">STATE BLOCK CONFIRMED</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-2.5 bg-slate-100 border-t border-slate-300 flex items-center justify-between">
          {result && (
            <button
              onClick={copyReference}
              className="text-[11px] font-mono font-bold text-slate-700 hover:text-slate-900 flex items-center gap-1.5 transition-colors uppercase"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Proof String Copied!" : "Copy Legal Proof String"}</span>
            </button>
          )}
          <div className="flex items-center gap-2 ml-auto">
            {result && (
              <button
                onClick={runVerification}
                className="px-3 py-1 bg-white border border-slate-400 hover:bg-slate-50 text-slate-800 text-xs font-mono font-semibold transition-colors flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Re-Examine
              </button>
            )}
            <button
              onClick={onClose}
              className="px-3.5 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded-xs text-xs font-mono font-semibold uppercase tracking-wider transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
