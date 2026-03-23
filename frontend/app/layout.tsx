import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import UserBadge from "./components/UserBadge";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PARAGRAF — AI Contract Management",
  description: "System zarządzania umowami B2B dla B2B.net S.A.",
};

function KeyboardShortcuts() {
  "use client";
  if (typeof window === "undefined") return null;
  
  if (typeof document !== "undefined") {
    document.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        window.location.href = "/search";
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        window.location.href = "/new";
      }
    });
  }
  return null;
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl">
      <body className={`${inter.className} bg-gray-50 min-h-screen`}>
        <nav className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <div className="flex items-center gap-6">
                <Link href="/" className="flex items-center gap-2">
                  <span className="text-xl font-bold text-gray-900">⚖️ PARAGRAF</span>
                </Link>
                <div className="hidden md:flex items-center gap-4">
                  <NavLink href="/" label="Dashboard" />
                  <NavLink href="/recruiter" label="👤 Rekruter" />
                  <NavLink href="/analytics" label="📈 Analityka" />
                  <NavLink href="/insights" label="💡 Insights" />
                  <NavLink href="/benchmark" label="💰 Benchmark" />
                  <NavLink href="/legal" label="📚 Prawo" />
                  <NavLink href="/alerts" label="🔔" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link href="/search" className="text-gray-400 hover:text-gray-600 p-2" title="Szukaj">🔍</Link>
                <UserBadge />
                <Link href="/users" className="text-gray-400 hover:text-gray-600 p-2" title="Użytkownicy">👥</Link>
                <Link href="/settings" className="text-gray-400 hover:text-gray-600 p-2" title="Ustawienia">⚙️</Link>
                <Link href="/ceo" className="text-xs text-gray-500 hover:text-gray-700 font-medium border border-gray-200 px-2 py-1 rounded">CEO</Link>
                <Link href="/quick" className="text-sm text-purple-600 hover:text-purple-800 font-medium" title="AI Quick Generate">⚡</Link>
                <Link href="/onboard" className="bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-green-700">🚀 Onboard</Link>
                <Link href="/new" className="bg-blue-600 text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-blue-700 text-sm">+ Nowa</Link>
              </div>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        <footer className="max-w-7xl mx-auto px-4 py-4 text-center text-xs text-gray-300">
          PARAGRAF v6.5 · B2B.net S.A. · ⌘K szukaj · ⌘N nowa umowa
        </footer>
      </body>
    </html>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
      {label}
    </Link>
  );
}
