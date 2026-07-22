import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { InvoiceWithItems } from "@/lib/invoices/types";
import { getBusinessTheme, invoiceTitle } from "@/lib/brand/business-theme";
import { SaeBrandMark } from "@/lib/brand/sae-pdf-mark";

// SA Equipment invoice — light/cream premium, purpose-built to read fresh and
// clean: generous whitespace, hairline dividers instead of boxes, amber used with
// restraint, and a single dark accent (the total). ARQUD uses its own dark
// InvoicePDF and is untouched by this file.

const CREAM = "#F7F4EE";
const INK = "#0E1116";
const INK_SOFT = "#3B424B";
const MUTED = "#8C8578";
const STEEL = "#59606B";
const AMBER = "#F5B301";
const AMBER_INK = "#8A6410";
const HAIR = "#E6DDCB";

const S = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 9, backgroundColor: CREAM, color: INK, paddingTop: "15mm", paddingHorizontal: "15mm", paddingBottom: "22mm" },

  // Header
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10mm" },
  title: { fontFamily: "Helvetica-Bold", fontSize: 26, color: INK, letterSpacing: 0.5 },
  num: { fontSize: 8.5, color: AMBER_INK, letterSpacing: 2.5, marginTop: 5, textAlign: "right" },

  // Meta strip (no band, no dividers — just air + one hairline top & bottom)
  metaWrap: { borderTopWidth: 1, borderTopColor: HAIR, borderBottomWidth: 1, borderBottomColor: HAIR, flexDirection: "row", paddingVertical: "4mm", marginBottom: "9mm" },
  metaItem: { flex: 1 },
  metaKey: { fontSize: 6.5, letterSpacing: 1.8, color: MUTED, marginBottom: 3 },
  metaVal: { fontFamily: "Helvetica-Bold", fontSize: 10.5, color: INK },
  metaValAmt: { fontFamily: "Helvetica-Bold", fontSize: 12.5, color: INK },

  // Parties (no boxes)
  parties: { flexDirection: "row", gap: "12mm", marginBottom: "10mm" },
  party: { flex: 1 },
  partyLabel: { fontSize: 6.5, letterSpacing: 2.2, color: AMBER_INK, marginBottom: "3mm" },
  partyName: { fontFamily: "Helvetica-Bold", fontSize: 11.5, color: INK, marginBottom: "2mm" },
  partyDetail: { fontSize: 9, lineHeight: 1.55, color: STEEL },

  // Line items
  tHead: { flexDirection: "row", borderBottomWidth: 1.4, borderBottomColor: INK, paddingBottom: "2.5mm", marginBottom: "1mm" },
  th: { fontSize: 6.5, letterSpacing: 1.8, color: MUTED },
  thRight: { fontSize: 6.5, letterSpacing: 1.8, color: MUTED, textAlign: "right" },
  row: { flexDirection: "row", alignItems: "flex-start", paddingVertical: "3mm", borderBottomWidth: 1, borderBottomColor: HAIR },
  tdDesc: { fontSize: 10.5, color: INK },
  tdSub: { fontSize: 8, color: MUTED, marginTop: 2 },
  tdNum: { fontSize: 10, color: INK_SOFT, textAlign: "right" },
  colDesc: { flex: 3 },
  colNum: { flex: 1.2, textAlign: "right" },

  // Totals
  totals: { alignSelf: "flex-end", width: "70mm", marginTop: "5mm" },
  subRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: "1.5mm" },
  subLabel: { fontSize: 9.5, color: STEEL },
  subVal: { fontSize: 9.5, color: INK },
  totalBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: INK, borderRadius: 2, paddingVertical: "4mm", paddingHorizontal: "5mm", marginTop: "2.5mm" },
  totalLabel: { fontSize: 8, letterSpacing: 2, color: "rgba(247,244,238,0.7)", fontFamily: "Helvetica-Bold" },
  totalVal: { fontFamily: "Helvetica-Bold", fontSize: 15, color: AMBER },

  // Lower (banking + note)
  lower: { flexDirection: "row", gap: "12mm", marginTop: "12mm", borderTopWidth: 1, borderTopColor: HAIR, paddingTop: "6mm" },
  lowerCol: { flex: 1 },
  lowerLabel: { fontSize: 6.5, letterSpacing: 2.2, color: AMBER_INK, marginBottom: "3mm" },
  lowerStrong: { fontFamily: "Helvetica-Bold", fontSize: 10, color: INK, marginBottom: "1.5mm" },
  lowerDetail: { fontSize: 9, lineHeight: 1.6, color: STEEL },
  ref: { fontFamily: "Helvetica-Oblique", color: MUTED },
  note: { fontFamily: "Helvetica-Oblique", fontSize: 9, lineHeight: 1.55, color: STEEL },

  // Footer (light — a hairline + a quiet legal line, no dark bar)
  footer: { position: "absolute", bottom: "12mm", left: "15mm", right: "15mm", borderTopWidth: 1, borderTopColor: HAIR, paddingTop: "3mm", flexDirection: "row", justifyContent: "space-between" },
  footerLegal: { fontSize: 7.5, color: STEEL, letterSpacing: 0.4 },
  footerThanks: { fontSize: 7.5, color: AMBER_INK, letterSpacing: 1.5 },
});

