#!/usr/bin/env tsx

/**
 * Generate Clean NFT Base Sample (No Traits)
 * 
 * Creates a clean, minimal NFT character without accessories or traits.
 * Perfect for creating a consistent base for trait generation.
 */

import { GoogleGenAI } from "@google/genai";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import * as readline from "readline";

dotenv.config({ path: ".env.local" });

const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error("❌ No API key found");
    process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

// --- TYPES ---

interface CleanNFTStyle {
    subject: string;
    theme: string;
    artStyle: string;
    mood: string;
    faceOrientation: string;
    colorPalette: string[];
}

// --- GET USER INPUT ---

async function getUserInput(): Promise<CleanNFTStyle> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    const question = (query: string): Promise<string> => {
        return new Promise(resolve => rl.question(query, resolve));
    };

    console.log("\n🎨 Clean NFT Base Configuration");
    console.log("-".repeat(60));
    console.log("Define your clean NFT base (no accessories/traits):\n");

    const subject = await question("Subject (e.g., 'ape', 'cat', 'robot', 'alien', 'human'): ");
    const theme = await question("Theme (e.g., 'cyberpunk', 'fantasy', 'minimal', 'modern'): ");
    const artStyle = await question("Art style (e.g., 'cartoon', 'anime', 'realistic', 'pixel art'): ");
    const mood = await question("Mood/Expression (e.g., 'neutral', 'happy', 'serious', 'bored'): ");
    const faceOrientation = await question("Face orientation (e.g., 'frontal', 'three-quarter', 'profile'): ");
    const colorsInput = await question("Color palette (comma-separated hex codes, e.g., '#8B4513,#D2691E,#F5DEB3'): ");

    rl.close();

    const colorPalette = colorsInput
        .split(",")
        .map(c => c.trim())
        .filter(c => c.startsWith("#"));

    const style: CleanNFTStyle = {
        subject: subject.trim() || "ape",
        theme: theme.trim() || "minimal",
        artStyle: artStyle.trim() || "cartoon",
        mood: mood.trim() || "neutral",
        faceOrientation: faceOrientation.trim() || "frontal",
        colorPalette: colorPalette.length > 0 ? colorPalette : ["#8B4513", "#D2691E", "#F5DEB3"]
    };

    console.log("\n✅ Style configured:");
    console.log(`   Subject: ${style.subject}`);
    console.log(`   Theme: ${style.theme}`);
    console.log(`   Art Style: ${style.artStyle}`);
    console.log(`   Mood: ${style.mood}`);
    console.log(`   Face Orientation: ${style.faceOrientation}`);
    console.log(`   Colors: ${style.colorPalette.join(", ")}`);

    return style;
}

// --- GENERATE CLEAN NFT BASE ---

