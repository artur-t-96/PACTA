"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getContract, type ContractDetail } from "@/lib/api";

interface AnnexChange {
  field: string;
  old: string;
  new: string;
  description: string;
}

const ANNEX_TYPES = [
  { value: "rate_change", label: "Zmiana stawki" },
  { value: "role_change", label: "Zmiana stanowiska" },
  { value: "client_change", label: "Zmiana klienta/projektu" },
  { value: "address_change", label: "Zmiana danych firmy" },
  { value: "termination", label: "Rozwiązanie za porozumieniem" },
  { value: "extension", label: "Przedłużenie umowy" },
  { value: "other", label: "Inna zmiana" },
];

const FIELD_LABELS: Record<string, string> = {
  stawka: "Stawka godzinowa (PLN/h)",
  rola: "Stanowisko/rola",
  klient: "Klient projektu",
  adres: "Adres firmy",
  data_zakonczenia: "Data zakończenia umowy",
};

export default function AnnexPage() {
  const params = useParams();
  const router = useRouter();
  const id = parseInt(params.id as string);

  const [contract, setContract] = useState<ContractDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [annexType, setAnnexType] = useState("rate_change");
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [changes, setChanges] = useState<AnnexChange[]>([
    { field: "stawka", old: "", new: "", description: "" },
  ]);

  useEffect(() => {
    getContract(id).then(c => {
      setContract(c);
      // Pre-fill "old" values
      setChanges([{
        field: "stawka",
        old: String(c.rate),
        new: "",
        description: "",
      }]);
    }).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  async function handleGenerate() {
    const validChanges = changes.filter(c => c.field && (c.new || c.description));
    if (validChanges.length === 0) {
      setError("Dodaj przynajmniej jedną zmianę");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const r = await fetch(`/api/contracts/${id}/annex`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: annexType,
          changes: validChanges,
          effective_date: effectiveDate.split("-").reverse().join("."),
          notes,
        }),
      });
      const d = await r.json();
      if (d.success) {
        setSuccess(`✅ ${d.message}. Plik: ${d.file_path.split("/").pop()}`);
      } else {
        setError(d.detail || "Błąd generowania aneksu");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="text-center py-16 text-gray-400">Ładowanie...</div>;
  if (!contract) return <div className="text-center py-16">Umowa nie znaleziona</div>;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <Link href={`/contracts/${id}`} className="text-sm text-gray-400 hover:text-gray-600">
          ← Umowa {contract.number}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">
          📋 Aneks do umowy {contract.number}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {contract.contractor_name} · {contract.client} · {contract.rate} PLN/h
        </p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700 text-sm">❌ {error}</div>}
      {success && <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 text-green-700 text-sm">{success}</div>}

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Typ aneksu</label>
            <select value={annexType} onChange={e => setAnnexType(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm">
              {ANNEX_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data obowiązywania</label>
            <input type="date" value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>

        <h3 className="font-medium text-gray-800 mb-3">Zmiany</h3>
        {changes.map((change, i) => (
          <div key={i} className="bg-gray-50 rounded-lg p-4 mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Zmiana #{i + 1}</span>
              {changes.length > 1 && (
                <button onClick={() => setChanges(changes.filter((_, j) => j !== i))}
                  className="text-red-400 hover:text-red-600 text-sm">Usuń</button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3 mb-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Pole</label>
                <select value={change.field} onChange={e => {
                  const updated = [...changes];
                  updated[i] = { ...updated[i], field: e.target.value };
                  // Auto-fill old value
                  const fieldMap: Record<string, string> = { stawka: String(contract.rate), rola: contract.role, klient: contract.client };
                  updated[i].old = fieldMap[e.target.value] || "";
                  setChanges(updated);
                }} className="w-full border rounded-lg px-3 py-2 text-sm">
                  {Object.entries(FIELD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Było</label>
                <input type="text" value={change.old} readOnly
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-100" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Będzie</label>
                <input type="text" value={change.new} onChange={e => {
                  const updated = [...changes]; updated[i].new = e.target.value; setChanges(updated);
                }} placeholder="Nowa wartość" className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Opis (opcjonalny)</label>
              <input type="text" value={change.description} onChange={e => {
                const updated = [...changes]; updated[i].description = e.target.value; setChanges(updated);
              }} placeholder="np. Podwyżka stawki na wniosek klienta"
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
        ))}

        <button onClick={() => setChanges([...changes, { field: "stawka", old: "", new: "", description: "" }])}
          className="text-sm text-blue-600 hover:text-blue-800 mb-4">+ Dodaj zmianę</button>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Uwagi (opcjonalne)</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
            className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Dodatkowe uwagi..." />
        </div>

        <button onClick={handleGenerate} disabled={saving}
          className="w-full bg-blue-600 text-white font-medium py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {saving ? "⏳ Generuję aneks..." : "📋 Generuj aneks"}
        </button>
      </div>
    </div>
  );
}
