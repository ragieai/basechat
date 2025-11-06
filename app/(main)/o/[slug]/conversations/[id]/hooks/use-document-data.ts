import { useEffect, useState } from "react";
import { z } from "zod";

import { getRagieSourcePath } from "@/lib/paths";

import { DocumentDisplayData } from "../shared-types";

const DocumentResponseSchema = z.object({
  name: z.string(),
  metadata: z.object({
    source_type: z.string().optional(),
    source_url: z.string().optional(),
    _source_updated_at: z.number().optional(), // Unix timestamp
  }),
  updatedAt: z.string(), // ISO string
  summary: z.string(),
});

interface UseDocumentDataProps {
  documentId: string;
  slug: string;
  source: {
    streamUrl?: string;
    downloadUrl?: string;
    imageUrl?: string;
    startTime?: number;
    endTime?: number;
    mergedTimeRanges?: { startTime: number; endTime: number }[];
  };
}

export function useDocumentData({ documentId, slug, source }: UseDocumentDataProps) {
  const [documentData, setDocumentData] = useState<DocumentDisplayData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    setDocumentData(null);

    (async () => {
      try {
        const res = await fetch(`/api/documents/${documentId}`, {
          headers: { tenant: slug },
        });

        if (!res.ok) {
          const fallbackData: DocumentDisplayData = {
            name: "Document",
            summary: "Document summary not available",
            updatedAt: new Date().toISOString(),
            sourceUrl: getRagieSourcePath(slug, documentId),
            downloadUrl: source.downloadUrl,
            metadata: {
              source_type: "unknown",
              source_url: "#",
            },
          };
          setDocumentData(fallbackData);
          throw new Error("could not retrieve document with summary");
        }

        const rawJson = await res.json();

        // Validate the response with Zod
        const parseResult = DocumentResponseSchema.safeParse(rawJson);
        if (!parseResult.success) {
          console.error("Invalid document response format:", parseResult.error);
          throw new Error("Invalid document response format");
        }

        const json = parseResult.data;

        // Transform the API response to our display format
        const displayData: DocumentDisplayData = {
          name: json.name,
          summary: json.summary,
          updatedAt: json.metadata._source_updated_at
            ? new Date(json.metadata._source_updated_at * 1000).toISOString()
            : json.updatedAt,
          sourceUrl: json.metadata.source_url || getRagieSourcePath(slug, documentId),
          downloadUrl: source.downloadUrl,
          metadata: json.metadata,
        };

        setDocumentData(displayData);
      } catch (error) {
        console.error("Error fetching document:", error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [documentId, slug, source.downloadUrl]);

  return { documentData, isLoading };
}
