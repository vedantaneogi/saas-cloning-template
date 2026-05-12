import { Topbar } from "@/components/topbar";
import { Mail } from "lucide-react";
import { DigestPreview } from "@/components/digest-preview";

export default async function DigestPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const { workspace } = await params;
  const sp = await searchParams;
  const period: "daily" | "weekly" = sp.period === "weekly" ? "weekly" : "daily";
  return (
    <>
      <Topbar title="Email digest preview" icon={<Mail size={15} />} />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-[720px] space-y-3">
          <p className="text-mini text-text-tertiary">
            Renders the HTML you'd receive in a {period} email. SMTP delivery is not wired — copy
            from the rendered preview when needed.
          </p>
          <DigestPreview workspaceSlug={workspace} initialPeriod={period} />
        </div>
      </div>
    </>
  );
}
