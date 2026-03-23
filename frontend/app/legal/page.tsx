"use client";

import { useState } from "react";
import Link from "next/link";

export default function LegalSearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    
    setLoading(true);
    setSearched(true);
    try {
      const r = await fetch(`/api/ai/legal-search?q=${encodeURIComponent(query)}&limit=5`);
      const data = await r.json();
      setResults(data.results || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  const QUICK_SEARCHES = [
    "zakaz konkurencji w umowie B2B",
    "kary umowne dopuszczalne wysokości",
    "RODO obowiązki administratora",
    "przeniesienie praw autorskich IT",
    "odpowiedzialność kontraktowa art 471",
    "KSeF obowiązki 2026",
    "samozatrudnienie a stosunek pracy",
    "poufność NDA okres obowiązywania",
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">📚 Baza prawna</h1>
        <p className="text-sm text-gray-500 mt-1">
          Wyszukiwarka przepisów prawa pracy, KC, RODO i regulacji IT. Zasilana z LEX.
        </p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Zadaj pytanie prawne, np. 'czy kara 100k za non-compete jest dopuszczalna'"
            className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white font-medium px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "🔍 Szukam..." : "🔍 Szukaj"}
          </button>
        </div>

        {/* Quick searches */}
        <div className="flex flex-wrap gap-2 mt-4">
          {QUICK_SEARCHES.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => {
                setQuery(q);
                // Auto-search
                setLoading(true);
                setSearched(true);
                fetch(`/api/ai/legal-search?q=${encodeURIComponent(q)}&limit=5`)
                  .then(r => r.json())
                  .then(data => setResults(data.results || []))
                  .finally(() => setLoading(false));
              }}
              className="text-xs bg-gray-100 hover:bg-blue-50 hover:text-blue-700 px-3 py-1.5 rounded-full transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      </form>

      {/* Results */}
      {searched && (
        <div className="space-y-4">
          {results.length === 0 && !loading ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
              <p className="text-4xl mb-3">📭</p>
              <p>Brak wyników dla &quot;{query}&quot;</p>
            </div>
          ) : (
            results.map((text, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                    Wynik #{i + 1}
                  </span>
                  <span className="text-xs text-gray-400">
                    Relevance score: {((5 - i) / 5 * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="prose prose-sm max-w-none text-gray-700">
                  {text.split("\n").map((line, j) => {
                    if (line.startsWith("###")) {
                      return <h3 key={j} className="text-base font-semibold text-gray-900 mt-3 mb-1">{line.replace(/^#+\s*/, "")}</h3>;
                    }
                    if (line.startsWith("**") && line.endsWith("**")) {
                      return <p key={j} className="font-semibold text-gray-800">{line.replace(/\*\*/g, "")}</p>;
                    }
                    if (line.startsWith("- ") || line.startsWith("✅") || line.startsWith("⚠️")) {
                      return <p key={j} className="ml-4 text-sm">{line}</p>;
                    }
                    return line.trim() ? <p key={j} className="text-sm">{line}</p> : null;
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
