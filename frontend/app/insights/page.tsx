"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface SeasonalData { by_month: Record<string, number>; busiest: string; quietest: string }
interface VelocityData { weekly: Array<{ period: string; count: number }>; monthly: Array<{ period: string; count: number }> }
interface DuplicatesData { contractor: string; client: string; count: number; numbers: string }[]

export default function InsightsPage() {
  const [seasonal, setSeasonal] = useState<SeasonalData | null>(null);
  const [velocity, setVelocity] = useState<VelocityData | null>(null);
  const [duplicates, setDuplicates] = useState<{ contractor: string; client: string; count: number; numbers: string }[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/analytics/seasonal").then(r => r.json()),
      fetch("/api/analytics/velocity").then(r => r.json()),
      fetch("/api/analytics/potential-duplicates").then(r => r.json()),
    ]).then(([s, v, d]) => { setSeasonal(s); setVelocity(v); setDuplicates(d); })
      .catch(console.error);
  }, []);

  const maxMonth = seasonal ? Math.max(...Object.values(seasonal.by_month), 1) : 1;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">💡 Insights</h1>
        <p className="text-sm text-gray-500 mt-1">Sezonowość, velocity, anomalie</p>
      </div>

      {/* Seasonal */}
      {seasonal && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">📅 Sezonowość umów</h2>
            <div className="text-sm text-gray-500">
              🔥 {seasonal.busiest} · ❄️ {seasonal.quietest}
            </div>
          </div>
          <div className="flex items-end gap-1 h-32">
            {Object.entries(seasonal.by_month).map(([month, count]) => (
              <div key={month} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-gray-600 font-medium">{count}</span>
                <div
                  className={`w-full rounded-t ${month === seasonal.busiest ? "bg-orange-500" : month === seasonal.quietest ? "bg-blue-300" : "bg-blue-500"}`}
                  style={{ height: `${(count / maxMonth) * 100}px`, minHeight: "4px" }}
                  title={`${month}: ${count}`}
                />
                <span className="text-xs text-gray-400">{month.slice(0, 3)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Velocity */}
      {velocity && velocity.monthly.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">⚡ Velocity (nowe umowy/miesiąc)</h2>
          <div className="space-y-2">
            {velocity.monthly.slice(0, 6).map(m => (
              <div key={m.period} className="flex items-center gap-3">
                <span className="text-sm text-gray-500 w-16">{m.period}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-5 relative">
                  <div
                    className="bg-green-500 h-5 rounded-full"
                    style={{ width: `${Math.min((m.count / 100) * 100, 100)}%` }}
                  />
                  <span className="absolute right-2 top-0 h-5 flex items-center text-xs font-medium text-gray-700">
                    {m.count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Duplicates */}
      {duplicates.length > 0 && (
        <div className="bg-white rounded-xl border border-yellow-200 bg-yellow-50 p-6">
          <h2 className="text-lg font-semibold text-yellow-800 mb-4">⚠️ Potencjalne duplikaty</h2>
          <p className="text-sm text-yellow-700 mb-4">Ten sam kontrahent ma wiele aktywnych umów u tego samego klienta.</p>
          <div className="space-y-2">
            {duplicates.filter(d => !d.contractor.includes("Test")).slice(0, 8).map((d, i) => (
              <div key={i} className="flex items-center justify-between bg-white rounded-lg p-3 border border-yellow-200">
                <div>
                  <span className="font-medium text-gray-900">{d.contractor}</span>
                  <span className="text-gray-400 mx-2">@</span>
                  <span className="text-gray-600">{d.client}</span>
                </div>
                <div className="text-right">
                  <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-xs">{d.count}x</span>
                  <p className="text-xs text-gray-400 mt-1">{d.numbers}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
