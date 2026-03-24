"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch, getCurrentUser } from "../lib/auth";

interface Ticket {
  id: number;
  type: "generate_contract" | "check_risks" | "modify_paragraph";
  status: "pending" | "in_progress" | "completed";
  title: string;
  requester_id: string;
  details: Record<string, unknown>;
  result: Record<string, unknown> | null;
  result_file_path: string | null;
  seen_by_requester: boolean;
  created_at: string;
  completed_at: string | null;
}

const TYPE_LABELS = {
  generate_contract: "Generowanie umowy B2B",
  check_risks: "Weryfikacja ryzyk",
  modify_paragraph: "Modyfikacja paragrafu",
};

const TYPE_ICONS = {
  generate_contract: "📄",
  check_risks: "⚖️",
  modify_paragraph: "✏️",
};

const STATUS_LABELS = {
  pending: "Oczekuje",
  in_progress: "W trakcie",
  completed: "Gotowe",
};

const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
};

export default function RecruiterPage() {
  const router = useRouter();
  const user = getCurrentUser();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const [formType, setFormType] = useState<string>("generate_contract");
  const [formDetails, setFormDetails] = useState({
    candidate_name: "",
    candidate_company: "",
    candidate_nip: "",
    role: "",
    rate: "",
    client: "",
    start_date: "",
    notes: "",
    contract_id: "",
    contract_text: "",
    paragraph_number: "",
    modification_request: "",
  });

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) { router.replace("/login"); return; }
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
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMessage("");

    let details: Record<string, string> = {};
    if (formType === "generate_contract") {
      details = {
        candidate_name: formDetails.candidate_name,
        candidate_company: formDetails.candidate_company,
        candidate_nip: formDetails.candidate_nip,
        role: formDetails.role,
        rate: formDetails.rate,
        client: formDetails.client,
        start_date: formDetails.start_date,
        notes: formDetails.notes,
      };
    } else if (formType === "check_risks") {
      details = {
        contract_id: formDetails.contract_id,
        contract_text: formDetails.contract_text,
        notes: formDetails.notes,
      };
    } else if (formType === "modify_paragraph") {
      details = {
        contract_id: formDetails.contract_id,
        paragraph_number: formDetails.paragraph_number,
        modification_request: formDetails.modification_request,
        notes: formDetails.notes,
      };
    }

    const r = await authFetch("/api/tickets", {
      method: "POST",
      body: JSON.stringify({ type: formType, details }),
    });
    const data = await r.json();

    if (data.id) {
      setMessage("✅ Zgłoszenie zostało wysłane. Operator zajmie się nim wkrótce.");
      setShowForm(false);
      setFormDetails({
        candidate_name: "", candidate_company: "", candidate_nip: "",
        role: "", rate: "", client: "", start_date: "", notes: "",
        contract_id: "", contract_text: "", paragraph_number: "", modification_request: "",
      });
      loadTickets();
    } else {
      setMessage("❌ Błąd: " + (data.detail || "Nie udało się wysłać zgłoszenia"));
    }
    setSubmitting(false);
  }

  async function markSeen(ticket: Ticket) {
    if (!ticket.seen_by_requester) {
      await authFetch(`/api/tickets/${ticket.id}/seen`, { method: "PATCH" });
    }
    setSelectedTicket(ticket);
    loadTickets();
  }

  const unread = tickets.filter((t) => t.status === "completed" && !t.seen_by_requester).length;
  const pending = tickets.filter((t) => t.status === "pending").length;
  const inProgress = tickets.filter((t) => t.status === "in_progress").length;

  if (loading) return <div className="text-center py-16 text-gray-400">Ładowanie...</div>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📋 Moje zgłoszenia</h1>
          <p className="text-sm text-gray-500 mt-1">
            Witaj, {user?.name}. Tutaj możesz zlecać zadania operatorowi.
          </p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setMessage(""); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          + Nowe zgłoszenie
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-xs text-gray-500">Oczekujące</p>
          <p className="text-2xl font-bold text-yellow-600">{pending}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-xs text-gray-500">W trakcie</p>
          <p className="text-2xl font-bold text-blue-600">{inProgress}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-xs text-gray-500">Gotowe (nieprzeczytane)</p>
          <p className="text-2xl font-bold text-green-600">{unread}</p>
        </div>
      </div>

      {message && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-blue-700">{message}</div>
      )}

      {/* New ticket form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="font-semibold text-gray-800 mb-4">Nowe zgłoszenie</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Type selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Typ zgłoszenia</label>
              <div className="grid grid-cols-3 gap-3">
                {(["generate_contract", "check_risks", "modify_paragraph"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFormType(t)}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      formType === t
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <span className="text-xl">{TYPE_ICONS[t]}</span>
                    <p className="text-xs font-medium mt-1">{TYPE_LABELS[t]}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Generate contract fields */}
            {formType === "generate_contract" && (
              <div className="grid grid-cols-2 gap-4">
                <Field label="Imię i nazwisko kandydata *" value={formDetails.candidate_name}
                  onChange={(v) => setFormDetails({ ...formDetails, candidate_name: v })} required />
                <Field label="Firma kandydata" value={formDetails.candidate_company}
                  onChange={(v) => setFormDetails({ ...formDetails, candidate_company: v })} />
                <Field label="NIP" value={formDetails.candidate_nip}
                  onChange={(v) => setFormDetails({ ...formDetails, candidate_nip: v })} />
                <Field label="Stanowisko / rola *" value={formDetails.role}
                  onChange={(v) => setFormDetails({ ...formDetails, role: v })} required />
                <Field label="Stawka (PLN/h)" value={formDetails.rate} type="number"
                  onChange={(v) => setFormDetails({ ...formDetails, rate: v })} />
                <Field label="Klient (firma zamawiająca) *" value={formDetails.client}
                  onChange={(v) => setFormDetails({ ...formDetails, client: v })} required />
                <Field label="Data rozpoczęcia" value={formDetails.start_date} type="date"
                  onChange={(v) => setFormDetails({ ...formDetails, start_date: v })} />
                <Field label="Dodatkowe uwagi" value={formDetails.notes}
                  onChange={(v) => setFormDetails({ ...formDetails, notes: v })} />
              </div>
            )}

            {/* Check risks fields */}
            {formType === "check_risks" && (
              <div className="space-y-4">
                <Field label="Numer umowy (opcjonalnie)" value={formDetails.contract_id}
                  onChange={(v) => setFormDetails({ ...formDetails, contract_id: v })} />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Treść umowy lub zmiany do sprawdzenia *</label>
                  <textarea
                    required
                    rows={5}
                    value={formDetails.contract_text}
                    onChange={(e) => setFormDetails({ ...formDetails, contract_text: e.target.value })}
                    placeholder="Wklej tutaj treść umowy lub paragraf, który chcesz zweryfikować..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <Field label="Dodatkowe uwagi / pytania" value={formDetails.notes}
                  onChange={(v) => setFormDetails({ ...formDetails, notes: v })} />
              </div>
            )}

            {/* Modify paragraph fields */}
            {formType === "modify_paragraph" && (
              <div className="space-y-4">
                <Field label="Numer umowy *" value={formDetails.contract_id}
                  onChange={(v) => setFormDetails({ ...formDetails, contract_id: v })} required />
                <Field label="Numer paragrafu (np. §3)" value={formDetails.paragraph_number}
                  onChange={(v) => setFormDetails({ ...formDetails, paragraph_number: v })} />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Opis żądanej modyfikacji *</label>
                  <textarea
                    required
                    rows={4}
                    value={formDetails.modification_request}
                    onChange={(e) => setFormDetails({ ...formDetails, modification_request: e.target.value })}
                    placeholder="Opisz, co chcesz zmienić..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <Field label="Dodatkowe uwagi" value={formDetails.notes}
                  onChange={(v) => setFormDetails({ ...formDetails, notes: v })} />
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50"
              >
                {submitting ? "Wysyłanie..." : "Wyślij zgłoszenie"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-gray-500 hover:text-gray-700 px-4 py-2 text-sm"
              >
                Anuluj
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Ticket list */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Historia zgłoszeń</h2>
        </div>

        {tickets.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-3">📭</p>
            <p>Brak zgłoszeń. Kliknij &quot;Nowe zgłoszenie&quot;, aby zacząć.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {tickets.map((t) => (
              <div
                key={t.id}
                onClick={() => markSeen(t)}
                className={`px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                  t.status === "completed" && !t.seen_by_requester ? "bg-green-50" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{TYPE_ICONS[t.type]}</span>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">
                        {t.title}
                        {t.status === "completed" && !t.seen_by_requester && (
                          <span className="ml-2 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">Nowe!</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(t.created_at).toLocaleString("pl-PL")}
                        {t.completed_at && ` · Zakończone: ${new Date(t.completed_at).toLocaleString("pl-PL")}`}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[t.status]}`}>
                    {STATUS_LABELS[t.status]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ticket detail modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{TYPE_ICONS[selectedTicket.type]}</span>
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedTicket.title}</h3>
                  <p className="text-xs text-gray-400">{TYPE_LABELS[selectedTicket.type]}</p>
                </div>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[selectedTicket.status]}`}>
              {STATUS_LABELS[selectedTicket.status]}
            </span>

            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Szczegóły zgłoszenia</h4>
              <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                {Object.entries(selectedTicket.details).filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} className="flex gap-2">
                    <span className="text-gray-500 min-w-32">{k.replace(/_/g, " ")}:</span>
                    <span className="text-gray-800">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>

            {selectedTicket.result && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">✅ Wynik od operatora</h4>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm space-y-1">
                  {Object.entries(selectedTicket.result).filter(([, v]) => v).map(([k, v]) => (
                    <div key={k}>
                      <span className="font-medium text-gray-700">{k.replace(/_/g, " ")}:</span>{" "}
                      <span className="text-gray-800 whitespace-pre-wrap">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedTicket.result_file_path && (
              <div className="mt-4">
                <a
                  href={`/api/contracts/${selectedTicket.result_file_path}/download`}
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
                >
                  📥 Pobierz plik wynikowy
                </a>
              </div>
            )}

            <div className="mt-4 text-xs text-gray-400">
              Zgłoszono: {new Date(selectedTicket.created_at).toLocaleString("pl-PL")}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
      />
    </div>
  );
}
