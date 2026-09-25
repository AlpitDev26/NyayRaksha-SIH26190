"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Scale, LogOut, Lock, Award, BellRing } from "lucide-react";

export function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="bg-[#0e1e38] border-b border-slate-700/80 text-white sticky top-[30px] z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 py-2 flex items-center justify-between">
        {/* Official Institutional Brand */}
        <Link href="/" className="flex items-center gap-3.5 group">
          <div className="w-11 h-11 rounded-sm bg-[#162a4d] border border-amber-600/40 flex items-center justify-center shadow-inner text-amber-400">
            <Scale className="w-6 h-6 stroke-[1.75]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif font-bold text-lg tracking-wide text-slate-100 uppercase">
                NyayaVault
              </span>
              <span className="text-[10px] font-mono uppercase bg-slate-800 text-amber-300 border border-amber-700/50 px-1.5 py-0.2 rounded-xs tracking-wider">
                ICJS SECURE LAYER
              </span>
            </div>
            <p className="text-[11px] text-slate-300 font-sans tracking-tight">
              National Repository for Electronic Evidence & Case Dockets • Govt. of India
            </p>
          </div>
        </Link>

        {/* Official Officer Profile & Station Verification */}
        {user ? (
          <div className="flex items-center gap-5">
            <div className="text-right hidden md:block border-r border-slate-700/80 pr-5">
              <div className="flex items-center justify-end gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <p className="text-xs font-bold text-slate-100 tracking-wide uppercase">
                  {user.full_name}
                </p>
              </div>
              <p className="text-[11px] text-amber-300/90 font-mono">
                {user.roles[0]?.replace(/_/g, " ")} • {user.organization_name || "Special Crime Wing"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => logout()}
                title="Secure Session Sign Out"
                className="px-3 py-1.5 rounded-sm bg-[#162744] hover:bg-red-950/60 hover:text-red-300 hover:border-red-700/60 text-slate-300 border border-slate-700 transition-colors text-xs font-semibold flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Terminate Session</span>
              </button>
            </div>
          </div>
        ) : (
          <Link
            href="/login"
            className="px-4 py-2 rounded-sm bg-blue-700 hover:bg-blue-600 text-white font-medium text-xs uppercase tracking-wider transition-colors border border-blue-500"
          >
            Officer Sign In
          </Link>
        )}
      </div>
    </header>
  );
}
