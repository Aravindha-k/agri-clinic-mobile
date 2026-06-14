import { StyleSheet, TextStyle, ViewStyle } from "react-native";
import { fontWeights } from "./fontWeights";

/** Shared list-card typography — farmers, visits, home recent activity. */
export const listCardType = {
  title: {
    fontSize: 16,
    fontWeight: fontWeights.heavy,
    lineHeight: 22
  } as TextStyle,
  meta: {
    fontSize: 13,
    fontWeight: fontWeights.medium,
    lineHeight: 18
  } as TextStyle,
  caption: {
    fontSize: 12,
    fontWeight: fontWeights.semibold,
    lineHeight: 16
  } as TextStyle,
  metric: {
    fontSize: 20,
    fontWeight: fontWeights.heavy,
    lineHeight: 24
  } as TextStyle
} as const;

export const listCardLayout = {
  avatarSize: 44,
  padding: 14,
  radius: 16,
  gap: 12,
  listGap: 12,
  iconSize: 15
} as const;

export const listCardStyles = StyleSheet.create({
  row: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: listCardLayout.gap
  },
  avatar: {
    alignItems: "center",
    borderRadius: 14,
    height: listCardLayout.avatarSize,
    justifyContent: "center",
    width: listCardLayout.avatarSize
  },
  avatarText: {
    fontSize: 17,
    fontWeight: fontWeights.heavy
  },
  body: {
    flex: 1,
    minWidth: 0
  },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    marginTop: 6
  },
  dateLine: {
    marginTop: 4
  },
  cardShell: {
    borderRadius: listCardLayout.radius,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden"
  },
  cardBody: {
    padding: listCardLayout.padding
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth
  },
  actionBtn: {
    alignItems: "center",
    borderRadius: 10,
    flex: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: 10
  },
  footerRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12
  }
});

export function listCardShellStyle(backgroundColor: string, borderColor: string): ViewStyle {
  return {
    backgroundColor,
    borderColor,
    borderRadius: listCardLayout.radius,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden"
  };
}
