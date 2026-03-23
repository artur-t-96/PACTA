"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { generateContract, type GenerateRequest } from "@/lib/api";

const IT_AREAS = [
  "Software Development",
  "QA",
  "DevOps",
  "Data & Analytics",
  "Cloud Solutions",
  "Test Automation",
];

const KLIENCI = [
  "Nordea Bank Abp S.A. Oddział w Polsce",
  "BNP Paribas Bank Polska S.A.",
  "Ferro S.A.",
  "Cognism Ltd.",
  "PEKAO S.A.",
  "PKO Bank Polski S.A.",
  "mBank S.A.",
  "Allegro sp. z o.o.",
];

export default function NewContract() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<Partial<GenerateRequest>>({
    obszar_it: "Software Development",
    data_startu: new Date().toISOString().split("T")[0],
  });

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "stawka" ? parseFloat(value) || 0 : value,
    }));
  }

  function validate(): string | null {
    const nip = (form.nip || "").replace(/[-\s]/g, "");
    if (nip && (nip.length !== 10 || !/^\d+$/.test(nip))) {
      return "NIP musi mieć 10 cyfr";
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      return "Nieprawidłowy adres email";
    }
    if (form.stawka && (form.stawka < 10 || form.stawka > 2000)) {
      return "Stawka musi być między 10 a 2000 PLN/h";
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setLoading(true);
    setError("");

    try {
      const result = await generateContract(form as GenerateRequest);
      router.push(`/contracts/${result.contract.id}?new=1`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Błąd generowania umowy");
      setLoading(false);
    }
  }

  const Field = ({
    label,
    name,
    type = "text",
    required = false,
    placeholder = "",
  }: {
    label: string;
    name: keyof GenerateRequest;
    type?: string;
    required?: boolean;
    placeholder?: string;
  }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={(form[name] as string) || ""}
        onChange={handleChange}
        required={required}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Generuj nową umowę B2B</h1>
        <p className="text-sm text-gray-500 mt-1">
          Wypełnij dane kontraktora. AI wygeneruje kompletną umowę z załącznikami.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700 text-sm">
          ❌ {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Section: Kontraktor */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-5 flex items-center gap-2">
            <span>👤</span> Dane kontraktora
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Imię" name="imie" required placeholder="np. Jan" />
            <Field label="Nazwisko" name="nazwisko" required placeholder="np. Kowalski" />
            <div className="md:col-span-2">
              <Field
                label="Nazwa firmy"
                name="firma"
                required
                placeholder="np. JK Software Jan Kowalski"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                NIP <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  name="nip"
                  value={(form.nip as string) || ""}
                  onChange={handleChange}
                  required
                  placeholder="np. 1234567890"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (!form.nip) return;
                    const r = await fetch(`/api/nip/${form.nip}`);
                    const d = await r.json();
                    if (d.name) {
                      setForm(prev => ({
                        ...prev,
                        firma: d.name || prev.firma,
                        regon: d.regon || prev.regon,
                        adres: d.address || prev.adres,
                      }));
                    }
                  }}
                  className="border border-gray-300 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 text-sm"
                  title="Pobierz dane z KRS/REGON"
                >
                  🔍
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">Kliknij 🔍 aby auto-uzupełnić z KRS</p>
            </div>
            <Field label="REGON" name="regon" placeholder="np. 123456789" />
            <div className="md:col-span-2">
              <Field
                label="Adres firmy"
                name="adres"
                required
                placeholder="np. ul. Przykładowa 1/2, 00-001 Warszawa"
              />
            </div>
            <Field label="Email" name="email" type="email" required placeholder="jan.kowalski@firma.pl" />
            <Field label="Telefon" name="tel" required placeholder="+48 600 100 200" />
          </div>
        </div>

        {/* Section: Projekt */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-5 flex items-center gap-2">
            <span>💼</span> Dane projektu
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rola / stanowisko <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="rola"
                list="roles-list"
                value={(form.rola as string) || ""}
                onChange={handleChange}
                required
                placeholder="np. Senior Java Developer"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <RoleDatalist />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stawka godzinowa (PLN netto) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="stawka"
                value={form.stawka || ""}
                onChange={handleChange}
                required
                min="1"
                step="0.01"
                placeholder="np. 180"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Klient projektu <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="klient"
                list="klienci-list"
                value={(form.klient as string) || ""}
                onChange={handleChange}
                required
                placeholder="Wpisz lub wybierz klienta"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <datalist id="klienci-list">
                {KLIENCI.map((k) => (
                  <option key={k} value={k} />
                ))}
              </datalist>
            </div>
            <Field
              label="Miasto klienta"
              name="miasto_klienta"
              required
              placeholder="np. Warszawa, Gdańsk"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data rozpoczęcia <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="data_startu"
                value={form.data_startu || ""}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Obszar IT <span className="text-red-500">*</span>
              </label>
              <select
                name="obszar_it"
                value={form.obszar_it || ""}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {IT_AREAS.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">AI dostosuje do kategorii standardowej</p>
              {form.stawka && form.obszar_it && (
                <RateHint rate={form.stawka} area={form.obszar_it} />
              )}
              {form.rola && form.klient && form.obszar_it && (
                <RateRecommendation role={form.rola} client={form.klient} area={form.obszar_it}
                  onApply={(rate) => setForm(prev => ({ ...prev, stawka: rate }))} />
              )}
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Opis projektu
              </label>
              <textarea
                name="opis_projektu"
                value={form.opis_projektu || ""}
                onChange={handleChange}
                rows={3}
                placeholder="Krótki opis zakresu prac, technologii, celów projektu..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            ← Anuluj
          </button>
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white font-medium px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <span className="animate-spin">⏳</span> Generuję umowę...
              </>
            ) : (
              <>⚡ Generuj umowę</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

function RoleDatalist() {
  const [roles, setRoles] = useState<string[]>([]);
  useEffect(() => {
    fetch("/api/contract-roles?limit=20")
      .then(r => r.json())
      .then(data => setRoles(data.map((r: { role: string }) => r.role)))
      .catch(() => {});
  }, []);
  return (
    <datalist id="roles-list">
      {roles.map(r => <option key={r} value={r} />)}
    </datalist>
  );
}

function RateRecommendation({ role, client, area, onApply }: { role: string; client: string; area: string; onApply: (rate: number) => void }) {
  const [rec, setRec] = useState<{ recommended_rate: number; range: { min: number; max: number }; reasoning: string } | null>(null);
  const [loading, setLoading] = useState(false);

  if (rec) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-blue-800">💡 AI rekomendacja: {rec.recommended_rate} PLN/h</p>
            <p className="text-xs text-blue-600">Range: {rec.range.min}-{rec.range.max} PLN/h</p>
          </div>
          <button onClick={() => onApply(rec.recommended_rate)}
            className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">
            Zastosuj
          </button>
        </div>
        <p className="text-xs text-blue-500 mt-1">{rec.reasoning}</p>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={async () => {
        setLoading(true);
        try {
          const r = await fetch(`/api/ai/recommend-rate?role=${encodeURIComponent(role)}&area=${encodeURIComponent(area)}&client=${encodeURIComponent(client)}`);
          setRec(await r.json());
        } catch { /**/ } finally { setLoading(false); }
      }}
      disabled={loading}
      className="text-xs text-blue-500 hover:text-blue-700 mt-1"
    >
      {loading ? "⏳ Sprawdzam..." : "💡 Sprawdź rekomendowaną stawkę"}
    </button>
  );
}

function RateHint({ rate, area }: { rate: number; area: string }) {
  // Simple median lookup (must match backend benchmark_service.py)
  const medians: Record<string, number> = {
    "Software Development": 140,
    "QA": 110,
    "DevOps": 150,
    "Data & Analytics": 140,
    "Cloud Solutions": 155,
    "Test Automation": 130,
  };
  
  const median = medians[area];
  if (!median || !rate) return null;
  
  const diff = Math.round(((rate - median) / median) * 100);
  
  if (Math.abs(diff) < 5) return null;
  
  return (
    <p className={`text-xs mt-1 ${diff < 0 ? "text-red-500" : "text-green-500"}`}>
      {diff < 0 ? "⚠️" : "✅"} {diff > 0 ? "+" : ""}{diff}% vs mediana rynkowa ({median} PLN/h mid-level)
    </p>
  );
}
