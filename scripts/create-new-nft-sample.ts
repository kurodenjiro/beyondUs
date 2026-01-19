#!/usr/bin/env tsx

/**
 * Create New NFT Sample Based on Reference
 * 
 * Takes a reference NFT (e.g., sample_ape.png) and user-defined style,
 * then generates a completely new NFT sample with the new style
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

interface NFTStructure {
    composition: string;
    pose: string;
    elements: string[];
    artStyle: string;
}

interface NewNFTStyle {
    subject: string;
    theme: string;
    artStyle: string;
    mood: string;
    faceOrientation: string;
    colorPalette: string[];
}

// --- ANALYZE REFERENCE NFT STRUCTURE ---

async function analyzeReferenceStructure(imagePath: string): Promise<NFTStructure> {
    console.log(`\n🔍 Analyzing reference NFT structure...`);

    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString("base64");

    const prompt = `Analyze this NFT image and extract its STRUCTURAL characteristics (not the specific content).

Provide a JSON response with:
{
    "composition": "description of layout and composition",
    "pose": "character pose and orientation",
    "elements": ["list of visual elements present"],
    "artStyle": "technical art style description"
}

Focus on STRUCTURE, not content. For example:
- "centered character, portrait orientation" not "ape character"
- "frontal pose, arms visible" not "wearing vest"
- "bold outlines, flat colors" not "orange and purple"`;

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
        const structure = jsonMatch ? JSON.parse(jsonMatch[0]) : {
            composition: "centered portrait",
            pose: "frontal, standing",
            elements: ["character", "clothing", "accessories"],
            artStyle: "cartoon with bold outlines"
        };

        console.log(`✅ Structure analyzed`);
        console.log(`   Composition: ${structure.composition}`);
        console.log(`   Pose: ${structure.pose}`);
        console.log(`   Art Style: ${structure.artStyle}`);

        return structure;

    } catch (error: any) {
        console.error(`⚠️  Analysis failed, using defaults:`, error.message);
        return {
            composition: "centered portrait",
            pose: "frontal, standing",
            elements: ["character", "clothing", "accessories", "headwear"],
            artStyle: "cartoon with bold outlines"
        };
    }
}

// --- GET USER INPUT FOR NEW STYLE ---

async function getUserNewStyle(): Promise<NewNFTStyle> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    const question = (query: string): Promise<string> => {
        return new Promise(resolve => rl.question(query, resolve));
    };

    console.log("\n🎨 New NFT Style Configuration");
    console.log("-".repeat(60));
    console.log("Define what you want the NEW NFT to be:\n");

    const subject = await question("Subject (e.g., 'robot', 'alien', 'cat', 'dragon', 'zombie'): ");
    const theme = await question("Theme (e.g., 'cyberpunk', 'fantasy', 'steampunk', 'horror'): ");
    const artStyle = await question("Art style (e.g., 'anime', 'pixel art', 'realistic', 'cartoon'): ");
    const mood = await question("Mood (e.g., 'fierce', 'cute', 'mysterious', 'elegant'): ");
    const faceOrientation = await question("Face orientation (e.g., 'frontal', 'three-quarter', 'profile', 'side'): ");
    const colorsInput = await question("Color palette (comma-separated hex codes, e.g., '#00FF00,#FF00FF,#FFFF00'): ");

    rl.close();

    const colorPalette = colorsInput
        .split(",")
        .map(c => c.trim())
        .filter(c => c.startsWith("#"));

    const style: NewNFTStyle = {
        subject: subject.trim() || "robot",
        theme: theme.trim() || "cyberpunk",
        artStyle: artStyle.trim() || "cartoon",
        mood: mood.trim() || "cool",
        faceOrientation: faceOrientation.trim() || "frontal",
        colorPalette: colorPalette.length > 0 ? colorPalette : ["#00FF00", "#FF00FF", "#FFFF00"]
    };

    console.log("\n✅ New style configured:");
    console.log(`   Subject: ${style.subject}`);
    console.log(`   Theme: ${style.theme}`);
    console.log(`   Art Style: ${style.artStyle}`);
    console.log(`   Mood: ${style.mood}`);
    console.log(`   Face Orientation: ${style.faceOrientation}`);
    console.log(`   Colors: ${style.colorPalette.join(", ")}`);

    return style;
}

// --- GENERATE NEW NFT SAMPLE ---

async function generateNewNFTSample(
    referenceStructure: NFTStructure,
    newStyle: NewNFTStyle,
    outputPath: string
): Promise<string> {
    console.log(`\n🎨 Generating new NFT sample...`);

    const prompt = `Create a NEW NFT character with these specifications:

SUBJECT & THEME:
- Subject: ${newStyle.subject}
- Theme: ${newStyle.theme}
- Mood: ${newStyle.mood}

ART STYLE:
- Style: ${newStyle.artStyle}
- Technical: ${referenceStructure.artStyle}
- Color Palette: ${newStyle.colorPalette.join(", ")}

COMPOSITION (match reference structure):
- Composition: ${referenceStructure.composition}
- Pose: ${referenceStructure.pose}
- Face Orientation: ${newStyle.faceOrientation} view
- Elements to include: ${referenceStructure.elements.join(", ")}

CRITICAL REQUIREMENTS:
1. Create a ${newStyle.subject} character (NOT an ape)
2. Use ${newStyle.theme} theme elements
3. Match the STRUCTURE of the reference (composition, pose, layout)
4. Use ${newStyle.artStyle} art style
5. Apply ${newStyle.mood} mood
6. Use the specified color palette
7. Include similar elements: headwear, eyewear, clothing, accessories
8. Professional NFT collection quality
9. Solid background color (from palette)

EXAMPLES of what to create:
- If subject is "robot": Create a robot character in the specified theme
- If subject is "alien": Create an alien character in the specified theme
- If subject is "cat": Create a cat character in the specified theme

OUTPUT: A complete, professional NFT character matching all specifications.

NEGATIVE: Ape character, different composition, missing elements, low quality`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-image",
            contents: {
                role: "user",
                parts: [{ text: prompt }]
            },
            config: {
                seed: Date.now() % 2147483647,
                temperature: 0.7
            }
        });

        const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);

        if (!imagePart || !imagePart.inlineData?.data) {
            throw new Error("Failed to generate new NFT sample");
        }

        const buffer = Buffer.from(imagePart.inlineData.data, 'base64');
        fs.writeFileSync(outputPath, buffer);

        console.log(`✅ New NFT sample saved to ${outputPath}`);

        return outputPath;

    } catch (error: any) {
        console.error(`❌ Generation failed:`, error.message);
        throw error;
    }
}

// --- MAIN WORKFLOW ---

async function createNewNFTSample(referenceImagePath: string) {
    console.log("🚀 Create New NFT Sample from Reference\n");
    console.log("=".repeat(60));

    // Step 1: Analyze reference structure
    console.log("\n📋 STEP 1: Analyzing Reference NFT");
    console.log("-".repeat(60));
    const structure = await analyzeReferenceStructure(referenceImagePath);

    // Step 2: Get user input for new style
    console.log("\n📋 STEP 2: Get New Style Input");
    console.log("-".repeat(60));
    const newStyle = await getUserNewStyle();

    // Step 3: Generate new NFT sample
    console.log("\n📋 STEP 3: Generating New NFT Sample");
    console.log("-".repeat(60));

    const timestamp = Date.now();
    const outputDir = "nft-templates";
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(
        outputDir,
        `${newStyle.subject}_${newStyle.theme}_${timestamp}.png`
    );

    await generateNewNFTSample(structure, newStyle, outputPath);

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("✨ NEW NFT SAMPLE CREATED!");
    console.log("=".repeat(60));
    console.log(`\n📊 Summary:`);
    console.log(`   Reference: ${path.basename(referenceImagePath)}`);
    console.log(`   New Subject: ${newStyle.subject}`);
    console.log(`   Theme: ${newStyle.theme}`);
    console.log(`   Art Style: ${newStyle.artStyle}`);
    console.log(`   Output: ${outputPath}`);
    console.log(`\n💡 You can now use this as a base for generating traits!`);
    console.log(`   npx tsx scripts/generate-traits-for-nft.ts ${outputPath} 3 5`);
}

// --- MAIN ---

if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.includes("--help") || args.includes("-h")) {
        console.log(`
🎨 Create New NFT Sample from Reference

Usage:
  npx tsx scripts/create-new-nft-sample.ts <reference-image>

Arguments:
  reference-image    Path to reference NFT image (e.g., sample_ape.png)

Example:
  npx tsx scripts/create-new-nft-sample.ts nft-templates/sample_ape.png

What it does:
  1. Analyzes the STRUCTURE of your reference NFT (composition, pose, elements)
  2. Asks you for a NEW style (subject, theme, art style, mood, colors)
  3. Generates a completely NEW NFT sample with the new style but similar structure

Example transformations:
  - Ape → Robot (cyberpunk theme)
  - Ape → Alien (sci-fi theme)
  - Ape → Dragon (fantasy theme)
  - Ape → Zombie (horror theme)
        `);
        process.exit(0);
    }

    const referenceImagePath = args[0] || "nft-templates/sample_ape.png";

    if (!fs.existsSync(referenceImagePath)) {
        console.error(`❌ Reference image not found: ${referenceImagePath}`);
        console.log("\nTip: Use --help to see usage instructions");
        process.exit(1);
    }

    createNewNFTSample(referenceImagePath).catch(console.error);
}
