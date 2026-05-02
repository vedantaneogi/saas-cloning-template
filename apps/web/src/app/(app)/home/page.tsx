import { WelcomeHero } from "@/features/dashboard/components/WelcomeHero";
import { HomeDashboard } from "@/features/dashboard/components/HomeDashboard";
import { DashboardFooter } from "@/features/dashboard/components/DashboardFooter";

export const metadata = {
  title: "Docusign",
};

export default function HomePage() {
  return (
    <div className="flex flex-col flex-1">
      <WelcomeHero />
      <HomeDashboard />
      <DashboardFooter />
    </div>
  );
}
