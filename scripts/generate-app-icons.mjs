/**
 * Legacy helper — redirects to promote-logo-icons (circular logo.png → launcher only).
 * Prefer: node scripts/promote-logo-icons.mjs
 */
import { promoteLogoIcons } from "./promote-logo-icons.mjs";

await promoteLogoIcons();
