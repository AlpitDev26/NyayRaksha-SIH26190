"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { DEMO_ACCOUNTS, useAuth } from "@/lib/auth-context";
import { Shield, Lock, Mail, KeyRound, AlertCircle, ArrowRight, Scale, Building2, UserCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login, verifyMfa } = useAuth();

  const [email, setEmail] = useState<string>("officer@nyayavault.demo");
  const [password, setPassword] = useState<string>("DemoSecurePassword2026!");
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState<string>("123456");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await login(email, password);
      if (res.status === "MFA_REQUIRED" && res.temp_token) {
        setTempToken(res.temp_token);
      } else {
        router.push("/");
      }
    } catch (err: any) {
      setError(err.message || "Failed to authenticate.");
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempToken) return;
    setLoading(true);
    setError(null);
    try {
      await verifyMfa(tempToken, mfaCode);
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Invalid TOTP code.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSelect = (accEmail: string) => {
    setEmail(accEmail);
    setPassword("DemoSecurePassword2026!");
    setTempToken(null);
    setError(null);
  };

  return (
    <div className="max-w-lg mx-auto py-8 px-4 font-sans">
      <div className="bg-white rounded-xs shadow-md border border-slate-300 overflow-hidden">
        {/* Tricolor Official Indian Portal Indicator */}
        <div className="h-[2.5px] w-full bg-gradient-to-r from-[#FF9933] via-[#FFFFFF] to-[#138808]" />

        {/* Institutional Government Header */}
        <div className="bg-[#0c1a32] p-5 text-white text-center border-b border-slate-700">
          <div className="w-12 h-12 rounded-xs bg-[#152a4e] border border-amber-600/40 flex items-center justify-center mx-auto mb-2 text-amber-400">
            <Scale className="w-6 h-6 stroke-[1.75]" />
          </div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-amber-300 font-bold">
            GOVERNMENT OF INDIA • MINISTRY OF HOME AFFAIRS
          </div>
          <h2 className="text-lg font-serif font-bold tracking-wide uppercase text-slate-100 mt-0.5">
            Inter-Operable Criminal Justice System
          </h2>
          <p className="text-[11px] text-slate-300 font-sans">
            NyayaVault — National Repository for Electronic Evidence & Case Dockets
          </p>
        </div>

        <div className="p-6 space-y-5">
          {/* Statutory Law Notice */}
          <div className="p-2.5 bg-slate-50 border border-slate-300 rounded-xs text-[10px] text-slate-600 font-mono leading-relaxed">
            <strong className="text-slate-800">STATUTORY NOTICE:</strong> Authorized judicial and law enforcement
            access only. All actions are cryptographically chained to the national audit ledger under Bharatiya Nagarik
            Suraksha Sanhita (BNSS 2023).
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-300 rounded-xs text-xs text-red-800 flex items-start gap-2 font-mono">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-700 mt-0.5" />
              <span>[AUTH ERROR]: {error}</span>
            </div>
          )}

          {!tempToken ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono font-bold text-slate-700 uppercase tracking-wider mb-1">
                  OFFICER CREDENTIAL / OFFICIAL EMAIL / PIS ID
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs font-mono bg-slate-50 border border-slate-300 rounded-xs focus:outline-none focus:ring-1 focus:ring-blue-700"
                    placeholder="officer@nyayavault.demo"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono font-bold text-slate-700 uppercase tracking-wider mb-1">
                  CRYPTOGRAPHIC PASSPHRASE / KEY
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs font-mono bg-slate-50 border border-slate-300 rounded-xs focus:outline-none focus:ring-1 focus:ring-blue-700"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-[#1b437c] hover:bg-[#23569c] text-white font-mono font-bold text-xs uppercase tracking-wider rounded-xs shadow-xs transition-colors flex items-center justify-center gap-2 border border-blue-500/50"
              >
                {loading ? "AUTHENTICATING CREDENTIALS..." : "ENTER JURISDICTIONAL PORTAL"}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleMfaSubmit} className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-300 rounded-xs text-xs text-blue-900 font-mono">
                <p className="font-bold uppercase">ZERO-TRUST MULTI-FACTOR AUTHENTICATION (TOTP)</p>
                <p className="mt-1 text-[11px]">
                  Privileged judicial credentials require hardware/app OTP verification. (For evaluation, default OTP is <span className="font-bold text-slate-900">123456</span>).
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-mono font-bold text-slate-700 uppercase tracking-wider mb-1">
                  6-DIGIT TOTP SECURITY CODE
                </label>
                <div className="relative">
                  <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs font-mono tracking-widest bg-slate-50 border border-slate-300 rounded-xs focus:outline-none focus:ring-1 focus:ring-blue-700"
                    placeholder="123456"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-[#1b437c] hover:bg-[#23569c] text-white font-mono font-bold text-xs uppercase tracking-wider rounded-xs shadow-xs transition-colors flex items-center justify-center gap-2 border border-blue-500/50"
              >
                {loading ? "VERIFYING PROOF..." : "CONFIRM TOTP TOKEN & ENTER"}
              </button>
            </form>
          )}

          {/* Official Gazetted Personnel Roster */}
          <div className="pt-4 border-t border-slate-200">
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2 font-mono flex items-center gap-1">
              <UserCheck className="w-3 h-3 text-blue-700" />
              AUTHORIZED GAZETTED PERSONNEL ROSTER:
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleQuickSelect(acc.email)}
                  className={`p-2 rounded-xs border text-left transition-all ${
                    email === acc.email
                      ? "bg-blue-50 border-blue-700 text-blue-950 font-bold"
                      : "bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <p className="truncate font-mono font-bold text-[11px] uppercase tracking-tight">{acc.label}</p>
                  <p className="text-[10px] text-slate-500 truncate font-mono">{acc.name}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
