"use client";

import { useState } from "react";
import Link from "next/link";

export default function ImportPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    imported?: number;
    duplicates?: number;
    errors?: string[];
    error?: string;
  } | null>(null);

  async function handleImport() {
    if (!confirm("Czy na pewno importować umowy z Excela Marty? Istniejące wpisy nie zostaną nadpisane.")) return;
    
    setLoading(true);
    setResult(null);
    try {
      const r = await fetch("/api/import/excel", { method: "POST" });
      setResult(await r.json());
    } catch {
      setResult({ success: false, error: "Nie można połączyć z backendem" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">📥 Import danych</h1>
        <p className="text-sm text-gray-500 mt-1">
          Import historycznych umów z pliku Excel Marty
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="font-semibold text-gray-800 mb-4">Import z UMOWY_I_ZAMÓWIENIA_do_AI.xlsx</h2>
        <p className="text-sm text-gray-500 mb-4">
          Importuje dane z arkusza &quot;Umowy B2B&quot;: nazwisko/imię, numer umowy, klient, 
          stanowisko, daty, uwagi. Duplikaty (po numerze) są pomijane.
        </p>
        
        <div className="bg-gray-50 rounded-lg p-4 mb-4 text-sm">
          <p className="font-medium text-gray-700 mb-2">Co zostanie zaimportowane:</p>
          <ul className="list-disc list-inside text-gray-600 space-y-1">
            <li>Nazwisko i imię kontraktora</li>
            <li>Numer umowy (z prefiksem H-)</li>
            <li>Klient (znormalizowany do pełnych nazw)</li>
            <li>Stanowisko / rola</li>
            <li>Daty: podpisania, startu, zakończenia</li>
            <li>Status: aktywna/zakończona (na podstawie dat i uwag)</li>
            <li>Uwagi i zmiany w umowie</li>
          </ul>
        </div>

        <button
          onClick={handleImport}
          disabled={loading}
          className="bg-blue-600 text-white font-medium px-6 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "⏳ Importuję..." : "📥 Importuj z Excela"}
        </button>
      </div>

      {result && (
        <div className={`rounded-xl border-2 p-6 ${
          result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
        }`}>
          {result.success ? (
            <div>
              <h3 className="font-semibold text-green-800 text-lg mb-3">✅ Import zakończony</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-green-600">Zaimportowano</p>
                  <p className="text-2xl font-bold text-green-800">{result.imported}</p>
                </div>
                <div>
                  <p className="text-yellow-600">Pominięto (duplikaty)</p>
                  <p className="text-2xl font-bold text-yellow-800">{result.duplicates}</p>
                </div>
              </div>
              {result.errors && result.errors.length > 0 && (
                <div className="mt-4">
                  <p className="text-red-600 text-sm font-medium">Błędy:</p>
                  <ul className="text-xs text-red-500 mt-1">
                    {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </div>
              )}
              <Link href="/" className="text-sm text-green-700 hover:text-green-900 mt-4 inline-block">
                → Przejdź do dashboardu
              </Link>
            </div>
          ) : (
            <div>
              <h3 className="font-semibold text-red-800">❌ Błąd importu</h3>
              <p className="text-sm text-red-600 mt-2">{result.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
