"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authFetch, getCurrentUser } from "../../lib/auth";

interface Message {
  role: "user" | "assistant";
  content: string;
  action?: ActionData | null;
  timestamp: Date;
}

interface ActionData {
  type: string;
  data: Record<string, unknown>;
}

interface ActionResult {
  success: boolean;
  type?: string;
  contract_id?: number;
  contract_number?: string;
  message?: string;
  download_url?: string;
  error?: string;
  data?: Record<string, unknown>;
}

interface TicketInfo {
  id: number;
  type: string;
  title: string;
  status: string;
  requester_id: string;
  details: Record<string, unknown>;
}

const QUICK_PROMPTS = [
  { icon: "📄", label: "Generuj umowę", prompt: "Chcę wygenerować nową umowę B2B. Pomóż mi zebrać potrzebne dane." },
  { icon: "⚖️", label: "Sprawdź ryzyko", prompt: "Chcę sprawdzić ryzyko prawne zapisu w umowie. Jaki paragraf mam ocenić?" },
  { icon: "✏️", label: "Zmień paragraf", prompt: "Chcę zmodyfikować paragraf w istniejącej umowie. Podaj mi propozycję zmiany." },
  { icon: "📚", label: "Baza prawna", prompt: "Jakie przepisy prawne regulują umowy B2B w Polsce? Podaj najważniejsze." },
  { icon: "📊", label: "Statystyki", prompt: "Pokaż mi aktualne statystyki umów — ile mamy aktywnych, średnia stawka, top klienci." },
];

