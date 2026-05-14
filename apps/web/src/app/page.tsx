import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function HomePage() {
  const jar = await cookies();
  if (!jar.get("lc_session")) redirect("/login");

  // Resolve the user's first workspace via the API. If the API rejects the
  // cookie (rotated AUTH_SECRET, user no longer exists, expired JWT, …) we
  // bounce to /login?stale=1 so middleware can clear the dead cookie —
  // otherwise the next request still carries it, gets rejected here again,
  // and the user is stuck in a redirect loop with no escape but manually
  // deleting cookies in DevTools.
  const api = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
  const cookieHeader = jar.getAll().map((c) => `${c.name}=${c.value}`).join("; ");
  let ok = false;
  let me: { workspaces?: { slug?: string }[] } | null = null;
  try {
    const res = await fetch(`${api}/api/auth/me`, { cache: "no-store", headers: { Cookie: cookieHeader } });
    if (res.ok) {
      me = await res.json();
      ok = true;
    }
  } catch {
    // network error → fall through to stale redirect below
  }
  if (!ok || !me) redirect("/login?stale=1");

  const firstWs = me.workspaces?.[0];
  if (firstWs?.slug) redirect(`/${firstWs.slug}/inbox`);
  redirect(`/new-workspace`);
}
