import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAdminPath = pathname.startsWith("/admin");
  const isClientPath = pathname.startsWith("/client");

  if (!isAdminPath && !isClientPath) return response;

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isAdminPath && profile.role !== "admin") {
    return NextResponse.redirect(new URL("/client/dashboard", request.url));
  }
  if (isClientPath && profile.role !== "client") {
    return NextResponse.redirect(new URL("/admin/overview", request.url));
  }

  // Cross-device theme: on a device with no theme cookie yet, seed it from the
  // user's saved profile.theme. Guarded so a missing column never breaks auth.
  if (!request.cookies.get("theme")?.value) {
    try {
      const { data: pref } = await supabase.from("profiles").select("theme").eq("id", user.id).single();
      const t = pref?.theme === "light" ? "light" : "dark";
      response.cookies.set("theme", t, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    } catch {
      /* profiles.theme column may not exist yet; ignore */
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
