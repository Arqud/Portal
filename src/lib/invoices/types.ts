export type LineItem = {
  id: string;
  invoice_id?: string;
  quote_id?: string;
  description: string;
  detail: string | null;
  rate: number;
  quantity: number;
  amount: number;
  sort_order: number;
};

export type Client = {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  contact_person: string | null;
  address: string | null;
  reg_number: string | null;
  vat_number: string | null;
  /** 'arqud' | 'sa_equipment'. Undefined until the business migration is applied. */
  business?: string;
};

export type Invoice = {
  id: string;
  client_id: string;
  invoice_number: string;
  status: "draft" | "pending" | "paid" | "overdue";
  issue_date: string;
  due_date: string;
  subtotal: number;
  vat_rate: number;
  vat_amount: number;
  amount: number;
  total?: number;
  terms: string;
  notes: string | null;
  paid_at: string | null;
  converted_from_quote_id: string | null;
  created_at: string;
  updated_at: string;
  /** 'arqud' | 'sa_equipment'. Undefined until the business migration is applied. */
  business?: string;
};

export type InvoiceWithItems = Invoice & {
  line_items: LineItem[];
  client?: Client;
  clients?: Client;
};

export type Quote = {
  id: string;
  client_id: string;
  quote_number: string;
  status: "draft" | "sent" | "accepted" | "rejected";
  issue_date: string;
  notes: string | null;
  subtotal: number;
  total: number;
  converted_to_invoice_id: string | null;
  created_at: string;
  updated_at: string;
  /** 'arqud' | 'sa_equipment'. Undefined until the business migration is applied. */
  business?: string;
};

export type QuoteWithItems = Quote & {
  line_items: LineItem[];
  client?: Client;
  clients?: Client;
};

export type CreateDocumentInput = {
  clientId: string;
  issueDate: string;
  dueDate?: string;
  terms?: string;
  notes?: string;
  vatRate?: number;
  lineItems: Omit<LineItem, "id" | "invoice_id" | "quote_id">[];
  isDraft?: boolean;
};
