import { View, Text, Svg, Path } from "@react-pdf/renderer";

// SA Equipment brand mark for the LIGHT (cream) PDF header — the Concept 2 primary
// lockup drawn with native react-pdf vector + text so it renders reliably in every
// viewer (no embedded image). Ink plate + amber chamfer + white "SA" knocked out,
// beside the ink "EQUIPMENT" wordmark, amber underscore and tagline. Only rendered
// on SA Equipment documents; ARQUD is untouched.
export function SaeBrandMark() {
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <View style={{ width: 48, height: 48, position: "relative" }}>
        <Svg width={48} height={48} viewBox="0 0 100 100">
          {/* amber chamfer cut (top-right corner) */}
          <Path d="M78,0 H100 V22 Z" fill="#F5B301" />
          {/* ink plate */}
          <Path d="M0,0 H78 L100,22 V100 H0 Z" fill="#0E1116" />
        </Svg>
        <Text
          style={{
            position: "absolute",
            top: 13,
            left: 0,
            width: 48,
            textAlign: "center",
            fontFamily: "Helvetica-Bold",
            fontSize: 23,
            letterSpacing: 1,
            color: "#F5F6F7",
          }}
        >
          SA
        </Text>
      </View>
      <View style={{ marginLeft: 10 }}>
        <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 19, letterSpacing: 1, color: "#0E1116" }}>
          EQUIPMENT
        </Text>
        <View style={{ height: 3, width: 34, backgroundColor: "#F5B301", marginTop: 3, marginBottom: 3 }} />
        <Text style={{ fontSize: 6, letterSpacing: 1.6, color: "#6B7280" }}>HEAVY MACHINERY DEALER</Text>
      </View>
    </View>
  );
}
