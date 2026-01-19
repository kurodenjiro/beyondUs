
import { GoogleGenAI } from "@google/genai";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import { TemplateMetadata } from "./nft-template-generator";

dotenv.config({ path: ".env.local" });

const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error("❌ No API key found");
    process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

// --- TYPE DEFINITIONS ---

export type TraitCategory = "body" | "head" | "clothing" | "eyes" | "hair" | "accessory";
export type TraitRarity = "common" | "uncommon" | "rare" | "legendary";

export interface Trait {
    category: TraitCategory;
    name: string;
    imagePath: string;
    rarity: TraitRarity;
    attributes: Record<string, string>;
}

export interface TraitLibrary {
    templateId: string;
    traits: {
        body: Trait[];
        head: Trait[];
        clothing: Trait[];
        eyes: Trait[];
        hair: Trait[];
        accessory: Trait[];
    };
}

// --- TRAIT GENERATION ---

/**
 * Generate trait variations matching the template style
 */
export async function generateTraits(
    template: TemplateMetadata,
    variationsPerCategory: number = 5,
    outputDir: string = "nft-traits"
): Promise<TraitLibrary> {
    console.log(`\n🎨 Generating traits for template: ${template.id}`);
    console.log(`   Creating ${variationsPerCategory} variations per category\n`);

    // Create output directory
    const traitsDir = path.join(outputDir, template.id);
    if (!fs.existsSync(traitsDir)) {
        fs.mkdirSync(traitsDir, { recursive: true });
    }

    const traitLibrary: TraitLibrary = {
        templateId: template.id,
        traits: {
            body: [],
            head: [],
            clothing: [],
            eyes: [],
            hair: [],
            accessory: []
        }
    };

    const categories: TraitCategory[] = ["body", "head", "clothing", "eyes", "hair", "accessory"];

    for (const category of categories) {
        console.log(`📋 Generating ${category} traits...`);

        const categoryDir = path.join(traitsDir, category);
        if (!fs.existsSync(categoryDir)) {
            fs.mkdirSync(categoryDir, { recursive: true });
        }

        for (let i = 1; i <= variationsPerCategory; i++) {
            try {
                const trait = await generateSingleTrait(
                    template,
                    category,
                    i,
                    variationsPerCategory,
                    categoryDir
                );

                if (trait) {
                    traitLibrary.traits[category].push(trait);
                    console.log(`   ✅ ${category} variation ${i}/${variationsPerCategory}`);
                }
            } catch (error: any) {
                console.error(`   ❌ Failed ${category} variation ${i}:`, error.message);
            }
        }
    }

    // Save trait library metadata
    const libraryPath = path.join(traitsDir, "trait_library.json");
    fs.writeFileSync(libraryPath, JSON.stringify(traitLibrary, null, 2));
    console.log(`\n✅ Trait library saved to ${libraryPath}`);

    return traitLibrary;
}

/**
 * Generate a single trait variation
 */
async function generateSingleTrait(
    template: TemplateMetadata,
    category: TraitCategory,
    variationNumber: number,
    totalVariations: number,
    outputDir: string
): Promise<Trait | null> {
    const prompt = buildTraitPrompt(template, category, variationNumber, totalVariations);

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-image",
            contents: {
                role: "user",
                parts: [{ text: prompt }]
            },
            config: {
                seed: (Date.now() + variationNumber) % 2147483647,
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
            return null;
        }

        // Save trait image
        const traitName = `${category}_${variationNumber}`;
        const imagePath = path.join(outputDir, `${traitName}.png`);
        const buffer = Buffer.from(imageData, 'base64');
        fs.writeFileSync(imagePath, buffer);

        // Determine rarity based on variation number
        const rarity = determineRarity(variationNumber, totalVariations);

        return {
            category,
            name: traitName,
            imagePath,
            rarity,
            attributes: {
                category,
                variation: variationNumber.toString(),
                style: template.artStyle
            }
        };

    } catch (error: any) {
        throw error;
    }
}

/**
 * Build trait generation prompt based on category and template style
 */
