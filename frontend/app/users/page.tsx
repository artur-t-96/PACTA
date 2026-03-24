"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch, getCurrentUser } from "../lib/auth";

interface User {
  username: string;
  name: string;
  role: string;
  role_label: string;
  active: boolean;
  api_key: string;
}

const roleColors: Record<string, string> = {
  admin: "bg-red-100 text-red-700",
  operator: "bg-blue-100 text-blue-700",
  manager: "bg-purple-100 text-purple-700",
  recruiter: "bg-green-100 text-green-700",
  viewer: "bg-gray-100 text-gray-700",
};

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newUser, setNewUser] = useState({ username: "", name: "", role: "recruiter", password: "" });
  const [message, setMessage] = useState("");

  const loadUsers = () => {
    authFetch("/api/users").then(r => r.json()).then(setUsers).catch(() => {});
  };

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) { router.replace("/login"); return; }
    if (user.role !== "admin") { router.replace("/login"); return; }
    loadUsers();
  }, []);

  async function handleCreate() {
    const r = await authFetch("/api/users", {
      method: "POST",
      body: JSON.stringify(newUser),
    });
    const d = await r.json();
    if (d.success) {
      setMessage(`✅ Utworzono ${newUser.username}. API Key: ${d.api_key}`);
      setShowCreate(false);
      setNewUser({ username: "", name: "", role: "recruiter", password: "" });
      loadUsers();
    } else {
      setMessage(`❌ ${d.error}`);
    }
  }

  async function changeRole(username: string, newRole: string) {
    await authFetch(`/api/users/${username}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role: newRole }),
    });
    loadUsers();
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">👥 Użytkownicy</h1>
          <p className="text-sm text-gray-500 mt-1">Zarządzanie dostępem do PARAGRAF</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">
          + Nowy użytkownik
        </button>
      </div>

      {message && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-blue-700">{message}</div>
      )}

      {showCreate && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h3 className="font-semibold mb-4">Nowy użytkownik</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Login</label>
              <input value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Imię i nazwisko</label>
              <input value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rola</label>
              <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="admin">Administrator</option>
                <option value="operator">Operator (pełny dostęp AI)</option>
                <option value="recruiter">Rekruter (tylko zgłoszenia)</option>
                <option value="viewer">Podgląd</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hasło</label>
              <input type="password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <button onClick={handleCreate}
            className="mt-4 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 text-sm">
            Utwórz
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b text-left text-gray-500">
              <th className="px-4 py-3">Login</th>
              <th className="px-4 py-3">Imię</th>
              <th className="px-4 py-3">Rola</th>
              <th className="px-4 py-3">API Key</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Akcja</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map(u => (
              <tr key={u.username} className={u.active ? "hover:bg-gray-50" : "opacity-40"}>
                <td className="px-4 py-3 font-medium">{u.username}</td>
                <td className="px-4 py-3">{u.name}</td>
                <td className="px-4 py-3">
                  <select
                    value={u.role}
                    onChange={e => changeRole(u.username, e.target.value)}
                    className={`text-xs px-2 py-1 rounded-full border-0 ${roleColors[u.role] || "bg-gray-100"}`}
                    disabled={u.username === "admin"}
                  >
                    <option value="admin">Admin</option>
                    <option value="operator">Operator</option>
                    <option value="recruiter">Rekruter</option>
                    <option value="viewer">Podgląd</option>
                  </select>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-gray-400">{u.api_key}</td>
                <td className="px-4 py-3">{u.active ? "✅" : "❌"}</td>
                <td className="px-4 py-3">
                  {u.username !== "admin" && u.active && (
                    <button onClick={async () => {
                      await authFetch(`/api/users/${u.username}`, { method: "DELETE" });
                      loadUsers();
                    }} className="text-red-400 hover:text-red-600 text-xs">Dezaktywuj</button>
                  )}
                  {u.username !== "admin" && !u.active && (
                    <button onClick={async () => {
                      await authFetch(`/api/users/${u.username}/activate`, { method: "POST" });
                      loadUsers();
                    }} className="text-green-500 hover:text-green-700 text-xs">Aktywuj</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 bg-gray-50 rounded-xl border p-4 text-xs text-gray-500">
        <p className="font-medium mb-2">Uprawnienia ról:</p>
        <ul className="space-y-1">
          <li><span className="font-semibold text-red-600">Admin</span> — pełen dostęp + backup + import + zarządzanie użytkownikami</li>
          <li><span className="font-semibold text-blue-600">Operator</span> — pełny dostęp AI: umowy, aneksy, modyfikacje, eksporty, przegląd prawny; przetwarza zgłoszenia od rekruterów</li>
          <li><span className="font-semibold text-green-600">Rekruter</span> — tylko zgłoszenia: może składać zlecenia i odebrać wyniki; nie ma dostępu do AI</li>
          <li><span className="font-semibold text-gray-600">Podgląd</span> — tylko odczyt umów i raportów</li>
        </ul>
      </div>
    </div>
  );
}
