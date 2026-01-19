#!/usr/bin/env tsx

/**
 * Complete NFT Trait Workflow with User Style Input
 * 
 * 1. Get style from user input (or auto-detect)
 * 2. Generate matching trait variations
 * 3. Apply traits to create NFT collection
 */

import { GoogleGenAI } from "@google/genai";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import { compositeMultipleTraits } from "./ai-composite-traits";
import * as readline from "readline";

dotenv.config({ path: ".env.local" });

const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error("❌ No API key found");
    process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

// --- TYPES ---

interface NFTStyle {
    artStyle: string;
    colorPalette: string[];
    mood: string;
    theme: string;
}

interface GeneratedTrait {
    category: string;
    description: string;
    imagePath: string;
}

// --- USER INPUT FOR STYLE ---

async function getUserStyleInput(): Promise<NFTStyle> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    const question = (query: string): Promise<string> => {
        return new Promise(resolve => rl.question(query, resolve));
    };

    console.log("\n🎨 Style Configuration");
    console.log("-".repeat(60));
    console.log("Define the style for trait generation:\n");

    const artStyle = await question("Art style (e.g., 'cartoon', 'anime', 'realistic', 'pixel art'): ");
    const theme = await question("Theme (e.g., 'cyberpunk', 'fantasy', 'streetwear', 'luxury'): ");
    const mood = await question("Mood (e.g., 'cool', 'playful', 'edgy', 'elegant'): ");
    const colorsInput = await question("Color palette (comma-separated hex codes, e.g., '#FF0000,#00FF00,#0000FF'): ");

    rl.close();

    const colorPalette = colorsInput
        .split(",")
        .map(c => c.trim())
        .filter(c => c.startsWith("#"));

    const style: NFTStyle = {
        artStyle: artStyle.trim() || "cartoon",
        theme: theme.trim() || "streetwear",
        mood: mood.trim() || "cool",
        colorPalette: colorPalette.length > 0 ? colorPalette : ["#FFA500", "#FF1493", "#8B00FF"]
    };

    console.log("\n✅ Style configured:");
    console.log(`   Art Style: ${style.artStyle}`);
    console.log(`   Theme: ${style.theme}`);
    console.log(`   Mood: ${style.mood}`);
    console.log(`   Colors: ${style.colorPalette.join(", ")}`);

    return style;
}

// --- AUTO-DETECT STYLE FROM IMAGE ---

