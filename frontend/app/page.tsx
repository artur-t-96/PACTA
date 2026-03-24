"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "./lib/auth";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      router.replace("/login");
    } else if (user.role === "recruiter") {
      router.replace("/recruiter");
    } else if (user.role === "admin") {
      router.replace("/users");
    } else {
      router.replace("/operator");
    }
  }, [router]);

  return null;
}
