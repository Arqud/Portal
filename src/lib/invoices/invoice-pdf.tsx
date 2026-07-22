import {
  Document, Page, Text, View, StyleSheet, Font,
} from "@react-pdf/renderer";
import type { InvoiceWithItems } from "@/lib/invoices/types";
import { getBusinessTheme, invoiceTitle, type BusinessPalette } from "@/lib/brand/business-theme";

// Register Google Fonts
Font.register({
  family: "Cormorant",
  fonts: [
    { src: "https://fonts.gstatic.com/s/cormorantgaramond/v22/co3YmX5slCNuHLi8bLeY9MK7whWMhyjYqXtK.woff2", fontWeight: 400 },
    { src: "https://fonts.gstatic.com/s/cormorantgaramond/v22/co3bmX5slCNuHLi8bLeY9MK7whWMhyjYrHtPBg.woff2", fontWeight: 500 },
  ],
});
Font.register({
  family: "Jost",
  fonts: [
    { src: "https://fonts.gstatic.com/s/jost/v18/92zPtBhPNqw79Ij1E865zBUv7myjJAVGPokMmuTl.woff2", fontWeight: 300 },
    { src: "https://fonts.gstatic.com/s/jost/v18/92zPtBhPNqw79Ij1E865zBUv7myjJAVGPokMmuTl.woff2", fontWeight: 400 },
    { src: "https://fonts.gstatic.com/s/jost/v18/92zPtBhPNqw79Ij1E865zBUv7myjJAVGPokMmuTl.woff2", fontWeight: 600 },
  ],
});

const WHITE = "#FFFFFF";

