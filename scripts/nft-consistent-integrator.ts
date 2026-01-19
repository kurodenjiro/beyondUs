
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

// --- CONSISTENT CHARACTER INTEGRATION ---

/**
 * Integrate traits while PRESERVING the exact template character
 * This ensures all NFTs have the same base pose and character
 */
export async function integrateTraitsConsistent(
    template: TemplateMetadata,
    selectedTraits: TraitSelection,
    tokenId: number,
    outputDir: string = "nft-collection"
): Promise<NFTOutput> {
    console.log(`\n🤖 Integrating traits for NFT #${tokenId} (Consistent Mode)...`);

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

    // Build STRICT integration prompt that preserves template
    const prompt = buildConsistentIntegrationPrompt(template, selectedTraits);

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-image",
            contents: {
                role: "user",
                parts: [
                    { text: prompt },
                    { inlineData: { mimeType: "image/png", data: templateBase64 } },
                    { inlineData: { mimeType: "image/png", data: traitImages.clothing } },
                    { inlineData: { mimeType: "image/png", data: traitImages.eyes } },
                    { inlineData: { mimeType: "image/png", data: traitImages.hair } },
                    { inlineData: { mimeType: "image/png", data: traitImages.accessory } }
                ]
            },
            config: {
                seed: (Date.now() + tokenId) % 2147483647,
                temperature: 0.1  // Very low temperature for consistency
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
 * Build STRICT integration prompt that preserves template character
 */
function buildConsistentIntegrationPrompt(
    template: TemplateMetadata,
    selectedTraits: TraitSelection
): string {
    const { theme, subject, style } = template.userRequest;
    const { artStyle, mood } = template;

    return `CRITICAL TASK: Create an NFT by applying ONLY the specified traits to the BASE TEMPLATE character.

THE BASE TEMPLATE (Image 1):
This is the EXACT character that MUST appear in the final NFT.
- PRESERVE the character's pose EXACTLY
- PRESERVE the character's body shape EXACTLY
- PRESERVE the character's proportions EXACTLY
- DO NOT change the character's overall appearance

THE TRAIT IMAGES (Images 2-5):
2. CLOTHING: Apply this outfit to the character
3. EYES: Replace/add these eyes to the character's face
4. HAIR: Add this hair/headgear on top of the character's head
5. ACCESSORY: Add this item to the character (in hand or nearby)

STRICT REQUIREMENTS:
1. The BASE TEMPLATE character MUST remain IDENTICAL in:
   - Pose (exact same stance)
   - Body shape and proportions
   - Overall character design
   - Facial structure

2. ONLY these elements should change:
   - Clothing/outfit (from trait image 2)
   - Eyes (from trait image 3)
   - Hair/headgear (from trait image 4)
   - Accessory (from trait image 5)

3. Style consistency:
   - Maintain ${artStyle} style
   - Keep ${mood} mood
   - Use same color palette and line weight

CRITICAL: This is for an NFT COLLECTION where ALL NFTs must have the SAME base character and pose. Only the traits (clothing, eyes, hair, accessory) should vary between NFTs.

Think of it like:
- Bored Ape Yacht Club: Same ape pose, different traits
- CryptoPunks: Same pixel grid, different features
- This collection: Same ${subject} character, different traits

OUTPUT: The EXACT template character with ONLY the specified traits applied.

NEGATIVE: Different pose, different character, different body shape, different proportions, completely new character, artistic reinterpretation`;
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

// Helper function
function randomElement<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
}

// --- EXAMPLE USAGE ---

if (require.main === module) {
    (async () => {
        console.log("🚀 NFT Consistent Integrator\n");

        const templateMetadataPath = process.argv[2];
        const traitLibraryPath = process.argv[3];

        if (!templateMetadataPath || !traitLibraryPath) {
            console.error("❌ Missing arguments");
            console.log("Usage: npx tsx nft-consistent-integrator.ts <template-metadata.json> <trait_library.json>");
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
            console.log(`🎨 Generating consistent NFT...\n`);

            // Select random traits
            const selectedTraits = selectRandomTraits(traitLibrary);

            console.log("Selected traits:");
            Object.entries(selectedTraits).forEach(([category, trait]) => {
                console.log(`   ${category}: ${trait.name} (${trait.rarity})`);
            });

            // Integrate traits with consistent character
            const nft = await integrateTraitsConsistent(template, selectedTraits, 1);

            console.log("\n✨ Consistent NFT generation complete!");
            console.log(`📁 Image: ${nft.imagePath}`);
            console.log(`📋 Metadata: ${nft.metadata.name}`);

        } catch (error: any) {
            console.error("\n❌ Failed:", error.message);
        }
    })();
}
