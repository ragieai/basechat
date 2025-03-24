export interface DocumentResponse {
  name: string;
  metadata: {
    source_type: string;
    source_url: string;
  };
  updatedAt: string;
  summary: string;
}
