import { AcceptInvite } from "@/components/auth/accept-invite";

export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <div className="rounded-xl bg-elevated p-6 shadow-popover">
      <AcceptInvite token={token} />
    </div>
  );
}
