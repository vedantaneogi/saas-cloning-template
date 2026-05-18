import { notFound } from "next/navigation";
import { CustomerDetailBody } from "@/components/customer-detail-body";
import {
  getCustomer,
  getWorkspace,
  listCustomerScopedRequests,
  listProjects,
  NotFoundError,
  type CustomerRequest,
  type Project,
  type Team,
} from "@/lib/api";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ workspace: string; customerSlug: string }>;
}) {
  const { workspace, customerSlug } = await params;
  try {
    const [customer, ws, requests, projects] = await Promise.all([
      getCustomer(workspace, customerSlug),
      getWorkspace(workspace).catch(() => null),
      listCustomerScopedRequests(workspace, customerSlug).catch(() => [] as CustomerRequest[]),
      listProjects(workspace).catch(() => [] as Project[]),
    ]);
    const teams: Team[] = ws?.teams ?? [];
    return (
      <CustomerDetailBody
        workspaceSlug={workspace}
        customer={customer}
        teams={teams}
        projects={projects}
        initialRequests={requests}
      />
    );
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
}
