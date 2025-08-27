#!/usr/bin/env tsx

/**
 * Ragie Asset Inspector
 *
 * This script searches Ragie for assets (like images) and reports their metadata.
 * Think of it as a detective tool that finds files and tells you what Ragie knows about them.
 */

import { config } from "dotenv";
import { Ragie } from "ragie";

// Load environment variables from .env
config({ path: ".env" });

// Get environment variables directly
const RAGIE_API_KEY = process.env.RAGIE_API_KEY!;
const RAGIE_API_BASE_URL = process.env.RAGIE_API_BASE_URL || "https://api.ragie.ai";

interface CliArgs {
  name: string;
  ctype: string;
  topK: number;
}

function parseArgs(): CliArgs {
  const args: CliArgs = {
    name: "Taylor_602C_Exploaded.png",
    ctype: "image/png",
    topK: 10,
  };

  const rawArgs = process.argv.slice(2);

  for (let i = 0; i < rawArgs.length; i += 2) {
    const flag = rawArgs[i];
    const value = rawArgs[i + 1];

    switch (flag) {
      case "--name":
        args.name = value;
        break;
      case "--ctype":
        args.ctype = value;
        break;
      case "--topK":
        args.topK = parseInt(value, 10);
        break;
    }
  }

  return args;
}

function generateFilenameVariants(filename: string): string[] {
  const variants = new Set<string>();

  // Original filename
  variants.add(filename);

  // Case variations
  variants.add(filename.toLowerCase());
  variants.add(filename.toUpperCase());

  // Common misspellings/variations for Taylor_602C_Exploaded
  if (filename.toLowerCase().includes("taylor") && filename.toLowerCase().includes("602c")) {
    variants.add("Taylor_C602_Exploded.png");
    variants.add("Taylor_602C_Exploded.png");
    variants.add("taylor_602c_exploded.png");
    variants.add("TAYLOR_602C_EXPLODED.PNG");
    variants.add("Taylor-602C-Exploded.png");
    variants.add("Taylor 602C Exploded.png");
  }

  // Remove extension and try different extensions
  const nameWithoutExt = filename.replace(/\.[^.]+$/, "");
  variants.add(nameWithoutExt);
  variants.add(nameWithoutExt + ".PNG");
  variants.add(nameWithoutExt + ".jpg");
  variants.add(nameWithoutExt + ".jpeg");

  return Array.from(variants);
}

interface AssetInfo {
  id: string;
  filename?: string;
  content_type?: string;
  url?: string;
  caption?: string;
  description?: string;
  text?: string;
  parent_document_id?: string;
  score?: number;
}

async function searchRagieForAsset(
  client: Ragie,
  query: string,
  contentType: string,
  topK: number,
  partition: string,
): Promise<AssetInfo[]> {
  const results: AssetInfo[] = [];

  try {
    console.error(`🔍 Searching for: "${query}" (content type: ${contentType})`);

    // Use retrievals.retrieve (the correct API method)
    const searchResponse = await client.retrievals.retrieve({
      partition,
      query,
      topK,
    });

    if (searchResponse.scoredChunks && searchResponse.scoredChunks.length > 0) {
      console.error(`📄 Found ${searchResponse.scoredChunks.length} search results`);

      for (const chunk of searchResponse.scoredChunks) {
        const assetInfo: AssetInfo = {
          id: chunk.chunkId || "unknown",
          score: chunk.score,
          parent_document_id: chunk.documentId,
        };

        // Extract metadata from the chunk
        if (chunk.metadata) {
          assetInfo.filename = chunk.metadata.filename || chunk.metadata.title;
          assetInfo.content_type = chunk.metadata.contentType || chunk.metadata.content_type;
          assetInfo.caption = chunk.metadata.caption;
          assetInfo.description = chunk.metadata.description;
        }

        if (chunk.text) {
          assetInfo.text = chunk.text.substring(0, 200) + (chunk.text.length > 200 ? "..." : "");
        }

        // Try to get more details if we have a document ID
        if (chunk.documentId) {
          try {
            const docResponse = await client.documents.get({
              partition: partition,
              documentId: chunk.documentId,
            });
            if (docResponse) {
              assetInfo.url = docResponse.url;
              if (!assetInfo.filename && docResponse.metadata) {
                assetInfo.filename = docResponse.metadata.filename;
              }
              if (!assetInfo.content_type && docResponse.metadata) {
                assetInfo.content_type = docResponse.metadata.contentType;
              }
            }
          } catch (docError) {
            console.error(`⚠️  Could not fetch document ${chunk.documentId}:`, docError.message);
          }
        }

        // Filter by content type if specified
        if (
          contentType === "any" ||
          !contentType ||
          !assetInfo.content_type ||
          assetInfo.content_type.includes(contentType.replace("image/", ""))
        ) {
          results.push(assetInfo);
        }
      }
    } else {
      console.error(`❌ No results found for "${query}"`);
    }
  } catch (error) {
    console.error(`❌ Search failed for "${query}":`, error.message);
  }

  return results;
}

