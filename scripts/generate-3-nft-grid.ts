
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
const GRID_SEED = 77777;

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

async function generateSingleNFT(theme: string, variation: number, totalVariations: number) {
    console.log(`\n🎨 [${variation}/${totalVariations}] Generating NFT character for theme: "${theme}"...`);

    // Define different trait combinations for each variation
    const variations = [
        {
            clothing: "Blue t-shirt and white lab coat",
            eyes: "Large white circles with small black asterisk pupils",
            hair: "Spiky blue hair (Rick style)",
            accessory: "Portal gun in hand"
        },
        {
            clothing: "Yellow t-shirt",
            eyes: "Large white circles with worried/anxious pupils",
            hair: "Brown messy hair (Morty style)",
            accessory: "None"
        },
        {
            clothing: "Pink tank top",
            eyes: "Large white circles with annoyed pupils",
            hair: "Long orange hair (Summer style)",
            accessory: "Phone in hand"
        }
    ];

    const traits = variations[variation - 1] || variations[0];

    const prompt = `
Generate a SINGLE, COMPLETE NFT character in ${theme} cartoon style.

Character Specifications:
- Body: Tan skin, thin noodle arms, lanky proportions, neutral A-pose
- Head: Bald round head base with simple C-shaped ears
- Clothing: ${traits.clothing}
- Eyes: ${traits.eyes}
- Hair/Hat: ${traits.hair}
- Accessory: ${traits.accessory}

Style Requirements:
- ${theme} cartoon aesthetic
- Flat colors, clean thin black outlines
- Simple 2D animation style
- Perfectly centered, front-facing
- Neutral A-pose, standing upright
- White background (#FFFFFF)

Technical Requirements:
- Production-ready NFT quality
- Clean, cohesive design
- All traits integrated into one complete character
- Centered on canvas with proper padding

Negative Prompt: 3d render, realistic proportions, gradients, complex shading, anime style, blurry, multiple characters, grid layout

CRITICAL: Generate ONE complete character with all traits combined.
`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-image",
            contents: {
                role: "user",
                parts: [{ text: prompt }]
            },
            config: {
                seed: GRID_SEED + variation, // Different seed for each variation
                temperature: 0.4
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
            console.error(`❌ No image data found for variation ${variation}`);
            return null;
        }

        const buffer = Buffer.from(imageData, 'base64');
        const outputPath = path.join(OUTPUT_DIR, `nft_character_${variation}.png`);

        // Ensure output dir exists
        if (!fs.existsSync(OUTPUT_DIR)) {
            fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        }

        fs.writeFileSync(outputPath, buffer);
        console.log(`✅ NFT character ${variation} saved to ${outputPath}`);

        return outputPath;

    } catch (error: any) {
        console.error(`❌ Generation failed for variation ${variation}:`, error.message);
        return null;
    }
}

// --- MAIN ---
async function main() {
    console.log("🚀 Generating 3 Separate NFT Characters...\n");

    const theme = await askQuestion("Enter NFT Theme (e.g., 'Rick and Morty', 'Cyberpunk'): ");

    if (!theme) {
        console.error("❌ Theme is required!");
        return;
    }

    const totalVariations = 3;
    const generatedFiles: string[] = [];

    for (let i = 1; i <= totalVariations; i++) {
        const filePath = await generateSingleNFT(theme, i, totalVariations);
        if (filePath) {
            generatedFiles.push(filePath);
        }
    }

    console.log("\n✨ Generation Complete!");
    console.log(`\n📁 Generated ${generatedFiles.length} NFT characters:`);
    generatedFiles.forEach((file, idx) => {
        console.log(`   ${idx + 1}. ${file}`);
    });
}

main().catch(console.error);
