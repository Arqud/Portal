"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export type Transaction = {
  id: string;
  date: string;
  description: string;
  amount: number;
  balance: number;
};

function parseFNBCsv(text: string): Omit<Transaction, "id">[] {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // Find the data header line: "Date, Amount, Balance, Description"
  const headerIdx = lines.findIndex((l) =>
    l.toLowerCase().startsWith("date,") || l.toLowerCase().startsWith("date ,")
  );
  if (headerIdx === -1) throw new Error("Could not find transaction header row in CSV.");

  const dataLines = lines.slice(headerIdx + 1);
  const results: Omit<Transaction, "id">[] = [];

  for (const line of dataLines) {
    // Split on first 3 commas only — description may contain commas
    const parts = line.split(",");
    if (parts.length < 4) continue;

    const rawDate = parts[0].trim();
    const rawAmount = parts[1].trim();
    const rawBalance = parts[2].trim();
    const description = parts.slice(3).join(",").trim();

    const date = rawDate.replace(/\//g, "-"); // 2026/05/19 → 2026-05-19
    const amount = parseFloat(rawAmount);
    const balance = parseFloat(rawBalance);

    if (isNaN(amount) || isNaN(balance) || !date || !description) continue;

    results.push({ date, description, amount, balance });
  }

  return results;
}

export async function uploadTransactionsCsv(csvText: string): Promise<{ inserted: number; error?: string }> {
  let parsed: Omit<Transaction, "id">[];
  try {
    parsed = parseFNBCsv(csvText);
  } catch (e) {
    return { inserted: 0, error: (e as Error).message };
  }

  if (parsed.length === 0) {
    return { inserted: 0, error: "No transactions found in file." };
  }

  const supabase = createSupabaseAdminClient();
  const { error, count } = await supabase
    .from("transactions")
    .upsert(parsed, { onConflict: "date,description,amount,balance", ignoreDuplicates: true })
    .select("id");

  if (error) return { inserted: 0, error: error.message };

  revalidatePath("/admin/finances");
  return { inserted: count ?? parsed.length };
}

export async function getTransactions(): Promise<Transaction[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("id, date, description, amount, balance")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) return [];
  return data ?? [];
}
