import { NextResponse, type NextRequest } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import { createElement } from "react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { QuotePDF } from "@/lib/invoices/quote-pdf";
import type { QuoteWithItems } from "@/lib/invoices/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const admin = createSupabaseAdminClient();
  const { data: profile } = await admin
    .from("profiles").select("role").eq("id", user.id).single();
  if (!profile || profile.role !== "admin") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { data: quote, error } = await admin
    .from("quotes")
    .select("*, client:clients(id,name,company,email,contact_person,address,reg_number,vat_number), line_items:quote_line_items(*)")
    .eq("id", id)
    .single();

  if (error || !quote) return new NextResponse("Not found", { status: 404 });

  quote.line_items = (quote.line_items as { sort_order: number }[])
    .sort((a, b) => a.sort_order - b.sort_order);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = createElement(QuotePDF, { quote: quote as QuoteWithItems }) as any;
  const stream = await renderToStream(element);

  const chunks: Buffer[] = [];
  for await (const chunk of stream as AsyncIterable<Buffer>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const buffer = Buffer.concat(chunks);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${quote.quote_number}.pdf"`,
    },
  });
}
