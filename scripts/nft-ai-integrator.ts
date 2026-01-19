
import { GoogleGenAI } from "@google/genai";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import { TemplateMetadata } from "./nft-template-generator";
import { Trait, TraitLibrary } from "./nft-trait-generator";

dotenv.config({ path: ".env.local" });

const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error("❌ No API key found");
    process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

// --- TYPE DEFINITIONS ---

export interface NFTOutput {
    tokenId: number;
    imagePath: string;
    metadata: NFTMetadata;
}

export interface NFTMetadata {
    name: string;
    description: string;
    image: string;
    attributes: Array<{
        trait_type: string;
        value: string;
        rarity?: string;
    }>;
}

export interface TraitSelection {
    body: Trait;
    head: Trait;
    clothing: Trait;
    eyes: Trait;
    hair: Trait;
    accessory: Trait;
}

// --- AI INTEGRATION ---

/**
 * Integrate selected traits with template using AI
 * This creates a cohesive final NFT image
 */
export async function integrateTraits(
    template: TemplateMetadata,
    selectedTraits: TraitSelection,
    tokenId: number,
    outputDir: string = "nft-collection"
): Promise<NFTOutput> {
    console.log(`\n🤖 Integrating traits for NFT #${tokenId}...`);

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Read template and all trait images
    const templateBuffer = fs.readFileSync(template.templatePath);
    const templateBase64 = templateBuffer.toString("base64");

    const traitImages: { [key: string]: string } = {};
    for (const [category, trait] of Object.entries(selectedTraits)) {
        const buffer = fs.readFileSync(trait.imagePath);
        traitImages[category] = buffer.toString("base64");
    }

    // Build integration prompt
    const prompt = buildIntegrationPrompt(template, selectedTraits);

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-image",
            contents: {
                role: "user",
                parts: [
                    { text: prompt },
                    { inlineData: { mimeType: "image/png", data: templateBase64 } },
                    { inlineData: { mimeType: "image/png", data: traitImages.body } },
                    { inlineData: { mimeType: "image/png", data: traitImages.head } },
                    { inlineData: { mimeType: "image/png", data: traitImages.clothing } },
                    { inlineData: { mimeType: "image/png", data: traitImages.eyes } },
                    { inlineData: { mimeType: "image/png", data: traitImages.hair } },
                    { inlineData: { mimeType: "image/png", data: traitImages.accessory } }
                ]
            },
            config: {
                seed: (Date.now() + tokenId) % 2147483647,
                temperature: 0.3
            }
        });

        const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);

        if (!imagePart || !imagePart.inlineData?.data) {
            throw new Error("Failed to generate integrated NFT");
        }

        // Save NFT image
        const imagePath = path.join(outputDir, `nft_${tokenId}.png`);
        const buffer = Buffer.from(imagePart.inlineData.data, 'base64');
        fs.writeFileSync(imagePath, buffer);

        console.log(`✅ NFT #${tokenId} saved to ${imagePath}`);

        // Generate metadata
        const metadata = generateMetadata(template, selectedTraits, tokenId, imagePath);

        // Save metadata
        const metadataPath = path.join(outputDir, `nft_${tokenId}_metadata.json`);
        fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

        return {
            tokenId,
            imagePath,
            metadata
        };

    } catch (error: any) {
        console.error(`❌ Integration failed for NFT #${tokenId}:`, error.message);
        throw error;
    }
}

/**
 * Build AI integration prompt
 */
function buildIntegrationPrompt(
    template: TemplateMetadata,
    selectedTraits: TraitSelection
): string {
    const { theme, subject, style } = template.userRequest;
    const { artStyle, mood } = template;

    return `You are given a BASE TEMPLATE and 6 TRAIT IMAGES to integrate into ONE cohesive NFT character.

TEMPLATE: ${theme} ${subject} in ${artStyle} style
MOOD: ${mood}

THE 7 IMAGES PROVIDED:
1. BASE TEMPLATE: The core character/subject
2. BODY TRAIT: Body variation
3. HEAD TRAIT: Head variation
4. CLOTHING TRAIT: Outfit/clothing
5. EYES TRAIT: Eye design
6. HAIR TRAIT: Hair/headgear
7. ACCESSORY TRAIT: Item/prop

YOUR TASK:
Integrate ALL 7 images into ONE cohesive, high-quality NFT character that:
- Maintains the template's core aesthetic and style
- Incorporates all 6 traits seamlessly
- Looks like a professional NFT collection piece
- Has consistent style throughout
- Is visually appealing and well-composed

INTEGRATION APPROACH:
1. Use the BASE TEMPLATE as the foundation
2. Blend in the BODY trait (pose, build)
3. Add the HEAD trait
4. Layer the CLOTHING over the body
5. Place EYES on the head
6. Add HAIR on top of head
7. Include ACCESSORY appropriately

CRITICAL REQUIREMENTS:
- Final character must be COMPLETE (head, body, all traits visible)
- Style must be CONSISTENT with template (${artStyle})
- All traits must be INTEGRATED (not just pasted)
- Character should look COHESIVE and professional
- Maintain ${mood} mood
- High quality, clean artwork

STYLE: ${artStyle}
OUTPUT: Single complete NFT character, centered, white background, square format

NEGATIVE: Separated traits, grid layout, inconsistent style, missing parts, low quality, blurry`;
}

