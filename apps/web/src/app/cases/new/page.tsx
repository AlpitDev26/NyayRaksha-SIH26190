"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import { Case } from "@/types";
import { ArrowLeft, Briefcase, PlusCircle, AlertCircle } from "lucide-react";

export default function NewCasePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: "",
    fir_number: "",
    category: "CYBER_CRIME",
    priority: "HIGH",
    jurisdiction: "Special Cyber Crime Cell, New Delhi",
    classification: "RESTRICTED",
    summary: "",
    tags: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const created = await apiRequest<Case>("/api/v1/cases", {
        method: "POST",
        body: JSON.stringify(formData),
      });
      router.push(`/cases/${created.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to create case record.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 font-sans">
      <Link
        href="/cases"
        className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Cases
      </Link>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="border-b border-slate-100 pb-4 mb-6">
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-blue-600" />
            Initiate New Investigation Case
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            System will automatically generate an immutable case reference: CASE-YYYY-XXXXXX
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2 mb-4">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Case Investigation Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Financial Diversion Investigation — Gateway Node 4"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                FIR Number (If Registered)
              </label>
              <input
                type="text"
                value={formData.fir_number}
                onChange={(e) => setFormData({ ...formData, fir_number: e.target.value })}
                placeholder="FIR-2026/1042"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
              >
                <option value="CYBER_CRIME">Cyber Crime</option>
                <option value="FINANCIAL_FRAUD">Financial Fraud</option>
                <option value="MISSING_PERSON">Missing Person</option>
                <option value="HOMICIDE">Homicide</option>
                <option value="NARCOTICS">Narcotics</option>
                <option value="CORRUPTION">Corruption</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Priority Level
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Security Classification
              </label>
              <select
                value={formData.classification}
                onChange={(e) => setFormData({ ...formData, classification: e.target.value })}
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

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Police Jurisdiction / Courtroom
            </label>
            <input
              type="text"
              required
              value={formData.jurisdiction}
              onChange={(e) => setFormData({ ...formData, jurisdiction: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Case Investigation Brief / Summary
            </label>
            <textarea
              rows={3}
              value={formData.summary}
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
              placeholder="Outline preliminary incident details, complainant background, and scope of evidence..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Search Tags (Comma separated)
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="e.g., cyber, financial, ip-theft"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <Link
              href="/cases"
              className="px-4 py-2 border border-slate-300 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-md transition-all flex items-center gap-1.5"
            >
              {loading ? "Registering Case..." : "Register Case in Ledger"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
