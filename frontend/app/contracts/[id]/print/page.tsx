"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getContract, type ContractDetail } from "@/lib/api";

export default function PrintContract() {
  const params = useParams();
  const id = parseInt(params.id as string);
  const [contract, setContract] = useState<ContractDetail | null>(null);

  useEffect(() => {
    getContract(id).then(setContract).catch(console.error);
  }, [id]);

  useEffect(() => {
    // Auto-trigger print when loaded
    if (contract) {
      setTimeout(() => window.print(), 500);
    }
  }, [contract]);

  if (!contract) return <div className="p-8">Ładowanie...</div>;

  return (
    <div className="max-w-3xl mx-auto p-8 bg-white print:p-0">
      <style>{`
        @media print {
          nav, button, .no-print { display: none !important; }
          body { font-size: 11pt; }
        }
      `}</style>

      {/* Header */}
      <div className="text-center border-b-2 border-gray-900 pb-4 mb-6">
        <h1 className="text-xl font-bold">B2B.net S.A.</h1>
        <p className="text-sm text-gray-600">Al. Jerozolimskie 180, 02-486 Warszawa</p>
        <p className="text-sm text-gray-600">KRS: 0000387063 · NIP: 5711707392</p>
      </div>

      <h2 className="text-lg font-bold text-center mb-6">
        KARTA UMOWY Nr {contract.number}
      </h2>

      {/* Contract Data */}
      <table className="w-full border-collapse mb-6 text-sm">
        <tbody>
          <Row label="Numer umowy" value={contract.number} />
          <Row label="Status" value={contract.status} />
          <Row label="Data utworzenia" value={new Date(contract.created_at).toLocaleDateString("pl-PL")} />
          <Row label="" value="" empty />
          <Row label="Kontrahent" value={contract.contractor_name} bold />
          <Row label="Firma" value={contract.contractor_company} />
          <Row label="NIP" value={contract.contractor_nip} />
          {contract.contractor_regon && <Row label="REGON" value={contract.contractor_regon} />}
          <Row label="Adres" value={contract.contractor_address} />
          <Row label="Email" value={contract.contractor_email} />
          <Row label="Telefon" value={contract.contractor_phone} />
          <Row label="" value="" empty />
          <Row label="Klient" value={contract.client} bold />
          <Row label="Miasto klienta" value={contract.client_city} />
          <Row label="Rola / stanowisko" value={contract.role} />
          <Row label="Stawka" value={`${contract.rate.toFixed(2)} PLN/h netto`} bold />
          <Row label="Obszar IT" value={contract.it_area} />
          <Row label="Data startu" value={contract.start_date} />
          {contract.project_description && <Row label="Opis projektu" value={contract.project_description} />}
        </tbody>
      </table>

      {/* Signatures */}
      <div className="flex justify-between mt-16 pt-8">
        <div className="text-center w-48">
          <div className="border-t border-gray-900 pt-2">
            <p className="text-sm font-medium">{contract.contractor_name}</p>
            <p className="text-xs text-gray-500">Partner</p>
          </div>
        </div>
        <div className="text-center w-48">
          <div className="border-t border-gray-900 pt-2">
            <p className="text-sm font-medium">B2B.net S.A.</p>
            <p className="text-xs text-gray-500">Zamawiający</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-12 pt-4 border-t border-gray-300 text-center text-xs text-gray-400">
        Wygenerowano przez PARAGRAF AI · B2B.net S.A. · {new Date().toLocaleDateString("pl-PL")}
      </div>

      {/* Print button */}
      <div className="no-print mt-8 text-center">
        <button
          onClick={() => window.print()}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 mr-4"
        >
          🖨️ Drukuj
        </button>
        <button
          onClick={() => window.history.back()}
          className="text-gray-500 hover:text-gray-700"
        >
          ← Wróć
        </button>
      </div>
    </div>
  );
}

function Row({ label, value, bold = false, empty = false }: { label: string; value: string; bold?: boolean; empty?: boolean }) {
  if (empty) return <tr><td colSpan={2} className="py-2" /></tr>;
  return (
    <tr className="border-b border-gray-100">
      <td className="py-2 pr-4 text-gray-500 w-40 align-top">{label}</td>
      <td className={`py-2 ${bold ? "font-semibold" : ""}`}>{value}</td>
    </tr>
  );
}
