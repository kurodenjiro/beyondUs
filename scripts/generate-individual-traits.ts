
import { GoogleGenAI } from "@google/genai";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import * as readline from "readline";

// Load environment variables
dotenv.config({ path: ".env.local" });

const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error("❌ No API key found. Please set GOOGLE_AI_API_KEY or GEMINI_API_KEY in .env.local");
    process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

// --- CONFIGURATION ---
const OUTPUT_DIR = "generated-traits";
const BASE_SEED = 88888;

// Trait type definitions
type TraitType = "body" | "head" | "clothing" | "eyes" | "hair" | "accessory";

interface TraitPaths {
    body: string;
    head: string;
    clothing: string;
    eyes: string;
    hair: string;
    accessory: string;
}

interface VariationTraits {
    clothing: string;
    eyes: string;
    hair: string;
    accessory: string;
}

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

// Define different trait variations
const TRAIT_VARIATIONS: VariationTraits[] = [
    {
        clothing: "Blue t-shirt and white lab coat",
        eyes: "Large white circles with small black asterisk pupils",
        hair: "Spiky blue hair (Rick style)",
        accessory: "Portal gun"
    },
    {
        clothing: "Yellow t-shirt",
        eyes: "Large white circles with worried/anxious pupils",
        hair: "Brown messy hair (Morty style)",
        accessory: "Backpack"
    },
    {
        clothing: "Pink tank top",
        eyes: "Large white circles with annoyed pupils",
        hair: "Long orange hair (Summer style)",
        accessory: "Smartphone"
    }
];

function getTraitPrompt(traitType: TraitType, theme: string, traits: VariationTraits): string {
    const baseStyle = `${theme} cartoon style, flat colors, clean thin black outlines, simple 2D animation aesthetic`;

    switch (traitType) {
        case "body":
            return `Generate a headless human body in ${theme} style.

REQUIREMENTS:
- Lanky, thin physique with tan/peach skin tone
- Neutral A-pose with arms slightly away from body
- NO HEAD - clean neck stump visible at top
- Simple anatomy with thin "noodle" arms and legs
- Full body from neck to feet
- Clean black outlines, flat colors, no gradients
- White background (#FFFFFF)
- Front-facing view, perfectly centered
- Simple, minimalist design

STYLE: ${baseStyle}

CRITICAL: The body MUST NOT have a head. Show the neck stump clearly.

NEGATIVE: head, face, hair, realistic, 3d render, complex shading, gradients, side view`;

        case "head":
            return `Generate ONLY a bald head (no body) in ${theme} style.

REQUIREMENTS:
- Large round head with simple C-shaped ears
- Tan/peach skin tone matching body
- NO HAIR, NO EYES, NO FACIAL FEATURES - completely blank bald head
- Simple facial structure outline
- Neck stump visible at bottom
- Clean black outlines, flat colors
- White background (#FFFFFF)
- Front-facing, perfectly centered
- Large scale to show detail

STYLE: ${baseStyle}

CRITICAL: This is ONLY a bald head. No hair, no eyes, no eyebrows, no mouth details.

NEGATIVE: hair, eyes, eyebrows, detailed face, body, realistic, 3d render, complex shading, gradients`;

        case "clothing":
            return `Generate clothing: ${traits.clothing} in ${theme} style.

REQUIREMENTS:
- ${traits.clothing}
- Designed to fit over a lanky, thin body
- Hollow/transparent in the middle (to layer over body)
- Show collar, sleeves, and main garment shape
- Clean black outlines, flat colors
- White background (#FFFFFF)
- Front-facing view, centered
- Simple, clean design

STYLE: ${baseStyle}

CRITICAL: Show the clothing as if laid flat, ready to be layered over a body.

NEGATIVE: body inside clothing, person wearing it, realistic, 3d render, complex shading, gradients`;

        case "eyes":
            return `Generate eye design: ${traits.eyes} in ${theme} style.

REQUIREMENTS:
- ${traits.eyes}
- Two eyes side by side
- Isolated eye design (no face, no head)
- Appropriate scale to fit on a cartoon head
- Clean black outlines, flat colors
- White background (#FFFFFF)
- Front-facing, centered
- Simple, expressive design

STYLE: ${baseStyle}

CRITICAL: ONLY the eyes. No head, no face outline, no other facial features.

NEGATIVE: head, face outline, nose, mouth, body, realistic, 3d render, complex shading, gradients`;

        case "hair":
            return `Generate ONLY hair: ${traits.hair} in ${theme} style.

REQUIREMENTS:
- ${traits.hair}
- JUST THE HAIR - no head, no face underneath
- Designed to sit on top of a bald head
- Show the hairstyle shape and style clearly
- Clean black outlines, flat colors
- White background (#FFFFFF)
- Front-facing, centered
- Hollow/transparent where it would sit on the head

STYLE: ${baseStyle}

CRITICAL: This is ONLY the hair/hairstyle. There should be NO HEAD or FACE visible underneath the hair.

NEGATIVE: head, face, eyes, complete character, body, realistic, 3d render, complex shading, gradients`;

        case "accessory":
            return `Generate accessory: ${traits.accessory} in ${theme} style.

REQUIREMENTS:
- ${traits.accessory}
- Standalone item/prop
- Simple geometric shapes
- Clean black outlines, flat colors
- White background (#FFFFFF)
- Centered, appropriate scale
- Simple, iconic design

STYLE: ${baseStyle}

CRITICAL: Just the accessory item, nothing else.

NEGATIVE: person holding it, body, hands, realistic, 3d render, complex shading, gradients`;

        default:
            throw new Error(`Unknown trait type: ${traitType}`);
    }
}

