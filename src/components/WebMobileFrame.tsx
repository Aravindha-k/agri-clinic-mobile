import { useEffect, type ReactNode } from "react";
import { Platform, StyleSheet, View } from "react-native";

/** Typical phone width for web dev preview (iPhone 14 / common Android). */
const MOBILE_WIDTH = 390;

type Props = {
  children: ReactNode;
};

/**
 * On web, centers the app in a phone-width column instead of stretching full browser width.
 * Native builds are unchanged.
 */
export function WebMobileFrame({ children }: Props) {
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyMargin = body.style.margin;
    const prevBodyBg = body.style.backgroundColor;
    html.style.overflow = "hidden";
    html.style.height = "100%";
    body.style.overflow = "hidden";
    body.style.margin = "0";
    body.style.height = "100%";
    body.style.backgroundColor = "#0f172a";
    return () => {
      html.style.overflow = prevHtmlOverflow;
      html.style.height = "";
      body.style.overflow = prevBodyOverflow;
      body.style.margin = prevBodyMargin;
      body.style.height = "";
      body.style.backgroundColor = prevBodyBg;
    };
  }, []);

  if (Platform.OS !== "web") {
    return <>{children}</>;
  }

  return (
    <View style={styles.canvas}>
      <View style={styles.phone}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    alignItems: "center",
    backgroundColor: "#0f172a",
    flex: 1,
    height: "100%",
    justifyContent: "center",
    width: "100%"
  },
  phone: {
    backgroundColor: "#F8FAFC",
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 28,
    borderWidth: 1,
    flex: 1,
    maxWidth: "100%",
    overflow: "hidden",
    width: MOBILE_WIDTH
  }
});
