"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface AuditEntry {
  id: number;
  contract_number: string;
  contractor: string;
  action: string;
  action_raw: string;
  details: Record<string, unknown>;
  user: string;
  timestamp: string;
}

const actionIcons: Record<string, string> = {
  "Umowa utworzona": "📄",
  "Zmiana statusu": "🔄",
  "Aneks": "📋",
  "Rozwiązana": "🔴",
  "Email": "📧",
  "Przegląd AI": "🤖",
  "Import": "📥",
  "Sklonowana": "📋",
  created: "📄",
  status_changed: "🔄",
  annex_created: "📋",
  terminated: "🔴",
  email_sent: "📧",
  full_review: "🤖",
  imported: "📥",
  note_added: "📝",
  fields_updated: "✏️",
  regenerated: "♻️",
};

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/activity?limit=100")
      .then(r => r.json())
      .then(setEntries)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-16 text-gray-400">Ładowanie...</div>;

  // Group by date
  const byDate: Record<string, AuditEntry[]> = {};
  for (const e of entries) {
    const date = e.timestamp?.slice(0, 10) || "unknown";
    if (!byDate[date]) byDate[date] = [];
    byDate[date].push(e);
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">📋 Audit Trail</h1>
        <p className="text-sm text-gray-500 mt-1">
          Pełna historia zmian w systemie ({entries.length} wpisów)
        </p>
      </div>

      {Object.entries(byDate).map(([date, items]) => (
        <div key={date} className="mb-6">
          <h2 className="text-sm font-semibold text-gray-400 mb-3 sticky top-0 bg-gray-50 py-1">
            📅 {date}
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="divide-y divide-gray-50">
              {items.map(e => (
                <div key={e.id} className="px-4 py-3 flex items-start gap-3 hover:bg-gray-50">
                  <span className="text-lg mt-0.5">
                    {actionIcons[e.action] || actionIcons[e.action_raw] || "⚡"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link href={`/contracts/${e.contract_number}`}
                        className="font-mono text-blue-600 text-sm hover:underline">
                        {e.contract_number}
                      </Link>
                      <span className="text-sm font-medium text-gray-900">{e.action}</span>
                      <span className="text-xs text-gray-400">· {e.contractor}</span>
                    </div>
                    {e.details && Object.keys(e.details).length > 0 && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                        {JSON.stringify(e.details).slice(0, 100)}
                      </p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-gray-400">{e.timestamp?.slice(11, 16)}</p>
                    <p className="text-xs text-gray-300">{e.user}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
