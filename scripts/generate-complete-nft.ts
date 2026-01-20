#!/usr/bin/env tsx

/**
 * Complete NFT Generation Workflow
 * 
 * 1. Generate new NFT sample (or use existing)
 * 2. Auto-detect style from sample
 * 3. Generate matching traits
 * 4. Create NFT collection with traits
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

interface NewNFTConfig {
    subject: string;
    theme: string;
    artStyle: string;
    mood: string;
    faceOrientation: string;
    colorPalette: string[];
}

// --- GENERATE NEW NFT SAMPLE ---

async function generateNewNFTSample(config: NewNFTConfig, outputPath: string): Promise<string> {
    console.log(`\n🎨 Generating new NFT sample...`);

    const prompt = `Create a CLEAN, MINIMAL NFT character base with NO accessories or traits.

SUBJECT & STYLE:
- Subject: ${config.subject}
- Theme: ${config.theme}
- Art Style: ${config.artStyle}
- Mood/Expression: ${config.mood}
- Face Orientation: ${config.faceOrientation} view
- Color Palette: ${config.colorPalette.join(", ")}

CRITICAL REQUIREMENTS - CLEAN BASE ONLY:
1. Create a ${config.subject} character in ${config.artStyle} style
2. ${config.mood} expression
3. ${config.faceOrientation} face orientation
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

OUTPUT: A clean, minimal ${config.subject} character base ready for trait addition.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-pro-image-preview",
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
            throw new Error("Failed to generate NFT sample");
        }

        const buffer = Buffer.from(imagePart.inlineData.data, 'base64');
        fs.writeFileSync(outputPath, buffer);

        console.log(`✅ NFT sample generated: ${outputPath}`);
        return outputPath;

    } catch (error: any) {
        console.error(`❌ Failed to generate sample:`, error.message);
        throw error;
    }
}

// --- PARSE PROMPT TO CONFIG ---

async function parsePromptToConfig(prompt: string): Promise<NewNFTConfig> {
    console.log(`\n🤖 Parsing prompt: "${prompt}"`);

    const aiPrompt = `Analyze this NFT collection prompt and extract configuration details.

Prompt: "${prompt}"

Provide a JSON response with:
{
    "subject": "main character type (e.g., cat, robot, dragon, alien)",
    "theme": "theme/style (e.g., cyberpunk, fantasy, horror, cute)",
    "artStyle": "art style (e.g., cartoon, anime, realistic, pixel art)",
    "mood": "mood/expression (e.g., cool, fierce, cute, mysterious)",
    "faceOrientation": "face view (frontal, three-quarter, or profile)",
    "colorPalette": ["#hex1", "#hex2", "#hex3"]
}

Examples:
- "Cyberpunk Cat" → subject: cat, theme: cyberpunk, artStyle: neon cartoon, mood: cool, colors: neon
- "Fantasy Dragon" → subject: dragon, theme: fantasy, artStyle: cartoon, mood: majestic, colors: gold/purple
- "Cute Space Bunny" → subject: bunny, theme: space, artStyle: kawaii, mood: cute, colors: pastel

Extract the most appropriate values based on the prompt.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash-exp",
            contents: {
                role: "user",
                parts: [{ text: aiPrompt }]
            }
        });

        const analysisText = response.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
        const config = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

        if (!config) {
            throw new Error("Failed to parse prompt");
        }

        console.log(`✅ Configuration extracted:`);
        console.log(`   Subject: ${config.subject}`);
        console.log(`   Theme: ${config.theme}`);
        console.log(`   Art Style: ${config.artStyle}`);
        console.log(`   Mood: ${config.mood}`);
        console.log(`   Face Orientation: ${config.faceOrientation}`);
        console.log(`   Colors: ${config.colorPalette.join(", ")}`);

        return config;

    } catch (error: any) {
        console.error(`⚠️  Parsing failed, using defaults`);
        // Extract subject from prompt (first word usually)
        const words = prompt.toLowerCase().split(" ");
        const subject = words[words.length - 1] || "character";
        const theme = words[0] || "modern";

        return {
            subject,
            theme,
            artStyle: "cartoon",
            mood: "cool",
            faceOrientation: "three-quarter",
            colorPalette: ["#00FF00", "#FF00FF", "#FFFF00"]
        };
    }
}

// --- AUTO-DETECT STYLE ---

async function analyzeNFTStyle(imagePath: string): Promise<NFTStyle> {
    console.log(`\n🔍 Auto-detecting style from NFT...`);

    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString("base64");

    const prompt = `Analyze this NFT image and extract its style characteristics.

Provide a JSON response with:
{
    "artStyle": "detailed description of the art style",
    "theme": "the theme or concept",
    "mood": "the mood or emotion conveyed",
    "colorPalette": ["#hex1", "#hex2", "#hex3"]
}`;

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
        const style = jsonMatch ? JSON.parse(jsonMatch[0]) : {
            artStyle: "cartoon",
            theme: "character",
            mood: "neutral",
            colorPalette: ["#8B4513", "#D2691E", "#F5DEB3"]
        };

        console.log(`✅ Style detected`);
        console.log(`   Art Style: ${style.artStyle}`);
        console.log(`   Theme: ${style.theme}`);
        console.log(`   Mood: ${style.mood}`);

        return style;

    } catch (error: any) {
        console.error(`⚠️  Analysis failed, using defaults:`, error.message);
        return {
            artStyle: "cartoon",
            theme: "character",
            mood: "neutral",
            colorPalette: ["#8B4513", "#D2691E", "#F5DEB3"]
        };
    }
}

// --- GENERATE MATCHING TRAIT ---

async function generateMatchingTrait(
    category: string,
    style: NFTStyle,
    variationNumber: number,
    outputDir: string
): Promise<GeneratedTrait | null> {
    const prompt = `Generate a single ${category} trait for an NFT character.

STYLE TO MATCH:
- Art Style: ${style.artStyle}
- Theme: ${style.theme}
- Mood: ${style.mood}
- Color Palette: ${style.colorPalette.join(", ")}

REQUIREMENTS:
1. Create ONLY the ${category} item (not the full character)
2. Match the art style exactly
3. Use the specified color palette
4. Transparent or solid background
5. Professional NFT quality
6. Variation ${variationNumber} - make it unique

EXAMPLES:
- background: gradient, pattern, scene, abstract, solid color
- headwear: hat, cap, crown, helmet, headband
- eyewear: sunglasses, glasses, goggles, visor
- accessory: chain, earring, watch, badge
- clothing: shirt, jacket, vest, hoodie

OUTPUT: Just the ${category} item, ready to be composited onto a character.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-pro-image-preview",
            contents: {
                role: "user",
                parts: [{ text: prompt }]
            },
            config: {
                seed: (Date.now() + variationNumber) % 2147483647,
                temperature: 0.7
            }
        });

        const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);

        if (!imagePart || !imagePart.inlineData?.data) {
            return null;
        }

        const buffer = Buffer.from(imagePart.inlineData.data, 'base64');
        const filename = `${category}_${variationNumber}.png`;
        const filepath = path.join(outputDir, filename);

        fs.writeFileSync(filepath, buffer);

        return {
            category,
            description: `${category} variation ${variationNumber}`,
            imagePath: filepath
        };

    } catch (error: any) {
        console.error(`   ⚠️  Failed to generate ${category} ${variationNumber}`);
        return null;
    }
}

// --- MAIN WORKFLOW ---

async function generateCompleteNFTCollection(
    mode: "new" | "existing",
    baseImagePath?: string,
    newNFTConfig?: NewNFTConfig,
    traitsPerCategory: number = 3,
    nftsToGenerate: number = 5
) {
    console.log("🚀 Complete NFT Generation Workflow\n");
    console.log("=".repeat(60));

    let samplePath: string;

    // Step 1: Get or generate NFT sample
    if (mode === "new" && newNFTConfig) {
        console.log("\n📋 STEP 1: Generating New NFT Sample");
        console.log("-".repeat(60));

        const timestamp = Date.now();
        const outputDir = "nft-templates/generated";
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        samplePath = path.join(outputDir, `${newNFTConfig.subject}_${newNFTConfig.theme}_${timestamp}.png`);
        await generateNewNFTSample(newNFTConfig, samplePath);
    } else if (mode === "existing" && baseImagePath) {
        console.log("\n📋 STEP 1: Using Existing NFT Sample");
        console.log("-".repeat(60));
        samplePath = baseImagePath;
        console.log(`✅ Using: ${path.basename(samplePath)}`);
    } else {
        throw new Error("Invalid mode or missing configuration");
    }

    // Step 2: Auto-detect style
    console.log("\n📋 STEP 2: Auto-Detecting Style");
    console.log("-".repeat(60));
    const style = await analyzeNFTStyle(samplePath);

    // Step 3: Generate matching traits
    console.log("\n📋 STEP 3: Generating Matching Traits");
    console.log("-".repeat(60));

    const traitsDir = "generated-traits/auto-generated";
    if (!fs.existsSync(traitsDir)) {
        fs.mkdirSync(traitsDir, { recursive: true });
    }

    const categories = ["background", "headwear", "eyewear", "accessory", "clothing"];
    const generatedTraits: GeneratedTrait[] = [];

    for (const category of categories) {
        console.log(`\n  Generating ${category} traits...`);
        const categoryDir = path.join(traitsDir, category);
        if (!fs.existsSync(categoryDir)) {
            fs.mkdirSync(categoryDir, { recursive: true });
        }

        for (let i = 1; i <= traitsPerCategory; i++) {
            console.log(`   Generating ${category} variation ${i}...`);
            const trait = await generateMatchingTrait(category, style, i, categoryDir);
            if (trait) {
                generatedTraits.push(trait);
                console.log(`     ✅ ${category} ${i}/${traitsPerCategory}`);
            }
        }
    }

    console.log(`\n✅ Generated ${generatedTraits.length} traits`);

    // Step 4: Create NFT collection
    console.log("\n📋 STEP 4: Creating NFT Collection");
    console.log("-".repeat(60));

    const collectionDir = path.join("nft-collection", "auto-generated");
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
        console.log(`   Base: ${path.basename(samplePath)}`);
        selectedTraits.forEach((t, idx) => {
            console.log(`   Trait ${idx + 1}: ${path.basename(t.imagePath)}`);
        });

        const outputPath = path.join(collectionDir, `nft_${i}.png`);

        try {
            const traitsToComposite = selectedTraits.map(t => ({
                category: t.category,
                imagePath: t.imagePath
            }));

            await compositeMultipleTraits(samplePath, traitsToComposite, outputPath);
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
    console.log(`   Base NFT: ${path.basename(samplePath)}`);
    console.log(`   Style: ${style.artStyle} / ${style.theme} / ${style.mood}`);
    console.log(`   Traits Generated: ${generatedTraits.length}`);
    console.log(`   NFTs Created: ${nftPaths.length}/${nftsToGenerate}`);
    console.log(`   Success Rate: ${((nftPaths.length / nftsToGenerate) * 100).toFixed(1)}%`);
    console.log(`\n📁 Sample: ${samplePath}`);
    console.log(`📁 Traits Directory: ${traitsDir}`);
    console.log(`📁 Collection Directory: ${collectionDir}`);
}

// --- CLI ---

if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.includes("--help") || args.includes("-h")) {
        console.log(`
🎨 Complete NFT Generation Workflow

Usage:
  # Simple prompt mode (AI auto-configures everything) - RECOMMENDED
  npx tsx scripts/generate-complete-nft.ts prompt "<description>" [traits-per-category] [nfts-count]

  # Manual mode (specify all parameters)
  npx tsx scripts/generate-complete-nft.ts new <subject> <theme> <art-style> <mood> <face-orientation> <colors> [traits-per-category] [nfts-count]

  # Use existing NFT sample
  npx tsx scripts/generate-complete-nft.ts existing <image-path> [traits-per-category] [nfts-count]

Examples:
  # Simple prompt mode
  npx tsx scripts/generate-complete-nft.ts prompt "Cyberpunk Cat" 5 10
  npx tsx scripts/generate-complete-nft.ts prompt "Fantasy Dragon" 5 10
  npx tsx scripts/generate-complete-nft.ts prompt "Cute Space Bunny" 5 10

  # Manual mode
  npx tsx scripts/generate-complete-nft.ts new robot cyberpunk cartoon cool frontal "#00FF00,#FF00FF,#FFFF00" 5 10

  # Use existing NFT
  npx tsx scripts/generate-complete-nft.ts existing nft-templates/sample_ape.png 5 10

What it does:
  1. Generate new NFT sample (or use existing)
  2. Auto-detect style from sample
  3. Generate matching traits (background, headwear, eyewear, accessory, clothing)
  4. Create NFT collection with random trait combinations
        `);
        process.exit(0);
    }

    const mode = args[0] as "prompt" | "new" | "existing";

    if (mode === "prompt") {
        // Simple prompt mode - AI auto-configures everything
        const promptText = args[1];
        const traitsPerCategory = parseInt(args[2]) || 3;
        const nftsToGenerate = parseInt(args[3]) || 5;

        if (!promptText) {
            console.error(`❌ Please provide a prompt description`);
            console.log(`Example: npx tsx scripts/generate-complete-nft.ts prompt "Cyberpunk Cat" 5 10`);
            process.exit(1);
        }

        (async () => {
            const config = await parsePromptToConfig(promptText);
            await generateCompleteNFTCollection("new", undefined, config, traitsPerCategory, nftsToGenerate);
        })().catch(console.error);

    } else if (mode === "new") {
        const subject = args[1] || "robot";
        const theme = args[2] || "cyberpunk";
        const artStyle = args[3] || "cartoon";
        const mood = args[4] || "cool";
        const faceOrientation = args[5] || "three-quarter";
        const colorsInput = args[6] || "#00FF00,#FF00FF,#FFFF00";
        const traitsPerCategory = parseInt(args[7]) || 3;
        const nftsToGenerate = parseInt(args[8]) || 5;

        const colorPalette = colorsInput.split(",").map(c => c.trim());

        const config: NewNFTConfig = {
            subject,
            theme,
            artStyle,
            mood,
            faceOrientation,
            colorPalette
        };

        generateCompleteNFTCollection("new", undefined, config, traitsPerCategory, nftsToGenerate)
            .catch(console.error);

    } else if (mode === "existing") {
        const imagePath = args[1];
        const traitsPerCategory = parseInt(args[2]) || 3;
        const nftsToGenerate = parseInt(args[3]) || 5;

        if (!imagePath || !fs.existsSync(imagePath)) {
            console.error(`❌ Image not found: ${imagePath}`);
            process.exit(1);
        }

        generateCompleteNFTCollection("existing", imagePath, undefined, traitsPerCategory, nftsToGenerate)
            .catch(console.error);

    } else {
        console.error(`❌ Invalid mode. Use 'prompt', 'new', or 'existing'`);
        console.log("Run with --help for usage instructions");
        process.exit(1);
    }
}
