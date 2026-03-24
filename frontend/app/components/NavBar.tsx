"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCurrentUser, logout, authFetch, type AuthUser } from "../lib/auth";

export default function NavBar() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const u = getCurrentUser();
    setUser(u);

    if (u) {
      const fetchUnread = () => {
        authFetch("/api/tickets/unread-count")
          .then((r) => r.json())
          .then((d) => setUnread(d.count || 0))
          .catch(() => {});
      };
      fetchUnread();
      const interval = setInterval(fetchUnread, 30000);
      return () => clearInterval(interval);
    }
  }, []);

  const roleColors: Record<string, string> = {
    admin: "bg-red-100 text-red-600",
    operator: "bg-blue-100 text-blue-600",
    recruiter: "bg-green-100 text-green-600",
    viewer: "bg-gray-100 text-gray-600",
  };

  const homeHref =
    user?.role === "recruiter" ? "/recruiter" :
    user?.role === "admin" ? "/users" :
    "/operator";

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14 items-center">
          <div className="flex items-center gap-6">
            <Link href={homeHref} className="text-lg font-bold text-gray-900">
              ⚖️ PARAGRAF
            </Link>

            {user?.role === "recruiter" && (
              <Link href="/recruiter" className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900">
                Moje tickety
                {unread > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {unread}
                  </span>
                )}
              </Link>
            )}

            {(user?.role === "operator" || user?.role === "admin") && (
              <Link href="/operator" className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900">
                Kolejka ticketów
                {unread > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {unread}
                  </span>
                )}
              </Link>
            )}

            {user?.role === "admin" && (
              <Link href="/users" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                Użytkownicy
              </Link>
            )}
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${roleColors[user.role] || "bg-gray-100"}`}
                  title={`${user.name} (${user.role})`}
                >
                  {user.name.split(" ")[0]}
                </span>
                <button
                  onClick={logout}
                  className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1"
                  title="Wyloguj"
                >
                  Wyloguj
                </button>
              </>
            ) : (
              <Link href="/login" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                Zaloguj →
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
