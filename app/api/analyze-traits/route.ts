import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

export const maxDuration = 60;

const TraitMetadataSchema = z.object({
    name: z.string().describe("Descriptive name for this trait (e.g., 'Blue Spiky Hair', 'Leather Jacket')"),
    description: z.string().describe("Brief description of the visual appearance"),
    category: z.enum(['Background', 'Body', 'Head', 'Other']),
    position: z.object({
        x: z.number().describe("X position on 1024x1024 canvas"),
        y: z.number().describe("Y position on 1024x1024 canvas"),
        width: z.number().describe("Width on 1024x1024 canvas"),
        height: z.number().describe("Height on 1024x1024 canvas")
    }).describe("Position and size for proper alignment"),
    anchorPoints: z.object({
        top: z.boolean().describe("Has connection point at top"),
        bottom: z.boolean().describe("Has connection point at bottom"),
        left: z.boolean().describe("Has connection point at left"),
        right: z.boolean().describe("Has connection point at right")
    }),
    rarity: z.number().min(1).max(100).describe("Suggested rarity percentage")
});

const AnalysisResponseSchema = z.object({
    traits: z.array(TraitMetadataSchema)
});

export async function POST(req: Request) {
    try {
        const { traits, knownAttributes } = await req.json();

        const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return new Response(JSON.stringify({ error: "No API key configured" }), { status: 500 });
        }

        console.log(`🔍 Analyzing ${traits.length} traits with Gemini Vision...`);
        if (knownAttributes) console.log("🎯 Using known attributes map:", JSON.stringify(knownAttributes).substring(0, 100) + "...");

        const ai = new GoogleGenAI({ apiKey });

        // Analyze all traits in one call for efficiency
        const imageParts = traits.map((trait: any) => ({
            inlineData: {
                mimeType: "image/png",
                data: trait.imageUrl.replace(/^data:image\/\w+;base64,/, '')
            }
        }));

        let promptText = `You are an expert NFT asset analyzer. Analyze these ${traits.length} character assets extracted from a sprite sheet.

For EACH asset image, provide:
1. **Name**: Descriptive name (e.g., "Blue Spiky Hair", "Leather Jacket", "Smiling Mouth")
2. **Description**: Brief visual description
3. **Category**: Choose the MOST SPECIFIC category that fits:
   - **Background**: Full canvas backgrounds, scenery, environments
   - **Body**: Torso, shoulders, neck (mannequin-like body parts)
   - **Head**: Complete head/face (round/oval shape with facial features)
   - **Other**: Only if none of the above fit`;

        if (knownAttributes && Array.isArray(knownAttributes) && knownAttributes.length > 0) {
            promptText += `

CRITICAL INSTRUCTION - ATTRIBUTE MAPPING:
These assets were generated based on a structured plan. You MUST map each image to one of the following known attributes.
Do not invent new names if an image plausibly matches one of these.
KNOWN ATTRIBUTES LIST:
${knownAttributes.map(a => `- [${a.category}] ${a.name}`).join('\n')}

For each image, check if it closely resembles one of the "KNOWN ATTRIBUTES" for its category.
If yes, use the exact Name from the list.
If no match is found, invent a descriptive name.`;
        } else {
            promptText += `
4. **Position**: Where this trait should be positioned on a 1024x1024 canvas
   - **Background**: x=0, y=0, width=1024, height=1024 (full canvas)
   - **Body**: x=256, y=400, width=512, height=624 (centered, lower half, neck at top)
   - **Head**: x=312, y=100, width=400, height=320 (centered, chin at y=420 connects to body neck)
             `;
        }

        promptText += `
5. **Anchor Points**: Which edges have connection points for assembly
6. **Rarity**: Suggested rarity percentage (1-100)

POSITIONING RULES:
- All traits should align on a standard 1024x1024 canvas
- **CRITICAL**: Head bottom edge (y + height) should be at y=420 (connects to body at neck)
- **CRITICAL**: Body top edge should be at y=400 (connects to head at neck)
- All parts should be horizontally centered (x around 256-512 range)

CRITICAL: Analyze the visual content and determine the optimal position for proper character assembly.

Return JSON array with one entry per image in the same order.`;
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash-exp",
            contents: {
                role: "user",
                parts: [
                    { text: promptText },
                    ...imageParts
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "object",
                    properties: {
                        traits: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    name: { type: "string" },
                                    description: { type: "string" },
                                    category: { type: "string", enum: ["Background", "Body", "Head", "Other"] },
                                    rarity: { type: "number" },
                                    anchorPoints: {
                                        type: "object",
                                        properties: {
                                            top: { type: "boolean" },
                                            bottom: { type: "boolean" },
                                            left: { type: "boolean" },
                                            right: { type: "boolean" }
                                        },
                                        required: ["top", "bottom", "left", "right"]
                                    }
                                },
                                required: ["name", "description", "category", "rarity", "anchorPoints"]
                            }
                        }
                    },
                    required: ["traits"]
                }
            }
        });

        const resultText = response.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        console.log('📝 Raw response text:', resultText.substring(0, 200));

        const cleanedText = resultText.replace(/^```json\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

        let analysis;
        try {
            analysis = JSON.parse(cleanedText);
        } catch (parseError) {
            console.error('❌ JSON parse error:', parseError);
            console.error('📝 Failed text:', cleanedText.substring(0, 500));

            // Fallback: create basic structure
            analysis = {
                traits: traits.map((t: any, i: number) => ({
                    Name: `Trait ${i + 1}`,
                    Description: 'Character asset',
                    Category: 'Other',
                    'Anchor Points': { top: false, bottom: false, left: false, right: false },
                    Rarity: 50
                }))
            };
        }

        console.log('🔍 Parsed AI response:', JSON.stringify(analysis, null, 2).substring(0, 500));

        // Handle case where Gemini returns array directly instead of wrapped in object
        if (Array.isArray(analysis)) {
            analysis = { traits: analysis };
        }

        // Add fallback values for incomplete trait data
        if (analysis.traits) {
            analysis.traits = analysis.traits.map((trait: any, index: number) => {
                // Handle both capitalized and lowercase field names
                const name = trait?.name || trait?.Name;
                const description = trait?.description || trait?.Description;
                const category = trait?.category || trait?.Category;
                const position = trait?.position || trait?.Position;
                let anchorPoints = trait?.anchorPoints || trait?.['Anchor Points'];
                const rarity = trait?.rarity || trait?.Rarity;

                // Convert string anchor points to object format
                if (typeof anchorPoints === 'string') {
                    const anchorStr = anchorPoints.toLowerCase();
                    anchorPoints = {
                        top: anchorStr.includes('top'),
                        bottom: anchorStr.includes('bottom'),
                        left: anchorStr.includes('left'),
                        right: anchorStr.includes('right')
                    };
                } else if (Array.isArray(anchorPoints)) {
                    // Handle array format like ["All"] or ["Top", "Bottom"]
                    const anchorStr = anchorPoints.join(' ').toLowerCase();
                    const hasAll = anchorStr.includes('all');
                    anchorPoints = {
                        top: hasAll || anchorStr.includes('top'),
                        bottom: hasAll || anchorStr.includes('bottom'),
                        left: hasAll || anchorStr.includes('left'),
                        right: hasAll || anchorStr.includes('right')
                    };
                }

                const hasValidCategory = category && [
                    'Background', 'Body', 'Head', 'Other'
                ].includes(category);

                if (!hasValidCategory) {
                    console.log(`⚠️ Trait ${index} has invalid/missing category:`, category);
                }

                // Default positions by category
                const defaultPositions: Record<string, any> = {
                    'Background': { x: 0, y: 0, width: 1024, height: 1024 },
                    'Body': { x: 256, y: 400, width: 512, height: 624 },
                    'Head': { x: 312, y: 100, width: 400, height: 320 },
                    'Other': { x: 0, y: 0, width: 1024, height: 1024 }
                };

                const finalCategory = hasValidCategory ? category : 'Other';

                // Ensure rarity is valid (1-100)
                let validRarity = typeof rarity === 'number' ? rarity : 50;
                if (validRarity < 1) validRarity = 1;
                if (validRarity > 100) validRarity = 100;

                return {
                    name: name || `Trait ${index + 1}`,
                    description: description || 'Character asset',
                    category: finalCategory,
                    position: position || defaultPositions[finalCategory],
                    anchorPoints: anchorPoints || {
                        top: false,
                        bottom: false,
                        left: false,
                        right: false
                    },
                    rarity: validRarity
                };
            });
        }

        // Validate with Zod
        const validated = AnalysisResponseSchema.parse(analysis);

        console.log(`✅ Analyzed ${validated.traits.length} traits`);
        validated.traits.forEach((trait, i) => {
            console.log(`  ${i + 1}. ${trait.name} (${trait.category}) - Rarity: ${trait.rarity}%`);
        });

        // Merge analysis with original trait data and apply dynamic positioning
        const enrichedTraits = await Promise.all(traits.map(async (trait: any, index: number) => {
            const enriched = {
                ...trait,
                ...validated.traits[index]
            };

            // Calculate dynamic position based on actual image dimensions
            // This ensures perfect alignment regardless of cropping
            try {
                if (trait.imageUrl) {
                    const base64Data = trait.imageUrl.replace(/^data:image\/\w+;base64,/, '');
                    const buffer = Buffer.from(base64Data, 'base64');
                    // dynamically import sharp to avoid build issues if it's treated as client component (though this is API route)
                    // actually simpler to just import at top, but let's stick to patterns if needed. 
                    // No, import at top is fine.
                    const sharp = require('sharp');
                    const metadata = await sharp(buffer).metadata();

                    if (metadata.width && metadata.height) {
                        // Size Normalization Logic
                        let finalWidth = metadata.width;
                        let finalHeight = metadata.height;
                        let scale = 1;

                        if (enriched.category === 'Head') {
                            const TARGET_HEAD_WIDTH = 320;
                            // If significantly off-target, scale it
                            if (metadata.width < 250 || metadata.width > 380) {
                                scale = TARGET_HEAD_WIDTH / metadata.width;
                                finalWidth = Math.round(metadata.width * scale);
                                finalHeight = Math.round(metadata.height * scale);
                                console.log(`🔄 Normalizing Head size: ${metadata.width}x${metadata.height} -> ${finalWidth}x${finalHeight} (Scale: ${scale.toFixed(2)})`);
                            }
                        } else if (enriched.category === 'Body') {
                            const TARGET_BODY_WIDTH = 500;
                            if (metadata.width < 420 || metadata.width > 580) {
                                scale = TARGET_BODY_WIDTH / metadata.width;
                                finalWidth = Math.round(metadata.width * scale);
                                finalHeight = Math.round(metadata.height * scale);
                                console.log(`🔄 Normalizing Body size: ${metadata.width}x${metadata.height} -> ${finalWidth}x${finalHeight} (Scale: ${scale.toFixed(2)})`);
                            }
                        }

                        const canvasCenter = 512;
                        let x = Math.round(canvasCenter - (finalWidth / 2));
                        let y = enriched.position?.y || 0;

                        // Apply specific alignment rules based on category
                        if (enriched.category === 'Head') {
                            // Align Head Bottom to Neck Connection (y=500) - lowered significantly
                            y = 500 - finalHeight;
                        } else if (enriched.category === 'Body') {
                            // Align Body Top to Neck (y=370) - raised further
                            y = 370;
                        }

                        // For full-size backgrounds, keep at 0,0
                        if (enriched.category === 'Background' && finalWidth > 900) {
                            x = 0;
                            y = 0;
                        }

                        // Override position with precise calculated values
                        enriched.position = {
                            x,
                            y,
                            width: finalWidth,
                            height: finalHeight
                        };

                        console.log(`📏 Adjusted position for ${enriched.name}: ${x}, ${y} (${finalWidth}x${finalHeight})`);
                    }
                }
            } catch (err) {
                console.error('⚠️ Error calculating dynamic position:', err);
            }

            return enriched;
        }));

        return new Response(JSON.stringify({
            traits: enrichedTraits
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        console.error("❌ Trait analysis failed:", error);
        return new Response(JSON.stringify({
            error: error.message || "Failed to analyze traits"
        }), { status: 500 });
    }
}
