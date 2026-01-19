
import { GoogleGenAI } from "@google/genai";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

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
const GRID_SEED = 99999; // Fixed seed for reproducibility

// --- SINGLE PROMPT GRID GENERATION ---
async function generateTraitGrid(theme: string) {
    console.log(`🎨 Generating all traits in a single 3x2 grid for theme: "${theme}"...`);

    const prompt = `
Project: beyoundUS_Asset_System
Layout: 3x2 Grid Sheet (6 quadrants total)
Style: ${theme} cartoon style, flat colors, clean thin black outlines, simple 2D animation aesthetic

Global Settings:
- Background: Solid white #FFFFFF for entire canvas
- Symmetry: Each trait perfectly centered on vertical axis within its quadrant
- Perspective: Neutral front-facing for all traits

Generate a 3x2 grid containing these 6 NFT trait layers:

QUADRANT 1 (Top-Left) - body_base:
Headless human body base in ${theme} style, thin noodle arms, lanky neutral A-pose, tan skin, centered, very simple anatomy.

QUADRANT 2 (Top-Right) - head_base:
Large-scale bald head base, ${theme} style, round shape, no hair, matching skin tone, centered, simple C-shaped ears.

QUADRANT 3 (Mid-Left) - clothing_wear:
Character outfit trait: Blue T-shirt and lab coat, ${theme} style, hollow inside to fit the lanky body_base, flat colors, no shading.

QUADRANT 4 (Mid-Right) - eye_trait:
Pair of ${theme} eyes: large white circles with small black asterisk (*) or 'scribble' pupils, matching the scale of the head_base, isolated.

QUADRANT 5 (Bottom-Left) - hat_trait:
Headwear trait: Alien helmet, simple cartoon lines, scaled for the large head_base, front-facing.

QUADRANT 6 (Bottom-Right) - accessory_trait:
Accessory trait: Portal gun or sci-fi device, ${theme} style, simple geometric shapes, flat colors.

Technical Anchor Logic:
- The collar of the 'clothing_wear' must align exactly with the thin neck stump of the body_base.
- The head_base must be generated at 200% scale relative to the body to capture specific pupil detail and line thickness.
- All traits must be perfectly centered within their quadrants.
- Each quadrant should have clear separation (thin black border lines between quadrants).

Negative Prompt: 3d render, realistic proportions, high-detail muscles, gradients, complex shading, anime style, thick brushstrokes, blurry, hair on bald head, overlapping quadrants

CRITICAL: Generate all 6 traits in a single image arranged in a 3x2 grid. Each trait should be isolated in its quadrant.
`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-image",
            contents: {
                role: "user",
                parts: [{ text: prompt }]
            },
            config: {
                seed: GRID_SEED,
                temperature: 0.3
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
            console.error("❌ No image data found");
            return null;
        }

        const buffer = Buffer.from(imageData, 'base64');
        const outputPath = path.join(OUTPUT_DIR, "trait_grid_3x2.png");

        // Ensure output dir exists
        if (!fs.existsSync(OUTPUT_DIR)) {
            fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        }

        fs.writeFileSync(outputPath, buffer);
        console.log(`✅ Trait grid saved to ${outputPath}`);

        return outputPath;

    } catch (error: any) {
        console.error("❌ Grid generation failed:", error.message);
        return null;
    }
}

async function combineGridIntoNFT(gridPath: string, theme: string) {
    console.log(`\n🤖 Asking Gemini to combine all traits from grid into a single NFT character...`);

    if (!fs.existsSync(gridPath)) {
        console.error("❌ Grid file not found!");
        return null;
    }

    const gridBuffer = fs.readFileSync(gridPath);
    const base64Grid = gridBuffer.toString("base64");

    const prompt = `
You are given a 3x2 grid containing 6 separate NFT trait layers in ${theme} style.

The grid layout is:
- Top-Left: body_base (headless body)
- Top-Right: head_base (bald head)
- Mid-Left: clothing_wear (outfit)
- Mid-Right: eye_trait (eyes)
- Bottom-Left: hat_trait (headwear)
- Bottom-Right: accessory_trait (optional accessory)

YOUR TASK:
Generate a SINGLE, COMPLETE NFT character by combining ALL these traits into one cohesive image.

Instructions:
1. Extract the visual style and design from each quadrant
2. Combine them into a single character:
   - Place the head on the body's neck
   - Add the clothing onto the body
   - Add the eyes onto the face
   - Add the hat onto the head
   - Include the accessory if appropriate
3. Maintain the ${theme} cartoon style
4. Create a perfectly centered, front-facing character
5. White background (#FFFFFF)
6. The result should look like ONE complete character, not separate layers

Technical Requirements:
- Neutral A-pose, standing upright
- Centered on canvas
- Clean, cohesive design
- Production-ready NFT character

CRITICAL: Generate a SINGLE complete character image, not a grid. All traits should be integrated into one cohesive design.
`;

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
                seed: GRID_SEED,
                temperature: 0.3
            }
        });

        const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);

        if (!imagePart || !imagePart.inlineData?.data) {
            console.error("❌ Failed to generate combined NFT");
            return null;
        }

        const buffer = Buffer.from(imagePart.inlineData.data, 'base64');
        const outputPath = path.join(OUTPUT_DIR, "combined_nft_from_grid.png");
        fs.writeFileSync(outputPath, buffer);
        console.log(`✅ Combined NFT saved to ${outputPath}`);

        return outputPath;

    } catch (error: any) {
        console.error("❌ Combination failed:", error.message);
        return null;
    }
}

// --- MAIN ---
async function main() {
    console.log("🚀 Testing Single-Prompt Grid Generation + Combination...\n");

    const theme = "Rick and Morty";

    // Step 1: Generate trait grid
    const gridPath = await generateTraitGrid(theme);

    if (!gridPath) {
        console.error("❌ Failed to generate grid");
        return;
    }

    // Step 2: Combine grid into single NFT
    await combineGridIntoNFT(gridPath, theme);

    console.log("\n✨ Test Complete!");
    console.log("\n� Generated files:");
    console.log("   - Trait grid: generated-traits/trait_grid_3x2.png");
    console.log("   - Combined NFT: generated-traits/combined_nft_from_grid.png");
}

main().catch(console.error);
