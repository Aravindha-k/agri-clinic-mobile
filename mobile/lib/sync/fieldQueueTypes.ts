/** Shared offline queue record shapes for field sync. */

export type QueueSyncStatus = "pending" | "syncing" | "synced" | "failed" | "quarantined";

export type QueueOwnerFields = {
  user_id?: number;
  device_session_id?: string;
  created_at: string;
  updated_at?: string;
};

export type PendingVisitStatus = "pending" | "syncing" | "failed" | "quarantined";

export type PendingVisitPhoto = {
  local_photo_id: string;
  visit_local_sync_id: string;
  user_id?: number;
  persistent_file_uri: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  checksum?: string;
  upload_status: QueueSyncStatus;
  retry_count: number;
  last_error?: string;
  server_photo_id?: number;
  created_at: string;
};

export type PendingVisit = QueueOwnerFields & {
  local_sync_id: string;
  payload: Record<string, unknown>;
  attempts: number;
  status: PendingVisitStatus;
  farmer_name: string;
  crop_name: string;
  last_error?: string;
  local_workday_id?: string;
  server_workday_id?: number;
  /** Durable photo metadata — preferred over cache URIs in __pending_attachments. */
  pending_photos?: PendingVisitPhoto[];
};

export type PendingGPSPoint = QueueOwnerFields & {
  local_point_id: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number | null;
  heading: number | null;
  battery_level: number;
  duty_session_id?: number;
  server_workday_id?: number;
  local_workday_id?: string;
  recorded_at: string;
  network_type: string;
  sync_status?: QueueSyncStatus;
  retry_count?: number;
  last_error?: string;
  failure_code?: string;
};

export type WorkdayOperationType = "end";

export type PendingWorkdayOperation = QueueOwnerFields & {
  local_operation_id: string;
  local_workday_id?: string;
  server_workday_id?: number;
  server_duty_session_id?: number;
  operation: WorkdayOperationType;
  timestamp: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  status: QueueSyncStatus;
  retry_count: number;
  last_error?: string;
};

export type QuarantinedQueueRecord = {
  id: string;
  queue: "visits" | "gps" | "photos" | "workday";
  reason: string;
  created_at: string;
  payload: unknown;
};

export type GpsBulkFailedItem = {
  index?: number;
  local_point_id?: string;
  client_point_id?: string;
  code: string;
  message: string;
  retryable?: boolean;
};

export type GpsBulkAckPayload = {
  success_count: number;
  failed_count: number;
  accepted_ids?: string[];
  failed_items?: GpsBulkFailedItem[];
};
