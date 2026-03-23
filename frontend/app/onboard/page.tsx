"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { GenerateRequest } from "@/lib/api";

export default function OnboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    success: boolean;
    number?: string;
    contract_id?: number;
    message?: string;
    steps?: Array<{ step: string; result: string }>;
    email_preview?: { subject: string; to: string };
    errors?: string[];
  } | null>(null);

  const [form, setForm] = useState<Partial<GenerateRequest>>({
    obszar_it: "Software Development",
    data_startu: new Date().toISOString().split("T")[0],
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: name === "stawka" ? parseFloat(value) || 0 : value }));
  }

  async function handleOnboard(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const r = await fetch("/api/contracts/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (d.success) {
        setResult(d);
      } else {
        setError(d.errors?.[0] || d.detail?.[0]?.msg || "Błąd onboardingu");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd");
    } finally {
      setLoading(false);
    }
  }

  if (result?.success) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-8 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-green-800 mb-2">Onboarding zakończony!</h1>
          <p className="text-green-700 mb-4">{result.message}</p>
          
          <div className="bg-white rounded-xl p-6 mb-6 text-left">
            <h3 className="font-semibold text-gray-800 mb-3">Wykonane kroki:</h3>
            <div className="space-y-2">
              {result.steps?.map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="text-green-500">✅</span>
                  <span className="text-gray-600">{s.step}:</span>
                  <span className="font-medium text-gray-900">{s.result}</span>
                </div>
              ))}
            </div>
          </div>

          {result.email_preview && (
            <div className="bg-white rounded-xl p-4 mb-6 text-left text-sm">
              <p className="text-gray-500">📧 Email gotowy:</p>
              <p className="font-medium">{result.email_preview.subject}</p>
              <p className="text-gray-400">→ {result.email_preview.to}</p>
            </div>
          )}

          <div className="flex gap-3 justify-center">
            <button onClick={() => router.push(`/contracts/${result.contract_id}`)}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700">
              📄 Zobacz umowę
            </button>
            <button onClick={() => { setResult(null); setForm({ obszar_it: "Software Development", data_startu: new Date().toISOString().split("T")[0] }); }}
              className="bg-gray-200 text-gray-700 px-6 py-2.5 rounded-lg hover:bg-gray-300">
              ➕ Kolejny onboarding
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">🚀 Szybki onboarding</h1>
        <p className="text-sm text-gray-500 mt-1">
          Wypełnij formularz → AI automatycznie: generuje umowę, waliduje, ustawia status &quot;do podpisu&quot;, przygotowuje email
        </p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700 text-sm">❌ {error}</div>}

      <form onSubmit={handleOnboard} className="space-y-6">
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold text-gray-800 mb-4">👤 Kontrahent</h2>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Imię" name="imie" value={form.imie || ""} onChange={handleChange} required />
            <Input label="Nazwisko" name="nazwisko" value={form.nazwisko || ""} onChange={handleChange} required />
            <Input label="Firma" name="firma" value={form.firma || ""} onChange={handleChange} required className="col-span-2" />
            <Input label="NIP" name="nip" value={form.nip || ""} onChange={handleChange} required placeholder="1234567890" />
            <Input label="Email" name="email" value={form.email || ""} onChange={handleChange} required type="email" />
            <Input label="Telefon" name="tel" value={form.tel || ""} onChange={handleChange} required />
            <Input label="Adres" name="adres" value={form.adres || ""} onChange={handleChange} required className="col-span-2" />
          </div>
        </div>

        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold text-gray-800 mb-4">💼 Projekt</h2>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Rola" name="rola" value={form.rola || ""} onChange={handleChange} required />
            <Input label="Stawka PLN/h" name="stawka" value={String(form.stawka || "")} onChange={handleChange} required type="number" />
            <Input label="Klient" name="klient" value={form.klient || ""} onChange={handleChange} required />
            <Input label="Miasto klienta" name="miasto_klienta" value={form.miasto_klienta || ""} onChange={handleChange} required />
            <Input label="Data startu" name="data_startu" value={form.data_startu || ""} onChange={handleChange} required type="date" />
            <Input label="Obszar IT" name="obszar_it" value={form.obszar_it || ""} onChange={handleChange} required />
          </div>
        </div>

        <button type="submit" disabled={loading}
          className="w-full bg-green-600 text-white font-semibold py-4 rounded-xl hover:bg-green-700 disabled:opacity-50 text-lg">
          {loading ? "🚀 Onboarding w toku..." : "🚀 Uruchom onboarding"}
        </button>
      </form>
    </div>
  );
}

function Input({ label, name, value, onChange, required = false, type = "text", placeholder = "", className = "" }: {
  label: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean; type?: string; placeholder?: string; className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label} {required && <span className="text-red-500">*</span>}</label>
      <input type={type} name={name} value={value} onChange={onChange} required={required} placeholder={placeholder}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
    </div>
  );
}
