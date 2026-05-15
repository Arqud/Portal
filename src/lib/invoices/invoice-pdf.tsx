import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { InvoiceWithItems } from "@/lib/invoices/types";

const S = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 9, backgroundColor: "#ffffff", paddingBottom: 36 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", backgroundColor: "#111520", padding: 20 },
  co: { fontFamily: "Helvetica-Bold", fontSize: 16, color: "#c8a96e", letterSpacing: 4 },
  coSub: { fontSize: 7, color: "#6e6e6e", letterSpacing: 2, marginTop: 3 },
  titleBlock: { alignItems: "flex-end" },
  title: { fontFamily: "Helvetica-Bold", fontSize: 22, color: "#f3ecd9" },
  docNum: { fontSize: 9, color: "#c8a96e", marginTop: 4, letterSpacing: 1 },
  infoBar: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#1a1f2e", paddingHorizontal: 20, paddingVertical: 10 },
  infoCol: { flex: 1, borderRightWidth: 1, borderRightColor: "#e5e0d5", paddingRight: 10, paddingLeft: 6 },
  infoColLast: { flex: 1, paddingLeft: 10 },
  infoL: { fontSize: 7, color: "#6e6e6e", letterSpacing: 1, marginBottom: 3 },
  infoV: { fontFamily: "Helvetica-Bold", fontSize: 9, color: "#080808" },
  amtDue: { fontFamily: "Helvetica-BoldOblique", fontSize: 13, color: "#080808" },
  billed: { flexDirection: "row", margin: 18, gap: 12 },
  billedBox: { flex: 1, borderWidth: 1, borderColor: "#e5e0d5", padding: 12 },
  billedL: { fontSize: 7, color: "#6e6e6e", letterSpacing: 1, marginBottom: 6, borderLeftWidth: 2, borderLeftColor: "#c8a96e", paddingLeft: 5 },
  billedName: { fontFamily: "Helvetica-Bold", fontSize: 10, color: "#080808", marginBottom: 3 },
  billedD: { fontSize: 8, color: "#6e6e6e", lineHeight: 1.5 },
  tHead: { flexDirection: "row", backgroundColor: "#111520", marginHorizontal: 18, padding: 8 },
  tHeadT: { fontFamily: "Helvetica-Bold", fontSize: 7, color: "#c8a96e", letterSpacing: 1 },
  cDesc: { flex: 3 },
  cRate: { flex: 1, textAlign: "right" },
  cAmt: { flex: 1, textAlign: "right" },
  tRow: { flexDirection: "row", marginHorizontal: 18, paddingVertical: 8, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: "#f0ece4" },
  lineDesc: { fontFamily: "Helvetica-Bold", fontSize: 9, color: "#080808" },
  lineDet: { fontSize: 7, color: "#6e6e6e", marginTop: 2 },
  lineAmt: { fontSize: 9, color: "#080808", textAlign: "right" },
  totals: { marginHorizontal: 18, marginTop: 10, alignItems: "flex-end" },
  totRow: { flexDirection: "row", width: 200, justifyContent: "space-between", paddingVertical: 3 },
  totL: { fontSize: 8, color: "#6e6e6e", letterSpacing: 1 },
  totV: { fontSize: 9, color: "#080808" },
  totDue: { flexDirection: "row", width: 200, justifyContent: "space-between", backgroundColor: "#111520", padding: 10, marginTop: 4 },
  totDueL: { fontSize: 8, color: "#f3ecd9", letterSpacing: 1 },
  totDueV: { fontFamily: "Helvetica-BoldOblique", fontSize: 13, color: "#c8a96e" },
  foot: { flexDirection: "row", marginHorizontal: 18, marginTop: 20, gap: 12 },
  footBox: { flex: 1, borderWidth: 1, borderColor: "#e5e0d5", padding: 12 },
  footL: { fontSize: 7, color: "#6e6e6e", letterSpacing: 1, marginBottom: 4 },
  footT: { fontSize: 8, color: "#080808", lineHeight: 1.6 },
  footTi: { fontSize: 8, color: "#6e6e6e", fontFamily: "Helvetica-Oblique", lineHeight: 1.6 },
  strip: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", justifyContent: "space-between", backgroundColor: "#080808", paddingHorizontal: 18, paddingVertical: 8 },
  stripT: { fontSize: 7, color: "#6e6e6e" },
});

