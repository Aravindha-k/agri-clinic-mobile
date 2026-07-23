export function generateLocalSyncId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `sync-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function generateLocalPointId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return `pt-${globalThis.crypto.randomUUID()}`;
  }
  return `pt-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function generateLocalPhotoId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return `ph-${globalThis.crypto.randomUUID()}`;
  }
  return `ph-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function generateLocalHeartbeatId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return `hb-${globalThis.crypto.randomUUID()}`;
  }
  return `hb-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function generateLocalOperationId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return `wd-${globalThis.crypto.randomUUID()}`;
  }
  return `wd-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

