"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getContract,
  checkRisks,
  getDownloadUrl,
  updateStatus,
  getContractHistory,
  type ContractDetail,
  type ContractChange,
  type RiskItem,
} from "@/lib/api";

const riskColors = {
  green: "bg-green-100 text-green-800 border-green-200",
  yellow: "bg-yellow-100 text-yellow-800 border-yellow-200",
  red: "bg-red-100 text-red-800 border-red-200",
};

const riskIcons = {
  green: "✅",
  yellow: "⚠️",
  red: "🔴",
};

const statusColors: Record<string, string> = {
  draft: "bg-yellow-100 text-yellow-800",
  modified: "bg-blue-100 text-blue-800",
  signed: "bg-green-100 text-green-800",
};

const statusLabels: Record<string, string> = {
  draft: "Robocza",
  modified: "Zmodyfikowana",
  do_podpisu: "Do podpisu",
  aktywna: "Aktywna",
  zakonczona: "Zakończona",
  anulowana: "Anulowana",
  signed: "Podpisana",
};

const statusTransitions: Record<string, string[]> = {
  draft: ["do_podpisu", "anulowana"],
  modified: ["do_podpisu", "anulowana"],
  do_podpisu: ["aktywna", "draft", "anulowana"],
  aktywna: ["zakonczona"],
  zakonczona: [],
  anulowana: ["draft"],
};

