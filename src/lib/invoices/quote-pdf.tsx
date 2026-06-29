import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import type { QuoteWithItems } from "@/lib/invoices/types";

Font.register({ family: "Jost", src: "https://fonts.gstatic.com/s/jost/v18/92zPtBhPNqw79Ij1E865zBUv7myjJAVGPokMmuTl.woff2" });

const DARK = "#0D0D12";
const NAVY = "#111520";
const GOLD = "#C8A96E";
const GOLD_LIGHT = "#E2C98A";
const GOLD_DIM = "#9A8058";
const BG = "#FDFBF8";
const BG_ALT = "#F7F3EE";
const BORDER = "#E4DDD0";
const TEXT = "#1A1814";
const TEXT_MID = "#5A5650";
const TEXT_DIM = "#9A9590";
const WHITE = "#FFFFFF";

const S = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 9, backgroundColor: BG, flexDirection: "column", paddingBottom: "14mm" },
  header: { backgroundColor: DARK, padding: "8mm 14mm 7mm", flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  brandName: { fontFamily: "Helvetica-Bold", fontSize: 16, color: GOLD_LIGHT, letterSpacing: 4 },
  brandTag: { fontSize: 7, color: "rgba(200,169,110,0.45)", letterSpacing: 2.5, marginTop: 3 },
  titleBlock: { alignItems: "flex-end" },
  docWord: { fontFamily: "Helvetica-Bold", fontSize: 28, color: WHITE },
  docNum: { fontSize: 8, color: "rgba(200,169,110,0.6)", letterSpacing: 2.5, marginTop: 4 },
  rule: { height: 2, backgroundColor: GOLD },
  metaRow: { backgroundColor: NAVY, flexDirection: "row", paddingHorizontal: "14mm", paddingVertical: "3.5mm" },
  metaItemFirst: { flex: 1, borderRightWidth: 1, borderRightColor: "rgba(200,169,110,0.12)", paddingRight: "8mm", paddingLeft: 0 },
  metaItem: { flex: 1, borderRightWidth: 1, borderRightColor: "rgba(200,169,110,0.12)", paddingRight: "8mm", paddingLeft: "8mm" },
  metaItemLast: { flex: 1, paddingLeft: "8mm" },
  metaKey: { fontSize: 7, color: "rgba(200,169,110,0.5)", letterSpacing: 2, marginBottom: 2 },
  metaVal: { fontFamily: "Helvetica-Bold", fontSize: 10, color: "rgba(253,251,248,0.9)", letterSpacing: 0.5 },
  metaValHighlight: { fontFamily: "Helvetica-BoldOblique", fontSize: 14, color: GOLD_LIGHT },
  body: { padding: "7mm 14mm", flexDirection: "column" },
  partiesRow: { flexDirection: "row", gap: "5mm", marginBottom: "6mm" },
  partyBox: { flex: 1, backgroundColor: WHITE, borderWidth: 1, borderColor: BORDER, borderLeftWidth: 3, borderLeftColor: GOLD, padding: "5mm" },
  partyLabel: { fontSize: 7, letterSpacing: 2.8, color: GOLD_DIM, marginBottom: "4mm", paddingLeft: "4mm" },
  partyName: { fontFamily: "Helvetica-Bold", fontSize: 11, color: DARK, letterSpacing: 0.5, marginBottom: "1.5mm", paddingLeft: "4mm" },
  partyDetail: { fontSize: 8.5, lineHeight: 1.45, color: TEXT_MID, paddingLeft: "4mm" },
  tableHead: { flexDirection: "row", backgroundColor: DARK, paddingHorizontal: "5mm", paddingVertical: "3mm" },
  th: { fontSize: 7, letterSpacing: 2.5, color: "rgba(200,169,110,0.65)" },
  thRight: { fontSize: 7, letterSpacing: 2.5, color: "rgba(200,169,110,0.65)", textAlign: "right" },
  tableRow: { flexDirection: "row", backgroundColor: WHITE, paddingHorizontal: "5mm", paddingVertical: "2.5mm", borderBottomWidth: 1, borderBottomColor: BORDER, alignItems: "center" },
  tdDesc: { fontSize: 10, color: TEXT, letterSpacing: 0.3 },
  tdSub: { fontSize: 8, color: TEXT_DIM, marginTop: 2, letterSpacing: 0.5 },
  tdNum: { flex: 1, fontSize: 10, color: TEXT, textAlign: "right" },
  colDesc: { flex: 3 },
  colNum: { flex: 1, textAlign: "right" },
  totalsBlock: { alignSelf: "flex-end", width: "80mm" },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: "5mm", paddingVertical: "2.5mm", borderBottomWidth: 1, borderBottomColor: BORDER, backgroundColor: WHITE },
  totalsLabel: { fontSize: 8.5, letterSpacing: 1.2, color: TEXT_MID },
  totalsVal: { fontSize: 10, color: TEXT },
  totalsGrandRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: "5mm", paddingVertical: "4mm", backgroundColor: DARK },
  totalsGrandLabel: { fontSize: 8, letterSpacing: 2.5, color: "rgba(200,169,110,0.6)", fontFamily: "Helvetica-Bold" },
  totalsGrandVal: { fontFamily: "Helvetica-BoldOblique", fontSize: 20, color: GOLD_LIGHT },
  vatNote: { alignSelf: "flex-end", paddingRight: "5mm", marginTop: "2mm", marginBottom: "6mm" },
  vatNoteText: { fontSize: 7.5, color: TEXT_DIM, fontFamily: "Helvetica-Oblique" },
  noteBox: { backgroundColor: BG_ALT, borderWidth: 1, borderColor: BORDER, padding: "3.5mm 5mm" },
  noteLabel: { fontSize: 7, letterSpacing: 2.8, color: GOLD_DIM, marginBottom: "2.5mm" },
  noteText: { fontFamily: "Helvetica-Oblique", fontSize: 9.5, lineHeight: 1.45, color: TEXT_MID },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: DARK, paddingHorizontal: "14mm", paddingVertical: "4mm", flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  footerLeft: { fontSize: 7.5, color: "rgba(253,251,248,0.3)", letterSpacing: 1.5 },
  footerRight: { fontSize: 7.5, color: "rgba(200,169,110,0.4)", letterSpacing: 2 },
});