async function generateCleanNFTBase(
    style: CleanNFTStyle,
    outputPath: string
): Promise<string> {
    console.log(`\n🎨 Generating clean NFT base...`);

    const prompt = `Create a CLEAN, MINIMAL NFT character base with NO accessories or traits.

SUBJECT & STYLE:
- Subject: ${style.subject}
- Theme: ${style.theme}
- Art Style: ${style.artStyle}
- Mood/Expression: ${style.mood}
- Face Orientation: ${style.faceOrientation} view
- Color Palette: ${style.colorPalette.join(", ")}

CRITICAL REQUIREMENTS - CLEAN BASE ONLY:
1. Create a ${style.subject} character in ${style.artStyle} style
2. ${style.mood} expression
3. ${style.faceOrientation} face orientation
4. NO accessories (no hats, caps, headwear)
5. NO clothing (just the base character body)
6. NO jewelry or accessories
7. NO items in hands
8. NO background elements
9. Clean, simple, minimal design
10. Solid background color (from palette)
11. Professional NFT quality
12. Centered composition, portrait orientation
13. Upper body visible (head, neck, shoulders, torso)

WHAT TO INCLUDE:
- Base character body
- Natural features (ears, eyes, nose, mouth for the subject)
- Natural skin/fur/surface color
- Simple, clean design
- ${style.mood} facial expression

WHAT TO EXCLUDE:
- NO hats, caps, or headwear
- NO sunglasses or eyewear
- NO clothing, shirts, jackets, vests
- NO jewelry, chains, earrings
- NO accessories of any kind
- NO items in hands or nearby
- NO decorative elements

EXAMPLES of CLEAN bases:
- Ape: Just the ape head and upper body, no clothes, no accessories
- Cat: Just the cat head and upper body, natural fur, no accessories
- Robot: Just the robot head and torso, basic design, no add-ons
- Alien: Just the alien head and upper body, natural features

OUTPUT: A clean, minimal ${style.subject} character base ready for trait addition.

NEGATIVE: Accessories, clothing, hats, sunglasses, jewelry, items, decorations, complex design`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-image",
            contents: {
                role: "user",
                parts: [{ text: prompt }]
            },
            config: {
                seed: Date.now() % 2147483647,
                temperature: 0.5
            }
        });

        const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);

        if (!imagePart || !imagePart.inlineData?.data) {
            throw new Error("Failed to generate clean NFT base");
        }

        const buffer = Buffer.from(imagePart.inlineData.data, 'base64');
        fs.writeFileSync(outputPath, buffer);

        console.log(`✅ Clean NFT base saved to ${outputPath}`);

        return outputPath;

    } catch (error: any) {
        console.error(`❌ Generation failed:`, error.message);
        throw error;
    }
}

// --- MAIN WORKFLOW ---

async function createCleanNFTBase() {
    console.log("🚀 Clean NFT Base Generator\n");
    console.log("=".repeat(60));
    console.log("Generate a clean, minimal NFT base without any traits\n");

    // Get user input
    const style = await getUserInput();

    // Generate clean NFT base
    console.log("\n📋 Generating Clean NFT Base");
    console.log("-".repeat(60));

    const timestamp = Date.now();
    const outputDir = "nft-templates/clean-bases";
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(
        outputDir,
        `${style.subject}_${style.theme}_clean_${timestamp}.png`
    );

    await generateCleanNFTBase(style, outputPath);

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("✨ CLEAN NFT BASE CREATED!");
    console.log("=".repeat(60));
    console.log(`\n📊 Summary:`);
    console.log(`   Subject: ${style.subject}`);
    console.log(`   Theme: ${style.theme}`);
    console.log(`   Art Style: ${style.artStyle}`);
    console.log(`   Expression: ${style.mood}`);
    console.log(`   Orientation: ${style.faceOrientation}`);
    console.log(`   Output: ${outputPath}`);
    console.log(`\n💡 Next steps:`);
    console.log(`   1. Use this as a base for trait generation:`);
    console.log(`      npx tsx scripts/generate-traits-for-nft.ts ${outputPath} 5 10`);
    console.log(`   2. Or apply specific traits:`);
    console.log(`      npx tsx scripts/apply-trait-to-nft.ts ${outputPath}`);
}

// --- MAIN ---

if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.includes("--help") || args.includes("-h")) {
        console.log(`
🎨 Clean NFT Base Generator

Usage:
  npx tsx scripts/generate-clean-nft-base.ts

What it does:
  Generates a clean, minimal NFT character base WITHOUT any accessories or traits.
  Perfect for creating a consistent base that you can add traits to later.

Features:
  - No accessories (hats, caps, headwear)
  - No clothing (shirts, jackets, vests)
  - No jewelry or items
  - Just the pure character base
  - Ready for trait addition

Example:
  npx tsx scripts/generate-clean-nft-base.ts

You'll be prompted for:
  - Subject (ape, cat, robot, alien, etc.)
  - Theme (cyberpunk, fantasy, minimal, etc.)
  - Art style (cartoon, anime, realistic, etc.)
  - Mood/Expression (neutral, happy, serious, etc.)
  - Face orientation (frontal, three-quarter, profile)
  - Color palette (hex codes)

Output:
  Clean NFT base saved to: nft-templates/clean-bases/
        `);
        process.exit(0);
    }

    createCleanNFTBase().catch(console.error);
}
