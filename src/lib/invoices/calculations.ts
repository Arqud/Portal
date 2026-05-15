import type { LineItem } from "@/lib/invoices/types";

export function calcSubtotal(items: Pick<LineItem, "amount">[]): number {
  return items.reduce((sum, item) => sum + item.amount, 0);
}

export function calcVat(subtotal: number, vatRate: number): number {
  return Math.round(subtotal * (vatRate / 100) * 100) / 100;
}

export function calcTotal(subtotal: number, vat: number): number {
  return Math.round((subtotal + vat) * 100) / 100;
}

export function calcLineAmount(rate: number, quantity: number): number {
  return Math.round(rate * quantity * 100) / 100;
}
