"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Suggestion {
  id: number;
  number: string;
  contractor: string;
  client: string;
  role: string;
  it_area: string;
  seniority: string;
  suggested_rate: number;
  range: { min: number; max: number };
}

export default function EnrichmentPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [applied, setApplied] = useState<Set<number>>(new Set());
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    fetch("/api/enrichment/suggest-rates?limit=50")
      .then(r => r.json())
      .then(d => setSuggestions(d.suggestions || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function applyRate(id: number, rate: number) {
    try {
      await fetch(`/api/contracts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rate }),
      });
      setApplied(prev => new Set([...prev, id]));
    } catch { /* */ }
  }

  async function applyAll() {
    setApplying(true);
    const updates = suggestions
      .filter(s => !applied.has(s.id))
      .map(s => ({ id: s.id, field: "rate", value: s.suggested_rate }));
    
    await fetch("/api/contracts/bulk/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    setApplied(new Set(suggestions.map(s => s.id)));
    setApplying(false);
  }

  if (loading) return <div className="text-center py-16 text-gray-400">Ładowanie sugestii...</div>;

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🔧 Uzupełnianie danych</h1>
          <p className="text-sm text-gray-500 mt-1">
            {suggestions.length} umów bez stawki — AI sugeruje na podstawie roli i rynku
          </p>
        </div>
        {suggestions.length > 0 && (
          <button
            onClick={applyAll}
            disabled={applying}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
          >
            {applying ? "⏳ Aplikuję..." : `✅ Zastosuj wszystkie (${suggestions.length - applied.size})`}
          </button>
        )}
      </div>

      {suggestions.length === 0 ? (
        <div className="bg-white rounded-xl border border-green-200 p-8 text-center">
          <p className="text-4xl mb-3">✅</p>
          <p className="text-green-700 font-medium">Wszystkie nowe umowy mają uzupełnione stawki!</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b text-left text-gray-500">
                <th className="px-4 py-3">Nr</th>
                <th className="px-4 py-3">Kontrahent</th>
                <th className="px-4 py-3">Klient</th>
                <th className="px-4 py-3">Rola</th>
                <th className="px-4 py-3">Level</th>
                <th className="px-4 py-3 text-right">Sugestia</th>
                <th className="px-4 py-3 text-right">Range</th>
                <th className="px-4 py-3">Akcja</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {suggestions.map(s => (
                <tr key={s.id} className={applied.has(s.id) ? "bg-green-50 opacity-60" : "hover:bg-gray-50"}>
                  <td className="px-4 py-2 font-mono text-blue-600">
                    <Link href={`/contracts/${s.id}`}>{s.number}</Link>
                  </td>
                  <td className="px-4 py-2">{s.contractor}</td>
                  <td className="px-4 py-2 text-gray-500">{s.client}</td>
                  <td className="px-4 py-2">{s.role}</td>
                  <td className="px-4 py-2">
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{s.seniority}</span>
                  </td>
                  <td className="px-4 py-2 text-right font-semibold">{s.suggested_rate} PLN/h</td>
                  <td className="px-4 py-2 text-right text-gray-400 text-xs">{s.range.min}-{s.range.max}</td>
                  <td className="px-4 py-2">
                    {applied.has(s.id) ? (
                      <span className="text-green-600 text-xs">✅</span>
                    ) : (
                      <button
                        onClick={() => applyRate(s.id, s.suggested_rate)}
                        className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                      >
                        Zastosuj
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
