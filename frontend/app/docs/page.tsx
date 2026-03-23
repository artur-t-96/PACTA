"use client";

import { useEffect, useState } from "react";
import { BACKEND_ORIGIN } from "@/lib/api";

interface Endpoint {
  path: string;
  methods: string[];
  summary: string;
}

export default function DocsPage() {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);

  useEffect(() => {
    fetch(`${BACKEND_ORIGIN}/openapi.json`)
      .then((r) => r.json())
      .then((data) => {
        const eps: Endpoint[] = Object.entries(data.paths).map(([path, methods]) => ({
          path,
          methods: Object.keys(methods as Record<string, unknown>).filter((m) => m !== "parameters"),
          summary:
            Object.values(methods as Record<string, Record<string, string>>).find(
              (m: Record<string, string>) => m?.summary,
            )?.summary || "",
        }));
        setEndpoints(eps);
      })
      .catch(console.error);
  }, []);

  const groups = {
    Umowy: endpoints.filter((e) => e.path.startsWith("/api/contracts")),
    Analityka: endpoints.filter(
      (e) => e.path.includes("analytics") || e.path.includes("benchmark") || e.path.includes("stats"),
    ),
    Narzędzia: endpoints.filter(
      (e) => !e.path.startsWith("/api/contracts") && !e.path.includes("analytics") && !e.path.includes("benchmark"),
    ),
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">📖 API Docs</h1>
        <p className="text-sm text-gray-500 mt-1">
          {endpoints.length} endpointów ·
          <a href={`${BACKEND_ORIGIN}/docs`} target="_blank" className="text-blue-600 hover:underline ml-1">
            Swagger UI →
          </a>
        </p>
      </div>

      {Object.entries(groups).map(
        ([group, eps]) =>
          eps.length > 0 && (
            <div key={group} className="mb-8">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">{group}</h2>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="divide-y divide-gray-50">
                  {eps.map((ep) => (
                    <div key={ep.path} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50">
                      <div className="flex gap-1">
                        {ep.methods.map((m) => (
                          <span
                            key={m}
                            className={`text-xs font-mono px-2 py-0.5 rounded ${
                              m === "get"
                                ? "bg-green-100 text-green-700"
                                : m === "post"
                                  ? "bg-blue-100 text-blue-700"
                                  : m === "put"
                                    ? "bg-yellow-100 text-yellow-700"
                                    : m === "patch"
                                      ? "bg-purple-100 text-purple-700"
                                      : m === "delete"
                                        ? "bg-red-100 text-red-700"
                                        : "bg-gray-100"
                            }`}
                          >
                            {m.toUpperCase()}
                          </span>
                        ))}
                      </div>
                      <code className="text-sm font-mono text-gray-800 flex-1">{ep.path}</code>
                      <span className="text-xs text-gray-400 truncate max-w-xs">{ep.summary}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ),
      )}
    </div>
  );
}
