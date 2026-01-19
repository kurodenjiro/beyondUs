#!/usr/bin/env tsx

/**
 * AI-Powered NFT Collection Generator
 * 
 * Main orchestrator that ties together all modules:
 * 1. Template Generation (from user request)
 * 2. Trait Generation (matching template style)
 * 3. AI Integration (combining traits into final NFTs)
 */

import * as readline from "readline";
import * as fs from "fs";
import * as path from "path";
import { UserRequest, generateTemplate, TemplateMetadata } from "./nft-template-generator";
import { generateTraits, TraitLibrary } from "./nft-trait-generator";
import { integrateTraits, selectRandomTraits, NFTOutput } from "./nft-ai-integrator";

function askQuestion(query: string): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans);
    }));
}

/**
 * Main collection generation workflow
 */
async function generateCollection(
    request: UserRequest,
    traitsPerCategory: number = 5,
    nftsToGenerate: number = 10
): Promise<NFTOutput[]> {
    console.log("🚀 AI-Powered NFT Collection Generator\n");
    console.log("=".repeat(60));
    console.log(`Theme: ${request.theme}`);
    console.log(`Subject: ${request.subject}`);
    console.log(`Style: ${request.style || "auto-detected"}`);
    console.log(`Collection Size: ${nftsToGenerate} NFTs`);
    console.log("=".repeat(60) + "\n");

    const outputs: NFTOutput[] = [];

    try {
        // STAGE 1: Generate Template
        console.log("📋 STAGE 1: Template Generation");
        console.log("-".repeat(60));

        const template = await generateTemplate(request);

        console.log("\n✅ Template generated successfully!");
        console.log(`   Template ID: ${template.id}`);
        console.log(`   Art Style: ${template.artStyle}`);
        console.log(`   Mood: ${template.mood}`);
        console.log(`   Style Tags: ${template.styleTags.join(", ")}`);

        // STAGE 2: Generate Traits
        console.log("\n📋 STAGE 2: Trait Generation");
        console.log("-".repeat(60));

        const traitLibrary = await generateTraits(template, traitsPerCategory);

        console.log("\n✅ Traits generated successfully!");
        console.log("   Trait counts:");
        Object.entries(traitLibrary.traits).forEach(([category, traits]) => {
            console.log(`     ${category}: ${traits.length} variations`);
        });

        // STAGE 3: Generate NFT Collection
        console.log("\n📋 STAGE 3: NFT Collection Generation");
        console.log("-".repeat(60));
        console.log(`Generating ${nftsToGenerate} unique NFTs...\n`);

        const collectionDir = path.join("nft-collection", template.id);

        for (let i = 1; i <= nftsToGenerate; i++) {
            console.log(`\n[${i}/${nftsToGenerate}] Generating NFT #${i}...`);

            // Select random trait combination
            const selectedTraits = selectRandomTraits(traitLibrary);

            console.log("   Selected traits:");
            Object.entries(selectedTraits).forEach(([category, trait]) => {
                console.log(`     ${category}: ${trait.name} (${trait.rarity})`);
            });

            try {
                const nft = await integrateTraits(template, selectedTraits, i, collectionDir);
                outputs.push(nft);
                console.log(`   ✅ NFT #${i} complete`);
            } catch (error: any) {
                console.error(`   ❌ NFT #${i} failed:`, error.message);
            }
        }

        // Generate collection metadata
        console.log("\n📋 Generating collection metadata...");
        const collectionMetadata = {
            name: `${request.theme} ${request.subject} Collection`,
            description: `An AI-generated NFT collection featuring ${request.subject} in ${request.theme} style.`,
            template: template.id,
            totalSupply: outputs.length,
            artStyle: template.artStyle,
            generatedAt: new Date().toISOString(),
            nfts: outputs.map(nft => ({
                tokenId: nft.tokenId,
                image: path.basename(nft.imagePath),
                metadata: nft.metadata
            }))
        };

        const metadataPath = path.join(collectionDir, "collection_metadata.json");
        fs.writeFileSync(metadataPath, JSON.stringify(collectionMetadata, null, 2));
        console.log(`✅ Collection metadata saved to ${metadataPath}`);

        // Summary
        console.log("\n" + "=".repeat(60));
        console.log("✨ COLLECTION GENERATION COMPLETE!");
        console.log("=".repeat(60));
        console.log(`\n📊 Summary:`);
        console.log(`   Template: ${template.id}`);
        console.log(`   Total Traits Generated: ${Object.values(traitLibrary.traits).reduce((sum, arr) => sum + arr.length, 0)}`);
        console.log(`   NFTs Generated: ${outputs.length}/${nftsToGenerate}`);
        console.log(`   Success Rate: ${((outputs.length / nftsToGenerate) * 100).toFixed(1)}%`);
        console.log(`\n📁 Output Directory: ${collectionDir}`);
        console.log(`\n🎨 Your AI-powered NFT collection is ready!`);

        return outputs;

    } catch (error: any) {
        console.error("\n❌ Collection generation failed:", error.message);
        throw error;
    }
}