function buildTraitPrompt(
    template: TemplateMetadata,
    category: TraitCategory,
    variationNumber: number,
    totalVariations: number
): string {
    const { theme, subject, style } = template.userRequest;
    const { artStyle, mood, colorPalette, styleTags } = template;

    const baseStyle = `${artStyle} style matching ${theme} ${subject} aesthetic`;
    const colors = colorPalette.join(", ");
    const tags = styleTags.join(", ");

    // Category-specific prompts
    const categoryPrompts: Record<TraitCategory, string> = {
        body: `Generate a HEADLESS body base for ${subject} in ${baseStyle}.

REQUIREMENTS:
- Headless body (NO HEAD - clean neck stump visible)
- Variation ${variationNumber}/${totalVariations} - make it unique
- Full body from neck to feet
- Neutral A-pose or standing pose
- Style: ${artStyle}
- Mood: ${mood}
- Color palette: ${colors}
- Tags: ${tags}

CRITICAL: NO HEAD. Show clean neck stump at top.

NEGATIVE: head, face, hair, side view, complex background`,

        head: `Generate a BALD HEAD (no body) for ${subject} in ${baseStyle}.

REQUIREMENTS:
- Bald head only (NO HAIR, NO EYES, NO BODY)
- Variation ${variationNumber}/${totalVariations} - unique head shape
- Clean facial structure outline
- Neck stump visible at bottom
- Style: ${artStyle}
- Color palette: ${colors}
- Front-facing, centered

CRITICAL: ONLY a bald head. No hair, no eyes, no facial features.

NEGATIVE: hair, eyes, body, detailed features, side view`,

        clothing: `Generate clothing/outfit for ${subject} in ${baseStyle}.

REQUIREMENTS:
- ${theme} themed clothing
- Variation ${variationNumber}/${totalVariations} - unique design
- Designed to layer over body
- Style: ${artStyle}
- Mood: ${mood}
- Color palette: ${colors}
- Hollow/transparent to fit over body

EXAMPLES: armor, robes, tech suit, casual wear, etc.

NEGATIVE: body inside, person wearing it, side view`,

        eyes: `Generate eye design for ${subject} in ${baseStyle}.

REQUIREMENTS:
- Two eyes side by side
- Variation ${variationNumber}/${totalVariations} - unique expression
- Isolated eyes (no face, no head)
- Style: ${artStyle}
- Mood: ${mood}
- Expressive and distinctive

EXAMPLES: large anime eyes, glowing cyber eyes, cute kawaii eyes, etc.

NEGATIVE: head, face outline, nose, mouth, body`,

        hair: `Generate hair/hairstyle for ${subject} in ${baseStyle}.

REQUIREMENTS:
- JUST THE HAIR (no head underneath)
- Variation ${variationNumber}/${totalVariations} - unique style
- Designed to sit on top of bald head
- Style: ${artStyle}
- Color palette: ${colors}
- Hollow where it sits on head

EXAMPLES: spiky hair, long flowing hair, mohawk, helmet, hat, etc.

CRITICAL: NO HEAD visible underneath the hair.

NEGATIVE: head, face, complete character, body`,

        accessory: `Generate accessory/item for ${subject} in ${baseStyle}.

REQUIREMENTS:
- ${theme} themed accessory
- Variation ${variationNumber}/${totalVariations} - unique item
- Standalone prop/item
- Style: ${artStyle}
- Color palette: ${colors}

EXAMPLES: weapons, tools, pets, gadgets, magical items, etc.

NEGATIVE: person holding it, body, hands, complex background`
    };

    return categoryPrompts[category] + `\n\nOUTPUT: High-quality isolated trait, white background, centered, square format.`;
}

/**
 * Determine trait rarity based on variation number
 */
function determineRarity(variationNumber: number, totalVariations: number): TraitRarity {
    const percentage = variationNumber / totalVariations;

    if (percentage <= 0.5) return "common";
    if (percentage <= 0.75) return "uncommon";
    if (percentage <= 0.9) return "rare";
    return "legendary";
}

/**
 * Load existing trait library
 */
export function loadTraitLibrary(libraryPath: string): TraitLibrary {
    const data = fs.readFileSync(libraryPath, "utf-8");
    return JSON.parse(data);
}

// --- EXAMPLE USAGE ---

if (require.main === module) {
    (async () => {
        console.log("🚀 NFT Trait Generator\n");

        // Load template metadata (you would get this from template generator)
        const templateMetadataPath = process.argv[2];

        if (!templateMetadataPath) {
            console.error("❌ Please provide template metadata path");
            console.log("Usage: npx tsx nft-trait-generator.ts <path-to-template-metadata.json>");
            process.exit(1);
        }

        try {
            const metadataData = fs.readFileSync(templateMetadataPath, "utf-8");
            const template: TemplateMetadata = JSON.parse(metadataData);
            template.generatedAt = new Date(template.generatedAt);

            console.log(`📋 Template: ${template.id}`);
            console.log(`🎨 Theme: ${template.userRequest.theme} ${template.userRequest.subject}\n`);

            const traitLibrary = await generateTraits(template, 3); // Generate 3 variations per category

            console.log("\n✨ Trait generation complete!");
            console.log(`\n📊 Generated traits:`);
            Object.entries(traitLibrary.traits).forEach(([category, traits]) => {
                console.log(`   ${category}: ${traits.length} variations`);
            });

        } catch (error: any) {
            console.error("\n❌ Failed to generate traits:", error.message);
        }
    })();
}
