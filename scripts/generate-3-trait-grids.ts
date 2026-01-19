
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

async function generateTraitGrid(theme: string, variation: number, totalVariations: number) {
    console.log(`\n🎨 [${variation}/${totalVariations}] Generating trait grid for theme: "${theme}"...`);

    // Define different trait variations
    const variations = [
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

    const traits = variations[variation - 1] || variations[0];

    const prompt = `Create a 3x2 grid (3 columns, 2 rows = 6 quadrants total) of NFT character trait layers in ${theme} cartoon style with flat colors and clean black outlines.

CRITICAL GRID LAYOUT - Each trait MUST be in its exact position:

ROW 1 (TOP):
- TOP-LEFT (Position 1): Headless body base - lanky tan body in neutral A-pose, thin noodle arms, NO HEAD, simple anatomy
- TOP-CENTER (Position 2): Bald head base - large round head with simple C-shaped ears, tan skin, NO HAIR, front-facing
- TOP-RIGHT (Position 3): Clothing - ${traits.clothing}, hollow/transparent inside to layer over body

ROW 2 (BOTTOM):
- BOTTOM-LEFT (Position 4): Eyes - ${traits.eyes}, isolated eye design to place on head
- BOTTOM-CENTER (Position 5): Hair - ${traits.hair}, designed to sit on top of the bald head
- BOTTOM-RIGHT (Position 6): Accessory - ${traits.accessory}, simple flat design

STRICT RULES:
- Each quadrant has a thin black border separating it from others
- All traits centered within their quadrants
- White background (#FFFFFF) for each quadrant
- Simple 2D cartoon style, flat colors, no gradients or 3D effects
- Each trait is SEPARATE and ISOLATED in its own box
- DO NOT combine traits - keep them in separate quadrants

Style: ${theme} animation style, clean thin black outlines, flat cel-shading, simple shapes

NEGATIVE: 3d render, realistic, gradients, complex shading, anime, blurry, combined character, overlapping quadrants, merged traits`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-image",
            contents: {
                role: "user",
                parts: [{ text: prompt }]
            },
            config: {
                seed: BASE_SEED + variation,
                temperature: 0.9
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
            console.error(`❌ No image data found for grid ${variation}`);
            return null;
        }

        const buffer = Buffer.from(imageData, 'base64');
        const outputPath = path.join(OUTPUT_DIR, `trait_grid_${variation}.png`);

        // Ensure output dir exists
        if (!fs.existsSync(OUTPUT_DIR)) {
            fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        }

        fs.writeFileSync(outputPath, buffer);
        console.log(`✅ Trait grid ${variation} saved to ${outputPath}`);

        return outputPath;

    } catch (error: any) {
        console.error(`❌ Grid generation failed for variation ${variation}:`, error.message);
        return null;
    }
}

