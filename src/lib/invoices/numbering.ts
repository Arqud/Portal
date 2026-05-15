import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const PREFIXES: Record<string, string> = {
  invoice: "INV",
  quote: "QTE",
};

export function formatDocumentNumber(type: string, year: number, n: number): string {
  const prefix = PREFIXES[type] ?? type.toUpperCase();
  return `${prefix}-${year}-${String(n).padStart(3, "0")}`;
}

export async function nextDocumentNumber(type: string): Promise<string> {
  const year = new Date().getFullYear();
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin.rpc("increment_document_sequence", {
    p_type: type,
    p_year: year,
  });

  if (error || data === null) {
    throw new Error(`Failed to get next ${type} number: ${error?.message}`);
  }

  return formatDocumentNumber(type, year, data as number);
}
