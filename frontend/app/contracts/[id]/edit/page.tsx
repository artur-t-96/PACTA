"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getContract, modifyContract, type ContractDetail, type ContractChange } from "@/lib/api";

interface DiffItem {
  paragraf: string;
  before: string;
  after: string;
}

const COMMON_PARAGRAPHS = [
  "§1 ust.1 — Przedmiot umowy",
  "§5 — Prawa autorskie",
  "§6 — Wynagrodzenie",
  "§8 — Poufność",
  "§9 — Zakaz działalności konkurencyjnej",
  "§10 — Zakaz podbierania pracowników",
  "§12 — Termin rozpoczęcia",
];

export default function EditContract() {
  const params = useParams();
  const router = useRouter();
  const id = parseInt(params.id as string);

  const [contract, setContract] = useState<ContractDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [diffs, setDiffs] = useState<DiffItem[]>([]);
  const [activeMode, setActiveMode] = useState<"paragraphs" | "fields">("paragraphs");
  const [changes, setChanges] = useState<ContractChange[]>([
    { paragraf: "", zmiana: "" },
  ]);

  // Quick field edits
  const [fieldEdits, setFieldEdits] = useState<Record<string, string>>({});
  const [fieldSaved, setFieldSaved] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await getContract(id);
        setContract(data);
        setFieldEdits({
          rate: String(data.rate),
          role: data.role,
          client: data.client,
          start_date: data.start_date,
          client_city: data.client_city,
          contractor_email: data.contractor_email,
          contractor_phone: data.contractor_phone,
          project_description: data.project_description || "",
        });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function handleModify() {
    const validChanges = changes.filter((c) => c.paragraf && c.zmiana);
    if (validChanges.length === 0) {
      setError("Dodaj przynajmniej jedną zmianę");
      return;
    }

    setSaving(true);
    setError("");
    setDiffs([]);

    try {
      const result = await modifyContract(id, validChanges);
      setDiffs(result.diffs);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Błąd modyfikacji");
    } finally {
      setSaving(false);
    }
  }

  async function handleFieldSave() {
    setSaving(true);
    setError("");
    try {
      const payload = { ...fieldEdits };
      if (payload.rate) payload.rate = parseFloat(payload.rate) as unknown as string;
      const res = await fetch(`/api/contracts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Błąd zapisu");
      }
      setFieldSaved(true);
      setTimeout(() => setFieldSaved(false), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Błąd zapisu pól");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="text-center py-16 text-gray-400"><p>Ładowanie...</p></div>;
  if (!contract) return <div className="text-center py-16">Umowa nie znaleziona</div>;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link href={`/contracts/${id}`} className="text-sm text-gray-400 hover:text-gray-600">
          ← Powrót do umowy {contract.number}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">
          Edytuj umowę {contract.number}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {contract.contractor_name} · {contract.client}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700 text-sm">
          ❌ {error}
        </div>
      )}

      {fieldSaved && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 text-green-700 text-sm">
          ✅ Zmiany zapisane
        </div>
      )}

      {/* Mode tabs */}
      <div className="flex gap-4 border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveMode("paragraphs")}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
            activeMode === "paragraphs"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          ✏️ Modyfikuj paragrafy (AI)
        </button>
        <button
          onClick={() => setActiveMode("fields")}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
            activeMode === "fields"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          📝 Edytuj pola umowy
        </button>
      </div>

      {/* PARAGRAPHS MODE */}
      {activeMode === "paragraphs" && (
        <div>
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h2 className="font-semibold text-gray-800 mb-2">Zmiany treści paragrafów</h2>
            <p className="text-sm text-gray-500 mb-5">
              AI (Claude Sonnet) zmodyfikuje treść paragrafu zgodnie z opisem. Zobaczysz diff przed/po.
            </p>

            {/* Quick picks */}
            <div className="flex flex-wrap gap-2 mb-5">
              {COMMON_PARAGRAPHS.map((p) => {
                const ref = p.split(" — ")[0];
                return (
                  <button
                    key={p}
                    onClick={() => setChanges([...changes, { paragraf: ref, zmiana: "" }])}
                    className="text-xs bg-gray-100 hover:bg-blue-50 hover:text-blue-700 px-3 py-1 rounded-full transition-colors"
                  >
                    + {p}
                  </button>
                );
              })}
            </div>

            <div className="space-y-3 mb-4">
              {changes.map((change, i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">Zmiana #{i + 1}</span>
                    {changes.length > 1 && (
                      <button
                        onClick={() => setChanges(changes.filter((_, j) => j !== i))}
                        className="text-red-400 hover:text-red-600 text-sm"
                      >
                        Usuń
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Paragraf</label>
                      <input
                        type="text"
                        placeholder="np. §10 ust.1"
                        value={change.paragraf}
                        onChange={(e) => {
                          const updated = [...changes];
                          updated[i] = { ...updated[i], paragraf: e.target.value };
                          setChanges(updated);
                        }}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Opis zmiany</label>
                      <input
                        type="text"
                        placeholder="np. zmień okres z 12 na 6 miesięcy"
                        value={change.zmiana}
                        onChange={(e) => {
                          const updated = [...changes];
                          updated[i] = { ...updated[i], zmiana: e.target.value };
                          setChanges(updated);
                        }}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={() => setChanges([...changes, { paragraf: "", zmiana: "" }])}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                + Dodaj kolejną zmianę
              </button>
              <button
                onClick={handleModify}
                disabled={saving}
                className="bg-blue-600 text-white font-medium px-6 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? <><span className="animate-spin">⏳</span> AI modyfikuje...</> : "✏️ Zastosuj zmiany AI"}
              </button>
            </div>
          </div>

          {/* Diffs */}
          {diffs.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-semibold text-gray-800">✅ Zmiany wprowadzone — diff</h2>
                <Link href={`/contracts/${id}`} className="text-sm text-blue-600 hover:text-blue-800">
                  → Wróć do umowy
                </Link>
              </div>
              <div className="space-y-6">
                {diffs.map((diff, i) => (
                  <div key={i} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 border-b">
                      <span className="font-mono text-sm font-medium text-gray-700">{diff.paragraf}</span>
                    </div>
                    <div className="p-4 space-y-3">
                      <div>
                        <p className="text-xs font-medium text-red-500 mb-1 uppercase tracking-wide">Przed</p>
                        <p className="text-sm text-gray-700 bg-red-50 rounded p-3 border border-red-100">{diff.before}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-green-600 mb-1 uppercase tracking-wide">Po</p>
                        <p className="text-sm text-gray-700 bg-green-50 rounded p-3 border border-green-100">{diff.after}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* FIELDS MODE */}
      {activeMode === "fields" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-800 mb-5">Edytuj pola umowy</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { key: "role", label: "Rola / stanowisko" },
              { key: "rate", label: "Stawka (PLN/h)", type: "number" },
              { key: "client", label: "Klient" },
              { key: "start_date", label: "Data startu", type: "date" },
              { key: "client_city", label: "Miasto klienta" },
              { key: "contractor_email", label: "Email kontraktora", type: "email" },
              { key: "contractor_phone", label: "Telefon kontraktora" },
            ].map(({ key, label, type = "text" }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <input
                  type={type}
                  value={fieldEdits[key] || ""}
                  onChange={(e) => setFieldEdits({ ...fieldEdits, [key]: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Opis projektu</label>
              <textarea
                value={fieldEdits.project_description || ""}
                onChange={(e) => setFieldEdits({ ...fieldEdits, project_description: e.target.value })}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex justify-end mt-6">
            <button
              onClick={handleFieldSave}
              disabled={saving}
              className="bg-blue-600 text-white font-medium px-6 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Zapisuję..." : "💾 Zapisz zmiany"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