function cur(n: number) {
  return `R ${Number(n).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
}

export function QuotePDF({ quote }: { quote: QuoteWithItems }) {
  const { client, line_items } = quote;
  const sorted = [...(line_items ?? [])].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <Document>
      <Page size="A4" style={S.page}>
        <View style={S.header}>
          <View>
            <Text style={S.brandName}>ARQUD</Text>
            <Text style={S.brandTag}>DIGITAL MARKETING AGENCY</Text>
          </View>
          <View style={S.titleBlock}>
            <Text style={S.docWord}>Quote</Text>
            <Text style={S.docNum}>{quote.quote_number}</Text>
          </View>
        </View>
        <View style={S.rule} />
        <View style={S.metaRow}>
          <View style={S.metaItemFirst}>
            <Text style={S.metaKey}>QUOTE DATE</Text>
            <Text style={S.metaVal}>{fmtDate(quote.issue_date)}</Text>
          </View>
          <View style={S.metaItem}>
            <Text style={S.metaKey}>STATUS</Text>
            <Text style={S.metaVal}>{quote.status.toUpperCase()}</Text>
          </View>
          <View style={S.metaItemLast}>
            <Text style={S.metaKey}>TOTAL (EXCL. VAT)</Text>
            <Text style={S.metaValHighlight}>{cur(quote.total)}</Text>
          </View>
        </View>
        <View style={S.body}>
          <View style={S.partiesRow}>
            <View style={S.partyBox}>
              <Text style={S.partyLabel}>FROM</Text>
              <Text style={S.partyName}>ARQUD (PTY) LTD</Text>
              <Text style={S.partyDetail}>Morne Swanepoel</Text>
              <Text style={S.partyDetail}>Morne@arqud.com</Text>
              <Text style={S.partyDetail}>Reg No: 2025/074398/07</Text>
              <Text style={S.partyDetail}>Tel: +27 60 865 8690</Text>
            </View>
            <View style={S.partyBox}>
              <Text style={S.partyLabel}>PREPARED FOR</Text>
              <Text style={S.partyName}>{client?.company ?? client?.name ?? "—"}</Text>
              {client?.contact_person ? <Text style={S.partyDetail}>Attn: {client.contact_person}</Text> : null}
              <Text style={S.partyDetail}>{client?.email ?? ""}</Text>
              {client?.address ? <Text style={S.partyDetail}>{client.address}</Text> : null}
            </View>
          </View>
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
          <View style={S.totalsBlock}>
            <View style={S.totalsGrandRow}>
              <Text style={S.totalsGrandLabel}>TOTAL</Text>
              <Text style={S.totalsGrandVal}>{cur(quote.total)}</Text>
            </View>
          </View>
          <View style={S.vatNote}>
            <Text style={S.vatNoteText}>VAT (15%) will be added upon invoice conversion.</Text>
          </View>
          {quote.notes ? (
            <View style={S.noteBox}>
              <Text style={S.noteLabel}>NOTES</Text>
              <Text style={S.noteText}>{quote.notes}</Text>
            </View>
          ) : null}
        </View>
        <View style={S.footer} fixed>
          <Text style={S.footerLeft}>Morne@arqud.com · ARQUD (PTY) LTD · Reg: 2025/074398/07</Text>
          <Text style={S.footerRight}>Thank you for your business</Text>
        </View>
      </Page>
    </Document>
  );
}
