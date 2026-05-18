import { CustomersBody } from "@/components/customers-body";
import { listCustomers, listMembers, type Customer, type Member } from "@/lib/api";

export default async function CustomersPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  const [customers, members] = await Promise.all([
    listCustomers(workspace).catch(() => [] as Customer[]),
    listMembers(workspace).catch(() => [] as Member[]),
  ]);

  return (
    <CustomersBody workspaceSlug={workspace} members={members} initial={customers} />
  );
}