function cur(n: number) {
  return `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-ZA", { day: "2-digit", month: "long", year: "numeric" });
}

export function InvoicePDF({ invoice, arqudVatNumber }: { invoice: InvoiceWithItems; arqudVatNumber?: string }) {
  const vat = Boolean(arqudVatNumber);
  const { client, line_items } = invoice;
  const sorted = [...line_items].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <Document>
      <Page size="A4" style={S.page}>
        <View style={S.header}>
          <View>
            <Text style={S.co}>A R Q U D</Text>
            <Text style={S.coSub}>DIGITAL MARKETING AGENCY</Text>
          </View>
          <View style={S.titleBlock}>
            <Text style={S.title}>{vat ? "Tax Invoice" : "Invoice"}</Text>
            <Text style={S.docNum}>{invoice.invoice_number}</Text>
          </View>
        </View>

        <View style={S.infoBar}>
          <View style={S.infoCol}>
            <Text style={S.infoL}>INVOICE DATE</Text>
            <Text style={S.infoV}>{fmtDate(invoice.issue_date)}</Text>
          </View>
          <View style={S.infoCol}>
            <Text style={S.infoL}>DUE DATE</Text>
            <Text style={S.infoV}>{fmtDate(invoice.due_date)}</Text>
          </View>
          <View style={S.infoCol}>
            <Text style={S.infoL}>TERMS</Text>
            <Text style={S.infoV}>{invoice.terms}</Text>
          </View>
          <View style={S.infoColLast}>
            <Text style={S.infoL}>AMOUNT DUE</Text>
            <Text style={S.amtDue}>{cur(invoice.amount)}</Text>
          </View>
        </View>

        <View style={S.billed}>
          <View style={S.billedBox}>
            <Text style={S.billedL}>BILLED FROM</Text>
            <Text style={S.billedName}>ARQUD (PTY) LTD</Text>
            <Text style={S.billedD}>Morne Swanepoel</Text>
            <Text style={S.billedD}>Morne@arqud.com</Text>
            <Text style={S.billedD}>Reg No: 2025/074398/07</Text>
            {vat && <Text style={S.billedD}>VAT No: {arqudVatNumber}</Text>}
            <Text style={S.billedD}>Bank: FNB Gold Business</Text>
            <Text style={S.billedD}>Acc: 63195766482</Text>
          </View>
          <View style={S.billedBox}>
            <Text style={S.billedL}>BILLED TO</Text>
            <Text style={S.billedName}>{client.company ?? client.name}</Text>
            {client.contact_person ? <Text style={S.billedD}>{client.contact_person}</Text> : null}
            <Text style={S.billedD}>{client.email}</Text>
            {client.address ? <Text style={S.billedD}>{client.address}</Text> : null}
            {client.reg_number ? <Text style={S.billedD}>Reg No: {client.reg_number}</Text> : null}
            {client.vat_number ? <Text style={S.billedD}>VAT No: {client.vat_number}</Text> : null}
          </View>
        </View>

        <View style={S.tHead}>
          <Text style={[S.tHeadT, S.cDesc]}>DESCRIPTION</Text>
          <Text style={[S.tHeadT, S.cRate]}>RATE</Text>
          <Text style={[S.tHeadT, S.cAmt]}>AMOUNT</Text>
        </View>
        {sorted.map((item, i) => (
          <View key={i} style={S.tRow}>
            <View style={S.cDesc}>
              <Text style={S.lineDesc}>{item.description}</Text>
              {item.detail ? <Text style={S.lineDet}>{item.detail}</Text> : null}
            </View>
            <Text style={[S.lineAmt, S.cRate]}>{cur(item.rate)}</Text>
            <Text style={[S.lineAmt, S.cAmt]}>{cur(item.amount)}</Text>
          </View>
        ))}

        <View style={S.totals}>
          <View style={S.totRow}>
            <Text style={S.totL}>SUBTOTAL</Text>
            <Text style={S.totV}>{cur(invoice.subtotal)}</Text>
          </View>
          <View style={S.totRow}>
            <Text style={S.totL}>VAT ({invoice.vat_rate}%)</Text>
            <Text style={S.totV}>{cur(invoice.vat_amount)}</Text>
          </View>
          <View style={S.totDue}>
            <Text style={S.totDueL}>TOTAL DUE</Text>
            <Text style={S.totDueV}>{cur(invoice.amount)}</Text>
          </View>
        </View>

        <View style={S.foot}>
          <View style={S.footBox}>
            <Text style={S.footL}>BANKING DETAILS</Text>
            <Text style={S.footT}>FNB Gold Business Account</Text>
            <Text style={S.footT}>Account Number: 63195766482</Text>
            <Text style={S.footT}>Branch Code: 255355</Text>
            <Text style={S.footTi}>Reference: {invoice.invoice_number}</Text>
          </View>
          <View style={S.footBox}>
            <Text style={S.footL}>NOTE</Text>
            <Text style={S.footTi}>{invoice.notes ?? "Please use the invoice number as your payment reference. Payment is due within 14 days of invoice date."}</Text>
          </View>
        </View>

        <View style={S.strip}>
          <Text style={S.stripT}>Morne@arqud.com · ARQUD (PTY) LTD · Reg 2025/074398/07</Text>
          <Text style={S.stripT}>THANK YOU FOR YOUR BUSINESS</Text>
        </View>
      </Page>
    </Document>
  );
}
