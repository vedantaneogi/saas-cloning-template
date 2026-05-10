"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

interface OverviewStats {
  waitingForOthers: number;
  expiringSoon: number;
  completed: number;
}

function fetchOverviewStats(): Promise<OverviewStats> {
  return fetch("/api/envelopes/stats", { credentials: "include" })
    .then((r) =>
      r.ok ? r.json() : { waitingForOthers: 0, expiringSoon: 0, completed: 0 },
    )
    .catch(() => ({ waitingForOthers: 0, expiringSoon: 0, completed: 0 }));
}

interface StatItemProps {
  count: number;
  label: string;
  href: string;
  isLast?: boolean;
}

function StatItem({ count, label, href, isLast }: StatItemProps) {
  return (
    <Link href={href} className="no-underline block group">
      <div
        className="flex items-center justify-between py-3"
        style={{
          borderBottom: isLast ? "none" : "1px solid #F0F0F0",
        }}
      >
        <span className="text-sm text-gray-600 group-hover:text-gray-900">{label}</span>
        <span style={{ fontSize: "16px", fontWeight: 400, color: "rgba(19,0,50,0.9)" }}>
          {count}
        </span>
      </div>
    </Link>
  );
}

export function OverviewPanel() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["overview-stats"],
    queryFn: fetchOverviewStats,
  });

  return (
    <div className="w-72 flex-shrink-0">
      <div
        className="bg-white"
        style={{ border: "1px solid #E0E0E0", borderRadius: "8px" }}
      >
        <Link href="/agreements" className="no-underline flex items-center justify-between px-4 py-4 border-b hover:bg-gray-50 transition-colors" style={{ borderColor: "#E0E0E0" }}>
          <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#6B7280", letterSpacing: "0.5px" }}>
            OVERVIEW
          </h2>
          <span className="text-gray-400 text-sm">›</span>
        </Link>
        <div className="px-4 py-2">
          {isLoading ? (
            <div className="space-y-3 py-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <div>
              <StatItem
                count={stats?.waitingForOthers ?? 0}
                label="Waiting for others"
                href="/agreements?filter=waiting"
              />
              <StatItem
                count={stats?.expiringSoon ?? 0}
                label="Expiring soon"
                href="/agreements?filter=expiring"
              />
              <StatItem
                count={stats?.completed ?? 0}
                label="Completed"
                href="/agreements?filter=completed"
                isLast
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
