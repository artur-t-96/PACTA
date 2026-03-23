"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getStats } from "@/lib/api";

interface CeoData {
  stats: {
    total: number;
    by_status: Record<string, number>;
    avg_rate: number;
    by_client: Record<string, number>;
    by_area: Record<string, number>;
  };
  benchmark: {
    total_with_rate: number;
    below_market: number;
    at_market: number;
    above_market: number;
    avg_vs_median_pct: number;
  };
  analytics: {
    by_year: Record<string, number>;
  };
  alerts: {
    missing_nip: number;
    missing_rate: number;
    draft_old: number;
  };
}

export default function CeoPage() {
  const [data, setData] = useState<CeoData | null>(null);
  const [loading, setLoading] = useState(true);

  // Auto-refresh every 60s
  useEffect(() => {
    const interval = setInterval(() => {
      fetch("/api/live").then(r => r.json()).then(live => {
        setData(prev => prev ? {
          ...prev,
          stats: { ...prev.stats, total: live.total },
        } : prev);
      }).catch(() => {});
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const [ksef, setKsef] = useState<{ readiness_pct: number; ksef_ready: number; total_active: number } | null>(null);
  const [funnel, setFunnel] = useState<{ funnel: Array<{ stage: string; count: number; color: string }> } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/contracts/stats").then(r => r.json()),
      fetch("/api/benchmark").then(r => r.json()),
      fetch("/api/analytics/contractors").then(r => r.json()),
      fetch("/api/alerts").then(r => r.json()),
    ]).then(([stats, benchmark, analytics, alerts]) => {
      setData({ stats, benchmark, analytics, alerts });
    }).catch(console.error).finally(() => setLoading(false));

    fetch("/api/ksef-readiness").then(r => r.json()).then(setKsef).catch(() => {});
    fetch("/api/funnel").then(r => r.json()).then(setFunnel).catch(() => {});
  }, []);

  if (loading) return <div className="text-center py-16 text-gray-400">Ładowanie raportu...</div>;
  if (!data) return <div className="text-red-500 p-8">Błąd</div>;

  const { stats, benchmark, analytics, alerts } = data;
  const aktywne = stats.by_status?.aktywna || 0;
  const topClients = Object.entries(stats.by_client)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📋 Raport CEO</h1>
          <p className="text-sm text-gray-500">
            Stan umów B2B.net S.A. · {new Date().toLocaleDateString("pl-PL")}
          </p>
        </div>
        <a
          href="/api/contracts/export/xlsx"
          className="bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-green-700"
        >
          📊 Pobierz raport Excel
        </a>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <KPI label="Łącznie umów" value={stats.total} />
        <KPI label="Aktywne" value={aktywne} color="green" />
        <KPI label="Zakończone" value={stats.by_status?.zakonczona || 0} color="gray" />
        <KPI label="Robocze" value={(stats.by_status?.draft || 0) + (stats.by_status?.do_podpisu || 0)} color="yellow" />
        <KPI label="Avg stawka" value={stats.avg_rate > 10 ? `${stats.avg_rate}` : "—"} suffix="PLN/h" color="blue" />
        <KPI 
          label="vs rynek" 
          value={`${benchmark.avg_vs_median_pct > 0 ? "+" : ""}${benchmark.avg_vs_median_pct}%`} 
          color={benchmark.avg_vs_median_pct >= 0 ? "green" : "red"} 
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 Clients */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Top 5 klientów</h2>
          <div className="space-y-3">
            {topClients.map(([client, count]) => (
              <div key={client} className="flex items-center justify-between">
                <span className="text-sm text-gray-700 truncate mr-4">{client}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${(count / topClients[0][1]) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-gray-900 w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Rate Benchmark */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Stawki vs rynek</h2>
          <div className="flex gap-3 mb-4">
            <div className="flex-1 text-center bg-red-50 rounded-lg p-3">
              <p className="text-2xl font-bold text-red-600">{benchmark.below_market}</p>
              <p className="text-xs text-red-500">Poniżej</p>
            </div>
            <div className="flex-1 text-center bg-green-50 rounded-lg p-3">
              <p className="text-2xl font-bold text-green-600">{benchmark.at_market}</p>
              <p className="text-xs text-green-500">W normie</p>
            </div>
            <div className="flex-1 text-center bg-blue-50 rounded-lg p-3">
              <p className="text-2xl font-bold text-blue-600">{benchmark.above_market}</p>
              <p className="text-xs text-blue-500">Powyżej</p>
            </div>
          </div>
          <p className="text-xs text-gray-400">
            Na {benchmark.total_with_rate} umów ze stawką. Źródło: NoFluffJobs, JJIT 2024-2025.
          </p>
        </div>

        {/* Year Trend */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Trend roczny</h2>
          <div className="flex items-end gap-1 h-32">
            {Object.entries(analytics.by_year || {})
              .filter(([yr]) => parseInt(yr) >= 2019)
              .map(([year, count]) => {
                const max = Math.max(...Object.values(analytics.by_year || {}).filter((_, i) => i > 2));
                return (
                  <div key={year} className="flex-1 flex flex-col items-center gap-0.5">
                    <span className="text-xs font-medium text-gray-600">{count}</span>
                    <div
                      className="w-full bg-blue-400 rounded-t hover:bg-blue-500"
                      style={{ height: `${(count / max) * 100}px`, minHeight: "4px" }}
                    />
                    <span className="text-xs text-gray-400">{year.slice(2)}</span>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Alerts */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-800 mb-4">⚠️ Wymagają uwagi</h2>
          <div className="space-y-3">
            <AlertItem label="Umów bez NIP" count={alerts.missing_nip} href="/alerts" />
            <AlertItem label="Umów bez stawki" count={alerts.missing_rate} href="/alerts" />
            <AlertItem label="Starych draftów (>7 dni)" count={alerts.draft_old} href="/alerts" />
          </div>
        </div>
      </div>

      {/* Funnel */}
      {funnel && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-800 mb-4">📊 Funnel umów (nowe)</h2>
          <div className="flex items-end gap-1 h-24">
            {funnel.funnel.filter(s => s.count > 0).map(s => {
              const max = Math.max(...funnel.funnel.map(f => f.count), 1);
              return (
                <div key={s.stage} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-bold text-gray-700">{s.count}</span>
                  <div className="w-full rounded-t" style={{ backgroundColor: s.color, height: `${(s.count / max) * 80}px`, minHeight: "8px" }} />
                  <span className="text-xs text-gray-500 text-center leading-tight">{s.stage.split(" ")[0]}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* KSeF Readiness */}
      {ksef && (
        <div className={`rounded-xl border-2 p-5 ${ksef.readiness_pct >= 80 ? "border-green-200 bg-green-50" : ksef.readiness_pct >= 50 ? "border-yellow-200 bg-yellow-50" : "border-red-200 bg-red-50"}`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-800">🏛️ KSeF Readiness</h2>
              <p className="text-sm text-gray-500">{ksef.ksef_ready} z {ksef.total_active} aktywnych umów gotowych na KSeF</p>
            </div>
            <p className={`text-3xl font-bold ${ksef.readiness_pct >= 80 ? "text-green-600" : ksef.readiness_pct >= 50 ? "text-yellow-600" : "text-red-600"}`}>
              {ksef.readiness_pct}%
            </p>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 mt-3">
            <div className={`h-3 rounded-full ${ksef.readiness_pct >= 80 ? "bg-green-500" : ksef.readiness_pct >= 50 ? "bg-yellow-500" : "bg-red-500"}`}
              style={{ width: `${ksef.readiness_pct}%` }} />
          </div>
        </div>
      )}

      {/* Client Ranking */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-800 mb-4">🏆 Top klienci (est. revenue)</h2>
        <ClientRanking />
      </div>

      {/* IT Areas Distribution */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-800 mb-4">Obszary IT</h2>
        <div className="flex flex-wrap gap-3">
          {Object.entries(stats.by_area)
            .sort(([, a], [, b]) => b - a)
            .map(([area, count]) => (
              <div key={area} className="bg-gray-50 rounded-lg px-4 py-2 border">
                <p className="text-xs text-gray-500">{area}</p>
                <p className="text-lg font-bold text-gray-900">{count}</p>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

function KPI({ label, value, suffix, color = "gray" }: { label: string; value: string | number; suffix?: string; color?: string }) {
  const colors: Record<string, string> = {
    green: "text-green-600",
    red: "text-red-600",
    blue: "text-blue-600",
    yellow: "text-yellow-600",
    gray: "text-gray-900",
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-xl font-bold ${colors[color] || colors.gray}`}>
        {value} {suffix && <span className="text-xs font-normal text-gray-400">{suffix}</span>}
      </p>
    </div>
  );
}

function ClientRanking() {
  const [ranking, setRanking] = useState<Array<{ rank: number; client: string; active_contracts: number; annual_revenue_est: number }>>([]);
  useEffect(() => {
    fetch("/api/analytics/client-ranking").then(r => r.json()).then(setRanking).catch(() => {});
  }, []);
  
  if (!ranking.length) return <p className="text-sm text-gray-400">Brak danych</p>;
  return (
    <div className="space-y-2">
      {ranking.slice(0, 5).map(c => (
        <div key={c.rank} className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-400">#{c.rank}</span>
            <span className="text-sm text-gray-800 truncate">{c.client}</span>
          </div>
          <div className="text-right">
            <span className="text-sm font-semibold text-green-600">{(c.annual_revenue_est / 1000000).toFixed(1)}M</span>
            <span className="text-xs text-gray-400 ml-1">PLN/rok</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function AlertItem({ label, count, href }: { label: string; count: number; href: string }) {
  if (count === 0) return null;
  return (
    <Link href={href} className="flex items-center justify-between hover:bg-gray-50 rounded-lg p-2 -mx-2">
      <span className="text-sm text-gray-700">{label}</span>
      <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-semibold">{count}</span>
    </Link>
  );
}
