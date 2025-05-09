export const VALID_FILE_TYPES = {
  // Plain Text
  ".txt": "text/plain",
  ".eml": "message/rfc822",
  ".html": "text/html",
  ".json": "application/json",
  ".md": "text/markdown",
  ".msg": "application/vnd.ms-outlook",
  ".rst": "text/x-rst",
  ".rtf": "application/rtf",
  ".xml": "application/xml",

  // Images
  ".png": "image/png",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".tiff": "image/tiff",
  ".bmp": "image/bmp",
  ".heic": "image/heic",

  // Documents
  ".csv": "text/csv",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".epub": "application/epub+zip",
  ".odt": "application/vnd.oasis.opendocument.text",
  ".pdf": "application/pdf",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".tsv": "text/tab-separated-values",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

  // Audio
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
  ".ogg": "audio/ogg",
  ".oga": "audio/ogg",
  ".opus": "audio/opus",

  // Video
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
} as const;

export const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateFile(file: File): FileValidationResult {
  const fileExtension = `.${file.name.split(".").pop()?.toLowerCase()}`;
  const isValidExtension = fileExtension in VALID_FILE_TYPES;
  const isValidMimeType = Object.values(VALID_FILE_TYPES).includes(file.type as any);

  if (!isValidExtension && !isValidMimeType) {
    return {
      isValid: false,
      error: "Please upload a supported file type",
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: "File size must be less than 500MB",
    };
  }

  return { isValid: true };
}

export async function uploadFile(file: File, tenantSlug: string, userName: string): Promise<void> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("metadata", JSON.stringify({ added_by: userName, source_type: "manual" }));

  const response = await fetch("/api/ragie/upload", {
    method: "POST",
    headers: {
      tenant: tenantSlug,
    },
    body: formData,
  });
  if (!response.ok) {
    throw new Error("Failed to upload file");
  }
}

export function getDropzoneAcceptConfig() {
  return Object.fromEntries(Object.entries(VALID_FILE_TYPES).map(([ext, mime]) => [mime, [ext]]));
}
