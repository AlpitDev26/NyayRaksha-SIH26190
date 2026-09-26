import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { DemoBanner } from "@/components/ui/demo-banner";
import { Navbar } from "@/components/ui/navbar";
import { Sidebar } from "@/components/ui/sidebar";

export const metadata: Metadata = {
  title: "NyayRaksha — Secure Digital Document Management System",
  description:
    "Tamper-evident legal and investigation document management with verifiable chain of custody (SIH 26190).",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-100 min-h-screen text-slate-900">
        <AuthProvider>
          <DemoBanner />
          <Navbar />
          <div className="flex">
            <Sidebar />
            <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
              {children}
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
