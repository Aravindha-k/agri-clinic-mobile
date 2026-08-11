import type { Visit } from "../api/visits";
import type { VisitAttachment } from "../api/visitAttachments";

export function extractVisitGalleryMedia(visit: unknown): VisitAttachment[];
export function visitHasCanonicalGallery(visit: unknown): boolean;
export function urlFromMediaItem(item: unknown): string | null;