async function mergeGridIntoNFT(gridPath: string, theme: string, variation: number) {
    console.log(`\n🤖 [${variation}] Merging trait grid into complete NFT character...`);

    if (!fs.existsSync(gridPath)) {
        console.error(`❌ Grid file not found: ${gridPath}`);
        return null;
    }

    const gridBuffer = fs.readFileSync(gridPath);
    const base64Grid = gridBuffer.toString("base64");

    // Define character descriptions for each variation
    const characterDescriptions = [
        {
            base_subject: `${theme} style character - Variation 1`,
            components: {
                body: "Tall, lanky, and thin physique with tan skin, neutral A-pose",
                head_shape: "Round head with simple C-shaped ears, bald base",
                hair: "Spiky blue 'mad scientist' style hair (from grid Bottom-Left)",
                eyes: "Large white circles with small black asterisk pupils (from grid Mid-Right)",
                clothing: "Blue t-shirt and white laboratory coat (from grid Mid-Left)",
                accessory: "High-tech sci-fi portal gun with glowing accents (from grid Bottom-Right)"
            }
        },
        {
            base_subject: `${theme} style character - Variation 2`,
            components: {
                body: "Tall, lanky, and thin physique with tan skin, neutral A-pose",
                head_shape: "Round head with simple C-shaped ears, bald base",
                hair: "Brown messy hair style (from grid Bottom-Left)",
                eyes: "Large white circles with worried/anxious pupils (from grid Mid-Right)",
                clothing: "Yellow t-shirt (from grid Mid-Left)",
                accessory: "Backpack (from grid Bottom-Right)"
            }
        },
        {
            base_subject: `${theme} style character - Variation 3`,
            components: {
                body: "Tall, lanky, and thin physique with tan skin, neutral A-pose",
                head_shape: "Round head with simple C-shaped ears, bald base",
                hair: "Long orange hair style (from grid Bottom-Left)",
                eyes: "Large white circles with annoyed pupils (from grid Mid-Right)",
                clothing: "Pink tank top (from grid Mid-Left)",
                accessory: "Smartphone (from grid Bottom-Right)"
            }
        }
    ];

    const charDesc = characterDescriptions[variation - 1] || characterDescriptions[0];

    const prompt = `You are given a 3x2 grid image containing 6 separate NFT character trait layers. Your task is to combine ALL 6 traits into ONE complete ${theme} style character.

THE GRID LAYOUT YOU RECEIVED:
- TOP-LEFT (Position 1): Headless body base
- TOP-CENTER (Position 2): Bald head (CRITICAL - this MUST appear in final character)
- TOP-RIGHT (Position 3): ${charDesc.components.clothing}
- BOTTOM-LEFT (Position 4): ${charDesc.components.eyes}
- BOTTOM-CENTER (Position 5): ${charDesc.components.hair}
- BOTTOM-RIGHT (Position 6): ${charDesc.components.accessory}

ASSEMBLY INSTRUCTIONS - Follow this EXACT order:
1. START with the headless body from TOP-LEFT as your foundation
2. LAYER the clothing from TOP-RIGHT onto the body
3. PLACE the bald head from TOP-CENTER on top of the body's neck - THE HEAD MUST BE FULLY VISIBLE
4. ADD the eyes from BOTTOM-LEFT onto the head's face
5. ADD the hair from BOTTOM-CENTER on top of the head (the head should still be visible underneath the hair)
6. ADD the accessory from BOTTOM-RIGHT (in hand or nearby the character)

CRITICAL REQUIREMENTS:
- The final character MUST have a visible head with face, chin, and neck
- Hair goes ON TOP of the head, not instead of it
- All 6 traits must be present in the final merged character
- The character should be: ${charDesc.components.body}, with ${charDesc.components.head_shape}

STYLE: ${theme} cartoon style, flat colors, clean black outlines, simple 2D animation aesthetic, neutral A-pose, front-facing, centered on white background

OUTPUT: A single complete character combining all 6 traits from the grid, NOT a grid layout.

NEGATIVE: Grid layout, separated traits, missing head, headless character, 3d render, realistic, complex shading`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-image",
            contents: {
                role: "user",
                parts: [
                    { text: prompt },
                    {
                        inlineData: {
                            mimeType: "image/png",
                            data: base64Grid
                        }
                    }
                ]
            },
            config: {
                seed: BASE_SEED + variation + 1000, // Different seed for merge
                temperature: 0.3
            }
        });

        const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);

        if (!imagePart || !imagePart.inlineData?.data) {
            console.error(`❌ Failed to merge grid ${variation}`);
            return null;
        }

        const buffer = Buffer.from(imagePart.inlineData.data, 'base64');
        const outputPath = path.join(OUTPUT_DIR, `merged_nft_${variation}.png`);
        fs.writeFileSync(outputPath, buffer);
        console.log(`✅ Merged NFT ${variation} saved to ${outputPath}`);

        return outputPath;

    } catch (error: any) {
        console.error(`❌ Merge failed for grid ${variation}:`, error.message);
        return null;
    }
}

// --- MAIN ---
async function main() {
    console.log("🚀 Generating 3 Different Trait Grid Images...\n");

    const theme = await askQuestion("Enter NFT Theme (e.g., 'Rick and Morty', 'Cyberpunk'): ");

    if (!theme) {
        console.error("❌ Theme is required!");
        return;
    }

    const totalVariations = 3;
    const generatedGrids: string[] = [];
    const mergedNFTs: string[] = [];

    // Step 1: Generate all trait grids
    console.log("\n📋 Step 1: Generating trait grids...");
    for (let i = 1; i <= totalVariations; i++) {
        const filePath = await generateTraitGrid(theme, i, totalVariations);
        if (filePath) {
            generatedGrids.push(filePath);
        }
    }

    // Step 2: Merge each grid into complete NFT
    console.log("\n📋 Step 2: Merging grids into complete NFT characters...");
    for (let i = 0; i < generatedGrids.length; i++) {
        const mergedPath = await mergeGridIntoNFT(generatedGrids[i], theme, i + 1);
        if (mergedPath) {
            mergedNFTs.push(mergedPath);
        }
    }

    console.log("\n✨ Generation Complete!");
    console.log(`\n📁 Generated ${generatedGrids.length} trait grids:`);
    generatedGrids.forEach((file, idx) => {
        console.log(`   ${idx + 1}. ${file}`);
    });
    console.log(`\n🎨 Generated ${mergedNFTs.length} merged NFT characters:`);
    mergedNFTs.forEach((file, idx) => {
        console.log(`   ${idx + 1}. ${file}`);
    });
}

main().catch(console.error);