async function generateIndividualTrait(
    traitType: TraitType,
    theme: string,
    traits: VariationTraits,
    variation: number,
    outputDir: string
): Promise<string | null> {
    console.log(`  🎨 Generating ${traitType}...`);

    const prompt = getTraitPrompt(traitType, theme, traits);

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-image",
            contents: {
                role: "user",
                parts: [{ text: prompt }]
            },
            config: {
                seed: BASE_SEED + variation * 100 + Object.keys(TRAIT_VARIATIONS[0]).indexOf(traitType),
                temperature: 0.85
            }
        });

        const candidate = response.candidates?.[0];
        const parts = candidate?.content?.parts || [];

        let imageData: string | null = null;

        for (const part of parts) {
            if (part.inlineData && part.inlineData.data) {
                imageData = part.inlineData.data;
                break;
            }
        }

        if (!imageData) {
            console.error(`    ❌ No image data found for ${traitType}`);
            return null;
        }

        const buffer = Buffer.from(imageData, 'base64');
        const traitOrder = ["body", "head", "clothing", "eyes", "hair", "accessory"].indexOf(traitType) + 1;
        const outputPath = path.join(outputDir, `${traitOrder}_${traitType}.png`);

        fs.writeFileSync(outputPath, buffer);
        console.log(`    ✅ ${traitType} saved`);

        return outputPath;

    } catch (error: any) {
        console.error(`    ❌ Failed to generate ${traitType}:`, error.message);
        return null;
    }
}

async function mergeTraitsIntoNFT(
    traitPaths: TraitPaths,
    theme: string,
    variation: number,
    outputDir: string
): Promise<string | null> {
    console.log(`\n🤖 Merging traits into complete NFT character...`);

    // Read all trait images
    const traitImages: { [key: string]: string } = {};

    for (const [traitType, traitPath] of Object.entries(traitPaths)) {
        if (!fs.existsSync(traitPath)) {
            console.error(`❌ Trait file not found: ${traitPath}`);
            return null;
        }
        const buffer = fs.readFileSync(traitPath);
        traitImages[traitType] = buffer.toString("base64");
    }

    const prompt = `You are given 6 separate trait images to combine into ONE complete ${theme} style character.

THE 6 TRAIT IMAGES:
1. BODY: Headless body in neutral A-pose
2. HEAD: Bald head with no hair or eyes
3. CLOTHING: Outfit to layer over the body
4. EYES: Eye design to place on the head's face
5. HAIR: Hairstyle to place on top of the head
6. ACCESSORY: Item for the character to hold or wear

ASSEMBLY INSTRUCTIONS - Follow this EXACT order:
1. START with the BODY image as your foundation (headless body)
2. LAYER the CLOTHING over the body
3. PLACE the HEAD on top of the body's neck stump
4. ADD the EYES onto the head's face area
5. ADD the HAIR on top of the head (the head's face should still be visible below the hair)
6. ADD the ACCESSORY in the character's hand or nearby

CRITICAL REQUIREMENTS:
- The final character MUST have a visible head with face
- The head should be clearly visible with the hair on top of it
- All body parts must be present: full body with legs, head, everything
- Hair goes ON TOP of the head, not instead of it
- The character should be complete from head to toe
- All 6 traits must be integrated seamlessly

STYLE: ${theme} cartoon style, flat colors, clean black outlines, simple 2D animation aesthetic
- Neutral A-pose, standing upright
- Front-facing, perfectly centered
- White background (#FFFFFF)
- Clean, cohesive final character

OUTPUT: A single complete character combining all 6 traits. NOT separate images, NOT a grid layout.

NEGATIVE: Grid layout, separated traits, missing head, headless character, missing legs, incomplete body, 3d render, realistic, complex shading`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-image",
            contents: {
                role: "user",
                parts: [
                    { text: prompt },
                    { inlineData: { mimeType: "image/png", data: traitImages.body } },
                    { inlineData: { mimeType: "image/png", data: traitImages.head } },
                    { inlineData: { mimeType: "image/png", data: traitImages.clothing } },
                    { inlineData: { mimeType: "image/png", data: traitImages.eyes } },
                    { inlineData: { mimeType: "image/png", data: traitImages.hair } },
                    { inlineData: { mimeType: "image/png", data: traitImages.accessory } }
                ]
            },
            config: {
                seed: BASE_SEED + variation * 100 + 1000,
                temperature: 0.3
            }
        });

        const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);

        if (!imagePart || !imagePart.inlineData?.data) {
            console.error(`❌ Failed to merge traits`);
            return null;
        }

        const buffer = Buffer.from(imagePart.inlineData.data, 'base64');
        const outputPath = path.join(outputDir, `merged_character.png`);
        fs.writeFileSync(outputPath, buffer);
        console.log(`✅ Merged character saved`);

        return outputPath;

    } catch (error: any) {
        console.error(`❌ Merge failed:`, error.message);
        return null;
    }
}

