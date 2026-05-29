import { StyleSheet, TextStyle, ViewStyle } from "react-native";
import { fontWeights } from "./fontWeights";

/** Shared list-card typography — use across farmers, visits, and stats. */
export const listCardType = {
  title: {
    fontSize: 15,
    fontWeight: fontWeights.heavy,
    lineHeight: 20
  } as TextStyle,
  meta: {
    fontSize: 13,
    fontWeight: fontWeights.semibold,
    lineHeight: 18
  } as TextStyle,
  caption: {
    fontSize: 12,
    fontWeight: fontWeights.semibold,
    lineHeight: 16
  } as TextStyle,
  metric: {
    fontSize: 22,
    fontWeight: fontWeights.heavy,
    lineHeight: 26
  } as TextStyle
} as const;

export const listCardLayout = {
  avatarSize: 38,
  padding: 12,
  radius: 14,
  gap: 8,
  listGap: 10,
  iconSize: 14
} as const;

export const listCardStyles = StyleSheet.create({
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: listCardLayout.gap
  },
  avatar: {
    alignItems: "center",
    borderRadius: 12,
    height: listCardLayout.avatarSize,
    justifyContent: "center",
    width: listCardLayout.avatarSize
  },
  avatarText: {
    fontSize: 15,
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
    marginTop: 4
  },
  cardShell: {
    borderRadius: listCardLayout.radius,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    overflow: "hidden"
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
    padding: listCardLayout.padding
  },
  accent: {
    width: 4
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12
  },
  actionBtn: {
    alignItems: "center",
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    paddingVertical: 9
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