/**
 * Interactive mode - ask user for collection parameters
 */
async function interactiveMode() {
    console.log("🎨 AI-Powered NFT Collection Generator");
    console.log("Interactive Mode\n");

    const theme = await askQuestion("Enter theme (e.g., 'cyberpunk', 'fantasy', 'cute'): ");
    const subject = await askQuestion("Enter subject (e.g., 'samurai', 'cats', 'robots'): ");
    const style = await askQuestion("Enter art style (optional, press Enter to skip): ");
    const attributesInput = await askQuestion("Enter attributes (comma-separated, optional): ");
    const collectionSizeInput = await askQuestion("How many NFTs to generate? (default: 5): ");

    const attributes = attributesInput ? attributesInput.split(",").map(s => s.trim()) : undefined;
    const collectionSize = parseInt(collectionSizeInput) || 5;

    const request: UserRequest = {
        theme: theme.trim(),
        subject: subject.trim(),
        style: style.trim() || undefined,
        attributes,
        collectionSize
    };

    console.log("\n");
    await generateCollection(request, 3, collectionSize);
}

/**
 * Preset mode - use predefined collection parameters
 */
async function presetMode(presetName: string) {
    const presets: Record<string, UserRequest> = {
        "cyberpunk-samurai": {
            theme: "cyberpunk",
            subject: "samurai warrior",
            style: "anime",
            attributes: ["futuristic", "neon", "armored"],
            collectionSize: 5
        },
        "space-cats": {
            theme: "space",
            subject: "cute cats",
            style: "kawaii",
            attributes: ["astronaut", "colorful"],
            collectionSize: 5
        },
        "fantasy-wizards": {
            theme: "fantasy",
            subject: "wizards",
            style: "digital art",
            attributes: ["magical", "mystical", "powerful"],
            collectionSize: 5
        }
    };

    const request = presets[presetName];

    if (!request) {
        console.error(`❌ Unknown preset: ${presetName}`);
        console.log(`\nAvailable presets: ${Object.keys(presets).join(", ")}`);
        process.exit(1);
    }

    await generateCollection(request, 3, request.collectionSize || 5);
}

// --- MAIN ---

async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        // Interactive mode
        await interactiveMode();
    } else if (args[0] === "--preset" && args[1]) {
        // Preset mode
        await presetMode(args[1]);
    } else if (args[0] === "--help" || args[0] === "-h") {
        console.log(`
AI-Powered NFT Collection Generator

Usage:
  npx tsx generate-nft-collection.ts                    # Interactive mode
  npx tsx generate-nft-collection.ts --preset <name>    # Use preset
  npx tsx generate-nft-collection.ts --help             # Show this help

Available Presets:
  cyberpunk-samurai    - Cyberpunk samurai warriors
  space-cats           - Cute space cats
  fantasy-wizards      - Fantasy wizards

Examples:
  npx tsx generate-nft-collection.ts --preset cyberpunk-samurai
  npx tsx generate-nft-collection.ts
        `);
    } else {
        console.error("❌ Invalid arguments. Use --help for usage information.");
        process.exit(1);
    }
}

main().catch(console.error);
