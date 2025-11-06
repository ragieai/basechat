export type SourceMetadata = {
  source_type: string;
  file_path: string;
  source_url: string;
  documentId: string;
  documentName: string;
  streamUrl?: string;
  downloadUrl?: string;
  documentStreamUrl?: string;
  startTime?: number;
  endTime?: number;
  imageUrl?: string;
  startPage?: number;
  endPage?: number;
  mergedRanges?: { startPage: number; endPage: number }[];
  mergedTimeRanges?: { startTime: number; endTime: number }[];
};
