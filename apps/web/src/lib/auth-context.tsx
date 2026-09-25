"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User } from "@/types";
import { apiRequest } from "@/lib/api";

export const DEMO_ACCOUNTS = [
  { role: "POLICE_OFFICER", label: "Evidence Officer", email: "officer@nyayraksha.demo", name: "Insp. Rajesh Sharma" },
  { role: "INVESTIGATING_OFFICER", label: "Investigating Officer", email: "investigator@nyayraksha.demo", name: "ACP Priya Nair" },
  { role: "JUDGE", label: "Judge", email: "judge@nyayraksha.demo", name: "Justice S. K. Roy" },
  { role: "PROSECUTOR", label: "Prosecutor", email: "prosecutor@nyayraksha.demo", name: "Adv. Meera Joshi" },
  { role: "FORENSIC_ANALYST", label: "Forensic Analyst", email: "forensic@nyayraksha.demo", name: "Dr. Anand Swaminathan" },
  { role: "COURT_CLERK", label: "Court Clerk", email: "clerk@nyayraksha.demo", name: "R. K. Gupta" },
  { role: "AUDITOR", label: "Compliance Auditor", email: "auditor@nyayraksha.demo", name: "Sunita Deshmukh" },
  { role: "ADMIN", label: "System Administrator", email: "admin@nyayraksha.demo", name: "Alok Verma" },
];

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<{ status: string; temp_token?: string }>;
  verifyMfa: (tempToken: string, code: string) => Promise<void>;
  switchRole: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshProfile = async () => {
    try {
      const profile = await apiRequest<User>("/api/v1/auth/me");
      setUser(profile);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshProfile();
  }, []);

  const login = async (email: string, password = "DemoSecurePassword2026!") => {
    const res = await apiRequest<{ status: string; user?: User; temp_token?: string }>(
      "/api/v1/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }
    );

    if (res.status === "AUTHENTICATED" && res.user) {
      setUser(res.user);
    }
    return { status: res.status, temp_token: res.temp_token };
  };

  const verifyMfa = async (tempToken: string, code: string) => {
    const res = await apiRequest<{ status: string; user?: User }>(
      "/api/v1/auth/mfa/verify",
      {
        method: "POST",
        body: JSON.stringify({ temp_token: tempToken, code }),
      }
    );
    if (res.user) {
      setUser(res.user);
    }
  };

  const switchRole = async (email: string) => {
    setLoading(true);
    try {
      const res = await login(email, "DemoSecurePassword2026!");
      if (res.status === "MFA_REQUIRED" && res.temp_token) {
        // Auto-verify with demo code for seamless role switching in demo mode
        await verifyMfa(res.temp_token, "123456");
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiRequest("/api/v1/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        verifyMfa,
        switchRole,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
