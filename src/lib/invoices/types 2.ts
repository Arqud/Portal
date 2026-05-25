export type LineItem = {
  id?: string;
  description: string;
  detail?: string;
  rate: number;
  quantity: number;
  amount: number;
  sort_order: number;
};

export type InvoiceStatus = "draft" | "pending" | "paid" | "overdue";
export type QuoteStatus = "draft" | "sent" | "accepted" | "rejected";

export type Client = {
  id: string;
  name: string;
  company: string | null;
  email: string;
  contact_person: string | null;
  address: string | null;
  reg_number: string | null;
  vat_number: string | null;
};

export type InvoiceWithItems = {
  id: string;
  invoice_number: string;
  client_id: string;
  client: Client;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string;
  terms: string;
  notes: string | null;
  subtotal: number;
  vat_rate: number;
  vat_amount: number;
  amount: number;
  paid_at: string | null;
  converted_from_quote_id: string | null;
  line_items: LineItem[];
  created_at: string;
};

export type QuoteWithItems = {
  id: string;
  quote_number: string;
  client_id: string;
  client: Client;
  status: QuoteStatus;
  issue_date: string;
  notes: string | null;
  subtotal: number;
  total: number;
  converted_to_invoice_id: string | null;
  line_items: LineItem[];
  created_at: string;
};

export type CreateInvoiceInput = {
  clientId: string;
  issueDate: string;
  dueDate: string;
  terms: string;
  notes: string;
  vatRate: number;
  lineItems: Omit<LineItem, "id">[];
  isDraft: boolean;
};

export type CreateQuoteInput = {
  clientId: string;
  issueDate: string;
  notes: string;
  lineItems: Omit<LineItem, "id">[];
  isDraft: boolean;
};
