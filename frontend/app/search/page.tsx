"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface SearchResult {
  query: string;
  contracts: Array<{
    id: number;
    number: string;
    name: string;
    client: string;
    role: string;
    status: string;
  }>;
  legal: string[];
  total_contracts: number;
  total_legal: number;
}

const statusColors: Record<string, string> = {
  aktywna: "bg-green-100 text-green-700",
  draft: "bg-yellow-100 text-yellow-700",
  zakonczona: "bg-gray-100 text-gray-600",
  do_podpisu: "bg-purple-100 text-purple-700",
  anulowana: "bg-red-100 text-red-700",
};

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("paragraf_recent_searches");
    if (stored) setRecent(JSON.parse(stored));
  }, []);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      setResult(await r.json());
      // Save to history
      const newRecent = [query, ...recent.filter(r => r !== query)].slice(0, 5);
      setRecent(newRecent);
      localStorage.setItem("paragraf_recent_searches", JSON.stringify(newRecent));
    } catch { /* */ } finally { setLoading(false); }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">🔍 Szukaj</h1>
        <p className="text-sm text-gray-500 mt-1">
          Przeszukuj umowy, kontrahentów i bazę prawną jednocześnie
        </p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-3 mb-8">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Szukaj po nazwisku, kliencie, numerze, roli, przepisie..."
          className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
        />
        <button type="submit" disabled={loading}
          className="bg-blue-600 text-white font-medium px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {loading ? "🔍..." : "🔍 Szukaj"}
        </button>
      </form>

      {result && (
        <div className="space-y-6">
          {/* Contracts */}
          {result.total_contracts > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-800 mb-4">
                📄 Umowy <span className="text-gray-400 font-normal">({result.total_contracts})</span>
              </h2>
              <div className="divide-y divide-gray-50">
                {result.contracts.map((c) => (
                  <Link
                    key={c.id}
                    href={`/contracts/${c.id}`}
                    className="flex items-center justify-between py-3 hover:bg-gray-50 -mx-3 px-3 rounded-lg"
                  >
                    <div>
                      <span className="font-mono text-blue-600 text-sm mr-3">{c.number}</span>
                      <span className="font-medium text-gray-900">{c.name}</span>
                      <span className="text-gray-400 mx-2">·</span>
                      <span className="text-gray-500 text-sm">{c.client}</span>
                      <span className="text-gray-400 mx-2">·</span>
                      <span className="text-gray-500 text-sm">{c.role}</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[c.status] || "bg-gray-100"}`}>
                      {c.status}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Legal */}
          {result.total_legal > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-800 mb-4">
                📚 Baza prawna <span className="text-gray-400 font-normal">({result.total_legal})</span>
              </h2>
              <div className="space-y-3">
                {result.legal.map((text, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700">
                    {text}
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.total_contracts === 0 && result.total_legal === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-3">📭</p>
              <p>Brak wyników dla &quot;{result.query}&quot;</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
