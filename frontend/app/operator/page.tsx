"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authFetch, getCurrentUser } from "../lib/auth";

interface Ticket {
  id: number;
  type: "generate_contract" | "check_risks" | "modify_paragraph";
  status: "pending" | "in_progress" | "completed";
  title: string;
  requester_id: string;
  operator_id: string | null;
  details: Record<string, unknown>;
  result: Record<string, unknown> | null;
  result_file_path: string | null;
  seen_by_requester: boolean;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

const TYPE_ICONS = {
  generate_contract: "📄",
  check_risks: "⚖️",
  modify_paragraph: "✏️",
};

const TYPE_LABELS = {
  generate_contract: "Generowanie umowy B2B",
  check_risks: "Weryfikacja ryzyk",
  modify_paragraph: "Modyfikacja paragrafu",
};

const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  in_progress: "bg-blue-100 text-blue-700 border-blue-200",
  completed: "bg-green-100 text-green-700 border-green-200",
};

const STATUS_LABELS = {
  pending: "Oczekuje",
  in_progress: "W trakcie",
  completed: "Zakończone",
};

export default function OperatorPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "in_progress" | "completed">("all");
  const [result, setResult] = useState({ summary: "", contract_number: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) { router.replace("/login"); return; }
    if (!["operator", "admin"].includes(user.role)) { router.replace("/login"); return; }
  }, []);

  const loadTickets = () => {
    authFetch("/api/tickets")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setTickets(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadTickets();
    const interval = setInterval(loadTickets, 30000);
    return () => clearInterval(interval);
  }, []);

  async function startTicket(ticket: Ticket) {
    await authFetch(`/api/tickets/${ticket.id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: "in_progress" }),
    });
    loadTickets();
    const updated = { ...ticket, status: "in_progress" as const, started_at: new Date().toISOString() };
    setSelected(updated);
    setResult({ summary: "", contract_number: "", notes: "" });
    setMessage("");
  }

  async function completeTicket(ticketId: number) {
    setSaving(true);
    setMessage("");
    const r = await authFetch(`/api/tickets/${ticketId}/result`, {
      method: "PATCH",
      body: JSON.stringify({
        result: {
          summary: result.summary,
          contract_number: result.contract_number,
          notes: result.notes,
        },
        result_file_path: result.contract_number || null,
      }),
    });
    const data = await r.json();
    if (data.id) {
      setMessage("✅ Zgłoszenie oznaczone jako zakończone");
      loadTickets();
      setSelected({ ...data });
    } else {
      setMessage("❌ Błąd zapisu");
    }
    setSaving(false);
  }

  const filtered = filter === "all" ? tickets : tickets.filter((t) => t.status === filter);
  const pendingCount = tickets.filter((t) => t.status === "pending").length;
  const inProgressCount = tickets.filter((t) => t.status === "in_progress").length;

  if (loading) return <div className="text-center py-16 text-gray-400">Ładowanie...</div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">🎫 Kolejka zgłoszeń</h1>
        <p className="text-sm text-gray-500 mt-1">Zgłoszenia od rekruterów do przetworzenia</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-yellow-200 p-4 text-center">
          <p className="text-xs text-gray-500">Oczekujące</p>
          <p className="text-3xl font-bold text-yellow-600">{pendingCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-blue-200 p-4 text-center">
          <p className="text-xs text-gray-500">W trakcie</p>
          <p className="text-3xl font-bold text-blue-600">{inProgressCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-green-200 p-4 text-center">
          <p className="text-xs text-gray-500">Zakończone dziś</p>
          <p className="text-3xl font-bold text-green-600">
            {tickets.filter((t) => t.status === "completed" && t.completed_at?.startsWith(new Date().toISOString().slice(0, 10))).length}
          </p>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Left: ticket queue */}
        <div className="w-80 flex-shrink-0">
          {/* Filter tabs */}
          <div className="flex gap-1 mb-3 bg-gray-100 p-1 rounded-lg">
            {(["all", "pending", "in_progress", "completed"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${
                  filter === f ? "bg-white shadow-sm font-medium" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {f === "all" ? "Wszystkie" : STATUS_LABELS[f]}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {filtered.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">Brak zgłoszeń</div>
            ) : (
              filtered.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setSelected(t); setMessage(""); setResult({ summary: "", contract_number: "", notes: "" }); }}
                  className={`w-full text-left p-3 rounded-xl border transition-colors hover:shadow-sm ${
                    selected?.id === t.id ? "border-blue-400 bg-blue-50" : "bg-white border-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm">{TYPE_ICONS[t.type]}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full border ${STATUS_COLORS[t.status]}`}>
                      {STATUS_LABELS[t.status]}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-800 truncate">{t.title}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    👤 {t.requester_id} · {new Date(t.created_at).toLocaleDateString("pl-PL")}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right: ticket detail + processing area */}
        <div className="flex-1">
          {!selected ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
              <p className="text-4xl mb-3">👈</p>
              <p>Wybierz zgłoszenie z listy, aby je przetworzyć</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{TYPE_ICONS[selected.type]}</span>
                  <div>
                    <h2 className="font-semibold text-gray-900">{selected.title}</h2>
                    <p className="text-xs text-gray-400">{TYPE_LABELS[selected.type]} · zgłoszone przez {selected.requester_id}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full border font-medium ${STATUS_COLORS[selected.status]}`}>
                  {STATUS_LABELS[selected.status]}
                </span>
              </div>

              {/* Request details */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Szczegóły zlecenia</h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                  {Object.entries(selected.details).filter(([, v]) => v).map(([k, v]) => (
                    <div key={k}>
                      <span className="text-gray-500 text-xs">{k.replace(/_/g, " ")}:</span>
                      <p className="text-gray-800 font-medium">{String(v)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI tools quick links (only for pending/in_progress) */}
              {selected.status !== "completed" && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Narzędzia AI</h3>
                  <div className="flex flex-wrap gap-2">
                    {selected.type === "generate_contract" && (
                      <>
                        <QuickAction href="/new" label="📄 Generuj umowę" />
                        <QuickAction href="/quick" label="⚡ Quick Generate" />
                        <QuickAction href="/onboard" label="🚀 Onboarding" />
                      </>
                    )}
                    {selected.type === "check_risks" && (
                      <>
                        <QuickAction href="/legal" label="📚 Baza prawna" />
                        <QuickAction href="/" label="🔍 Szukaj umów" />
                      </>
                    )}
                    {selected.type === "modify_paragraph" && (
                      <>
                        {selected.details.contract_id && (
                          <QuickAction href={`/contracts/${selected.details.contract_id}/edit`} label="✏️ Edytuj umowę" />
                        )}
                        <QuickAction href="/" label="🔍 Szukaj umów" />
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Start processing */}
              {selected.status === "pending" && (
                <button
                  onClick={() => startTicket(selected)}
                  className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 font-medium text-sm mb-4"
                >
                  ▶ Rozpocznij przetwarzanie
                </button>
              )}

              {/* Result form */}
              {selected.status === "in_progress" && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-700">Wynik pracy</h3>
                  {selected.type === "generate_contract" && (
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Numer wygenerowanej umowy</label>
                      <input
                        value={result.contract_number}
                        onChange={(e) => setResult({ ...result, contract_number: e.target.value })}
                        placeholder="np. P-2026-042"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Podsumowanie / wynik *</label>
                    <textarea
                      rows={4}
                      value={result.summary}
                      onChange={(e) => setResult({ ...result, summary: e.target.value })}
                      placeholder={
                        selected.type === "generate_contract"
                          ? "Umowa wygenerowana. Dostępna do pobrania..."
                          : selected.type === "check_risks"
                          ? "Zidentyfikowane ryzyka: ..."
                          : "Paragraf zmodyfikowany. Zmiany: ..."
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Dodatkowe notatki</label>
                    <input
                      value={result.notes}
                      onChange={(e) => setResult({ ...result, notes: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  {message && (
                    <p className={`text-sm ${message.startsWith("✅") ? "text-green-700" : "text-red-700"}`}>{message}</p>
                  )}
                  <button
                    onClick={() => completeTicket(selected.id)}
                    disabled={!result.summary || saving}
                    className="w-full bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700 font-medium text-sm disabled:opacity-50"
                  >
                    {saving ? "Zapisywanie..." : "✅ Oznacz jako zakończone"}
                  </button>
                </div>
              )}

              {/* Completed result */}
              {selected.status === "completed" && selected.result && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-green-800 mb-2">✅ Zakończone</h3>
                  {Object.entries(selected.result).filter(([, v]) => v).map(([k, v]) => (
                    <div key={k} className="text-sm mb-1">
                      <span className="text-gray-600 text-xs">{k.replace(/_/g, " ")}:</span>
                      <p className="text-gray-800 whitespace-pre-wrap">{String(v)}</p>
                    </div>
                  ))}
                  {selected.completed_at && (
                    <p className="text-xs text-gray-400 mt-2">
                      Zakończono: {new Date(selected.completed_at).toLocaleString("pl-PL")}
                      {" · "}Odebrano przez rekrutera: {selected.seen_by_requester ? "✅" : "⏳ oczekuje"}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function QuickAction({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition-colors"
    >
      {label}
    </Link>
  );
}
