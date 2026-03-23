"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface RecruiterStats {
  new_contracts: number;
  pending_signature: number;
  active: number;
  contracts_today: Array<{ id: number; number: string; name: string; client: string; role: string }>;
}

export default function RecruiterPage() {
  const [stats, setStats] = useState<RecruiterStats | null>(null);
  const [alerts, setAlerts] = useState<{ draft_old: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/live").then(r => r.json()),
      fetch("/api/alerts").then(r => r.json()),
      fetch("/api/contracts?status=do_podpisu&limit=10").then(r => r.json()),
      fetch("/api/contracts/stats/new").then(r => r.json()),
    ]).then(([live, alertData, pendingSig, newStats]) => {
      setStats({
        new_contracts: live.new_today,
        pending_signature: Array.isArray(pendingSig) ? pendingSig.length : 0,
        active: live.active,
        contracts_today: Array.isArray(pendingSig) ? pendingSig : [],
      });
      setAlerts(alertData);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-16 text-gray-400">Ładowanie...</div>;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">👤 Panel rekrutera</h1>
        <p className="text-sm text-gray-500 mt-1">Szybki podgląd dla Marty i zespołu</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Link href="/new" className="bg-blue-600 text-white rounded-xl p-5 text-center hover:bg-blue-700">
          <p className="text-3xl mb-1">✍️</p>
          <p className="font-semibold">Nowa umowa</p>
        </Link>
        <Link href="/import" className="bg-green-600 text-white rounded-xl p-5 text-center hover:bg-green-700">
          <p className="text-3xl mb-1">📥</p>
          <p className="font-semibold">Import Excel</p>
        </Link>
        <Link href="/search" className="bg-purple-600 text-white rounded-xl p-5 text-center hover:bg-purple-700">
          <p className="text-3xl mb-1">🔍</p>
          <p className="font-semibold">Szukaj</p>
        </Link>
        <Link href="/legal" className="bg-gray-700 text-white rounded-xl p-5 text-center hover:bg-gray-800">
          <p className="text-3xl mb-1">📚</p>
          <p className="font-semibold">Baza prawna</p>
        </Link>
      </div>

      {/* Status */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
          <p className="text-xs text-gray-500">Aktywne umowy</p>
          <p className="text-3xl font-bold text-green-600">{stats?.active}</p>
        </div>
        <div className="bg-white rounded-xl border border-orange-200 p-5 text-center">
          <p className="text-xs text-gray-500">Do podpisania</p>
          <p className="text-3xl font-bold text-orange-600">{stats?.pending_signature || 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
          <p className="text-xs text-gray-500">Stare drafty</p>
          <p className="text-3xl font-bold text-red-500">{alerts?.draft_old || 0}</p>
        </div>
      </div>

      {/* Do podpisu */}
      {(stats?.contracts_today?.length || 0) > 0 && (
        <div className="bg-white rounded-xl border border-orange-200 p-6">
          <h2 className="font-semibold text-gray-800 mb-4">⏳ Umowy oczekujące na podpis</h2>
          <div className="space-y-2">
            {stats?.contracts_today.map(c => (
              <Link key={c.id} href={`/contracts/${c.id}`}
                className="flex items-center justify-between py-2 hover:bg-gray-50 rounded-lg px-2">
                <div>
                  <span className="font-mono text-blue-600 text-sm mr-3">{c.number}</span>
                  <span className="font-medium">{c.name}</span>
                  <span className="text-gray-400 mx-2">·</span>
                  <span className="text-gray-500 text-sm">{c.client}</span>
                </div>
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                  {c.role}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Activity Feed */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mt-6">
        <h2 className="font-semibold text-gray-800 mb-4">📋 Ostatnia aktywność</h2>
        <ActivityFeed />
      </div>

      {/* Recent */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mt-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-gray-800">Ostatnie 10 umów</h2>
          <Link href="/" className="text-sm text-blue-600 hover:text-blue-800">Zobacz wszystkie →</Link>
        </div>
        <RecentContracts />
      </div>
    </div>
  );
}

function ActivityFeed() {
  const [activity, setActivity] = useState<Array<{ contract_number: string; contractor: string; action: string; timestamp: string }>>([]);
  useEffect(() => {
    fetch("/api/activity?limit=8")
      .then(r => r.json()).then(setActivity).catch(() => {});
  }, []);

  const actionIcons: Record<string, string> = {
    "Umowa utworzona": "📄", "Zmiana statusu": "🔄", "Aneks wygenerowany": "📋",
    "Umowa rozwiązana": "🔴", "Email wysłany": "📧", "Przegląd AI": "🤖",
    "Import z Excela": "📥", "Umowa sklonowana": "📋",
  };

  return (
    <div className="space-y-2">
      {activity.map((a, i) => (
        <div key={i} className="flex items-center gap-3 text-sm py-1.5 border-l-2 border-blue-200 pl-3">
          <span>{actionIcons[a.action] || "⚡"}</span>
          <span className="text-gray-500 text-xs w-12">{a.timestamp?.slice(11, 16)}</span>
          <span className="font-mono text-blue-600 text-xs">{a.contract_number}</span>
          <span className="text-gray-700">{a.action}</span>
          <span className="text-gray-400 text-xs">· {a.contractor}</span>
        </div>
      ))}
    </div>
  );
}

function RecentContracts() {
  const [contracts, setContracts] = useState<Array<{ id: number; number: string; contractor_name: string; client: string; status: string; created_at: string }>>([]);
  
  useEffect(() => {
    fetch("/api/contracts?limit=10")
      .then(r => r.json())
      .then(setContracts)
      .catch(() => {});
  }, []);

  const statusColors: Record<string, string> = {
    aktywna: "bg-green-100 text-green-700",
    draft: "bg-yellow-100 text-yellow-700",
    do_podpisu: "bg-purple-100 text-purple-700",
    zakonczona: "bg-gray-100 text-gray-500",
    anulowana: "bg-red-100 text-red-500",
  };

  return (
    <div className="divide-y divide-gray-50">
      {contracts.map(c => (
        <Link key={c.id} href={`/contracts/${c.id}`}
          className="flex items-center justify-between py-2.5 hover:bg-gray-50 rounded-lg px-2 -mx-2">
          <div>
            <span className="font-mono text-blue-600 text-sm mr-2">{c.number}</span>
            <span className="font-medium text-gray-900">{c.contractor_name}</span>
            <span className="text-gray-400 mx-2">·</span>
            <span className="text-sm text-gray-500">{c.client}</span>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[c.status] || "bg-gray-100"}`}>
            {c.status}
          </span>
        </Link>
      ))}
    </div>
  );
}
