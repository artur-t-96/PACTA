"use client";

import { useEffect, useState } from "react";
import { BACKEND_ORIGIN } from "@/lib/api";

interface SystemInfo {
  traffit: { configured: boolean; message: string };
  usage: { ai: { calls: number; input_tokens: number; output_tokens: number }; rag: { count: number } };
  templates: Array<{ filename: string; paragraphs: number; tables: number }>;
}

export default function SettingsPage() {
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [backupResult, setBackupResult] = useState<string>("");
  const [health, setHealth] = useState<{ status: string; version: string; contracts: number; active: number } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/traffit/status").then((r) => r.json()),
      fetch("/api/usage").then((r) => r.json()),
      fetch("/api/templates").then((r) => r.json()),
    ])
      .then(([traffit, usage, templates]) => {
        setInfo({ traffit, usage, templates });
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetch(`${BACKEND_ORIGIN}/health`).then((r) => r.json()).then(setHealth).catch(() => {});
  }, []);

  if (!info) return <div className="text-center py-16 text-gray-400">Ładowanie...</div>;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">⚙️ Ustawienia</h1>
      </div>

      <Section title="System">
        <Item label="Backend" value={health ? `${health.status} — v${health.version}` : "checking..."} status={health?.status === "healthy" ? "✅" : "❌"} />
        <Item label="Umowy" value={health ? `${health.contracts} łącznie · ${health.active} aktywnych` : "..."} />
        <Item label="RAG chunks" value={String(info.usage.rag.count)} />
        <Item label="AI calls (sesja)" value={String(info.usage.ai.calls)} />
        <Item label="Tokeny input" value={info.usage.ai.input_tokens.toLocaleString()} />
        <Item label="Tokeny output" value={info.usage.ai.output_tokens.toLocaleString()} />
      </Section>

      <Section title="Integracje">
        <Item label="Traffit ATS" value={info.traffit.message} status={info.traffit.configured ? "✅" : "❌"} />
        <Item label="MS365 Email" value="Wymaga tokenu" status="⚠️" />
        <Item label="REGON/KRS" value="API publiczne (rejestr.io)" status="✅" />
      </Section>

      <Section title="Szablony umów">
        {info.templates.map((t) => (
          <Item key={t.filename} label={t.filename} value={`${t.paragraphs} akapitów, ${t.tables} tabel`} />
        ))}
      </Section>

      <Section title="Akcje">
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={async () => {
              const r = await fetch("/api/backup", { method: "POST" });
              const d = await r.json();
              setBackupResult(d.success ? `✅ Backup: ${d.size_mb} MB` : `❌ ${d.error}`);
            }}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm"
          >
            💾 Backup bazy
          </button>
          <button
            onClick={async () => {
              const r = await fetch("/api/normalize/clients", { method: "POST" });
              const d = await r.json();
              setBackupResult(`✅ Znormalizowano: ${d.updated} klientów`);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
          >
            🔧 Normalizuj klientów
          </button>
          <a
            href={`${BACKEND_ORIGIN}/docs`}
            target="_blank"
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 text-sm"
          >
            📖 Swagger API
          </a>
        </div>
        {backupResult && <p className="text-sm text-gray-600 mt-3">{backupResult}</p>}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      <h2 className="font-semibold text-gray-800 mb-4">{title}</h2>
      {children}
    </div>
  );
}

function Item({ label, value, status }: { label: string; value: string; status?: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-900">{value}</span>
        {status && <span>{status}</span>}
      </div>
    </div>
  );
}