export default function AIAssistantPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ticketId = searchParams.get("ticket");

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [ticket, setTicket] = useState<TicketInfo | null>(null);
  const [actionResult, setActionResult] = useState<ActionResult | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auth check
  useEffect(() => {
    const user = getCurrentUser();
    if (!user) { router.replace("/login"); return; }
    if (!["operator", "admin"].includes(user.role)) { router.replace("/login"); return; }
  }, []);

  // Load ticket info if provided
  useEffect(() => {
    if (ticketId) {
      authFetch(`/api/tickets/${ticketId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.id) {
            const details = typeof data.details === "string" ? JSON.parse(data.details) : data.details || {};
            setTicket({ ...data, details });

            // Auto-send initial message based on ticket type
            const typeMessages: Record<string, string> = {
              generate_contract: `Mam zgłoszenie #${data.id} od ${data.requester_id}: "${data.title}". Pomóż mi wygenerować tę umowę B2B. Oto dane ze zgłoszenia:\n${Object.entries(details).filter(([, v]) => v).map(([k, v]) => `- ${k.replace(/_/g, " ")}: ${v}`).join("\n")}`,
              check_risks: `Mam zgłoszenie #${data.id} od ${data.requester_id}: "${data.title}". Potrzebuję weryfikacji ryzyk prawnych.\n${Object.entries(details).filter(([, v]) => v).map(([k, v]) => `- ${k.replace(/_/g, " ")}: ${v}`).join("\n")}`,
              modify_paragraph: `Mam zgłoszenie #${data.id} od ${data.requester_id}: "${data.title}". Potrzebuję modyfikacji paragrafu.\n${Object.entries(details).filter(([, v]) => v).map(([k, v]) => `- ${k.replace(/_/g, " ")}: ${v}`).join("\n")}`,
            };
            const autoMsg = typeMessages[data.type] || `Mam zgłoszenie #${data.id}: "${data.title}". Pomóż mi je przetworzyć.`;
            setTimeout(() => sendMessage(autoMsg), 500);
          }
        })
        .catch(() => {});
    }
  }, [ticketId]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(text?: string) {
    const msgText = text || input.trim();
    if (!msgText || loading) return;

    const userMsg: Message = { role: "user", content: msgText, timestamp: new Date() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    if (!text) setInput("");
    setLoading(true);
    setActionResult(null);

    try {
      const r = await authFetch("/api/ai/assistant", {
        method: "POST",
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          ticket_id: ticketId ? parseInt(ticketId) : null,
        }),
      });
      const data = await r.json();

      const assistantMsg: Message = {
        role: "assistant",
        content: data.reply || data.error || "Przepraszam, nie mogę teraz odpowiedzieć.",
        action: data.action || null,
        timestamp: new Date(),
      };
      setMessages([...newMessages, assistantMsg]);
    } catch {
      setMessages([
        ...newMessages,
        { role: "assistant", content: "Nie udało się połączyć z serwerem AI. Spróbuj ponownie.", timestamp: new Date() },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  async function executeAction(action: ActionData) {
    setLoading(true);
    try {
      const r = await authFetch("/api/ai/assistant/execute-action", {
        method: "POST",
        body: JSON.stringify(action),
      });
      const result: ActionResult = await r.json();
      setActionResult(result);

      // Add result message to chat
      const resultMsg = result.success
        ? `✅ ${result.message || "Akcja wykonana pomyślnie!"}`
        : `❌ ${result.error || "Błąd wykonania akcji."}`;

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: resultMsg, timestamp: new Date() },
      ]);

      // If we generated a contract and have a ticket, update the ticket
      if (result.success && result.type === "contract_generated" && ticketId) {
        await authFetch(`/api/tickets/${ticketId}/result`, {
          method: "PATCH",
          body: JSON.stringify({
            result: {
              summary: `Umowa ${result.contract_number} wygenerowana przez AI Assistant`,
              contract_number: result.contract_number,
              notes: "Wygenerowane automatycznie przez AI Assistant",
            },
            result_file_path: result.contract_number || null,
          }),
        });
      }
    } catch {
      setActionResult({ success: false, error: "Błąd połączenia" });
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Link href="/operator" className="text-gray-400 hover:text-gray-600 text-sm">
            ← Kolejka
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              🤖 AI Assistant
              {ticket && (
                <span className="text-sm font-normal text-gray-500">
                  · Ticket #{ticket.id}
                </span>
              )}
            </h1>
            <p className="text-xs text-gray-400">
              Generuj umowy, weryfikuj ryzyka, modyfikuj paragrafy
            </p>
          </div>
        </div>
        {ticket && (
          <div className="text-right">
            <p className="text-xs text-gray-500">{ticket.title}</p>
            <p className="text-xs text-gray-400">od: {ticket.requester_id}</p>
          </div>
        )}
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto bg-white rounded-xl border border-gray-200 p-4 mb-4">
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-5xl mb-4">🤖</div>
            <h2 className="text-lg font-semibold text-gray-700 mb-2">
              Witaj! Jestem AI Assistant PARAGRAF
            </h2>
            <p className="text-sm text-gray-500 mb-6 max-w-md">
              Pomogę Ci wygenerować umowy B2B, sprawdzić ryzyka prawne i zmodyfikować zapisy umów.
              Wybierz szybką akcję lub napisz do mnie.
            </p>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {QUICK_PROMPTS.map((qp) => (
                <button
                  key={qp.label}
                  onClick={() => sendMessage(qp.prompt)}
                  className="flex items-center gap-1.5 text-sm bg-gray-50 hover:bg-blue-50 hover:border-blue-300 border border-gray-200 text-gray-700 px-3 py-2 rounded-lg transition-colors"
                >
                  <span>{qp.icon}</span>
                  <span>{qp.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`mb-4 flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</div>

              {/* Action button */}
              {msg.action && msg.role === "assistant" && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium text-gray-500">
                      {msg.action.type === "generate_contract" && "📄 Gotowe do wygenerowania umowy"}
                      {msg.action.type === "risk_assessment" && "⚖️ Ocena ryzyka"}
                      {msg.action.type === "modify_paragraph" && "✏️ Propozycja modyfikacji"}
                    </span>
                  </div>

                  {msg.action.type === "generate_contract" && (
                    <div className="bg-white rounded-lg p-3 mb-2 text-xs">
                      <div className="grid grid-cols-2 gap-1">
                        {Object.entries(msg.action.data as Record<string, unknown>)
                          .filter(([, v]) => v)
                          .map(([k, v]) => (
                            <div key={k}>
                              <span className="text-gray-400">{k}:</span>{" "}
                              <span className="font-medium">{String(v)}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {msg.action.type === "risk_assessment" && (
                    <div className={`rounded-lg p-3 mb-2 text-xs ${
                      (msg.action.data as Record<string, unknown>).ryzyko === "green" ? "bg-green-50" :
                      (msg.action.data as Record<string, unknown>).ryzyko === "yellow" ? "bg-yellow-50" : "bg-red-50"
                    }`}>
                      <p className="font-medium">
                        Ryzyko: {String((msg.action.data as Record<string, unknown>).ryzyko).toUpperCase()}
                      </p>
                      {(msg.action.data as Record<string, unknown>).uzasadnienie && (
                        <p className="mt-1 text-gray-600">{String((msg.action.data as Record<string, unknown>).uzasadnienie)}</p>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => executeAction(msg.action!)}
                    disabled={loading}
                    className="w-full text-sm bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
                  >
                    {msg.action.type === "generate_contract" && "📄 Wygeneruj umowę"}
                    {msg.action.type === "risk_assessment" && "✅ Zapisz ocenę ryzyka"}
                    {msg.action.type === "modify_paragraph" && "✏️ Zastosuj zmianę"}
                  </button>
                </div>
              )}

              <p className="text-xs mt-1 opacity-50">
                {msg.timestamp.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        ))}

        {/* Action result banner */}
        {actionResult && actionResult.success && actionResult.download_url && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-800">
                Umowa {actionResult.contract_number} wygenerowana!
              </p>
              <p className="text-xs text-green-600">Kliknij aby pobrać plik DOCX</p>
            </div>
            <a
              href={actionResult.download_url}
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 flex items-center gap-2"
            >
              📥 Pobierz
            </a>
          </div>
        )}

        {/* Loading indicator */}
        {loading && (
          <div className="mb-4 flex justify-start">
            <div className="bg-gray-100 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                AI myśli...
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="bg-white rounded-xl border border-gray-200 p-3">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Napisz do AI Assistant... (Enter = wyślij, Shift+Enter = nowa linia)"
            rows={2}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
            disabled={loading}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="bg-blue-600 text-white px-5 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium text-sm self-end py-2"
          >
            Wyślij
          </button>
        </div>
      </div>
    </div>
  );
}

