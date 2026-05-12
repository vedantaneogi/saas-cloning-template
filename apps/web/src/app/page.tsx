import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function HomePage() {
  const jar = await cookies();
  if (!jar.get("lc_session")) {
    redirect("/login");
  }
  // Resolve user's first workspace via the API.
  const api = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
  const cookieHeader = jar.getAll().map((c) => `${c.name}=${c.value}`).join("; ");
  try {
    const res = await fetch(`${api}/api/auth/me`, { cache: "no-store", headers: { Cookie: cookieHeader } });
    if (!res.ok) redirect("/login");
    const me = await res.json();
    const firstWs = me.workspaces?.[0];
    if (firstWs?.slug) redirect(`/${firstWs.slug}/inbox`);
    redirect(`/new-workspace`);
  } catch {
    redirect("/login");
  }
}
