"use client";

import { useEffect, useState } from "react";
import { getTrialRequestStats } from "@/lib/api/client/trial-requests";

export function TrialRequestsBadge() {
  const [pendingCount, setPendingCount] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const stats = await getTrialRequestStats();
        if (isMounted && typeof stats.pending === "number") {
          setPendingCount(stats.pending);
        }
      } catch {
        // Silently fail if network error or unauthenticated
      }
    }

    load();
    // Poll every 60 seconds
    const interval = setInterval(load, 60000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  if (!pendingCount || pendingCount <= 0) return null;

  return (
    <span className="ml-1 inline-flex items-center justify-center px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-amber-500 text-white">
      {pendingCount}
    </span>
  );
}