export default function ContractDetail() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = parseInt(params.id as string);
  const isNew = searchParams.get("new") === "1";

  const [contract, setContract] = useState<ContractDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"details" | "checklist" | "risks" | "review" | "history">("details");
  const [summary, setSummary] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [review, setReview] = useState<Record<string, unknown> | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  // History state
  const [history, setHistory] = useState<Array<{id: number; action: string; details: Record<string, string>; user: string; created_at: string}>>([]);

  // Risk check state
  const [riskChanges, setRiskChanges] = useState<ContractChange[]>([
    { paragraf: "", zmiana: "" },
  ]);
  const [risks, setRisks] = useState<RiskItem[]>([]);
  const [riskLoading, setRiskLoading] = useState(false);
  const [overallRisk, setOverallRisk] = useState<string>("");

  useEffect(() => {
    loadContract();
  }, [id]);

  useEffect(() => {
    if (activeTab === "history") {
      getContractHistory(id).then(setHistory).catch(console.error);
    }
  }, [activeTab, id]);

  async function loadContract() {
    try {
      const data = await getContract(id);
      setContract(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckRisks() {
    const validChanges = riskChanges.filter((c) => c.paragraf && c.zmiana);
    if (validChanges.length === 0) return;

    setRiskLoading(true);
    try {
      const result = await checkRisks(id, validChanges);
      setRisks(result.risks);
      setOverallRisk(result.overall_risk);
    } catch (e) {
      console.error(e);
    } finally {
      setRiskLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="text-center py-16 text-gray-400">
        <div className="text-4xl mb-3">⏳</div>
        <p>Ładowanie umowy...</p>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="text-center py-16 text-gray-400">
        <div className="text-4xl mb-3">❌</div>
        <p>Umowa nie znaleziona</p>
      </div>
    );
  }

  return (
    <div>
      {/* Success banner */}
      {isNew && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <span className="text-2xl">✅</span>
          <div>
            <p className="font-semibold text-green-800">
              Umowa {contract.number} wygenerowana!
            </p>
            <p className="text-sm text-green-600">
              Plik Word jest gotowy do pobrania.
            </p>
          </div>
          <a
            href={getDownloadUrl(id)}
            download
            className="ml-auto bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-green-700"
          >
            ↓ Pobierz DOCX
          </a>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">
              ← Dashboard
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Umowa {contract.number}
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <span
              className={`text-xs px-2 py-1 rounded-full font-medium ${
                statusColors[contract.status] || "bg-gray-100 text-gray-600"
              }`}
            >
              {statusLabels[contract.status] || contract.status}
            </span>
            <span className="text-sm text-gray-500">
              Wygenerowana{" "}
              {new Date(contract.created_at).toLocaleDateString("pl-PL")}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Status transitions */}
          {contract && statusTransitions[contract.status]?.map((nextStatus) => (
            <button
              key={nextStatus}
              onClick={async () => {
                try {
                  await updateStatus(id, nextStatus);
                  loadContract();
                } catch (e) {
                  console.error(e);
                }
              }}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition-colors ${
                nextStatus === "anulowana"
                  ? "border-red-300 text-red-600 hover:bg-red-50"
                  : "border-green-300 text-green-700 hover:bg-green-50"
              }`}
            >
              → {statusLabels[nextStatus] || nextStatus}
            </button>
          ))}
          {contract?.contractor_email && (
            <button
              onClick={async () => {
                if (!confirm(`Wysłać email powitalny do ${contract.contractor_email}?`)) return;
                const r = await fetch(`/api/contracts/${id}/send-welcome-email`, { method: "POST" });
                const d = await r.json();
                alert(d.success ? `✅ Email wysłany do ${contract.contractor_email}` : `❌ ${d.error || "Błąd wysyłki"}\n\nPodgląd: ${d.preview?.subject || ""}`);
              }}
              className="border border-blue-300 text-blue-600 text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-50"
            >
              📧 Mail powitalny
            </button>
          )}
          <button
            onClick={async () => {
              try {
                const res = await fetch(`/api/contracts/${id}/duplicate`, { method: "POST" });
                const data = await res.json();
                if (data.success) {
                  router.push(`/contracts/${data.contract_id}?new=1`);
                }
              } catch (e) {
                console.error(e);
              }
            }}
            className="border border-gray-300 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50"
          >
            📋 Duplikuj
          </button>
          <Link
            href={`/contracts/${id}/annex`}
            className="border border-orange-300 text-orange-600 text-sm font-medium px-4 py-2 rounded-lg hover:bg-orange-50"
          >
            📋 Aneks
          </Link>
          <Link
            href={`/contracts/${id}/edit`}
            className="border border-gray-300 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50"
          >
            ✏️ Modyfikuj
          </Link>
          <Link
            href={`/contracts/${id}/print`}
            className="border border-gray-300 text-gray-600 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50"
          >
            🖨️
          </Link>
          <a
            href={getDownloadUrl(id)}
            download
            className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            ↓ Pobierz DOCX
          </a>
          {contract && (contract.status === "draft" || contract.status === "anulowana") && (
            <button
              onClick={async () => {
                if (!confirm(`Usunąć umowę ${contract.number}?`)) return;
                try {
                  await fetch(`/api/contracts/${id}`, { method: "DELETE" });
                  router.push("/");
                } catch (e) {
                  console.error(e);
                }
              }}
              className="text-sm text-red-500 hover:text-red-700 px-2"
              title="Usuń umowę"
            >
              🗑️
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-6">
          {(["details", "checklist", "risks", "review", "history"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab === "details" ? "📋 Szczegóły" : tab === "checklist" ? "✅ Checklist" : tab === "risks" ? "⚖️ Ryzyka" : tab === "review" ? "🔍 Full Review" : "📜 Historia"}
            </button>
          ))}
        </div>
      </div>

      {/* Details Tab */}
      {activeTab === "details" && (
        <div className="space-y-6">
          {/* AI Summary */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-blue-800 text-sm">🤖 Podsumowanie AI</h3>
              {!summary && (
                <button
                  onClick={async () => {
                    setSummaryLoading(true);
                    try {
                      const r = await fetch(`/api/contracts/${id}/summary`);
                      const d = await r.json();
                      setSummary(d.summary);
                    } catch { /**/ } finally { setSummaryLoading(false); }
                  }}
                  disabled={summaryLoading}
                  className="text-xs bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {summaryLoading ? "Generuję..." : "Generuj"}
                </button>
              )}
            </div>
            {summary ? (
              <p className="text-sm text-blue-900">{summary}</p>
            ) : (
              <p className="text-xs text-blue-400">Kliknij &quot;Generuj&quot; aby uzyskać AI podsumowanie umowy</p>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Kontraktor */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              👤 Kontraktor
            </h3>
            <dl className="space-y-3">
              <DetailRow label="Imię i nazwisko" value={contract.contractor_name} />
              <DetailRow label="Firma" value={contract.contractor_company} />
              <DetailRow label="NIP" value={contract.contractor_nip} />
              {contract.contractor_regon && (
                <DetailRow label="REGON" value={contract.contractor_regon} />
              )}
              <DetailRow label="Adres" value={contract.contractor_address} />
              <DetailRow label="Email" value={contract.contractor_email} />
              <DetailRow label="Telefon" value={contract.contractor_phone} />
            </dl>
          </div>

          {/* Projekt */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              💼 Projekt
            </h3>
            <dl className="space-y-3">
              <DetailRow label="Klient" value={contract.client} />
              <DetailRow label="Rola" value={contract.role} />
              <DetailRow label="Stawka" value={`${contract.rate.toFixed(2)} PLN/h netto`} />
              {contract.rate > 0 && (
                <div className="ml-32 -mt-1">
                  <button
                    onClick={async () => {
                      const r = await fetch(`/api/benchmark/${id}`);
                      const b = await r.json();
                      alert(`${b.recommendation}\n\nMediana: ${b.benchmark.median} PLN/h\nMin: ${b.benchmark.min} PLN/h\nMax: ${b.benchmark.max} PLN/h\nSeniority: ${b.seniority}`);
                    }}
                    className="text-xs text-blue-500 hover:text-blue-700"
                  >
                    📊 Porównaj z rynkiem
                  </button>
                </div>
              )}
              <DetailRow label="Obszar IT" value={contract.it_area} />
              {contract.it_area_raw && contract.it_area_raw !== contract.it_area && (
                <DetailRow label="Obszar podany" value={contract.it_area_raw} />
              )}
              <DetailRow label="Miasto klienta" value={contract.client_city} />
              <DetailRow label="Data startu" value={contract.start_date} />
              {contract.project_description && (
                <DetailRow label="Opis projektu" value={contract.project_description} />
              )}
            </dl>
          </div>
        </div>
        </div>
      )}

      {/* Risks Tab */}
      {activeTab === "checklist" && (
        <ChecklistTab contractId={id} />
      )}

      {activeTab === "risks" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-800 mb-4">
              Analiza ryzyk prawnych
            </h3>
            <p className="text-sm text-gray-500 mb-5">
              Wpisz planowane zmiany w umowie. AI przeanalizuje ryzyko prawne
              każdej zmiany przy pomocy bazy przepisów.
            </p>

            <div className="space-y-3 mb-4">
              {riskChanges.map((change, i) => (
                <div key={i} className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Paragraf np. §10 ust.1"
                    value={change.paragraf}
                    onChange={(e) => {
                      const updated = [...riskChanges];
                      updated[i] = { ...updated[i], paragraf: e.target.value };
                      setRiskChanges(updated);
                    }}
                    className="w-40 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Opis zmiany np. 12 miesięcy → 6 miesięcy"
                    value={change.zmiana}
                    onChange={(e) => {
                      const updated = [...riskChanges];
                      updated[i] = { ...updated[i], zmiana: e.target.value };
                      setRiskChanges(updated);
                    }}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {riskChanges.length > 1 && (
                    <button
                      onClick={() =>
                        setRiskChanges(riskChanges.filter((_, j) => j !== i))
                      }
                      className="text-red-400 hover:text-red-600"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() =>
                  setRiskChanges([...riskChanges, { paragraf: "", zmiana: "" }])
                }
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                + Dodaj zmianę
              </button>
              <button
                onClick={handleCheckRisks}
                disabled={riskLoading}
                className="ml-auto bg-purple-600 text-white text-sm font-medium px-6 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {riskLoading ? "⏳ Analizuję..." : "🔍 Sprawdź ryzyka"}
              </button>
            </div>
          </div>

          {/* Risk Results */}
          {risks.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-semibold text-gray-800">Wyniki analizy</h3>
                <span
                  className={`text-sm font-medium px-3 py-1.5 rounded-full border ${
                    riskColors[overallRisk as keyof typeof riskColors] ||
                    "bg-gray-100 text-gray-600"
                  }`}
                >
                  {riskIcons[overallRisk as keyof typeof riskIcons]} Ogólny poziom:{" "}
                  {overallRisk === "green"
                    ? "Niskie"
                    : overallRisk === "yellow"
                    ? "Średnie"
                    : "Wysokie"}{" "}
                  ryzyko
                </span>
              </div>

              <div className="space-y-4">
                {risks.map((risk, i) => (
                  <div
                    key={i}
                    className={`rounded-lg border p-4 ${
                      riskColors[risk.ryzyko as keyof typeof riskColors]
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xl">
                        {riskIcons[risk.ryzyko as keyof typeof riskIcons]}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {risk.paragraf}: {risk.zmiana}
                        </p>
                        <p className="text-sm mt-1 opacity-80">
                          {risk.uzasadnienie}
                        </p>
                        {risk.przepisy && risk.przepisy.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {risk.przepisy.map((p, j) => (
                              <span
                                key={j}
                                className="text-xs bg-white bg-opacity-60 px-2 py-0.5 rounded"
                              >
                                {p}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {activeTab === "review" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">🔍 Pełna analiza prawna AI</h3>
            {!review && (
              <button
                onClick={async () => {
                  setReviewLoading(true);
                  try {
                    const r = await fetch(`/api/contracts/${id}/full-review`, { method: "POST" });
                    setReview(await r.json());
                  } catch { /**/ } finally { setReviewLoading(false); }
                }}
                disabled={reviewLoading}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm"
              >
                {reviewLoading ? "⏳ Analizuję (Sonnet)..." : "🔍 Uruchom review"}
              </button>
            )}
          </div>
          {!review && !reviewLoading && (
            <p className="text-sm text-gray-400">Kliknij &quot;Uruchom review&quot; — AI przeanalizuje cały dokument DOCX z Claude Sonnet.</p>
          )}
          {reviewLoading && (
            <div className="text-center py-8 text-gray-400">
              <p className="text-4xl mb-3 animate-pulse">🤖</p>
              <p>Claude Sonnet analizuje umowę... (15-30 sekund)</p>
            </div>
          )}
          {review && (
            <div className="space-y-4">
              {/* Score */}
              <div className={`rounded-lg p-4 text-center ${
                (review.overall_score as number) >= 7 ? "bg-green-50 border border-green-200" :
                (review.overall_score as number) >= 4 ? "bg-yellow-50 border border-yellow-200" :
                "bg-red-50 border border-red-200"
              }`}>
                <p className="text-3xl font-bold">{review.overall_score as number}/10</p>
                <p className="text-sm mt-1">{review.overall_assessment as string}</p>
                <p className="text-xs mt-2">Compliance: <span className="font-semibold">{review.legal_compliance as string}</span></p>
              </div>

              {/* Risky clauses */}
              {(review.risky_clauses as Array<Record<string, string>>)?.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">Klauzule ryzykowne</h4>
                  <div className="space-y-2">
                    {(review.risky_clauses as Array<Record<string, string>>).map((r, i) => {
                      const colors: Record<string, string> = { green: "border-green-200 bg-green-50", yellow: "border-yellow-200 bg-yellow-50", red: "border-red-200 bg-red-50" };
                      return (
                        <div key={i} className={`border rounded-lg p-3 ${colors[r.ryzyko] || "border-gray-200"}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span>{r.ryzyko === "red" ? "🔴" : r.ryzyko === "yellow" ? "🟡" : "🟢"}</span>
                            <span className="font-mono text-sm font-medium">{r.paragraf}</span>
                          </div>
                          <p className="text-sm text-gray-700">{r.opis}</p>
                          {r.rekomendacja && <p className="text-xs text-gray-500 mt-1">💡 {r.rekomendacja}</p>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Missing */}
              {(review.missing_provisions as string[])?.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">Brakujące postanowienia</h4>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                    {(review.missing_provisions as string[]).map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {(review.recommendations as string[])?.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">Rekomendacje</h4>
                  <ul className="space-y-1">
                    {(review.recommendations as string[]).map((r, i) => (
                      <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                        <span>💡</span>{r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === "history" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">📜 Historia zmian</h3>
          {history.length === 0 ? (
            <p className="text-gray-400 text-sm">Brak historii zmian</p>
          ) : (
            <div className="space-y-3">
              {history.map((entry) => (
                <div key={entry.id} className="flex items-start gap-3 border-l-2 border-blue-200 pl-4 py-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {entry.action === "created" && "📄 Umowa utworzona"}
                      {entry.action === "status_changed" && `🔄 Status: ${entry.details.from} → ${entry.details.to}`}
                      {entry.action === "modified" && "✏️ Paragraf zmodyfikowany"}
                      {entry.action === "duplicated" && "📋 Umowa zduplikowana"}
                      {entry.action === "risk_checked" && "⚖️ Ryzyka sprawdzone"}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(entry.created_at).toLocaleString("pl-PL")} · {entry.user}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ChecklistTab({ contractId }: { contractId: number }) {
  const [checklist, setChecklist] = useState<{ progress_pct: number; checklist: Array<{ step: string; done: boolean }> } | null>(null);
  
  useEffect(() => {
    fetch(`/api/contracts/${contractId}/checklist`)
      .then(r => r.json()).then(setChecklist).catch(() => {});
  }, [contractId]);

  if (!checklist) return <div className="text-center py-8 text-gray-400">Ładowanie...</div>;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">✅ Checklist onboardingu</h3>
        <div className="flex items-center gap-2">
          <div className="w-24 bg-gray-200 rounded-full h-2.5">
            <div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${checklist.progress_pct}%` }} />
          </div>
          <span className="text-sm font-medium text-gray-600">{checklist.progress_pct}%</span>
        </div>
      </div>
      <div className="space-y-3">
        {checklist.checklist.map((item, i) => (
          <div key={i} className={`flex items-center gap-3 p-3 rounded-lg ${item.done ? "bg-green-50" : "bg-gray-50"}`}>
            <span className="text-lg">{item.done ? "✅" : "⬜"}</span>
            <span className={`text-sm ${item.done ? "text-green-700 line-through" : "text-gray-700 font-medium"}`}>
              {item.step}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <dt className="text-sm text-gray-500 w-32 flex-shrink-0">{label}</dt>
      <dd className="text-sm text-gray-900 font-medium">{value}</dd>
    </div>
  );
}
