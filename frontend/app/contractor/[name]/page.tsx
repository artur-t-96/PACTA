"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Contract {
  id: number;
  number: string;
  client: string;
  role: string;
  rate: number;
  it_area: string;
  start_date: string;
  status: string;
}

const statusColors: Record<string, string> = {
  aktywna: "bg-green-100 text-green-700",
  draft: "bg-yellow-100 text-yellow-700",
  zakonczona: "bg-gray-100 text-gray-500",
  do_podpisu: "bg-purple-100 text-purple-700",
  anulowana: "bg-red-100 text-red-500",
};

export default function ContractorPage() {
  const params = useParams();
  const name = decodeURIComponent(params.name as string);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/contracts?q=${encodeURIComponent(name)}&limit=100`)
      .then(r => r.json())
      .then(data => setContracts(data.filter((c: Contract & { contractor_name: string }) => c.contractor_name === name)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [name]);

  const totalEarnings = contracts.filter(c => c.rate > 0).reduce((sum, c) => sum + c.rate, 0);
  const avgRate = contracts.filter(c => c.rate > 0).length > 0
    ? totalEarnings / contracts.filter(c => c.rate > 0).length : 0;
  const activeCount = contracts.filter(c => c.status === "aktywna").length;
  const clients = [...new Set(contracts.map(c => c.client))].filter(Boolean);

  if (loading) return <div className="text-center py-16 text-gray-400">Ładowanie...</div>;

  return (
    <div>
      <div className="mb-8">
        <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">← Dashboard</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">👤 {name}</h1>
        <p className="text-sm text-gray-500 mt-1">Historia umów w B2B.net S.A.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border p-5 text-center">
          <p className="text-xs text-gray-500">Łącznie umów</p>
          <p className="text-2xl font-bold text-gray-900">{contracts.length}</p>
        </div>
        <div className="bg-white rounded-xl border p-5 text-center">
          <p className="text-xs text-gray-500">Aktywne</p>
          <p className="text-2xl font-bold text-green-600">{activeCount}</p>
        </div>
        <div className="bg-white rounded-xl border p-5 text-center">
          <p className="text-xs text-gray-500">Avg stawka</p>
          <p className="text-2xl font-bold text-blue-600">{avgRate > 0 ? `${avgRate.toFixed(0)}` : "—"}</p>
          {avgRate > 0 && <p className="text-xs text-gray-400">PLN/h</p>}
        </div>
        <div className="bg-white rounded-xl border p-5 text-center">
          <p className="text-xs text-gray-500">Klientów</p>
          <p className="text-2xl font-bold text-gray-900">{clients.length}</p>
        </div>
      </div>

      {/* Clients */}
      {clients.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h2 className="font-semibold text-gray-800 mb-3">Klienci</h2>
          <div className="flex flex-wrap gap-2">
            {clients.map(c => (
              <span key={c} className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm">{c}</span>
            ))}
          </div>
        </div>
      )}

      {/* Contract list */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Historia umów</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {contracts.map(c => (
            <Link key={c.id} href={`/contracts/${c.id}`}
              className="flex items-center justify-between px-5 py-3 hover:bg-gray-50">
              <div>
                <span className="font-mono text-blue-600 text-sm mr-3">{c.number}</span>
                <span className="text-sm text-gray-700">{c.client}</span>
                <span className="text-gray-400 mx-2">·</span>
                <span className="text-sm text-gray-500">{c.role}</span>
              </div>
              <div className="flex items-center gap-3">
                {c.rate > 0 && <span className="text-sm font-medium text-gray-700">{c.rate} PLN/h</span>}
                <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[c.status] || "bg-gray-100"}`}>
                  {c.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
