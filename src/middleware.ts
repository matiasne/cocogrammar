import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Paths reachable without a session. The browsing pages (Write, Course, Log) are
// public — guests can view them, but the underlying APIs still require auth and
// return 401, so actions prompt a login. Only /subscribe requires a session.
const PUBLIC_PREFIXES = [
  "/login",
  "/signup",
  "/auth/callback",
  "/api/billing/webhook",
];

// Exact public page paths (in addition to the prefixes above).
const PUBLIC_EXACT = new Set(["/", "/course", "/history"]);

export async function middleware(request: NextRequest) {
  // Cookies Supabase wants to (re)set this request — e.g. a refreshed session.
  // We stage them here and apply them to WHATEVER response we return (the
  // pass-through OR a redirect), so a refreshed session is never dropped. Losing
  // them on redirect is the classic cause of a /login redirect loop.
  const pending: { name: string; value: string; options?: Record<string, unknown> }[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            pending.push({ name, value, options });
          });
        },
      },
    },
  );

  const applyCookies = (res: NextResponse) => {
    for (const { name, value, options } of pending) {
      res.cookies.set(name, value, options);
    }
    return res;
  };

  // Refreshes the session cookie if it's near expiry. Fail CLOSED: if the auth
  // check throws (network/config), treat the visitor as logged out rather than
  // letting the request through.
  let user = null;
  try {
    const result = await supabase.auth.getUser();
    user = result.data.user;
  } catch {
    user = null;
  }

  const { pathname } = request.nextUrl;
  const isPublic =
    PUBLIC_EXACT.has(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

  // API routes handle their own auth (returning 401), so never redirect them —
  // a 307 to an HTML login page would break fetch callers. Only redirect page
  // navigations for logged-out users on protected paths.
  const isApi = pathname.startsWith("/api/");

  if (!user && !isPublic && !isApi) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return applyCookies(NextResponse.redirect(url));
  }

  return applyCookies(NextResponse.next({ request }));
}

export const config = {
  // Run on everything except Next internals and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
