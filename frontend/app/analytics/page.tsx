"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Analytics {
  top_contractors: Array<{ name: string; contracts: number; max_rate: number }>;
  by_year: Record<string, number>;
}

interface FullAnalytics {
  top_roles: Array<{ role: string; count: number }>;
  top_clients: Array<{ client: string; count: number; avg_rate: number }>;
}

interface RecruiterStat {
  recruiter: string;
  total: number;
  active: number;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [full, setFull] = useState<FullAnalytics | null>(null);
  const [recruiters, setRecruiters] = useState<RecruiterStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/analytics/contractors").then(r => r.json()),
      fetch("/api/analytics/full").then(r => r.json()),
      fetch("/api/analytics/recruiters").then(r => r.json()),
    ]).then(([contractors, fullData, recruiterData]) => {
      setData(contractors);
      setFull(fullData);
      setRecruiters(recruiterData);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-16 text-gray-400">Ładowanie...</div>;
  if (!data) return <div className="text-red-500 p-8">Błąd</div>;

  const maxYear = Math.max(...Object.values(data.by_year));
  const maxRole = full ? Math.max(...full.top_roles.map(r => r.count), 1) : 1;
  const maxRecruiter = recruiters.length > 0 ? Math.max(...recruiters.map(r => r.total), 1) : 1;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">📈 Analityka</h1>
        <p className="text-sm text-gray-500 mt-1">
          Trendy i statystyki historyczne umów
        </p>
      </div>

      {/* By Year Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-6">Umowy per rok</h2>
        <div className="flex items-end gap-2 h-48">
          {Object.entries(data.by_year)
            .filter(([yr]) => parseInt(yr) >= 2018)
            .map(([year, count]) => (
              <div key={year} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-semibold text-gray-700">{count}</span>
                <div
                  className="w-full bg-blue-500 rounded-t-sm hover:bg-blue-600 transition-colors"
                  style={{ height: `${(count / maxYear) * 180}px`, minHeight: "4px" }}
                  title={`${year}: ${count} umów`}
                />
                <span className="text-xs text-gray-500 font-medium">{year.slice(2)}</span>
              </div>
            ))}
        </div>
      </div>

      {/* Top Contractors */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Kontraktory z wieloma umowami</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-gray-500">
                <th className="pb-2">#</th>
                <th className="pb-2">Kontrahent</th>
                <th className="pb-2 text-right">Umów</th>
                <th className="pb-2 text-right">Max stawka</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.top_contractors
                .filter(c => !["Status Test", "Pytest Testowy"].includes(c.name))
                .slice(0, 15)
                .map((c, i) => (
                  <tr key={c.name} className="hover:bg-gray-50">
                    <td className="py-2 text-gray-400">{i + 1}</td>
                    <td className="py-2 font-medium text-gray-900">{c.name}</td>
                    <td className="py-2 text-right">
                      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                        {c.contracts}
                      </span>
                    </td>
                    <td className="py-2 text-right text-gray-500">
                      {c.max_rate > 0 ? `${c.max_rate} PLN/h` : "—"}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recruiters */}
      {recruiters.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mt-6">
          <h2 className="text-lg font-semibold mb-4">👥 Rekruterzy — umowy</h2>
          <div className="space-y-2">
            {recruiters.slice(0, 10).map(r => (
              <div key={r.recruiter}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700 font-medium">{r.recruiter}</span>
                  <span className="text-gray-500">{r.total} total · <span className="text-green-600">{r.active} aktywnych</span></span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-purple-500 h-2 rounded-full"
                    style={{ width: `${(r.total / maxRecruiter) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Roles */}
      {full && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mt-6">
          <h2 className="text-lg font-semibold mb-4">Najpopularniejsze role</h2>
          <div className="space-y-2">
            {full.top_roles.slice(0, 10).map((r) => (
              <div key={r.role}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">{r.role}</span>
                  <span className="text-gray-500 font-medium">{r.count}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${(r.count / maxRole) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
