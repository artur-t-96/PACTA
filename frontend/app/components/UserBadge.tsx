"use client";

import { useEffect, useState } from "react";

export default function UserBadge() {
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  
  useEffect(() => {
    const stored = localStorage.getItem("paragraf_user");
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch {}
    }
  }, []);
  
  if (!user) return null;
  
  const colors: Record<string, string> = {
    admin: "bg-red-100 text-red-600",
    manager: "bg-blue-100 text-blue-600",
    recruiter: "bg-green-100 text-green-600",
    viewer: "bg-gray-100 text-gray-600",
  };
  
  return (
    <span className={`text-xs px-2 py-1 rounded-full ${colors[user.role] || "bg-gray-100"}`} title={`${user.name} (${user.role})`}>
      {user.name.split(" ")[0]}
    </span>
  );
}
