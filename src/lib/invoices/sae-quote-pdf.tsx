import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { QuoteWithItems } from "@/lib/invoices/types";
import { getBusinessTheme } from "@/lib/brand/business-theme";
import { SaeBrandMark } from "@/lib/brand/sae-pdf-mark";

// SA Equipment quotation — light/cream premium, matching the clean SaeInvoicePDF:
// whitespace, hairlines, one dark accent (the total). ARQUD is untouched.

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
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10mm" },
  title: { fontFamily: "Helvetica-Bold", fontSize: 26, color: INK, letterSpacing: 0.5 },
  num: { fontSize: 8.5, color: AMBER_INK, letterSpacing: 2.5, marginTop: 5, textAlign: "right" },
  metaWrap: { borderTopWidth: 1, borderTopColor: HAIR, borderBottomWidth: 1, borderBottomColor: HAIR, flexDirection: "row", paddingVertical: "4mm", marginBottom: "9mm" },
  metaItem: { flex: 1 },
  metaKey: { fontSize: 6.5, letterSpacing: 1.8, color: MUTED, marginBottom: 3 },
  metaVal: { fontFamily: "Helvetica-Bold", fontSize: 10.5, color: INK },
  metaValAmt: { fontFamily: "Helvetica-Bold", fontSize: 12.5, color: INK },
  parties: { flexDirection: "row", gap: "12mm", marginBottom: "10mm" },
  party: { flex: 1 },
  partyLabel: { fontSize: 6.5, letterSpacing: 2.2, color: AMBER_INK, marginBottom: "3mm" },
  partyName: { fontFamily: "Helvetica-Bold", fontSize: 11.5, color: INK, marginBottom: "2mm" },
  partyDetail: { fontSize: 9, lineHeight: 1.55, color: STEEL },
  tHead: { flexDirection: "row", borderBottomWidth: 1.4, borderBottomColor: INK, paddingBottom: "2.5mm", marginBottom: "1mm" },
  th: { fontSize: 6.5, letterSpacing: 1.8, color: MUTED },
  thRight: { fontSize: 6.5, letterSpacing: 1.8, color: MUTED, textAlign: "right" },
  row: { flexDirection: "row", alignItems: "flex-start", paddingVertical: "3mm", borderBottomWidth: 1, borderBottomColor: HAIR },
  tdDesc: { fontSize: 10.5, color: INK },
  tdSub: { fontSize: 8, color: MUTED, marginTop: 2 },
  tdNum: { fontSize: 10, color: INK_SOFT, textAlign: "right" },
  colDesc: { flex: 3 },
  colNum: { flex: 1.2, textAlign: "right" },
  totals: { alignSelf: "flex-end", width: "70mm", marginTop: "5mm" },
  totalBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: INK, borderRadius: 2, paddingVertical: "4mm", paddingHorizontal: "5mm" },
  totalLabel: { fontSize: 8, letterSpacing: 2, color: "rgba(247,244,238,0.7)", fontFamily: "Helvetica-Bold" },
  totalVal: { fontFamily: "Helvetica-Bold", fontSize: 15, color: AMBER },
  validity: { marginTop: "8mm", fontSize: 9, lineHeight: 1.6, color: STEEL },
  validityStrong: { fontFamily: "Helvetica-Bold", color: INK },
  lower: { marginTop: "10mm", borderTopWidth: 1, borderTopColor: HAIR, paddingTop: "6mm" },
  lowerLabel: { fontSize: 6.5, letterSpacing: 2.2, color: AMBER_INK, marginBottom: "3mm" },
  note: { fontFamily: "Helvetica-Oblique", fontSize: 9, lineHeight: 1.55, color: STEEL },
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

export function SaeQuotePDF({ quote }: { quote: QuoteWithItems }) {
  const theme = getBusinessTheme("sa_equipment");
  const { client, line_items } = quote;
  const sorted = [...(line_items ?? [])].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <Document>
      <Page size="A4" style={S.page}>
        <View style={S.header}>
          <SaeBrandMark />
          <View>
            <Text style={S.title}>Quotation</Text>
            <Text style={S.num}>{quote.quote_number}</Text>
          </View>
        </View>

        <View style={S.metaWrap}>
          <View style={S.metaItem}>
            <Text style={S.metaKey}>QUOTE DATE</Text>
            <Text style={S.metaVal}>{fmtDate(quote.issue_date)}</Text>
          </View>
          <View style={S.metaItem}>
            <Text style={S.metaKey}>VALID FOR</Text>
            <Text style={S.metaVal}>14 days</Text>
          </View>
          <View style={S.metaItem}>
            <Text style={S.metaKey}>STATUS</Text>
            <Text style={S.metaVal}>{quote.status.toUpperCase()}</Text>
          </View>
          <View style={S.metaItem}>
            <Text style={S.metaKey}>QUOTED TOTAL</Text>
            <Text style={S.metaValAmt}>{cur(quote.total)}</Text>
          </View>
        </View>

        <View style={S.parties}>
          <View style={S.party}>
            <Text style={S.partyLabel}>FROM</Text>
            <Text style={S.partyName}>{theme.billedFromName}</Text>
            <Text style={S.partyDetail}>Morne Swanepoel</Text>
            <Text style={S.partyDetail}>Morne@arqud.com · +27 60 865 8690</Text>
            <Text style={S.partyDetail}>Reg No: 2025/074398/07</Text>
          </View>
          <View style={S.party}>
            <Text style={S.partyLabel}>PREPARED FOR</Text>
            <Text style={S.partyName}>{client?.company ?? client?.name ?? "—"}</Text>
            {client?.contact_person ? <Text style={S.partyDetail}>Attn: {client.contact_person}</Text> : null}
            <Text style={S.partyDetail}>{client?.email ?? ""}</Text>
            {client?.address ? <Text style={S.partyDetail}>{client.address}</Text> : null}
          </View>
        </View>

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

        <View style={S.totals}>
          <View style={S.totalBar}>
            <Text style={S.totalLabel}>TOTAL</Text>
            <Text style={S.totalVal}>{cur(quote.total)}</Text>
          </View>
        </View>

        <Text style={S.validity}>
          <Text style={S.validityStrong}>This quotation is valid for 14 days</Text> from the date above. Prices are subject to stock availability and confirmed at the time of order. Machinery is offered subject to prior sale.
        </Text>

        {quote.notes ? (
          <View style={S.lower} wrap={false}>
            <Text style={S.lowerLabel}>NOTES</Text>
            <Text style={S.note}>{quote.notes}</Text>
          </View>
        ) : null}

        <View style={S.footer} fixed>
          <Text style={S.footerLegal}>{theme.legalFooter}</Text>
          <Text style={S.footerThanks}>THANK YOU</Text>
        </View>
      </Page>
    </Document>
  );
}
