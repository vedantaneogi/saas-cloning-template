import { NextResponse, type NextRequest } from "next/server";

// Routes that don't require an auth cookie.
const PUBLIC_PREFIXES = ["/login", "/signup", "/accept-invite"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = req.cookies.get("lc_session")?.value;

  const isPublic = PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));

  // Logged in, but on /login or /signup → bounce home.
  // EXCEPT when ?stale=1 is set — that means the (app) layout detected an
  // invalid session (e.g. JWT was signed by a rotated AUTH_SECRET, or its exp
  // has passed). Without this escape, the cookie sticks around, middleware
  // bounces to /, layout redirects back to /login, and the user is in a loop.
  const stale = req.nextUrl.searchParams.get("stale") === "1";
  if (session && !stale && (pathname === "/login" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Not logged in, not on a public route → /login.
  if (!session && !isPublic) {
    const url = new URL("/login", req.url);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Skip Next internals, static, and the API rewrite path. Match everything else.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/.*|.*\\..*).*)",
  ],
};
