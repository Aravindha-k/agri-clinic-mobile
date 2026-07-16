/**
 * Plain JS WCAG contrast helpers for Node 20 CI (no TypeScript / strip-types).
 */

function parseHex(hex) {
  const raw = String(hex).trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  return {
    r: Number.parseInt(raw.slice(0, 2), 16),
    g: Number.parseInt(raw.slice(2, 4), 16),
    b: Number.parseInt(raw.slice(4, 6), 16)
  };
}

function channelToLinear(c8) {
  const c = c8 / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Relative luminance per WCAG 2.x (sRGB). */
export function relativeLuminance(hex) {
  const { r, g, b } = parseHex(hex);
  return (
    0.2126 * channelToLinear(r) + 0.7152 * channelToLinear(g) + 0.0722 * channelToLinear(b)
  );
}

/** Contrast ratio of two hex colors (order-independent). */
export function contrastRatio(foregroundHex, backgroundHex) {
  const l1 = relativeLuminance(foregroundHex);
  const l2 = relativeLuminance(backgroundHex);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Extract a `#RRGGBB` token assignment from theme source, e.g. `text4: "#5B6B7A"`.
 */
export function extractHexToken(source, tokenName) {
  const re = new RegExp(`\\b${tokenName}\\s*:\\s*["'\`]?(#[0-9A-Fa-f]{6})["'\`]?`);
  const match = source.match(re);
  if (!match) {
    throw new Error(`Token ${tokenName} hex not found`);
  }
  return match[1].toUpperCase();
}

/**
 * Assert Semantic.textMutedReadable delegates to Colors.textMutedReadable (or same hex).
 */
export function assertSemanticMutedReadable(source) {
  const delegates =
    /textMutedReadable\s*:\s*Colors\.textMutedReadable/.test(source) ||
    /textMutedReadable\s*:\s*Colors\.text4/.test(source);
  if (!delegates) {
    throw new Error(
      "Semantic.textMutedReadable must delegate to Colors.textMutedReadable or Colors.text4"
    );
  }
}
