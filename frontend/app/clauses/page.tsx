"use client";

import { useEffect, useState } from "react";

interface Clause {
  id: string;
  name: string;
  category: string;
  text: string;
  risk_level: string;
  notes: string;
}

const riskColors: Record<string, string> = {
  low: "bg-green-100 text-green-700 border-green-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  high: "bg-red-100 text-red-700 border-red-200",
};

const riskLabels: Record<string, string> = {
  low: "Niskie ryzyko",
  medium: "Średnie ryzyko",
  high: "Wysokie ryzyko",
};

export default function ClausesPage() {
  const [clauses, setClauses] = useState<Clause[]>([]);
  const [filter, setFilter] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/clauses")
      .then(r => r.json())
      .then(setClauses)
      .catch(console.error);
  }, []);

  const filtered = clauses.filter(c =>
    !filter || c.category.toLowerCase() === filter.toLowerCase()
  );

  const categories = [...new Set(clauses.map(c => c.category))];

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">📜 Biblioteka klauzul</h1>
        <p className="text-sm text-gray-500 mt-1">
          Standardowe paragrafy do umów B2B. Kliknij &quot;Kopiuj&quot; i wklej do edycji.
        </p>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setFilter("")}
          className={`px-3 py-1.5 rounded-full text-sm ${!filter ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
        >
          Wszystkie ({clauses.length})
        </button>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 rounded-full text-sm ${filter === cat ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            {cat} ({clauses.filter(c => c.category === cat).length})
          </button>
        ))}
      </div>

      {/* Clauses */}
      <div className="space-y-4">
        {filtered.map(clause => (
          <div key={clause.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-gray-900">{clause.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${riskColors[clause.risk_level]}`}>
                    {riskLabels[clause.risk_level]}
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(clause.text, clause.id)}
                  className={`text-sm px-3 py-1 rounded-lg ${
                    copied === clause.id
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-700"
                  }`}
                >
                  {copied === clause.id ? "✅ Skopiowano!" : "📋 Kopiuj"}
                </button>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 leading-relaxed">
                {clause.text}
              </div>
              {clause.notes && (
                <p className="text-xs text-gray-400 mt-3 flex items-start gap-1">
                  <span>💡</span> {clause.notes}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
