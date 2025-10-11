import { createMcpHandler } from "@vercel/mcp-adapter";
import { withMcpAuth } from "better-auth/plugins";
import { z } from "zod";

import auth from "@/auth";

const handler = withMcpAuth(auth, async (req, session) => {
  // session contains the access token record with scopes and user ID
  if (!session) {
    //this is important and you must return 401
    return new Response(null, {
      status: 401,
    });
  }

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
        },
      },
    },
    {
      basePath: "/api",
      verboseLogs: true,
      maxDuration: 60,
    },
  )(req);
});

export { handler as GET, handler as POST, handler as DELETE, handler as OPTIONS };
