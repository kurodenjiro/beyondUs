
import { GoogleGenAI } from "@google/genai";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error("❌ No API key found. Please set GOOGLE_AI_API_KEY or GEMINI_API_KEY in .env.local");
    process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

// --- TYPE DEFINITIONS ---

export interface UserRequest {
    theme: string;           // e.g., "cyberpunk", "fantasy", "cute"
    subject: string;         // e.g., "samurai", "cat", "robot"
    style?: string;          // e.g., "anime", "realistic", "pixel art"
    attributes?: string[];   // e.g., ["warrior", "magical", "tech"]
    collectionSize?: number; // How many NFTs to generate
}

export interface TemplateMetadata {
    id: string;
    userRequest: UserRequest;
    styleTags: string[];
    colorPalette: string[];
    artStyle: string;
    mood: string;
    generatedAt: Date;
    templatePath: string;
}

// --- TEMPLATE GENERATION ---

/**
 * Generate an NFT template based on user request
 * This creates the base character/subject that traits will be applied to
 */
export async function generateTemplate(
    request: UserRequest,
    outputDir: string = "nft-templates"
): Promise<TemplateMetadata> {
    console.log(`\n🎨 Generating NFT template for: "${request.theme} ${request.subject}"`);

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Build comprehensive prompt for template generation
    const styleDesc = request.style ? `${request.style} style` : "modern digital art style";
    const attributesDesc = request.attributes?.length
        ? `with characteristics: ${request.attributes.join(", ")}`
        : "";

    const prompt = `Create a base NFT character template for a collection.

SUBJECT: ${request.subject}
THEME: ${request.theme}
STYLE: ${styleDesc}
${attributesDesc ? `ATTRIBUTES: ${attributesDesc}` : ""}

REQUIREMENTS:
- Create a complete, standalone character in neutral pose (A-pose or standing)
- This will be the BASE TEMPLATE for an NFT collection
- Style should be consistent and distinctive
- Character should be centered on canvas
- White or transparent background
- High quality, clean artwork
- Front-facing view
- Professional NFT collection quality

TECHNICAL SPECS:
- Square format (1:1 ratio)
- Clean, bold outlines
- Flat colors or minimal shading
- Suitable for trait variations
- ${styleDesc}

OUTPUT: A complete base character that represents the collection's core aesthetic.

NEGATIVE: Multiple characters, side view, complex background, blurry, low quality, inconsistent style`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-image",
            contents: {
                role: "user",
                parts: [{ text: prompt }]
            },
            config: {
                seed: Date.now() % 2147483647,
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
            throw new Error("No image data received from AI");
        }

        // Save template
        const templateId = `${request.theme}_${request.subject}_${Date.now()}`.replace(/\s+/g, "_");
        const templatePath = path.join(outputDir, `${templateId}.png`);
        const buffer = Buffer.from(imageData, 'base64');
        fs.writeFileSync(templatePath, buffer);

        console.log(`✅ Template saved to ${templatePath}`);

        // Analyze and extract style metadata
        const metadata = await analyzeTemplateStyle(templatePath, request);

        // Save metadata
        const metadataPath = path.join(outputDir, `${templateId}_metadata.json`);
        fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

        console.log(`✅ Metadata saved to ${metadataPath}`);

        return metadata;

    } catch (error: any) {
        console.error(`❌ Template generation failed:`, error.message);
        throw error;
    }
}

/**
 * Analyze template to extract style characteristics
 * This helps ensure generated traits match the template aesthetic
 */
async function analyzeTemplateStyle(
    templatePath: string,
    request: UserRequest
): Promise<TemplateMetadata> {
    console.log(`\n🔍 Analyzing template style...`);

    const templateBuffer = fs.readFileSync(templatePath);
    const base64Template = templateBuffer.toString("base64");

    const analysisPrompt = `Analyze this NFT template image and extract style characteristics.

Provide a JSON response with:
{
    "styleTags": ["tag1", "tag2", ...],  // Art style descriptors (e.g., "anime", "cyberpunk", "minimalist")
    "colorPalette": ["#hex1", "#hex2", ...],  // Dominant colors (5-8 colors)
    "artStyle": "description",  // Overall art style (e.g., "flat vector art", "cel-shaded anime")
    "mood": "description"  // Overall mood/vibe (e.g., "energetic", "mysterious", "cute")
}

Be specific and accurate. These characteristics will guide trait generation.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash-exp",
            contents: {
                role: "user",
                parts: [
                    { text: analysisPrompt },
                    {
                        inlineData: {
                            mimeType: "image/png",
                            data: base64Template
                        }
                    }
                ]
            }
        });

        const analysisText = response.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

        // Extract JSON from response (handle markdown code blocks)
        const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
        const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : {
            styleTags: [request.theme, request.style || "digital art"],
            colorPalette: ["#000000", "#FFFFFF"],
            artStyle: request.style || "digital art",
            mood: "neutral"
        };

        console.log(`✅ Style analysis complete`);
        console.log(`   Style Tags: ${analysis.styleTags.join(", ")}`);
        console.log(`   Art Style: ${analysis.artStyle}`);
        console.log(`   Mood: ${analysis.mood}`);

        const templateId = path.basename(templatePath, ".png");

        return {
            id: templateId,
            userRequest: request,
            styleTags: analysis.styleTags,
            colorPalette: analysis.colorPalette,
            artStyle: analysis.artStyle,
            mood: analysis.mood,
            generatedAt: new Date(),
            templatePath: templatePath
        };

    } catch (error: any) {
        console.error(`⚠️  Style analysis failed, using defaults:`, error.message);

        // Return default metadata if analysis fails
        const templateId = path.basename(templatePath, ".png");
        return {
            id: templateId,
            userRequest: request,
            styleTags: [request.theme, request.style || "digital art"],
            colorPalette: ["#000000", "#FFFFFF"],
            artStyle: request.style || "digital art",
            mood: "neutral",
            generatedAt: new Date(),
            templatePath: templatePath
        };
    }
}

/**
 * Load existing template metadata
 */
export function loadTemplateMetadata(metadataPath: string): TemplateMetadata {
    const data = fs.readFileSync(metadataPath, "utf-8");
    const metadata = JSON.parse(data);
    metadata.generatedAt = new Date(metadata.generatedAt);
    return metadata;
}

// --- EXAMPLE USAGE ---

if (require.main === module) {
    (async () => {
        console.log("🚀 NFT Template Generator\n");

        const exampleRequest: UserRequest = {
            theme: "cyberpunk",
            subject: "samurai warrior",
            style: "anime",
            attributes: ["futuristic", "neon", "armored"],
            collectionSize: 100
        };

        try {
            const metadata = await generateTemplate(exampleRequest);
            console.log("\n✨ Template generation complete!");
            console.log(`\n📋 Template ID: ${metadata.id}`);
            console.log(`📁 Template Path: ${metadata.templatePath}`);
        } catch (error) {
            console.error("\n❌ Failed to generate template:", error);
        }
    })();
}
