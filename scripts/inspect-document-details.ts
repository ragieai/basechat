#!/usr/bin/env tsx

/**
 * Document Detail Inspector
 *
 * This script gets the full details of a specific document to see what's actually indexed.
 */

import { config } from "dotenv";
import { Ragie } from "ragie";

// Load environment variables from .env
config({ path: ".env" });

// Get environment variables directly
const RAGIE_API_KEY = process.env.RAGIE_API_KEY!;
const RAGIE_API_BASE_URL = process.env.RAGIE_API_BASE_URL || "https://api.ragie.ai";

async function main() {
  const documentId = process.argv[2] || "48eac37c-c7ad-466f-97d2-2f6472317721";
  const partition = "6d05528e-347d-4055-98bf-d68cff6f0ca2";

  console.error(`🤖 Document Detail Inspector`);
  console.error(`📋 Document ID: ${documentId}`);
  console.error(`🎯 Partition: ${partition}`);
  console.error("");

  let client: Ragie;
  try {
    if (!RAGIE_API_KEY) {
      throw new Error("RAGIE_API_KEY environment variable is required");
    }
    client = new Ragie({
      auth: RAGIE_API_KEY,
      serverURL: RAGIE_API_BASE_URL,
    });
    console.error("✅ Connected to Ragie API");
  } catch (error) {
    console.error("❌ Failed to connect to Ragie API:", error.message);
    process.exit(1);
  }

  try {
    // Get full document details
    const doc = await client.documents.get({
      partition: partition,
      documentId: documentId,
    });

    console.error(`📄 Document Details:`);
    console.log(
      JSON.stringify(
        {
          id: doc.id,
          url: doc.url,
          metadata: doc.metadata,
          indexedAt: doc.indexedAt,
          createdAt: doc.createdAt,
        },
        null,
        2,
      ),
    );

    // Get chunks for this document
    console.error(`\n🔍 Getting chunks for this document...`);
    const searchResponse = await client.retrievals.retrieve({
      partition,
      query: "exploded view technical illustration",
      topK: 20,
    });

    const relevantChunks = searchResponse.scoredChunks.filter((chunk) => chunk.documentId === documentId);

    console.error(`📋 Found ${relevantChunks.length} chunks from this document:`);
    for (const chunk of relevantChunks) {
      console.log(
        JSON.stringify(
          {
            chunkId: chunk.chunkId,
            score: chunk.score,
            text: chunk.text,
            metadata: chunk.metadata,
          },
          null,
          2,
        ),
      );
    }
  } catch (error) {
    console.error(`❌ Failed to get document details:`, error.message);
    process.exit(1);
  }
}

// Run main function
main().catch((error) => {
  console.error("❌ Script failed:", error);
  process.exit(1);
});
