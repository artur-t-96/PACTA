"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface AlertData {
  missing_nip: number;
  missing_rate: number;
  missing_file: number;
  draft_old: number;
  details: {
    missing_nip: Array<{ id: number; number: string; name: string }>;
    missing_rate: Array<{ id: number; number: string; name: string }>;
    missing_file: Array<{ id: number; number: string; name: string }>;
    draft_old: Array<{ id: number; number: string; name: string; age_days: number }>;
  };
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/alerts")
      .then((r) => r.json())
      .then(setAlerts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-16 text-gray-400">Ładowanie alertów...</div>;
  if (!alerts) return <div className="text-red-500 p-8">Błąd ładowania alertów</div>;

  const alertTypes = [
    {
      key: "missing_nip",
      label: "Brak NIP",
      icon: "🆔",
      color: "border-yellow-300 bg-yellow-50",
      count: alerts.missing_nip,
      description: "Aktywne umowy bez NIP kontraktora",
    },
    {
      key: "missing_rate",
      label: "Brak stawki",
      icon: "💰",
      color: "border-orange-300 bg-orange-50",
      count: alerts.missing_rate,
      description: "Aktywne umowy ze stawką 0 PLN/h",
    },
    {
      key: "missing_file",
      label: "Brak pliku",
      icon: "📄",
      color: "border-red-300 bg-red-50",
      count: alerts.missing_file,
      description: "Umowy bez wygenerowanego dokumentu DOCX",
    },
    {
      key: "draft_old",
      label: "Stare drafty",
      icon: "⏰",
      color: "border-purple-300 bg-purple-50",
      count: alerts.draft_old,
      description: "Umowy robocze starsze niż 7 dni",
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">🔔 Alerty</h1>
        <p className="text-sm text-gray-500 mt-1">
          Umowy wymagające uwagi
        </p>
      </div>

      <div className="space-y-4">
        {alertTypes.map((alert) => (
          <div
            key={alert.key}
            className={`rounded-xl border-2 ${alert.color} overflow-hidden`}
          >
            <button
              onClick={() => setExpanded(expanded === alert.key ? null : alert.key)}
              className="w-full p-5 flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{alert.icon}</span>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {alert.label}{" "}
                    <span className="text-sm font-normal text-gray-500">
                      ({alert.count})
                    </span>
                  </h3>
                  <p className="text-sm text-gray-500">{alert.description}</p>
                </div>
              </div>
              <span className="text-gray-400 text-lg">
                {expanded === alert.key ? "▼" : "▶"}
              </span>
            </button>

            {expanded === alert.key && alert.count > 0 && (
              <div className="border-t px-5 pb-4 max-h-96 overflow-y-auto">
                <table className="w-full text-sm mt-3">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="pb-2">Nr umowy</th>
                      <th className="pb-2">Kontrahent</th>
                      {alert.key === "draft_old" && <th className="pb-2">Wiek (dni)</th>}
                      <th className="pb-2">Akcja</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(alerts.details as Record<string, Array<Record<string, unknown>>>)[alert.key]
                      .slice(0, 50)
                      .map((item: Record<string, unknown>) => (
                        <tr key={item.id as number}>
                          <td className="py-2 font-mono text-blue-600">
                            <Link href={`/contracts/${item.id}`}>{item.number as string}</Link>
                          </td>
                          <td className="py-2">{item.name as string}</td>
                          {alert.key === "draft_old" && (
                            <td className="py-2 text-purple-600 font-medium">
                              {item.age_days as number}d
                            </td>
                          )}
                          <td className="py-2">
                            <Link
                              href={`/contracts/${item.id}/edit`}
                              className="text-blue-600 hover:text-blue-800 text-xs"
                            >
                              Edytuj →
                            </Link>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {(alerts.details as Record<string, Array<unknown>>)[alert.key].length > 50 && (
                  <p className="text-xs text-gray-400 mt-2">
                    Pokazano 50 z {(alerts.details as Record<string, Array<unknown>>)[alert.key].length}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