function makeStyles(p: BusinessPalette) {
  return StyleSheet.create({
    page: { fontFamily: "Helvetica", fontSize: 9, backgroundColor: p.bg, flexDirection: "column", paddingBottom: "14mm" },
    // Header
    header: { backgroundColor: p.dark, padding: "8mm 14mm 7mm", flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    brandName: { fontFamily: "Helvetica-Bold", fontSize: 16, color: p.goldLight, letterSpacing: 4 },
    brandTag: { fontSize: 7, color: `rgba(${p.accentRGB},0.45)`, letterSpacing: 2.5, marginTop: 3 },
    titleBlock: { alignItems: "flex-end" },
    invoiceWord: { fontFamily: "Helvetica-Bold", fontSize: 28, color: WHITE },
    invoiceNum: { fontSize: 8, color: `rgba(${p.accentRGB},0.6)`, letterSpacing: 2.5, marginTop: 4 },
    // Gold rule
    rule: { height: 2, backgroundColor: p.gold },
    // Meta row
    metaRow: { backgroundColor: p.navy, flexDirection: "row", paddingHorizontal: "14mm", paddingVertical: "3.5mm" },
    metaItem: { flex: 1, borderRightWidth: 1, borderRightColor: `rgba(${p.accentRGB},0.12)`, paddingRight: "8mm", paddingLeft: "8mm" },
    metaItemFirst: { flex: 1, borderRightWidth: 1, borderRightColor: `rgba(${p.accentRGB},0.12)`, paddingRight: "8mm", paddingLeft: 0 },
    metaItemLast: { flex: 1, paddingLeft: "8mm" },
    metaKey: { fontSize: 7, color: `rgba(${p.accentRGB},0.5)`, letterSpacing: 2, marginBottom: 2 },
    metaVal: { fontFamily: "Helvetica-Bold", fontSize: 10, color: `rgba(${p.paperRGB},0.9)`, letterSpacing: 0.5 },
    metaValHighlight: { fontFamily: "Helvetica-BoldOblique", fontSize: 14, color: p.goldLight },
    // Body
    body: { padding: "7mm 14mm", flexDirection: "column" },
    // Parties
    partiesRow: { flexDirection: "row", gap: "5mm", marginBottom: "6mm" },
    partyBox: { flex: 1, backgroundColor: WHITE, borderWidth: 1, borderColor: p.border, borderLeftWidth: 3, borderLeftColor: p.gold, padding: "5mm" },
    partyLabel: { fontSize: 7, letterSpacing: 2.8, color: p.goldDim, marginBottom: "4mm", paddingLeft: "4mm" },
    partyName: { fontFamily: "Helvetica-Bold", fontSize: 11, color: p.dark, letterSpacing: 0.5, marginBottom: "1.5mm", paddingLeft: "4mm" },
    partyDetail: { fontSize: 8.5, lineHeight: 1.45, color: p.textMid, paddingLeft: "4mm" },
    // Table
    tableHead: { flexDirection: "row", backgroundColor: p.dark, paddingHorizontal: "5mm", paddingVertical: "3mm" },
    th: { fontSize: 7, letterSpacing: 2.5, color: `rgba(${p.accentRGB},0.65)` },
    thRight: { fontSize: 7, letterSpacing: 2.5, color: `rgba(${p.accentRGB},0.65)`, textAlign: "right" },
    tableRow: { flexDirection: "row", backgroundColor: WHITE, paddingHorizontal: "5mm", paddingVertical: "2.2mm", borderBottomWidth: 1, borderBottomColor: p.border, alignItems: "center" },
    tdDesc: { fontSize: 10, color: p.text, letterSpacing: 0.3 },
    tdSub: { fontSize: 8, color: p.textDim, marginTop: 2, letterSpacing: 0.5 },
    tdNum: { flex: 1, fontSize: 10, color: p.text, textAlign: "right" },
    colDesc: { flex: 3 },
    colNum: { flex: 1, textAlign: "right" },
    // Totals
    totalsBlock: { alignSelf: "flex-end", width: "80mm" },
    totalsRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: "5mm", paddingVertical: "2.5mm", borderBottomWidth: 1, borderBottomColor: p.border, backgroundColor: WHITE },
    totalsLabel: { fontSize: 8.5, letterSpacing: 1.2, color: p.textMid },
    totalsVal: { fontSize: 10, color: p.text },
    totalsGrandRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: "5mm", paddingVertical: "4mm", backgroundColor: p.dark },
    totalsGrandLabel: { fontSize: 8, letterSpacing: 2.5, color: `rgba(${p.accentRGB},0.6)`, fontFamily: "Helvetica-Bold" },
    totalsGrandVal: { fontFamily: "Helvetica-BoldOblique", fontSize: 20, color: p.goldLight },
    // Banking
    bankingRow: { flexDirection: "row", gap: "5mm", marginTop: "4mm" },
    bankingBox: { flex: 1, backgroundColor: p.bgAlt, borderWidth: 1, borderColor: p.border, padding: "3.5mm 5mm" },
    bankingLabel: { fontSize: 7, letterSpacing: 2.8, color: p.goldDim, marginBottom: "2.5mm" },
    bankingDetail: { fontSize: 8.5, lineHeight: 1.5, color: p.textMid },
    bankingStrong: { fontFamily: "Helvetica-Bold", fontSize: 10, color: p.dark, marginBottom: "1mm" },
    noteBox: { flex: 1, backgroundColor: p.bgAlt, borderWidth: 1, borderColor: p.border, padding: "3.5mm 5mm" },
    noteLabel: { fontSize: 7, letterSpacing: 2.8, color: p.goldDim, marginBottom: "2.5mm" },
    noteText: { fontFamily: "Helvetica-Oblique", fontSize: 9.5, lineHeight: 1.45, color: p.textMid },
    // Footer
    footer: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: p.dark, paddingHorizontal: "14mm", paddingVertical: "4mm", flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    footerLeft: { fontSize: 7.5, color: `rgba(${p.paperRGB},0.3)`, letterSpacing: 1.5 },
    footerRight: { fontSize: 7.5, color: `rgba(${p.accentRGB},0.4)`, letterSpacing: 2, textTransform: "uppercase" },
  });
}

