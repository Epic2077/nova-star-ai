import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseCookieMethods } from "@/types/supabase";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookies: SupabaseCookieMethods["getAll"] extends () => infer R
            ? R
            : never,
        ) {
          cookies.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      } as SupabaseCookieMethods,
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoggedIn = Boolean(user);
  const { pathname } = request.nextUrl;

  if (pathname === "/" && isLoggedIn) {
    return NextResponse.redirect(new URL("/chat", request.url));
  }

  if (pathname.startsWith("/chat") && !isLoggedIn) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  if (pathname.startsWith("/login") && isLoggedIn) {
    return NextResponse.redirect(new URL("/chat", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/", "/chat/:path*"],
};
