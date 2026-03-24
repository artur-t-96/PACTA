import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import NavBar from "./components/NavBar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PARAGRAF — AI Contract Management",
  description: "System zarządzania umowami B2B dla B2B.net S.A.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl">
      <body className={`${inter.className} bg-gray-50 min-h-screen`}>
        <NavBar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        <footer className="max-w-7xl mx-auto px-4 py-4 text-center text-xs text-gray-300">
          PARAGRAF v6.6 · B2B.net S.A.
        </footer>
      </body>
    </html>
  );
}
