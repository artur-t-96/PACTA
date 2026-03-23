"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listContracts, getDownloadUrl, getStats, type Contract } from "@/lib/api";

const statusColors: Record<string, string> = {
  draft: "bg-yellow-100 text-yellow-800",
  modified: "bg-blue-100 text-blue-800",
  do_podpisu: "bg-purple-100 text-purple-800",
  aktywna: "bg-green-100 text-green-800",
  zakonczona: "bg-gray-100 text-gray-800",
  anulowana: "bg-red-100 text-red-800",
  signed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const statusLabels: Record<string, string> = {
  draft: "Robocza",
  modified: "Zmodyfikowana",
  do_podpisu: "Do podpisu",
  aktywna: "Aktywna",
  zakonczona: "Zakończona",
  anulowana: "Anulowana",
  signed: "Podpisana",
  cancelled: "Anulowana",
};

export default function Dashboard() {
  const [stats, setStats] = useState<{total: number; avg_rate: number; by_status: Record<string, number>} | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortKey, setSortKey] = useState<keyof Contract>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  useEffect(() => {
    loadContracts();
    getStats().then(setStats).catch(() => {});
  }, []);

  // Debounced server-side search for large datasets
  useEffect(() => {
    if (!filter && !statusFilter) {
      loadContracts();
      return;
    }
    const timer = setTimeout(() => {
      setLoading(true);
      listContracts({ q: filter || undefined, status: statusFilter || undefined })
        .then(setContracts)
        .catch(() => setError("Błąd wyszukiwania"))
        .finally(() => setLoading(false));
    }, 400);
    return () => clearTimeout(timer);
  }, [filter, statusFilter]);

  const [error, setError] = useState("");

  async function loadContracts() {
    try {
      setError("");
      const data = await listContracts();
      setContracts(data);
    } catch (e) {
      console.error(e);
      setError("Nie można połączyć z backendem. Sprawdź czy serwer działa na porcie 8001.");
    } finally {
      setLoading(false);
    }
  }

  const filtered = contracts.filter((c) => {
    const matchText =
      !filter ||
      c.contractor_name.toLowerCase().includes(filter.toLowerCase()) ||
      c.contractor_company.toLowerCase().includes(filter.toLowerCase()) ||
      c.client.toLowerCase().includes(filter.toLowerCase()) ||
      c.number.toLowerCase().includes(filter.toLowerCase());

    const matchStatus = !statusFilter || c.status === statusFilter;
    return matchText && matchStatus;
  }).sort((a, b) => {
    const va = a[sortKey];
    const vb = b[sortKey];
    const cmp = String(va ?? "").localeCompare(String(vb ?? ""));
    return sortDir === "asc" ? cmp : -cmp;
  });

  function toggleSort(key: keyof Contract) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  }

  const SortIcon = ({ k }: { k: keyof Contract }) =>
    sortKey === k ? (sortDir === "asc" ? <span> ↑</span> : <span> ↓</span>) : <span className="text-gray-300"> ↕</span>;

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Umowy B2B</h1>
          <p className="text-sm text-gray-500 mt-1">
            {contracts.length} umów łącznie
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/api/contracts/export/xlsx"
            className="text-sm text-gray-600 border border-gray-300 px-4 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
          >
            📊 Excel
          </a>
          <a
            href="/api/contracts/export/csv"
            className="text-sm text-gray-600 border border-gray-300 px-4 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
          >
            📥 CSV
          </a>
          <a
            href="/api/contracts/export/zip"
            className="text-sm text-gray-600 border border-gray-300 px-4 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
          >
            📦 ZIP
          </a>
          <Link
            href="/new"
            className="bg-blue-600 text-white font-medium px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <span>+</span> Generuj umowę
          </Link>
        </div>
      </div>

      {/* KPI Summary */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500">Łącznie</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500">Aktywne</p>
            <p className="text-2xl font-bold text-green-600">{stats.by_status?.aktywna || 0}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500">Robocze</p>
            <p className="text-2xl font-bold text-yellow-600">{(stats.by_status?.draft || 0) + (stats.by_status?.do_podpisu || 0)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500">Avg stawka</p>
            <p className="text-2xl font-bold text-blue-600">{stats.avg_rate > 10 ? `${stats.avg_rate}` : "—"} <span className="text-sm font-normal text-gray-400">PLN/h</span></p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700 text-sm">
          ❌ {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex gap-4">
        <input
          type="text"
          placeholder="Szukaj po nazwisku, firmie, kliencie, numerze..."
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <select
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Wszystkie statusy</option>
          <option value="draft">Robocza</option>
          <option value="modified">Zmodyfikowana</option>
          <option value="do_podpisu">Do podpisu</option>
          <option value="aktywna">Aktywna</option>
          <option value="zakonczona">Zakończona</option>
          <option value="anulowana">Anulowana</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">⏳</div>
            <p>Ładowanie...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">📄</div>
            <p className="font-medium text-gray-600">Brak umów</p>
            <p className="text-sm mt-1">
              {filter || statusFilter
                ? "Brak wyników dla podanych filtrów"
                : "Wygeneruj pierwszą umowę"}
            </p>
            {!filter && !statusFilter && (
              <Link
                href="/new"
                className="mt-4 inline-block bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Nowa umowa
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {([
                    ["number", "Nr umowy"],
                    ["contractor_name", "Kontraktor"],
                    ["contractor_company", "Firma"],
                    ["client", "Klient"],
                    ["role", "Rola"],
                    ["rate", "Stawka"],
                    ["it_area", "Obszar IT"],
                    ["status", "Status"],
                    ["created_at", "Data"],
                  ] as [keyof Contract, string][]).map(([key, label]) => (
                    <th
                      key={key}
                      className="text-left px-4 py-3 font-medium text-gray-600 cursor-pointer hover:text-gray-900 select-none"
                      onClick={() => toggleSort(key)}
                    >
                      {label}<SortIcon k={key} />
                    </th>
                  ))}
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Akcje</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginated.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-blue-600 font-medium">
                      <Link href={`/contracts/${c.id}`}>{c.number}</Link>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <Link href={`/contractor/${encodeURIComponent(c.contractor_name)}`}
                        className="hover:text-blue-600 hover:underline">
                        {c.contractor_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{c.contractor_company}</td>
                    <td className="px-4 py-3 text-gray-600">{c.client}</td>
                    <td className="px-4 py-3 text-gray-600">{c.role}</td>
                    <td className="px-4 py-3 text-gray-900 font-medium">
                      {c.rate.toFixed(2)} zł/h
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                        {c.it_area}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-medium ${
                          statusColors[c.status] || "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {statusLabels[c.status] || c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(c.created_at).toLocaleDateString("pl-PL")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/contracts/${c.id}`}
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                        >
                          Szczegóły
                        </Link>
                        <a
                          href={getDownloadUrl(c.id)}
                          className="text-green-600 hover:text-green-800 text-xs font-medium"
                          download
                        >
                          ↓ Pobierz
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  Strona {page} z {totalPages} · {filtered.length} umów
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 text-sm border rounded-lg disabled:opacity-30 hover:bg-gray-50"
                  >
                    ← Wstecz
                  </button>
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    let p: number;
                    if (totalPages <= 7) p = i + 1;
                    else if (page <= 4) p = i + 1;
                    else if (page >= totalPages - 3) p = totalPages - 6 + i;
                    else p = page - 3 + i;
                    return (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`px-3 py-1 text-sm border rounded-lg ${
                          p === page ? "bg-blue-600 text-white border-blue-600" : "hover:bg-gray-50"
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1 text-sm border rounded-lg disabled:opacity-30 hover:bg-gray-50"
                  >
                    Dalej →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
