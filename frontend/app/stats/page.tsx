"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getStats } from "@/lib/api";

interface Stats {
  total: number;
  by_status: Record<string, number>;
  avg_rate: number;
  by_client: Record<string, number>;
  by_area: Record<string, number>;
}

const statusLabels: Record<string, string> = {
  draft: "Robocze",
  modified: "Zmodyfikowane",
  do_podpisu: "Do podpisu",
  aktywna: "Aktywne",
  zakonczona: "Zakończone",
  anulowana: "Anulowane",
};

const statusColors: Record<string, string> = {
  draft: "bg-yellow-500",
  modified: "bg-blue-500",
  do_podpisu: "bg-purple-500",
  aktywna: "bg-green-500",
  zakonczona: "bg-gray-500",
  anulowana: "bg-red-500",
};

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="text-center py-16 text-gray-400">
        <div className="text-4xl mb-3">📊</div>
        <p>Ładowanie statystyk...</p>
      </div>
    );
  }

  if (!stats) return <div className="text-red-500 p-8">Błąd ładowania statystyk</div>;

  const maxClientCount = Math.max(...Object.values(stats.by_client), 1);
  const maxAreaCount = Math.max(...Object.values(stats.by_area), 1);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📊 Statystyki</h1>
          <p className="text-sm text-gray-500 mt-1">Podsumowanie wszystkich umów</p>
        </div>
        <Link
          href="/"
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          ← Wróć do dashboardu
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500 mb-1">Łącznie umów</p>
          <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500 mb-1">Średnia stawka</p>
          <p className="text-3xl font-bold text-blue-600">{stats.avg_rate} <span className="text-base font-normal text-gray-400">PLN/h</span></p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500 mb-1">Klientów</p>
          <p className="text-3xl font-bold text-gray-900">{Object.keys(stats.by_client).length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500 mb-1">Obszarów IT</p>
          <p className="text-3xl font-bold text-gray-900">{Object.keys(stats.by_area).length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* By Status */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Status umów</h2>
          <div className="space-y-3">
            {Object.entries(stats.by_status).map(([status, count]) => (
              <div key={status} className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${statusColors[status] || "bg-gray-400"}`} />
                <span className="text-sm text-gray-700 flex-1">
                  {statusLabels[status] || status}
                </span>
                <span className="text-sm font-semibold text-gray-900">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* By Client */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Umowy per klient</h2>
          <div className="space-y-3">
            {Object.entries(stats.by_client)
              .sort(([, a], [, b]) => b - a)
              .map(([client, count]) => (
                <div key={client}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700 truncate mr-2">{client}</span>
                    <span className="font-semibold text-gray-900">{count}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${(count / maxClientCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* By Area */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Obszary IT</h2>
          <div className="space-y-3">
            {Object.entries(stats.by_area)
              .sort(([, a], [, b]) => b - a)
              .map(([area, count]) => (
                <div key={area}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700">{area}</span>
                    <span className="font-semibold text-gray-900">{count}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all"
                      style={{ width: `${(count / maxAreaCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
