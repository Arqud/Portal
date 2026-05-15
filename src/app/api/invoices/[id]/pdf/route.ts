import { NextResponse, type NextRequest } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import { createElement } from "react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { InvoicePDF } from "@/lib/invoices/invoice-pdf";
import type { InvoiceWithItems } from "@/lib/invoices/types";

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
    .from("profiles").select("role, client_id").eq("id", user.id).single();
  if (!profile) return new NextResponse("Unauthorized", { status: 401 });

  const { data: invoice, error } = await admin
    .from("invoices")
    .select("*, client:clients(id,name,company,email,contact_person,address,reg_number,vat_number), line_items:invoice_line_items(*)")
    .eq("id", id)
    .single();

  if (error || !invoice) return new NextResponse("Not found", { status: 404 });

  if (profile.role === "client") {
    if (invoice.client_id !== profile.client_id || invoice.status === "draft") {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  invoice.line_items = (invoice.line_items as { sort_order: number }[])
    .sort((a, b) => a.sort_order - b.sort_order);

  const arqudVatNumber = process.env.ARQUD_VAT_NUMBER;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = createElement(InvoicePDF, { invoice: invoice as InvoiceWithItems, arqudVatNumber }) as any;
  const stream = await renderToStream(element);

  const chunks: Buffer[] = [];
  for await (const chunk of stream as AsyncIterable<Buffer>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const buffer = Buffer.concat(chunks);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${invoice.invoice_number}.pdf"`,
    },
  });
}
