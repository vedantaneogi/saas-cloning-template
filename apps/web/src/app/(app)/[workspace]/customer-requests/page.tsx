import { Users } from "lucide-react";
import { Topbar } from "@/components/topbar";
import { CustomerRequestsBody } from "@/components/customer-requests-body";
import { listCustomerRequests, type CustomerRequest } from "@/lib/api";

export default async function CustomerRequestsPage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  const items = await listCustomerRequests(workspace).catch(() => [] as CustomerRequest[]);

  return (
    <>
      <Topbar title="Customer requests" icon={<Users size={15} />} />
      <CustomerRequestsBody workspaceSlug={workspace} initial={items} />
    </>
  );
}