async function main() {
  const args = parseArgs();

  console.error(`🤖 Ragie Asset Inspector`);
  console.error(`📋 Parameters: name="${args.name}", content-type="${args.ctype}", top-k=${args.topK}`);
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

  // Use the correct partition for this app
  const partition = "6d05528e-347d-4055-98bf-d68cff6f0ca2";
  console.error(`🎯 Using partition: "${partition}"`);

  // First, let's check the specific PNG document that we know exists
  const knownPngDocId = "ffd56ea0-b398-4336-8da5-ba700e41468c";
  console.error(`\n🎯 Checking known PNG document: ${knownPngDocId}`);

  try {
    const knownDoc = await client.documents.get({
      partition: partition,
      documentId: knownPngDocId,
    });

    if (knownDoc) {
      console.error(`✅ Found known document:`);
      console.error(`   - ID: ${knownDoc.id}`);
      console.error(`   - Filename: ${knownDoc.metadata?.filename || "N/A"}`);
      console.error(`   - Content Type: ${knownDoc.metadata?.contentType || "N/A"}`);
      console.error(`   - URL: ${knownDoc.url || "N/A"}`);
      if (knownDoc.metadata?.caption) {
        console.error(`   - Caption: ${knownDoc.metadata.caption}`);
      }
      if (knownDoc.metadata?.description) {
        console.error(`   - Description: ${knownDoc.metadata.description}`);
      }
    }
  } catch (error) {
    console.error(`❌ Could not retrieve known document: ${error.message}`);
  }

  // Also check what other documents exist in this partition
  console.error(`\n🔍 Checking what other content exists in this partition...`);
  try {
    const docsResponse = await client.documents.list({
      partition: partition,
      pageSize: 5,
    });

    if (docsResponse.result && docsResponse.result.documents && docsResponse.result.documents.length > 0) {
      console.error(`📚 Found ${docsResponse.result.documents.length} documents in partition`);
      for (const doc of docsResponse.result.documents) {
        console.error(`   - ${doc.metadata?.filename || doc.id} (${doc.metadata?.contentType || "unknown"})`);
      }
    }
  } catch (error) {
    console.error(`❌ Could not list documents: ${error.message}`);
  }

  const allResults: AssetInfo[] = [];
  const variants = generateFilenameVariants(args.name);

  console.error(`🔄 Testing ${variants.length} filename variants...`);

  for (const variant of variants) {
    const results = await searchRagieForAsset(client, variant, args.ctype, args.topK, partition);
    allResults.push(...results);

    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Remove duplicates based on ID
  const uniqueResults = allResults.reduce((acc, current) => {
    const existing = acc.find((item) => item.id === current.id);
    if (!existing) {
      acc.push(current);
    } else if (current.score && (!existing.score || current.score > existing.score)) {
      // Keep the result with higher score
      Object.assign(existing, current);
    }
    return acc;
  }, [] as AssetInfo[]);

  console.error("");
  console.error(`📊 Summary: Found ${uniqueResults.length} unique assets`);
  console.error("");

  if (uniqueResults.length === 0) {
    console.error("❌ No PNG assets found matching the query");
    console.error("💡 This could mean:");
    console.error("   - The file is not uploaded to Ragie");
    console.error("   - The file exists but has no searchable text/metadata");
    console.error("   - The filename is different than expected");
    console.error("   - The content type filter is too restrictive");
    console.error("");
    console.error('🔧 Try running with --ctype "any" to see all content types');
    process.exit(1);
  }

  // Output results as JSON lines for easy parsing
  for (const result of uniqueResults) {
    console.log(JSON.stringify(result, null, 0));
  }

  process.exit(0);
}

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Run main function
main().catch((error) => {
  console.error("❌ Script failed:", error);
  process.exit(1);
});
