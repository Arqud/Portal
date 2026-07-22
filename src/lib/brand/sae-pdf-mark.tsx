import { View, Text, Svg, Path } from "@react-pdf/renderer";

// SA Equipment brand mark for the dark PDF header (Concept 2 — Modern Wordmark).
// Amber chamfered "SA" block (ink letters knocked out) + white "EQUIPMENT"
// wordmark + amber underscore + tagline. Rendered with vector primitives so it
// is crisp at any scale. Only used on SA Equipment documents; ARQUD is untouched.
export function SaeBrandMark() {
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <View style={{ width: 46, height: 46, position: "relative" }}>
        <Svg width={46} height={46} viewBox="0 0 100 100">
          {/* amber steel plate, top-right corner chamfered (header shows through the cut) */}
          <Path d="M0,3 H74 L97,26 V97 H0 Z" fill="#F5B301" />
        </Svg>
        <Text
          style={{
            position: "absolute",
            top: 12,
            left: 0,
            width: 44,
            textAlign: "center",
            fontFamily: "Helvetica-Bold",
            fontSize: 22,
            letterSpacing: 1,
            color: "#0E1116",
          }}
        >
          SA
        </Text>
      </View>
      <View style={{ marginLeft: 9 }}>
        <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 18, letterSpacing: 1.5, color: "#FFFFFF" }}>
          EQUIPMENT
        </Text>
        <View style={{ height: 3, width: 34, backgroundColor: "#F5B301", marginTop: 3, marginBottom: 3 }} />
        <Text style={{ fontSize: 6, letterSpacing: 1.6, color: "rgba(255,255,255,0.5)" }}>
          MACHINERY DEALER · SOUTH AFRICA
        </Text>
      </View>
    </View>
  );
}