async function analyzeNFTStyle(imagePath: string): Promise<NFTStyle> {
    console.log(`\n🔍 Auto-detecting style from NFT...`);

    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString("base64");

    const prompt = `Analyze this NFT image and extract its style characteristics.

Provide a JSON response with:
{
    "artStyle": "description of art style",
    "colorPalette": ["#hex1", "#hex2", ...],
    "mood": "overall mood/vibe",
    "theme": "main theme/subject"
}

Be specific and accurate.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash-exp",
            contents: {
                role: "user",
                parts: [
                    { text: prompt },
                    { inlineData: { mimeType: "image/png", data: base64Image } }
                ]
            }
        });

        const analysisText = response.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
        const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : {
            artStyle: "cartoon",
            colorPalette: ["#FFA500", "#FF1493", "#8B00FF"],
            mood: "fun",
            theme: "character"
        };

        console.log(`✅ Style detected`);
        console.log(`   Art Style: ${analysis.artStyle}`);
        console.log(`   Theme: ${analysis.theme}`);
        console.log(`   Mood: ${analysis.mood}`);

        return analysis;

    } catch (error: any) {
        console.error(`⚠️  Auto-detection failed, using defaults:`, error.message);
        return {
            artStyle: "cartoon",
            colorPalette: ["#FFA500", "#FF1493", "#8B00FF"],
            mood: "fun",
            theme: "character"
        };
    }
}

// --- GENERATE MATCHING TRAITS ---

async function generateMatchingTrait(
    category: string,
    style: NFTStyle,
    variation: number,
    outputDir: string
): Promise<GeneratedTrait | null> {
    console.log(`   Generating ${category} variation ${variation}...`);

    const traitPrompts: Record<string, string> = {
        headwear: `Generate a ${category} accessory in ${style.artStyle} style.

REQUIREMENTS:
- Style: ${style.artStyle}
- Theme: ${style.theme}
- Mood: ${style.mood}
- Color palette: ${style.colorPalette.join(", ")}
- Isolated item (no character wearing it)
- Transparent background

EXAMPLES: baseball cap, crown, beanie, top hat, helmet, bandana

OUTPUT: Single isolated ${category} item, centered, transparent background`,

        eyewear: `Generate ${category} in ${style.artStyle} style.

REQUIREMENTS:
- Style: ${style.artStyle}
- Theme: ${style.theme}
- Mood: ${style.mood}
- Isolated glasses/eyewear (no face)
- Transparent background

EXAMPLES: sunglasses, reading glasses, goggles, monocle, VR headset

OUTPUT: Single isolated eyewear, centered, transparent background`,

        accessory: `Generate a ${category} in ${style.artStyle} style.

REQUIREMENTS:
- Style: ${style.artStyle}
- Theme: ${style.theme}
- Mood: ${style.mood}
- Color palette: ${style.colorPalette.join(", ")}
- Isolated item
- Transparent background

EXAMPLES: gold chain, earrings, watch, cigar, pipe, weapon, tool

OUTPUT: Single isolated accessory, centered, transparent background`,

        clothing: `Generate ${category} in ${style.artStyle} style.

REQUIREMENTS:
- Style: ${style.artStyle}
- Theme: ${style.theme}
- Mood: ${style.mood}
- Color palette: ${style.colorPalette.join(", ")}
- Isolated clothing item
- Transparent background

EXAMPLES: hoodie, jacket, vest, shirt, suit

OUTPUT: Single isolated clothing item, centered, transparent background`
    };

    const prompt = traitPrompts[category] || traitPrompts.accessory;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-image",
            contents: {
                role: "user",
                parts: [{ text: prompt }]
            },
            config: {
                seed: (Date.now() + variation) % 2147483647,
                temperature: 0.85
            }
        });

        const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);

        if (!imagePart || !imagePart.inlineData?.data) {
            return null;
        }

        const imagePath = path.join(outputDir, `${category}_${variation}.png`);
        const buffer = Buffer.from(imagePart.inlineData.data, 'base64');
        fs.writeFileSync(imagePath, buffer);

        return {
            category,
            description: `${category} variation ${variation}`,
            imagePath
        };

    } catch (error: any) {
        console.error(`   ❌ Failed: ${error.message}`);
        return null;
    }
}

// --- MAIN WORKFLOW ---

async function generateNFTCollection(
    baseImagePath: string,
    traitsPerCategory: number = 3,
    nftsToGenerate: number = 5,
    useAutoDetect: boolean = false
) {
    console.log("🚀 NFT Trait Generator with Custom Style\n");
    console.log("=".repeat(60));

    // Step 1: Get style (user input or auto-detect)
    console.log("\n📋 STEP 1: Style Configuration");
    console.log("-".repeat(60));

    let style: NFTStyle;
    if (useAutoDetect) {
        style = await analyzeNFTStyle(baseImagePath);
    } else {
        style = await getUserStyleInput();
    }

    // Step 2: Generate traits
    console.log("\n📋 STEP 2: Generating Matching Traits");
    console.log("-".repeat(60));

    const traitsDir = path.join("generated-traits", "custom-traits");
    if (!fs.existsSync(traitsDir)) {
        fs.mkdirSync(traitsDir, { recursive: true });
    }

    const categories = ["headwear", "eyewear", "accessory", "clothing"];
    const generatedTraits: GeneratedTrait[] = [];

    for (const category of categories) {
        console.log(`\n  Generating ${category} traits...`);
        const categoryDir = path.join(traitsDir, category);
        if (!fs.existsSync(categoryDir)) {
            fs.mkdirSync(categoryDir, { recursive: true });
        }

        for (let i = 1; i <= traitsPerCategory; i++) {
            const trait = await generateMatchingTrait(category, style, i, categoryDir);
            if (trait) {
                generatedTraits.push(trait);
                console.log(`     ✅ ${category} ${i}/${traitsPerCategory}`);
            }
        }
    }

    console.log(`\n✅ Generated ${generatedTraits.length} traits`);

    // Step 3: Apply traits to create NFT variations
    console.log("\n📋 STEP 3: Creating NFT Variations");
    console.log("-".repeat(60));

    const collectionDir = path.join("nft-collection", "custom-collection");
    if (!fs.existsSync(collectionDir)) {
        fs.mkdirSync(collectionDir, { recursive: true });
    }

    const nftPaths: string[] = [];

    for (let i = 1; i <= nftsToGenerate; i++) {
        // Randomly select traits
        const selectedTraits = categories.map(cat => {
            const categoryTraits = generatedTraits.filter(t => t.category === cat);
            return categoryTraits[Math.floor(Math.random() * categoryTraits.length)];
        }).filter(Boolean);

        const traitDescription = selectedTraits.map(t => t.description).join(", ");

        console.log(`\n[${i}/${nftsToGenerate}] Generating NFT #${i}`);
        console.log(`   Traits: ${traitDescription}`);

        const outputPath = path.join(collectionDir, `nft_${i}.png`);

        try {
            // Use professional AI compositor with actual trait images
            console.log(`   Base: ${path.basename(baseImagePath)}`);
            selectedTraits.forEach((t, idx) => {
                console.log(`   Trait ${idx + 1}: ${path.basename(t.imagePath)}`);
            });

            const traitsToComposite = selectedTraits.map(t => ({
                category: t.category,
                imagePath: t.imagePath
            }));

            await compositeMultipleTraits(baseImagePath, traitsToComposite, outputPath);
            nftPaths.push(outputPath);
        } catch (error: any) {
            console.error(`   ❌ Failed: ${error.message}`);
        }
    }

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("✨ NFT COLLECTION COMPLETE!");
    console.log("=".repeat(60));
    console.log(`\n📊 Summary:`);
    console.log(`   Base NFT: ${path.basename(baseImagePath)}`);
    console.log(`   Style: ${style.artStyle} / ${style.theme} / ${style.mood}`);
    console.log(`   Traits Generated: ${generatedTraits.length}`);
    console.log(`   NFTs Created: ${nftPaths.length}/${nftsToGenerate}`);
    console.log(`   Success Rate: ${((nftPaths.length / nftsToGenerate) * 100).toFixed(1)}%`);
    console.log(`\n📁 Traits Directory: ${traitsDir}`);
    console.log(`📁 Collection Directory: ${collectionDir}`);
}

