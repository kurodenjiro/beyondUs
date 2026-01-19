import { GoogleGenAI } from "@google/genai";

export const maxDuration = 60;

const TECHNICAL_SPEC = {
    style: "2D nft asset sprite sheet, vector art illustration, nft asset style, NO TEXT OR LABELS",
    rendering: {
        lineWork: "clean bold dark outlines, consistent weight",
        shading: "flat cell-shading, minimal shadows, no gradients",
        colorProfile: "matte finish, vibrant colors"
    },
    environment: {
        background: "#00FF00",
        lighting: "global ambient lighting, no drop shadows, no environmental depth",
        perspective: "orthographic front-view"
    },
    layout: {
        composition: "deconstructed knolling arrangement",
        alignment: "strict grid-based isolation",
        padding: "wide gutters between all individual assets to prevent overlapping"
    },
    constraints: [
        "no clothing on the base body",
        "no 3D perspective",
        "no textured backgrounds",
        "no painterly brushstrokes",
        "no character interactions",
        "all assets must be separate and not touching",
        "no text, labels, or typography",
        "CRITICAL: minimum 50px grey space between all assets",
        "CRITICAL: assets must NOT touch or overlap each other"
    ]
};

export async function POST(req: Request) {
    try {
        const { prompt } = await req.json();

        const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return new Response(JSON.stringify({ error: "No API key configured" }), { status: 500 });
        }

        console.log('🎨 Generating sprite sheet for:', prompt);

        const ai = new GoogleGenAI({ apiKey });

        // Combine user prompt with technical specification
        const fullPrompt = `Create a professional NFT character sprite sheet with the following specifications:

TECHNICAL REQUIREMENTS:
- Style: ${TECHNICAL_SPEC.style}
- Line Work: ${TECHNICAL_SPEC.rendering.lineWork}
- Shading: ${TECHNICAL_SPEC.rendering.shading}
- Colors: ${TECHNICAL_SPEC.rendering.colorProfile}
- Background: ${TECHNICAL_SPEC.environment.background}
- Layout: ${TECHNICAL_SPEC.layout.composition}
- Spacing: ${TECHNICAL_SPEC.layout.padding}

CHARACTER THEME: ${prompt}

REQUIRED ASSETS (all separate, not touching):
1. BACKGROUND: One simple background scene (e.g., solid color, gradient, or simple pattern)
2. BASE BODY: 2-3 different character body top half with articulated joints, detached head, centered left
   - CRITICAL: Body must NOT have a head attached - only neck joint visible at top
   - Body should be HEADLESS - just torso, shoulders, arms, and neck
   - IMPORTANT: Body should match the CHARACTER THEME style (same art style as the heads)
   - Body should be compatible with ALL head variations
   - Body should reflect the character theme (e.g., cyberpunk body for cyberpunk heads)
3. HEAD VARIANTS: 2-3 different character heads in a row, top area with natural neck joint (y=400)
   - All heads should be in the SAME art style as the body
   - All heads should fit the CHARACTER THEME
   - Heads should be SEPARATE from bodies

DO NOT GENERATE: Hair, clothing, accessories, or any wearable items. Only body and head.
DO NOT attach heads to bodies - they must be completely separate assets.

STYLE CONSISTENCY RULE:
The body and all head variations MUST be in the same art style and match the character theme.
For example:
- If theme is "cyberpunk", body should be cyberpunk-styled, heads should be cyberpunk-styled
- If theme is "cartoon", body should be cartoon-styled, heads should be cartoon-styled
- If theme is "Rick and Morty", body should be Rick and Morty art style, heads should be Rick and Morty art style

TRAIT VARIATIONS:
Create 2-3 different visual variations for heads:
- Head: Create 2-3 different head variations (e.g., "Male Face" 40%, "Female Face" 40%, "Alien Face" 20%)
All variations must match the character theme and art style!
Rarities should sum to 100% per layer. Create visually distinct variations!

SPACING AND LAYOUT:
- Arrange assets in a grid with clear separation
- Each asset must have at least 50px of bright green (#00FF00) background space around it
- Assets must NOT touch or overlap - they should be completely isolated
- Example layout: [Head1] [50px space] [Head2] [50px space] [Head3]
                   [50px space]
                   [Body1] [50px space] [Body2]
                   [50px space]
                   [Background]

STANDARD DIMENSIONS (CRITICAL):
- HEAD: 320px width x 320px height (approx). Neck width at bottom MUST be exactly 60px.
- BODY: 500px width x 500px height (approx). Neck width at top MUST be exactly 60px.
- NECK JOINT: Both head and body must have a 60px flat or slightly curved connector to fit perfectly.

STANDARD NFT POSITIONING (for reference):
- Background: x=0, y=0, width=1024, height=1024
- Body: Centered, Top edge at y=400
- Head: Centered, Bottom edge at y=420

ALIGNMENT RULES:
- Head bottom edge (y + height) should be at y=420
- Body top edge should be at y=400
- This creates a 20px overlap for the neck connection.

CRITICAL RULES:
${TECHNICAL_SPEC.constraints.map(c => `- ${c}`).join('\n')}

ABSOLUTELY NO TEXT, LABELS, WORDS, OR TYPOGRAPHY IN THE IMAGE. Only visual assets.

Create a clean, organized sprite sheet with all assets clearly separated on bright green (#00FF00) background.`;

        console.log('📝 Sprite Sheet Prompt:');
        console.log('='.repeat(80));
        console.log(fullPrompt);
        console.log('='.repeat(80));

        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash-exp",
            contents: {
                role: "user",
                parts: [{ text: fullPrompt }]
            }
        });

        // Gemini returns text response, we need to use imagen for actual image generation
        // For now, let's use the existing generate-image endpoint
        console.log('⚠️ Using fallback to generate-image endpoint');

        const imageResponse = await fetch(`${req.headers.get('origin') || 'http://localhost:3000'}/api/generate-image`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Payment-Hash': req.headers.get('X-Payment-Hash') || ''
            },
            body: JSON.stringify({ prompt: fullPrompt })
        });

        if (!imageResponse.ok) {
            throw new Error("Failed to generate sprite sheet image");
        }

        const { url: imageUrl } = await imageResponse.json();

        // Convert data URL to base64
        const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, '');

        console.log('✅ Sprite sheet generated successfully');

        return new Response(JSON.stringify({
            url: imageUrl,
            base64: base64Data
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        console.error("❌ Sprite sheet generation failed:", error);
        return new Response(JSON.stringify({
            error: error.message || "Failed to generate sprite sheet"
        }), { status: 500 });
    }
}
