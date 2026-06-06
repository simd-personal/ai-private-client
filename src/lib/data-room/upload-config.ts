export const DATA_ROOM_BUCKET = "private-client-data-room";

export const DATA_ROOM_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export const DATA_ROOM_ALLOWED_MIME_TYPES = new Map<string, string>([
  ["application/pdf", "pdf"],
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/jpg", "jpg"],
  ["image/webp", "webp"],
  ["application/msword", "doc"],
  [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "docx",
  ],
  ["application/vnd.ms-excel", "xls"],
  [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "xlsx",
  ],
]);

export const DATA_ROOM_SIGNED_URL_TTL_SECONDS = 300;