function cur(n: number) {
  return `R ${Number(n).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
}

export function SaeInvoicePDF({ invoice, vatNumber }: { invoice: InvoiceWithItems; vatNumber?: string }) {
  const theme = getBusinessTheme("sa_equipment");
  const vat = Boolean(vatNumber);
  const { client, line_items } = invoice;
  const sorted = [...(line_items ?? [])].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <Document>
      <Page size="A4" style={S.page}>
        {/* Header */}
        <View style={S.header}>
          <SaeBrandMark />
          <View>
            <Text style={S.title}>{invoiceTitle(vatNumber)}</Text>
            <Text style={S.num}>{invoice.invoice_number}</Text>
          </View>
        </View>

        {/* Meta */}
        <View style={S.metaWrap}>
          <View style={S.metaItem}>
            <Text style={S.metaKey}>INVOICE DATE</Text>
            <Text style={S.metaVal}>{fmtDate(invoice.issue_date)}</Text>
          </View>
          <View style={S.metaItem}>
            <Text style={S.metaKey}>DUE DATE</Text>
            <Text style={S.metaVal}>{fmtDate(invoice.due_date)}</Text>
          </View>
          <View style={S.metaItem}>
            <Text style={S.metaKey}>TERMS</Text>
            <Text style={S.metaVal}>{invoice.terms}</Text>
          </View>
          <View style={S.metaItem}>
            <Text style={S.metaKey}>AMOUNT DUE</Text>
            <Text style={S.metaValAmt}>{cur(invoice.amount)}</Text>
          </View>
        </View>

        {/* Parties */}
        <View style={S.parties}>
          <View style={S.party}>
            <Text style={S.partyLabel}>BILLED FROM</Text>
            <Text style={S.partyName}>{theme.billedFromName}</Text>
            <Text style={S.partyDetail}>Morne Swanepoel</Text>
            <Text style={S.partyDetail}>Morne@arqud.com · +27 60 865 8690</Text>
            <Text style={S.partyDetail}>Reg No: 2025/074398/07{vat ? ` · VAT No: ${vatNumber}` : ""}</Text>
          </View>
          <View style={S.party}>
            <Text style={S.partyLabel}>BILLED TO</Text>
            <Text style={S.partyName}>{client?.company ?? client?.name ?? "—"}</Text>
            {client?.contact_person ? <Text style={S.partyDetail}>Attn: {client.contact_person}</Text> : null}
            <Text style={S.partyDetail}>{client?.email ?? ""}</Text>
            {client?.address ? <Text style={S.partyDetail}>{client.address}</Text> : null}
          </View>
        </View>

        {/* Line items */}
        <View style={S.tHead}>
          <Text style={[S.th, S.colDesc]}>DESCRIPTION</Text>
          <Text style={[S.thRight, S.colNum]}>RATE</Text>
          <Text style={[S.thRight, S.colNum]}>AMOUNT</Text>
        </View>
        {sorted.map((item, i) => (
          <View key={i} style={S.row}>
            <View style={S.colDesc}>
              <Text style={S.tdDesc}>{item.description}</Text>
              {item.detail ? <Text style={S.tdSub}>{item.detail}</Text> : null}
            </View>
            <Text style={[S.tdNum, S.colNum]}>{cur(item.rate)}</Text>
            <Text style={[S.tdNum, S.colNum]}>{cur(item.amount)}</Text>
          </View>
        ))}

        {/* Totals */}
        <View style={S.totals}>
          <View style={S.subRow}>
            <Text style={S.subLabel}>Subtotal</Text>
            <Text style={S.subVal}>{cur(invoice.subtotal || invoice.amount)}</Text>
          </View>
          {vat ? (
            <View style={S.subRow}>
              <Text style={S.subLabel}>VAT ({invoice.vat_rate ?? 0}%)</Text>
              <Text style={S.subVal}>{cur(invoice.vat_amount || 0)}</Text>
            </View>
          ) : null}
          <View style={S.totalBar}>
            <Text style={S.totalLabel}>TOTAL DUE</Text>
            <Text style={S.totalVal}>{cur(invoice.amount)}</Text>
          </View>
        </View>

        {/* Banking + note */}
        <View style={S.lower} wrap={false}>
          <View style={S.lowerCol}>
            <Text style={S.lowerLabel}>BANKING DETAILS</Text>
            <Text style={S.lowerStrong}>FNB Gold Business Account</Text>
            <Text style={S.lowerDetail}>Account Holder: ARQUD (PTY) LTD</Text>
            <Text style={S.lowerDetail}>Account Number: 63219437109</Text>
            <Text style={S.lowerDetail}>Branch Code: 255355</Text>
            <Text style={[S.lowerDetail, S.ref]}>Reference: {invoice.invoice_number}</Text>
          </View>
          <View style={S.lowerCol}>
            <Text style={S.lowerLabel}>NOTE</Text>
            <Text style={S.note}>
              {invoice.notes ?? `Please use the invoice number as your payment reference. Payment is due within ${invoice.terms || "14 Days"} of invoice date.`}
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={S.footer} fixed>
          <Text style={S.footerLegal}>{theme.legalFooter}</Text>
          <Text style={S.footerThanks}>THANK YOU</Text>
        </View>
      </Page>
    </Document>
  );
}
