export function getAvatarColors(name = ""): { bg: string; text: string } {
  const first = name.trim()[0]?.toUpperCase() || "A";
  const code = first.charCodeAt(0);
  if (code <= 70) return { bg: "#dcfce7", text: "#14532d" };
  if (code <= 77) return { bg: "#dbeafe", text: "#1e3a5f" };
  if (code <= 83) return { bg: "#ede9fe", text: "#3b0764" };
  return { bg: "#fef9c3", text: "#713f12" };
}

export function avatarInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