// --- MAIN ---

if (require.main === module) {
    const args = process.argv.slice(2);

    // Check for help flag
    if (args.includes("--help") || args.includes("-h")) {
        console.log(`
🎨 NFT Trait Generator - Generate custom traits for your NFT

Usage:
  npx tsx generate-traits-for-nft.ts <image-path> [traits-per-category] [nfts-count] [--auto-detect]

Arguments:
  image-path           Path to your base NFT image
  traits-per-category  Number of trait variations per category (default: 3)
  nfts-count          Number of NFTs to generate (default: 5)

Flags:
  --auto-detect       Auto-detect style from image (default: user input)
  --help, -h          Show this help message

Examples:
  # Interactive mode (you input the style)
  npx tsx generate-traits-for-nft.ts nft-templates/sample_ape.png 3 5

  # Auto-detect mode
  npx tsx generate-traits-for-nft.ts nft-templates/sample_ape.png 3 5 --auto-detect

Style Input (Interactive Mode):
  You'll be prompted to enter:
  - Art style (e.g., 'cartoon', 'anime', 'realistic')
  - Theme (e.g., 'cyberpunk', 'fantasy', 'streetwear')
  - Mood (e.g., 'cool', 'playful', 'edgy')
  - Color palette (hex codes, e.g., '#FF0000,#00FF00,#0000FF')
        `);
        process.exit(0);
    }

    const useAutoDetect = args.includes("--auto-detect");
    const filteredArgs = args.filter(arg => !arg.startsWith("--"));

    const baseImagePath = filteredArgs[0] || "nft-templates/sample_ape.png";
    const traitsPerCategory = parseInt(filteredArgs[1]) || 3;
    const nftsToGenerate = parseInt(filteredArgs[2]) || 5;

    if (!fs.existsSync(baseImagePath)) {
        console.error(`❌ Image not found: ${baseImagePath}`);
        console.log("\nTip: Use --help to see usage instructions");
        process.exit(1);
    }

    generateNFTCollection(baseImagePath, traitsPerCategory, nftsToGenerate, useAutoDetect).catch(console.error);
}