function validateTrait(imagePath: string, traitType: string): boolean {
    if (!fs.existsSync(imagePath)) {
        console.error(`❌ Validation failed: ${traitType} file not found`);
        return false;
    }

    const stats = fs.statSync(imagePath);
    const fileSizeKB = stats.size / 1024;

    if (fileSizeKB < 10) {
        console.error(`❌ Validation failed: ${traitType} file too small (${fileSizeKB.toFixed(2)}KB)`);
        return false;
    }

    if (fileSizeKB > 5000) {
        console.error(`❌ Validation failed: ${traitType} file too large (${fileSizeKB.toFixed(2)}KB)`);
        return false;
    }

    return true;
}

// --- MAIN ---
async function main() {
    console.log("🚀 Generating NFT Traits (Individual Approach)...\n");

    const theme = await askQuestion("Enter NFT Theme (e.g., 'Rick and Morty', 'Cyberpunk'): ");

    if (!theme) {
        console.error("❌ Theme is required!");
        return;
    }

    const totalVariations = 3;
    const traitTypes: TraitType[] = ["body", "head", "clothing", "eyes", "hair", "accessory"];

    for (let i = 1; i <= totalVariations; i++) {
        console.log(`\n📋 Variation ${i}/${totalVariations}`);

        const variationDir = path.join(OUTPUT_DIR, `variation_${i}`);

        // Create variation directory
        if (!fs.existsSync(variationDir)) {
            fs.mkdirSync(variationDir, { recursive: true });
        }

        const traits = TRAIT_VARIATIONS[i - 1];
        const traitPaths: Partial<TraitPaths> = {};

        // Generate all individual traits
        console.log(`\n  Step 1: Generating individual traits...`);
        for (const traitType of traitTypes) {
            const filePath = await generateIndividualTrait(traitType, theme, traits, i, variationDir);
            if (filePath) {
                traitPaths[traitType] = filePath;
            }
        }

        // Validate all traits
        console.log(`\n  Step 2: Validating traits...`);
        let allValid = true;
        for (const traitType of traitTypes) {
            const traitPath = traitPaths[traitType];
            if (!traitPath || !validateTrait(traitPath, traitType)) {
                allValid = false;
            }
        }

        if (!allValid) {
            console.error(`\n❌ Variation ${i} failed validation. Skipping merge.`);
            continue;
        }

        console.log(`  ✅ All traits validated`);

        // Merge traits into complete character
        console.log(`\n  Step 3: Merging traits...`);
        const mergedPath = await mergeTraitsIntoNFT(traitPaths as TraitPaths, theme, i, variationDir);

        if (mergedPath) {
            console.log(`\n✅ Variation ${i} complete!`);
        } else {
            console.error(`\n❌ Variation ${i} merge failed`);
        }
    }

    console.log("\n✨ Generation Complete!\n");
    console.log(`📁 Check the '${OUTPUT_DIR}' directory for results.`);
    console.log(`   Each variation has its own folder with individual traits and merged character.\n`);
}

main().catch(console.error);
