/**
 * Visit Detail gallery — mobile contract only.
 * Reads media_files and/or media.images. Does not touch admin attachments.
 */

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

function firstString(...candidates) {
  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function stableIdFromUrl(url, index) {
  let hash = 0;
  const source = url || `idx-${index}`;
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash * 31 + source.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) || index + 1;
}

function urlFromMediaItem(item) {
  if (typeof item === "string") return item.trim() || null;
  const row = asRecord(item);
  if (!row) return null;
  const direct = firstString(
    row.file_url,
    row.url,
    row.file,
    row.image,
    row.media_url,
    row.photo_url,
    row.photo,
    row.path
  );
  if (direct) return direct;
  const fileObj = asRecord(row.file);
  if (fileObj) {
    return firstString(fileObj.url, fileObj.file_url, fileObj.path, fileObj.uri);
  }
  return null;
}

function toGalleryRow(item, index) {
  const file_url = urlFromMediaItem(item);
  if (!file_url) return null;
  const row = asRecord(item);
  const rawId = row ? Number(row.id) : NaN;
  const id = Number.isFinite(rawId) && rawId > 0 ? rawId : stableIdFromUrl(file_url, index);
  return {
    id,
    visit: row && typeof row.visit === "number" ? row.visit : 0,
    attachment_type: "image",
    file_url,
    text_content: null,
    original_filename: row ? firstString(row.original_filename, row.filename, row.name) : null,
    mime_type: row ? firstString(row.mime_type, row.mimeType, row.content_type) : null,
    file_size: row && typeof row.file_size === "number" ? row.file_size : null,
    uploaded_at: (row && firstString(row.uploaded_at, row.created_at)) || new Date().toISOString()
  };
}

function collectMediaArrays(visit) {
  const row = asRecord(visit);
  if (!row) return [];
  const media = asRecord(row.media);
  const buckets = [];
  if (Array.isArray(row.media_files)) buckets.push(row.media_files);
  if (media && Array.isArray(media.images)) buckets.push(media.images);
  if (media && Array.isArray(media.files)) buckets.push(media.files);
  return buckets;
}

/** True when the visit payload includes the canonical mobile gallery fields. */
function visitHasCanonicalGallery(visit) {
  const row = asRecord(visit);
  if (!row) return false;
  if (row.media_files != null) return true;
  const media = asRecord(row.media);
  return Boolean(media && (media.images != null || media.files != null));
}

/**
 * Single gallery source for Visit Detail.
 * Prefers media_files, then media.images. Dedupes by file_url.
 */
function extractVisitGalleryMedia(visit) {
  const seen = new Set();
  const out = [];
  let index = 0;
  for (const bucket of collectMediaArrays(visit)) {
    for (const item of bucket) {
      const row = toGalleryRow(item, index);
      index += 1;
      if (!row || seen.has(row.file_url)) continue;
      seen.add(row.file_url);
      out.push(row);
    }
  }
  return out;
}

module.exports = {
  extractVisitGalleryMedia,
  visitHasCanonicalGallery,
  urlFromMediaItem
};
