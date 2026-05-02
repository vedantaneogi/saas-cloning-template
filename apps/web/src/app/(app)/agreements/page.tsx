import { Suspense } from "react";
import { EnvelopeSidebar } from "@/features/envelopes/components/EnvelopeSidebar";
import { EnvelopeList } from "@/features/envelopes/components/EnvelopeList";

export const metadata = {
  title: "Agreements | Docusign",
};

export default function AgreementsPage() {
  return (
    <div className="flex flex-1 overflow-hidden min-h-0">
      <Suspense>
        <EnvelopeSidebar />
      </Suspense>
      <Suspense>
        <EnvelopeList />
      </Suspense>
    </div>
  );
}
