import { createMcpHandler } from "@vercel/mcp-adapter";
import { NextRequest } from "next/server";
import { z } from "zod";

import auth from "@/auth";
import { getRagieClientAndPartition } from "@/lib/server/ragie";
import { requireMcpAuthContext } from "@/lib/server/utils";

const handler = async (req: NextRequest, { params }: { params: Promise<{ slug: string }> }) => {
  const session = await auth.api.getMcpSession({
    headers: req.headers,
  });
  if (!session) {
    return new Response(null, {
      status: 401,
    });
  }
  const { slug } = await params;

  const { profile, tenant } = await requireMcpAuthContext(slug);
  const { client, partition } = await getRagieClientAndPartition(tenant.id);

  return createMcpHandler(
    (server) => {
      server.tool(
        "search",
        "Search for relevant documents and resources",
        { query: z.string().describe("The search query") },
        async ({ query }: { query: string }) => {
          // Mock search results - replace with actual search implementation
          const results = [
            {
              id: "doc-1",
              title: `Search result for "${query}"`,
              url: "https://example.com/doc-1",
            },
            {
              id: "doc-2",
              title: `Another result for "${query}"`,
              url: "https://example.com/doc-2",
            },
          ];

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({ results }),
              },
            ],
          };
        },
      );

      server.tool(
        "fetch",
        "Fetch the full contents of a document by its ID",
        { id: z.string().describe("The unique identifier for the document") },
        async ({ id }: { id: string }) => {
          // Mock document fetch - replace with actual fetch implementation
          const document = {
            id: id,
            title: `Document ${id}`,
            text: `This is the full text content of document ${id}. It contains detailed information about the topic.`,
            url: `https://example.com/${id}`,
            metadata: {
              source: "vector_store",
              last_updated: "2024-01-01",
              word_count: 150,
            },
          };

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(document),
              },
            ],
          };
        },
      );

      server.tool(
        "retrieve",
        "Retrieve relevant documents using Ragie SDK",
        { query: z.string().describe("The search query for retrieval") },
        async ({ query }: { query: string }) => {
          try {
            const response = await client.retrievals.retrieve({
              partition,
              query,
              topK: 6,
              rerank: false,
              recencyBias: false,
            });

            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(response),
                },
              ],
            };
          } catch (error) {
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    error: "Failed to retrieve documents",
                    message: error instanceof Error ? error.message : "Unknown error",
                  }),
                },
              ],
            };
          }
        },
      );
    },
    {
      capabilities: {
        tools: {
          search: {
            description: "Search for relevant documents and resources",
          },
          fetch: {
            description: "Fetch the full contents of a document by its ID",
          },
          retrieve: {
            description: "Retrieve relevant documents using Ragie SDK",
          },
        },
      },
    },
    {
      basePath: `/api/${slug}`,
      verboseLogs: true,
      maxDuration: 60,
    },
  )(req);
};

export { handler as GET, handler as POST, handler as DELETE, handler as OPTIONS };
