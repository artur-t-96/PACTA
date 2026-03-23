"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { generateContract } from "@/lib/api";

export default function QuickGenerate() {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [extracted, setExtracted] = useState<Record<string, string | number> | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  async function extractData() {
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      const d = await r.json();
      if (d.success) {
        setExtracted(d.extracted);
      } else {
        setError(d.error || "Nie udało się wyodrębnić danych");
      }
    } catch { setError("Błąd połączenia"); }
    finally { setLoading(false); }
  }

  async function handleGenerate() {
    if (!extracted) return;
    setGenerating(true);
    try {
      const result = await generateContract(extracted as unknown as Parameters<typeof generateContract>[0]);
      router.push(`/contracts/${result.contract.id}?new=1`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd generowania");
      setGenerating(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">⚡ Szybkie generowanie</h1>
        <p className="text-sm text-gray-500 mt-1">
          Opisz umowę po polsku — AI wyodrębni dane i wygeneruje dokument.
        </p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700 text-sm">❌ {error}</div>}

      {!extracted ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Opis umowy</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={4}
            placeholder="np. Senior Java Developer Tomek Kowalski z firmy TK Dev, stawka 180 PLN/h, do Nordei w Gdańsku, start 1 maja 2026, NIP 1234567890, email tomek@tkdev.pl"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={extractData}
            disabled={loading || !description.trim()}
            className="mt-4 w-full bg-blue-600 text-white font-medium py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "🤖 AI analizuje..." : "⚡ Wyodrębnij dane"}
          </button>
          
          <div className="mt-4 text-xs text-gray-400">
            <p className="font-medium mb-1">Przykłady:</p>
            <ul className="space-y-1">
              <li className="cursor-pointer hover:text-blue-500" onClick={() => setDescription("Senior DevOps Engineer Anna Nowak, firma AN Cloud, NIP 1234567890, 200 PLN/h, do BNP Paribas w Warszawie, start 1 czerwca")}>
                • Senior DevOps Engineer Anna Nowak, 200 PLN/h, BNP Paribas...
              </li>
              <li className="cursor-pointer hover:text-blue-500" onClick={() => setDescription("Tester automatyzujący Piotr Zieliński z PZ Testing, 140 PLN/h, Nordea Gdańsk, start 15 maja 2026")}>
                • Tester automatyzujący Piotr Zieliński, 140 PLN/h, Nordea...
              </li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">✅ Dane wyodrębnione</h2>
            <button onClick={() => setExtracted(null)} className="text-sm text-gray-400 hover:text-gray-600">
              ← Zmień opis
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mb-6">
            {Object.entries(extracted).map(([key, value]) => {
              if (!value && value !== 0) return null;
              const labels: Record<string, string> = {
                imie: "Imię", nazwisko: "Nazwisko", firma: "Firma", nip: "NIP",
                rola: "Rola", stawka: "Stawka", klient: "Klient", data_startu: "Data startu",
                obszar_it: "Obszar IT", miasto_klienta: "Miasto", email: "Email", tel: "Telefon",
                adres: "Adres", opis_projektu: "Opis",
              };
              return (
                <div key={key}>
                  <label className="block text-xs text-gray-500">{labels[key] || key}</label>
                  <input
                    type="text"
                    value={String(value)}
                    onChange={e => setExtracted({ ...extracted, [key]: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              );
            })}
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full bg-green-600 text-white font-medium py-3 rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {generating ? "⏳ Generuję umowę..." : "📄 Generuj umowę"}
          </button>
        </div>
      )}
    </div>
  );
}
