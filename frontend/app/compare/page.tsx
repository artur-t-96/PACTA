"use client";

import { useState } from "react";
import Link from "next/link";

interface CompareResult {
  contract_1: Record<string, string | number>;
  contract_2: Record<string, string | number>;
  differences: Array<{ field: string; contract_1: string | number; contract_2: string | number }>;
  rate_diff: number;
}

const fieldLabels: Record<string, string> = {
  number: "Nr umowy",
  contractor: "Kontrahent",
  company: "Firma",
  nip: "NIP",
  client: "Klient",
  role: "Rola",
  rate: "Stawka",
  it_area: "Obszar IT",
  start_date: "Data startu",
  status: "Status",
  city: "Miasto",
};

export default function ComparePage() {
  const [id1, setId1] = useState("");
  const [id2, setId2] = useState("");
  const [result, setResult] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleCompare() {
    if (!id1 || !id2) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/contracts/compare?id1=${id1}&id2=${id2}`);
      setResult(await r.json());
    } catch { /* */ } finally { setLoading(false); }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">⚖️ Porównaj umowy</h1>
        <p className="text-sm text-gray-500 mt-1">Porównanie dwóch umów obok siebie</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">ID umowy 1</label>
            <input type="number" value={id1} onChange={e => setId1(e.target.value)}
              placeholder="np. 1" className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">ID umowy 2</label>
            <input type="number" value={id2} onChange={e => setId2(e.target.value)}
              placeholder="np. 5" className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <button onClick={handleCompare} disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {loading ? "..." : "Porównaj"}
          </button>
        </div>
      </div>

      {result && !("error" in result) && (
        <div className="space-y-4">
          {/* Rate diff */}
          {result.rate_diff !== 0 && (
            <div className={`rounded-xl p-4 text-center ${result.rate_diff > 0 ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
              <p className="text-sm text-gray-600">Różnica stawek</p>
              <p className={`text-2xl font-bold ${result.rate_diff > 0 ? "text-green-600" : "text-red-600"}`}>
                {result.rate_diff > 0 ? "+" : ""}{result.rate_diff} PLN/h
              </p>
            </div>
          )}

          {/* Comparison table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-4 py-3 text-left text-gray-600 font-medium">Pole</th>
                  <th className="px-4 py-3 text-left text-blue-600 font-medium">
                    <Link href={`/contracts/${result.contract_1.id}`} className="hover:underline">
                      {result.contract_1.number as string}
                    </Link>
                  </th>
                  <th className="px-4 py-3 text-left text-purple-600 font-medium">
                    <Link href={`/contracts/${result.contract_2.id}`} className="hover:underline">
                      {result.contract_2.number as string}
                    </Link>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {Object.keys(result.contract_1)
                  .filter(k => k !== "id")
                  .map(field => {
                    const v1 = result.contract_1[field];
                    const v2 = result.contract_2[field];
                    const isDiff = v1 !== v2;
                    return (
                      <tr key={field} className={isDiff ? "bg-yellow-50" : ""}>
                        <td className="px-4 py-2 text-gray-500">{fieldLabels[field] || field}</td>
                        <td className={`px-4 py-2 ${isDiff ? "font-semibold text-blue-700" : "text-gray-700"}`}>
                          {field === "rate" ? `${v1} PLN/h` : String(v1)}
                        </td>
                        <td className={`px-4 py-2 ${isDiff ? "font-semibold text-purple-700" : "text-gray-700"}`}>
                          {field === "rate" ? `${v2} PLN/h` : String(v2)}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-400 text-center">
            {result.differences.length} różnic · Żółte wiersze = różne wartości
          </p>
        </div>
      )}
    </div>
  );
}
