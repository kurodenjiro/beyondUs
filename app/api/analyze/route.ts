import { createModelInstance } from '@/lib/ai-provider';
import { generateObject } from 'ai';
import { z } from 'zod';

export const maxDuration = 30;

export async function POST(req: Request) {
    try {
        const { prompt, aspectRatio = "1:1", upscale = "Original" } = await req.json();
        const paymentHash = req.headers.get("X-Payment-Hash");

        // Log payment proof
        if (paymentHash) console.log("x402 Payment Proof:", paymentHash);

        if (!process.env.VERCEL_GATEWAY_API_KEY) {
            // Mock response if no key
            return new Response(JSON.stringify({
                aspectRatio,
                upscale,
                layers: [
                    { name: "Background", description: "A dark cyberpunk cityscape with neon lights", rarity: 100, parentLayer: "", position: { x: 0, y: 0, width: 1024, height: 1024 }, traits: [] },
                    { name: "Body", description: "A metallic robot body with exposed gears", rarity: 100, parentLayer: "Background", position: { x: 256, y: 256, width: 512, height: 512 }, traits: [] },
                    { name: "Head", description: "A futuristic helmet with glowing visor", rarity: 100, parentLayer: "Body", position: { x: 384, y: 128, width: 256, height: 256 }, traits: [] }
                ]
            }), { status: 200 });
        }

        // Use unified provider
        const model = createModelInstance('google/gemini-3-flash');

        const { object } = await generateObject({
            model: model,
            schema: z.object({
                aspectRatio: z.string().describe('Image aspect ratio setting'),
                upscale: z.string().describe('Upscale setting'),
                layers: z.array(z.object({
                    name: z.string().describe('Name of the layer (e.g. Background, Body, Hat)'),
                    description: z.string().describe('General description for this layer category'),
                    parentLayer: z.string().describe('Name of the parent layer if this is a sub-layer (e.g. "Body" is parent of "Head", "Legs"). Use empty string "" for root layers.'),
                    rarity: z.number().describe('Overall layer rarity % (how often this layer appears in the collection, default 100)'),
                    position: z.object({
                        x: z.number().describe('Horizontal position on the composition (0-1000)'),
                        y: z.number().describe('Vertical position on the composition (0-1000)'),
                        width: z.number().describe('Width of the layer asset (0-1000)'),
                        height: z.number().describe('Height of the layer asset (0-1000)')
                    }),
                    traits: z.array(z.object({
                        name: z.string().describe('Specific trait name (e.g. Red Hair, Blue Hair)'),
                        description: z.string().describe('Brief visual description'),
                        aiPrompt: z.string().describe('Detailed AI generation prompt with exact canvas positioning (x,y,width,height) and 2D game asset specifications'),
                        rarity: z.number().describe('Rarity % (Traits in this layer MUST sum to 100)')
                    })).min(1)
                })),
            }),
            system: `You are an expert NFT collection architect specializing in 2D game assets and character assembly.

CRITICAL HIERARCHY RULE:
- ONLY the first/root layer (typically "Background") should have parentLayer: ""
- ALL other layers MUST have a parent specified
- Example: Background (parentLayer:""), Body (parentLayer:"Background"), Head (parentLayer:"Body")

SPATIAL ASSEMBLY PRECISION (1024x1024 Canvas):
Find the positions that match as perfectly as possible. Follow these strict "SNAP-TO-EDGE" rules to eliminate gaps:
1. CENTER HORIZONTAL: All character components MUST be centered on the x=512 axis.
2. JOINT ASSEMBLY: The meeting point is where Head ends and Body starts.
3. HEAD SNAPPING: The AI MUST draw the head so the CHIN touches the BOTTOM edge of the 1024 canvas.
4. BODY SNAPPING: The AI MUST draw the body so the NECK touches the TOP edge of the 1024 canvas.
5. NO GAPS: By drawing to the edges, the UI can assemble them (y_head + height_head = y_body) with zero gap.

AI PROMPT FORMAT (VERY IMPORTANT):
For each trait, generate an "aiPrompt" that strictly incorporates the PROJECT THEME listed in the analyze prompt.
DO NOT specify coordinates in the aiPrompt. The prompt should follow this format:
"A minimalist 2D flat vector nft asset of [trait name] for the [layer name] layer. [SPECIFIC SNAPPING & THEMATIC RULES]. Design features [specific visual details based on the project theme], perfectly symmetrical, clean edges, isolated on a solid PURE WHITE background (#FFFFFF). No shadows, No gradients, professional nft character style."

SNAPPING & THEMATIC RULES TO INCLUDE IN aiPrompt:
- For "Head" layers: "The head is a THEMED BASE HEAD reflecting the project concept (e.g. Robot, Alien, Human). It is BALD, FEATURELESS (no hair, no eyes, no mouth). It is centered and the CHIN TOUCHES THE BOTTOM EDGE of the frame. Decapitated at the neck line."
- For "Body" layers: "The body is a THEMED NAKED BASE BODY reflecting the project concept. ONLY THE UPPER HALF of the body. It MUST include the NECK and BOTH HANDS visible. It is centered and the NECK TOUCHES THE TOP EDGE of the frame. No head, no clothes."
- For "Eyes/Mouth/Hair/Clothes": "The asset is THEMED and designed to fit the project's base model."

LAYER CONSTRAINTS (VERY IMPORTANT):
- The "Body" layer MUST ALWAYS have exactly ONE trait (the base body).
- The "Head" layer MUST ALWAYS have exactly ONE trait (the base head).
- All decorative features (Clothes, Hair, Eyes, Mouth, Hats) MUST be their own separate layers.

REQUIREMENTS:
- Traits must sum to 100% rarity per layer
- Use exact x,y,width,height from the layer's position
- Always specify "1024x1024 white canvas"
- Always include "2D flat vector nft asset"
- Always include "No shadows, No gradients, professional nft character style"
- Return aspectRatio: "${aspectRatio}" and upscale: "${upscale}"`,
            prompt: `Analyze: "${prompt}"`,
        });

        console.log("Analysis Output:", JSON.stringify(object, null, 2));
        return new Response(JSON.stringify(object), { status: 200 });
    } catch (error) {
        console.error("Analysis failed:", error);
        return new Response(JSON.stringify({ error: "Failed to analyze prompt" }), { status: 500 });
    }
}
