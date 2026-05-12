import { NextResponse, type NextRequest } from "next/server";

// Routes that don't require an auth cookie.
const PUBLIC_PREFIXES = ["/login", "/signup", "/accept-invite"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = req.cookies.get("lc_session")?.value;

  const isPublic = PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));

  // Logged in, but on /login or /signup → bounce home.
  if (session && (pathname === "/login" || pathname === "/signup")) {
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
