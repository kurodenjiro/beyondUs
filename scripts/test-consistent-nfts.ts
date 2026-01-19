#!/usr/bin/env tsx

/**
 * Test script to generate multiple NFTs using consistent integrator
 * This demonstrates how all NFTs maintain the same base character
 */

import { integrateTraitsConsistent, selectRandomTraits } from "./nft-consistent-integrator";
import { TemplateMetadata } from "./nft-template-generator";
import { TraitLibrary } from "./nft-trait-generator";
import * as fs from "fs";
import * as path from "path";

async function testConsistentNFTs(
    templateMetadataPath: string,
    traitLibraryPath: string,
    count: number = 5
) {
    console.log("🚀 Testing Consistent NFT Generation\n");
    console.log(`Generating ${count} NFTs with consistent base character...\n`);

    // Load template and trait library
    const templateData = fs.readFileSync(templateMetadataPath, "utf-8");
    const template: TemplateMetadata = JSON.parse(templateData);
    template.generatedAt = new Date(template.generatedAt);

    const libraryData = fs.readFileSync(traitLibraryPath, "utf-8");
    const traitLibrary: TraitLibrary = JSON.parse(libraryData);

    console.log(`📋 Template: ${template.id}`);
    console.log(`🎨 Theme: ${template.userRequest.theme} ${template.userRequest.subject}\n`);

    const outputDir = path.join("nft-collection", "consistent-test");
    const generatedNFTs: string[] = [];

    for (let i = 1; i <= count; i++) {
        console.log(`\n[${i}/${count}] Generating NFT #${i}...`);

        // Select random traits
        const selectedTraits = selectRandomTraits(traitLibrary);

        console.log("   Selected traits:");
        Object.entries(selectedTraits).forEach(([category, trait]) => {
            console.log(`     ${category}: ${trait.name} (${trait.rarity})`);
        });

        try {
            const nft = await integrateTraitsConsistent(template, selectedTraits, i, outputDir);
            generatedNFTs.push(nft.imagePath);
            console.log(`   ✅ NFT #${i} complete`);
        } catch (error: any) {
            console.error(`   ❌ NFT #${i} failed:`, error.message);
        }
    }

    console.log("\n" + "=".repeat(60));
    console.log("✨ CONSISTENCY TEST COMPLETE!");
    console.log("=".repeat(60));
    console.log(`\n📊 Results:`);
    console.log(`   NFTs Generated: ${generatedNFTs.length}/${count}`);
    console.log(`   Success Rate: ${((generatedNFTs.length / count) * 100).toFixed(1)}%`);
    console.log(`\n📁 Output Directory: ${outputDir}`);
    console.log(`\n🔍 Review the NFTs to verify they all have:`);
    console.log(`   ✓ Same base character pose`);
    console.log(`   ✓ Same body proportions`);
    console.log(`   ✓ Only traits (clothing, eyes, hair, accessory) differ`);
    console.log(`\n💡 Compare these with the original template to see consistency!`);

    return generatedNFTs;
}

// Run test
const templatePath = process.argv[2] || "nft-templates/space_cute_cats_1768833598279_metadata.json";
const traitsPath = process.argv[3] || "nft-traits/space_cute_cats_1768833598279/trait_library.json";
const count = parseInt(process.argv[4]) || 5;

testConsistentNFTs(templatePath, traitsPath, count).catch(console.error);
