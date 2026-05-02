"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { ReportsSidebar } from "@/features/reports/components/ReportsSidebar";
import { ReportsDashboard } from "@/features/reports/components/ReportsDashboard";

export default function ReportsPage() {
  const searchParams = useSearchParams();
  const dashboardParam = searchParams.get("dashboard") ?? "administrator-dashboard";
  const [activeDashboard, setActiveDashboard] = useState(dashboardParam);

  return (
    <div className="flex flex-1 overflow-hidden min-h-0">
      <ReportsSidebar
        activeView="dashboard"
        activeDashboard={activeDashboard}
        onDashboard={setActiveDashboard}
      />
      <ReportsDashboard dashboardId={activeDashboard} activeType="all" />
    </div>
  );
}
