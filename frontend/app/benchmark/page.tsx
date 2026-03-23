"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface BenchmarkData {
  total_with_rate: number;
  below_market: number;
  at_market: number;
  above_market: number;
  avg_vs_median_pct: number;
  areas: Record<string, { count: number; avg_rate: number; median: number }>;
}

const positionColors = {
  below: "text-red-600",
  at: "text-green-600",
  above: "text-blue-600",
};

export default function BenchmarkPage() {
  const [data, setData] = useState<BenchmarkData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/benchmark")
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-16 text-gray-400">📊 Ładowanie benchmarku...</div>;
  if (!data) return <div className="text-red-500 p-8">Błąd</div>;

  const total = data.total_with_rate;
  const belowPct = total ? Math.round((data.below_market / total) * 100) : 0;
  const atPct = total ? Math.round((data.at_market / total) * 100) : 0;
  const abovePct = total ? Math.round((data.above_market / total) * 100) : 0;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">💰 Benchmark stawek</h1>
        <p className="text-sm text-gray-500 mt-1">
          Porównanie stawek B2B.net z medianą rynkową (No Fluff Jobs, JustJoinIT 2024-2025)
        </p>
      </div>

      {/* Overall KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500">Umów ze stawką</p>
          <p className="text-2xl font-bold text-gray-900">{data.total_with_rate}</p>
        </div>
        <div className="bg-red-50 rounded-xl border border-red-200 p-5">
          <p className="text-xs text-red-500">Poniżej rynku</p>
          <p className="text-2xl font-bold text-red-600">{data.below_market}</p>
          <p className="text-xs text-red-400">{belowPct}%</p>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-200 p-5">
          <p className="text-xs text-green-500">W normie</p>
          <p className="text-2xl font-bold text-green-600">{data.at_market}</p>
          <p className="text-xs text-green-400">{atPct}%</p>
        </div>
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-5">
          <p className="text-xs text-blue-500">Powyżej rynku</p>
          <p className="text-2xl font-bold text-blue-600">{data.above_market}</p>
          <p className="text-xs text-blue-400">{abovePct}%</p>
        </div>
        <div className={`rounded-xl border p-5 ${data.avg_vs_median_pct < 0 ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}>
          <p className="text-xs text-gray-500">vs mediana</p>
          <p className={`text-2xl font-bold ${data.avg_vs_median_pct < 0 ? "text-red-600" : "text-green-600"}`}>
            {data.avg_vs_median_pct > 0 ? "+" : ""}{data.avg_vs_median_pct}%
          </p>
        </div>
      </div>

      {/* Stacked bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Rozkład stawek</h2>
        <div className="flex rounded-full h-8 overflow-hidden">
          <div className="bg-red-400" style={{ width: `${belowPct}%` }} title={`Poniżej: ${data.below_market}`} />
          <div className="bg-green-400" style={{ width: `${atPct}%` }} title={`W normie: ${data.at_market}`} />
          <div className="bg-blue-400" style={{ width: `${abovePct}%` }} title={`Powyżej: ${data.above_market}`} />
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>🔴 Poniżej rynku</span>
          <span>🟢 W normie rynkowej</span>
          <span>🔵 Powyżej rynku</span>
        </div>
      </div>

      {/* By Area */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Stawki per obszar IT</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-gray-500">
                <th className="pb-2">Obszar IT</th>
                <th className="pb-2 text-right">Umów</th>
                <th className="pb-2 text-right">Avg B2B.net</th>
                <th className="pb-2 text-right">Mediana rynkowa</th>
                <th className="pb-2 text-right">Różnica</th>
                <th className="pb-2">Wizualizacja</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {Object.entries(data.areas)
                .sort(([, a], [, b]) => b.count - a.count)
                .map(([area, stats]) => {
                  const diff = stats.avg_rate - stats.median;
                  const diffPct = stats.median > 0 ? Math.round((diff / stats.median) * 100) : 0;
                  return (
                    <tr key={area} className="hover:bg-gray-50">
                      <td className="py-3 font-medium text-gray-900">{area}</td>
                      <td className="py-3 text-right text-gray-500">{stats.count}</td>
                      <td className="py-3 text-right font-semibold">{stats.avg_rate} PLN/h</td>
                      <td className="py-3 text-right text-gray-500">{stats.median} PLN/h</td>
                      <td className={`py-3 text-right font-semibold ${diff >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {diff >= 0 ? "+" : ""}{diffPct}%
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-1">
                          <div className="w-20 bg-gray-100 rounded-full h-2 relative">
                            <div
                              className={`absolute top-0 h-2 rounded-full ${diff >= 0 ? "bg-green-500" : "bg-red-500"}`}
                              style={{
                                width: `${Math.min(Math.abs(diffPct), 100)}%`,
                                left: diff < 0 ? `${100 - Math.min(Math.abs(diffPct), 100)}%` : "0",
                              }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
