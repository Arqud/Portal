import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { roleForRedirect } from "@/lib/auth/redirects";
import { getProfile } from "@/lib/auth/getProfile";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "";

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=invalid_link", origin));
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(new URL("/login?error=expired_link", origin));
  }

  const profile = await getProfile(data.user.id);
  const destination = next || roleForRedirect(profile?.role ?? null);
  return NextResponse.redirect(new URL(destination, origin));
}