function cur(n: number) {
  return `R ${Number(n).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
}

export function InvoicePDF({ invoice, vatNumber, business }: { invoice: InvoiceWithItems; vatNumber?: string; business?: string }) {
  const theme = getBusinessTheme(business);
  const S = makeStyles(theme.palette);
  const vat = Boolean(vatNumber);
  const { client, line_items } = invoice;
  const sorted = [...(line_items ?? [])].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <Document>
      <Page size="A4" style={S.page}>
        {/* Header */}
        <View style={S.header}>
          <View>
            <Text style={S.brandName}>{theme.brandName}</Text>
            <Text style={S.brandTag}>{theme.brandTag}</Text>
          </View>
          <View style={S.titleBlock}>
            <Text style={S.invoiceWord}>{invoiceTitle(vatNumber)}</Text>
            <Text style={S.invoiceNum}>{invoice.invoice_number}</Text>
          </View>
        </View>

        {/* Gold rule */}
        <View style={S.rule} />

        {/* Meta row */}
        <View style={S.metaRow}>
          <View style={S.metaItemFirst}>
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
          <View style={S.metaItemLast}>
            <Text style={S.metaKey}>AMOUNT DUE</Text>
            <Text style={S.metaValHighlight}>{cur(invoice.amount)}</Text>
          </View>
        </View>

        {/* Body */}
        <View style={S.body}>
          {/* Parties */}
          <View style={S.partiesRow}>
            <View style={S.partyBox}>
              <Text style={S.partyLabel}>BILLED FROM</Text>
              <Text style={S.partyName}>{theme.billedFromName}</Text>
              <View>
                <Text style={S.partyDetail}>Morne Swanepoel</Text>
                <Text style={S.partyDetail}>Morne@arqud.com</Text>
                <Text style={S.partyDetail}>Reg No: 2025/074398/07</Text>
                {vat ? <Text style={S.partyDetail}>VAT No: {vatNumber}</Text> : null}
                <Text style={S.partyDetail}>Tel: +27 60 865 8690</Text>
                <Text style={S.partyDetail}>Bank: FNB Gold Business</Text>
                <Text style={S.partyDetail}>Acc: 63219437109</Text>
              </View>
            </View>
            <View style={S.partyBox}>
              <Text style={S.partyLabel}>BILLED TO</Text>
              <Text style={S.partyName}>{client?.company ?? client?.name ?? "—"}</Text>
              <View>
                {client?.contact_person ? <Text style={S.partyDetail}>Attn: {client.contact_person}</Text> : null}
                <Text style={S.partyDetail}>{client?.email ?? ""}</Text>
                {client?.address ? <Text style={S.partyDetail}>{client.address}</Text> : null}
                {client?.reg_number ? <Text style={S.partyDetail}>Reg No: {client.reg_number}</Text> : null}
                {client?.vat_number ? <Text style={S.partyDetail}>VAT No: {client.vat_number}</Text> : null}
              </View>
            </View>
          </View>

          {/* Line items */}
          <View style={{ marginBottom: "6mm" }}>
            <View style={S.tableHead}>
              <Text style={[S.th, S.colDesc]}>DESCRIPTION</Text>
              <Text style={[S.thRight, S.colNum]}>RATE</Text>
              <Text style={[S.thRight, S.colNum]}>AMOUNT</Text>
            </View>
            {sorted.map((item, i) => (
              <View key={i} style={S.tableRow}>
                <View style={S.colDesc}>
                  <Text style={S.tdDesc}>{item.description}</Text>
                  {item.detail ? <Text style={S.tdSub}>{item.detail}</Text> : null}
                </View>
                <Text style={[S.tdNum, S.colNum]}>{cur(item.rate)}</Text>
                <Text style={[S.tdNum, S.colNum]}>{cur(item.amount)}</Text>
              </View>
            ))}
          </View>

          {/* Totals */}
          <View style={S.totalsBlock}>
            <View style={S.totalsRow}>
              <Text style={S.totalsLabel}>SUBTOTAL</Text>
              <Text style={S.totalsVal}>{cur(invoice.subtotal || invoice.amount)}</Text>
            </View>
            <View style={S.totalsRow}>
              <Text style={S.totalsLabel}>VAT ({invoice.vat_rate ?? 0}%)</Text>
              <Text style={S.totalsVal}>{cur(invoice.vat_amount || 0)}</Text>
            </View>
            <View style={S.totalsGrandRow}>
              <Text style={S.totalsGrandLabel}>TOTAL DUE</Text>
              <Text style={S.totalsGrandVal}>{cur(invoice.amount)}</Text>
            </View>
          </View>

          {/* Banking + Note */}
          <View style={S.bankingRow} wrap={false}>
            <View style={S.bankingBox}>
              <Text style={S.bankingLabel}>BANKING DETAILS</Text>
              <Text style={S.bankingStrong}>FNB Gold Business Account</Text>
              <Text style={S.bankingDetail}>Account Holder: ARQUD (PTY) LTD</Text>
              <Text style={S.bankingDetail}>Account Number: 63219437109</Text>
              <Text style={S.bankingDetail}>Branch Code: 255355</Text>
              <Text style={[S.bankingDetail, { fontFamily: "Helvetica-Oblique" }]}>Reference: {invoice.invoice_number}</Text>
            </View>
            <View style={S.noteBox}>
              <Text style={S.noteLabel}>NOTE</Text>
              <Text style={S.noteText}>
                {invoice.notes ?? "Please use the invoice number as your payment reference. Payment is due within " + (invoice.terms || "14 Days") + " of invoice date."}
              </Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={S.footer} fixed>
          <Text style={S.footerLeft}>{theme.legalFooter}</Text>
          <Text style={S.footerRight}>Thank you for your business</Text>
        </View>
      </Page>
    </Document>
  );
}
