import { StyleSheet, Text, View } from "react-native";
import { BRAND_COLORS } from "../../config/brand";
import { CompanyLogo } from "../brand/CompanyLogo";
import {
  buildEvidenceFooterContent,
  type EvidenceFooterContent
} from "../../utils/evidencePhotoFooter";
import type { EvidenceStampMeta } from "../../utils/visitPhotoWatermark";

type Props = {
  width: number;
  height: number;
  meta: EvidenceStampMeta;
  /** 1 = full capture resolution; lower values scale typography for on-screen preview. */
  scale?: number;
};

function scaled(size: number, scale: number) {
  return Math.max(8, Math.round(size * scale));
}

export function EvidencePhotoFooter({ width, height, meta, scale = 1 }: Props) {
  const content = buildEvidenceFooterContent(meta);
  const pad = scaled(16, scale);
  const logoSize = scaled(52, scale);
  const brandGap = scaled(6, scale);
  const brandWidth = scaled(88, scale);

  return (
    <View style={[styles.root, { width, height, paddingHorizontal: pad, paddingVertical: pad }]}>
      <View style={styles.separator} />
      <View style={styles.row}>
        <View style={[styles.brandCol, { width: brandWidth }]}>
          <CompanyLogo size={logoSize} />
          <Text style={[styles.brandLine, { fontSize: scaled(9, scale), marginTop: brandGap }]}>
            KAVYA
          </Text>
          <Text style={[styles.brandLine, { fontSize: scaled(9, scale) }]}>AGRI CLINIC</Text>
        </View>
        <View style={styles.metaCol}>
          <FooterMeta content={content} scale={scale} />
        </View>
      </View>
    </View>
  );
}

function FooterMeta({ content, scale }: { content: EvidenceFooterContent; scale: number }) {
  const dateSize = scaled(15, scale);
  const bodySize = scaled(13, scale);
  const lineHeight = scaled(18, scale);

  return (
    <>
      <Text style={[styles.dateTime, { fontSize: dateSize, lineHeight: lineHeight + 2 }]}>
        {content.dateTime}
      </Text>
      {content.locationLines.map((line, index) => (
        <Text
          key={`loc-${index}`}
          style={[styles.location, { fontSize: bodySize, lineHeight }]}
          numberOfLines={3}
        >
          {index === 0 && !content.usesCoordinates ? "📍 " : ""}
          {line}
        </Text>
      ))}
      {content.employeeLine ? (
        <Text style={[styles.employee, { fontSize: bodySize, lineHeight }]} numberOfLines={2}>
          {content.employeeLine}
        </Text>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: "#FAFCFA",
    justifyContent: "flex-start"
  },
  separator: {
    backgroundColor: "#C9A227",
    height: 2,
    marginBottom: 12,
    width: "100%"
  },
  row: {
    flex: 1,
    flexDirection: "row",
    gap: 10
  },
  brandCol: {
    alignItems: "center",
    justifyContent: "flex-start"
  },
  brandLine: {
    color: BRAND_COLORS.secondary,
    fontWeight: "800",
    letterSpacing: 0.6,
    textAlign: "center"
  },
  metaCol: {
    flex: 1,
    justifyContent: "center",
    minWidth: 0
  },
  dateTime: {
    color: BRAND_COLORS.secondary,
    fontWeight: "800",
    marginBottom: 4
  },
  location: {
    color: "#1F2937",
    fontWeight: "600",
    marginTop: 2
  },
  employee: {
    color: "#374151",
    fontWeight: "700",
    marginTop: 6
  }
});
