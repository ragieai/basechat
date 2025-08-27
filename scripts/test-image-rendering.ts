#!/usr/bin/env tsx

/**
 * Test script to verify image rendering pipeline
 * Tests the conversation-context utils with known PNG document
 */

import { config } from "dotenv";
config({ path: ".env" });

import { IMAGE_FILE_TYPES } from "../lib/file-utils";
import { getRagieClientAndPartition } from "../lib/server/ragie";

const PARTITION_ID = "6d05528e-347d-4055-98bf-d68cff6f0ca2";
const TAYLOR_QUERY = "Taylor 602C exploded view";

async function testImageRendering() {
  console.log("🧪 Testing Image Rendering Pipeline");
  console.log(`🎯 Partition: ${PARTITION_ID}`);
  console.log(`🔍 Query: "${TAYLOR_QUERY}"`);
  console.log();

  try {
    // Mock tenant object for testing
    const mockTenant = {
      id: "test",
      ragiePartition: PARTITION_ID,
    };

    const { client } = await getRagieClientAndPartition(mockTenant.id);

    console.log("✅ Connected to Ragie API");

    // Test retrieval
    const response = await client.retrievals.retrieve({
      partition: PARTITION_ID,
      query: TAYLOR_QUERY,
      topK: 5,
    });

    console.log(`📋 Found ${response.scoredChunks.length} chunks`);
    console.log();

    // Test our image detection logic
    response.scoredChunks.forEach((chunk, index) => {
      const documentName = chunk.documentName;
      const isImageByExtension =
        documentName && IMAGE_FILE_TYPES.some((ext) => documentName.toLowerCase().endsWith(ext));
      const hasImageLink = !!chunk.links.self_image?.href;

      console.log(`📄 Chunk ${index + 1}: ${documentName}`);
      console.log(`   🖼️  Image by extension: ${isImageByExtension}`);
      console.log(`   🔗 Has self_image link: ${hasImageLink}`);

      if (isImageByExtension && !hasImageLink) {
        console.log(`   ✅ Would use fallback: /documents/${chunk.documentId}/source`);
      }

      if (chunk.text.length > 100) {
        console.log(`   📝 Description: ${chunk.text.substring(0, 100)}...`);
      }
      console.log();
    });

    // Find PNG files specifically
    const pngChunks = response.scoredChunks.filter((chunk) => chunk.documentName?.toLowerCase().endsWith(".png"));

    console.log(`🎯 Found ${pngChunks.length} PNG chunks that should render as images`);

    if (pngChunks.length > 0) {
      console.log("✅ Image rendering pipeline should work!");
    } else {
      console.log("❌ No PNG files found in results");
    }
  } catch (error) {
    console.error("❌ Error testing image rendering:", error);
  }
}

testImageRendering();