/**
 * Generate NFT metadata
 */
function generateMetadata(
    template: TemplateMetadata,
    selectedTraits: TraitSelection,
    tokenId: number,
    imagePath: string
): NFTMetadata {
    const { theme, subject } = template.userRequest;

    const attributes = Object.entries(selectedTraits).map(([category, trait]) => ({
        trait_type: category.charAt(0).toUpperCase() + category.slice(1),
        value: trait.name,
        rarity: trait.rarity
    }));

    return {
        name: `${theme} ${subject} #${tokenId}`,
        description: `A unique ${theme} ${subject} from the AI-generated collection. This NFT features a distinctive combination of traits in ${template.artStyle} style.`,
        image: path.basename(imagePath),
        attributes
    };
}

/**
 * Select random traits from library
 */
export function selectRandomTraits(traitLibrary: TraitLibrary): TraitSelection {
    return {
        body: randomElement(traitLibrary.traits.body),
        head: randomElement(traitLibrary.traits.head),
        clothing: randomElement(traitLibrary.traits.clothing),
        eyes: randomElement(traitLibrary.traits.eyes),
        hair: randomElement(traitLibrary.traits.hair),
        accessory: randomElement(traitLibrary.traits.accessory)
    };
}

/**
 * Select specific traits by index
 */
export function selectTraitsByIndex(
    traitLibrary: TraitLibrary,
    indices: { body: number; head: number; clothing: number; eyes: number; hair: number; accessory: number }
): TraitSelection {
    return {
        body: traitLibrary.traits.body[indices.body] || traitLibrary.traits.body[0],
        head: traitLibrary.traits.head[indices.head] || traitLibrary.traits.head[0],
        clothing: traitLibrary.traits.clothing[indices.clothing] || traitLibrary.traits.clothing[0],
        eyes: traitLibrary.traits.eyes[indices.eyes] || traitLibrary.traits.eyes[0],
        hair: traitLibrary.traits.hair[indices.hair] || traitLibrary.traits.hair[0],
        accessory: traitLibrary.traits.accessory[indices.accessory] || traitLibrary.traits.accessory[0]
    };
}

// Helper function
function randomElement<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
}

// --- EXAMPLE USAGE ---

if (require.main === module) {
    (async () => {
        console.log("🚀 NFT AI Integrator\n");

        const templateMetadataPath = process.argv[2];
        const traitLibraryPath = process.argv[3];

        if (!templateMetadataPath || !traitLibraryPath) {
            console.error("❌ Missing arguments");
            console.log("Usage: npx tsx nft-ai-integrator.ts <template-metadata.json> <trait_library.json>");
            process.exit(1);
        }

        try {
            // Load template and trait library
            const templateData = fs.readFileSync(templateMetadataPath, "utf-8");
            const template: TemplateMetadata = JSON.parse(templateData);
            template.generatedAt = new Date(template.generatedAt);

            const libraryData = fs.readFileSync(traitLibraryPath, "utf-8");
            const traitLibrary: TraitLibrary = JSON.parse(libraryData);

            console.log(`📋 Template: ${template.id}`);
            console.log(`🎨 Generating sample NFT...\n`);

            // Select random traits
            const selectedTraits = selectRandomTraits(traitLibrary);

            console.log("Selected traits:");
            Object.entries(selectedTraits).forEach(([category, trait]) => {
                console.log(`   ${category}: ${trait.name} (${trait.rarity})`);
            });

            // Integrate traits
            const nft = await integrateTraits(template, selectedTraits, 1);

            console.log("\n✨ NFT generation complete!");
            console.log(`📁 Image: ${nft.imagePath}`);
            console.log(`📋 Metadata: ${nft.metadata.name}`);

        } catch (error: any) {
            console.error("\n❌ Failed:", error.message);
        }
    })();
}
