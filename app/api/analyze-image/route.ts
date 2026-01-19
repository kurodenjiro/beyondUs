import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

export const maxDuration = 60;

// Schema for layer extraction from image
const LayerSchema = z.object({
    name: z.string(),
    parentLayer: z.string(),
    position: z.object({
        x: z.number(),
        y: z.number(),
        width: z.number(),
        height: z.number()
    }),
    aiPrompt: z.string(),
    traits: z.array(z.object({
        name: z.string(),
        rarity: z.number()
    }))
});

const AnalysisSchema = z.object({
    layers: z.array(LayerSchema),
    aspectRatio: z.string(),
    upscale: z.string()
});

export async function POST(req: Request) {
    try {
        const { imageData, prompt } = await req.json();

        const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return new Response(JSON.stringify({ error: "No API key configured" }), { status: 500 });
        }

        console.log("🔍 Analyzing image with Gemini Vision...");

        const ai = new GoogleGenAI({ apiKey });

        // Remove data URL prefix if present
        const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');

        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash-exp",
            contents: {
                role: "user",
                parts: [
                    {
                        text: `You are an expert NFT character analyzer. Analyze this character image and extract the layer structure.

CRITICAL INSTRUCTIONS:
1. Identify distinct visual layers (Background, Body, Head, Clothes, Hair, Eyes, Mouth, etc.)
2. For each layer, determine its position (x, y, width, height) on a 1024x1024 canvas
3. Generate an "aiPrompt" for each layer that describes how to recreate that specific visual element
4. Create AT LEAST 2 TRAIT VARIATIONS per layer with different rarities

TRAIT VARIATIONS:
- For each layer, imagine 2-3 different visual variations
- Example for "Hair": ["Spiky Blue Hair" (60%), "Long Red Hair" (30%), "Bald" (10%)]
- Example for "Eyes": ["Green Eyes" (50%), "Blue Eyes" (30%), "Red Cyber Eyes" (20%)]
- Example for "Clothes": ["Leather Jacket" (40%), "Hoodie" (40%), "T-Shirt" (20%)]
- Rarities should sum to 100% per layer

LAYER HIERARCHY:
- Background should have parentLayer: ""
- Body should have parentLayer: "Background"
- Head should have parentLayer: "Body"
- All accessories (Eyes, Mouth, Hair, Clothes) should have appropriate parents

POSITION RULES:
- Background: Always 0,0,1024,1024
- Body: Upper body centered, neck at top edge (y≈400)
- Head: Centered, chin at bottom edge (y≈100, height≈320)
- Accessories: Position relative to their parent layer

AI PROMPT FORMAT:
"A minimalist 2D flat vector nft asset of [description]. [Positioning rule]. Design features [visual details from the image], perfectly symmetrical, clean edges, isolated on a solid PURE WHITE background (#FFFFFF). No shadows, No gradients, professional nft character style."

Original Project Prompt: "${prompt}"

Return aspectRatio: "1:1" and upscale: "1024x1024"

Analyze the image and extract the layer structure with multiple trait variations as JSON.`
                    },
                    {
                        inlineData: {
                            mimeType: "image/png",
                            data: base64Data
                        }
                    }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "object",
                    properties: {
                        layers: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    name: { type: "string" },
                                    parentLayer: { type: "string" },
                                    position: {
                                        type: "object",
                                        properties: {
                                            x: { type: "number" },
                                            y: { type: "number" },
                                            width: { type: "number" },
                                            height: { type: "number" }
                                        },
                                        required: ["x", "y", "width", "height"]
                                    },
                                    aiPrompt: { type: "string" },
                                    traits: {
                                        type: "array",
                                        items: {
                                            type: "object",
                                            properties: {
                                                name: { type: "string" },
                                                rarity: { type: "number" }
                                            },
                                            required: ["name", "rarity"]
                                        }
                                    }
                                },
                                required: ["name", "parentLayer", "position", "aiPrompt", "traits"]
                            }
                        },
                        aspectRatio: { type: "string" },
                        upscale: { type: "string" }
                    },
                    required: ["layers", "aspectRatio", "upscale"]
                }
            }
        });

        let analysisText = response.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

        // Strip markdown code blocks if present
        analysisText = analysisText.replace(/^```json\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

        const analysis = JSON.parse(analysisText);

        console.log("✅ Vision analysis complete:", JSON.stringify(analysis, null, 2));

        // Transform the response to match our schema
        if (analysis.layers) {
            analysis.layers = analysis.layers.map((layer: any) => {
                console.log(`🔍 Layer "${layer.name}" - processing traits and position`);

                // Handle position - Gemini might return flat x,y,width,height or nested position object
                const position = layer.position || {
                    x: layer.x ?? 0,
                    y: layer.y ?? 0,
                    width: layer.width ?? 1024,
                    height: layer.height ?? 1024
                };

                // Handle traits - normalize field names and types
                let traits = layer.traits || (layer.trait ? [layer.trait] : []);
                traits = traits.map((trait: any) => ({
                    name: trait.name || trait.value || trait.traitType || 'Unknown',
                    rarity: typeof trait.rarity === 'number' ? trait.rarity : parseFloat(String(trait.rarity).replace('%', '') || '100')
                }));

                // Fallback: If no traits, generate default variations based on layer name
                if (traits.length === 0) {
                    const layerName = layer.name.toLowerCase();
                    if (layerName.includes('hair')) {
                        traits = [
                            { name: 'Blue Hair', rarity: 40 },
                            { name: 'Red Hair', rarity: 30 },
                            { name: 'Green Hair', rarity: 20 },
                            { name: 'Bald', rarity: 10 }
                        ];
                    } else if (layerName.includes('eye')) {
                        traits = [
                            { name: 'Brown Eyes', rarity: 50 },
                            { name: 'Blue Eyes', rarity: 30 },
                            { name: 'Green Eyes', rarity: 20 }
                        ];
                    } else if (layerName.includes('mouth')) {
                        traits = [
                            { name: 'Smile', rarity: 50 },
                            { name: 'Neutral', rarity: 30 },
                            { name: 'Frown', rarity: 20 }
                        ];
                    } else if (layerName.includes('clothes') || layerName.includes('cloth')) {
                        traits = [
                            { name: 'Jacket', rarity: 40 },
                            { name: 'Hoodie', rarity: 35 },
                            { name: 'T-Shirt', rarity: 25 }
                        ];
                    } else if (layerName.includes('background')) {
                        traits = [
                            { name: 'City', rarity: 50 },
                            { name: 'Nature', rarity: 30 },
                            { name: 'Abstract', rarity: 20 }
                        ];
                    } else {
                        // Generic fallback
                        traits = [
                            { name: `${layer.name} Variant 1`, rarity: 60 },
                            { name: `${layer.name} Variant 2`, rarity: 40 }
                        ];
                    }
                    console.log(`  ⚠️ No traits from AI, using fallback for ${layer.name}`);
                }

                console.log(`  → ${traits.length} traits:`, traits.map((t: any) => `${t.name} (${t.rarity}%)`).join(', '));

                return {
                    name: layer.name,
                    parentLayer: layer.parentLayer || '',
                    position: position,
                    aiPrompt: layer.aiPrompt,
                    traits: traits
                };
            });
        }

        console.log("📦 Final transformed data:", JSON.stringify(analysis, null, 2));

        // Validate with Zod
        const validated = AnalysisSchema.parse(analysis);

        return new Response(JSON.stringify(validated), { status: 200 });

    } catch (error: any) {
        console.error("❌ Vision analysis failed:", error);
        return new Response(JSON.stringify({
            error: error.message || "Failed to analyze image"
        }), { status: 500 });
    }
}
