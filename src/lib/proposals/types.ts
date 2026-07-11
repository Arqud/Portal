export type ProposalStatus = "draft" | "sent" | "accepted" | "declined";

export interface ProposalSection {
  heading: string;
  bullets: string[];
}

export interface ProposalLineItem {
  id?: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  sort_order: number;
}

export interface Proposal {
  id: string;
  proposal_number: string;
  client_id: string | null;
  prospect_name: string | null;
  prospect_company: string | null;
  prospect_email: string | null;
  title: string;
  intro: string | null;
  sections: ProposalSection[];
  terms: string | null;
  valid_until: string | null; // ISO date
  status: ProposalStatus;
  share_token: string;
  first_viewed_at: string | null;
  accepted_by_name: string | null;
  accepted_at: string | null;
  accepted_ip: string | null;
  declined_at: string | null;
  decline_reason: string | null;
  converted_to_invoice_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProposalWithItems extends Proposal {
  line_items: ProposalLineItem[];
  client?: { id: string; name: string; company: string | null; email: string | null } | null;
}

// Recipient display everywhere: client?.company ?? client?.name ?? prospect_company ?? prospect_name ?? "—"
