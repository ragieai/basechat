export type SourceMetadata = {
  source_type: string;
  file_path: string;
  source_url: string;
  documentId: string;
  documentName: string;
  streamUrl?: string;
  downloadUrl?: string;
  startTime?: number;
  endTime?: number;
};
