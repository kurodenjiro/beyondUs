import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
if (!apiKey) {
    throw new Error("No API key found");
}

const ai = new GoogleGenAI({ apiKey });

export interface NFTConfig {
    subject: string;
    theme: string;
    artStyle: string;
    mood: string;
    faceOrientation: string;
    colorPalette: string[];
}

export interface GeneratedTrait {
    category: string;
    description: string;
    imageData: string; // base64
}

// Parse prompt to config using AI
export async function parsePromptToConfig(prompt: string): Promise<NFTConfig> {
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
}`;

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

        if (!config) throw new Error("Failed to parse prompt");

        // Ensure all fields have valid defaults
        config.subject = config.subject || "character";
        config.theme = config.theme || "modern";
        config.artStyle = config.artStyle || "cartoon";
        config.mood = config.mood || "cool";
        config.faceOrientation = config.faceOrientation || "three-quarter";

        if (!config.colorPalette || !Array.isArray(config.colorPalette) || config.colorPalette.length === 0) {
            config.colorPalette = ["#00FF00", "#FF00FF", "#FFFF00"];
        }

        return config;
    } catch (error) {
        // Fallback
        console.warn("Prompt parsing failed, using fallback config", error);
        const words = prompt.toLowerCase().split(" ");
        return {
            subject: words[words.length - 1] || "character",
            theme: words[0] || "modern",
            artStyle: "cartoon",
            mood: "cool",
            faceOrientation: "three-quarter",
            colorPalette: ["#00FF00", "#FF00FF", "#FFFF00"]
        };
    }
}

// Generate NFT sample
export async function generateNFTSample(config: NFTConfig): Promise<string> {
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
4. NO accessories, clothing, jewelry, or items
5. Clean, simple, minimal design
6. Solid background color
7. Professional NFT quality
8. Centered composition, portrait orientation`;

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

    return imagePart.inlineData.data;
}

// Generate trait
export async function generateTrait(category: string, config: NFTConfig, variationNumber: number): Promise<GeneratedTrait | null> {
    const prompt = `Generate a single ${category} trait for an NFT character.

STYLE TO MATCH:
- Art Style: ${config.artStyle}
- Theme: ${config.theme}
- Mood: ${config.mood}
- Color Palette: ${config.colorPalette.join(", ")}

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
        if (!imagePart || !imagePart.inlineData?.data) return null;

        return {
            category,
            description: `${category} variation ${variationNumber}`,
            imageData: imagePart.inlineData.data
        };
    } catch (error) {
        console.error(`Failed to generate ${category} ${variationNumber}`);
        return null;
    }
}
