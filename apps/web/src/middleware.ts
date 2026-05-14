import { NextResponse, type NextRequest } from "next/server";

// Routes that don't require an auth cookie.
const PUBLIC_PREFIXES = ["/login", "/signup", "/accept-invite"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = req.cookies.get("lc_session")?.value;

  const isPublic = PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));

  // ?stale=1 means the (app) layout detected an invalid session (rotated
  // AUTH_SECRET, expired JWT, etc.). Clear the cookie server-side as part of
  // rendering /login so the browser drops it before the user even sees the
  // form — doing this in a client useEffect raced the login submit and
  // sometimes wiped the freshly-issued cookie.
  const stale = req.nextUrl.searchParams.get("stale") === "1";
  if (stale && session && (pathname === "/login" || pathname === "/signup")) {
    const res = NextResponse.next();
    // Match the API's Set-Cookie attributes so every browser drops it.
    res.cookies.set("lc_session", "", {
      path: "/",
      maxAge: 0,
      httpOnly: true,
      sameSite: "lax",
      secure: req.nextUrl.protocol === "https:",
    });
    return res;
  }

  // Logged in and not stale → bounce auth pages home.
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
