import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;

// Reusing interfaces from the collection generator for consistency
interface TraitConfig {
    artStyle: string;
    theme: string;
    mood: string;
    colorPalette: string[];
}

export async function POST(request: NextRequest) {
    if (!apiKey) {
        return NextResponse.json({ error: "Server misconfigured: No API Key" }, { status: 500 });
    }

    try {
        const { prompt, style, category = "asset", config } = await request.json();

        // Use provided config or defaults based on the inputs
        const traitConfig: TraitConfig = config || {
            artStyle: style === 'none' ? "game asset" : style,
            theme: "general",
            mood: "neutral",
            colorPalette: []
        };

        // Construct the rigorous prompt used in the collection generator
        const systemPrompt = `Generate a single ${category} trait for an NFT character.

STYLE TO MATCH:
- Art Style: ${traitConfig.artStyle}
${traitConfig.theme !== 'general' ? `- Theme: ${traitConfig.theme}` : ''}
${traitConfig.mood !== 'neutral' ? `- Mood: ${traitConfig.mood}` : ''}
${traitConfig.colorPalette.length > 0 ? `- Color Palette: ${traitConfig.colorPalette.join(", ")}` : ''}

REQUIREMENTS:
1. Create ONLY the ${category} item
2. Match the art style exactly
3. Transparent or solid background (white preferred for assets)
4. Professional NFT quality
5. High resolution, crisp details
6. Flat 2D vector style unless specified otherwise

SPECIFIC PROMPT: ${prompt}

OUTPUT: Just the ${category} item, ready to be composited directly.`;

        const ai = new GoogleGenAI({ apiKey });

        console.log(`🎨 Generating trait: ${prompt} [Category: ${category}]`);

        // Using the same model as the detailed generator script
        const response = await ai.models.generateContent({
            model: "gemini-3-pro-image-preview",
            contents: {
                role: "user",
                parts: [{ text: systemPrompt }]
            },
            config: {
                seed: Date.now() % 2147483647,
                temperature: 0.7
            }
        });

        const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);

        if (!imagePart || !imagePart.inlineData?.data) {
            // Fallback attempt with Flash model if 3-pro fails or returns no image (though 3-pro is best for images)
            console.warn("⚠️ Primary model failed, valid image data not found. Attempting fallback...");

            // Simple fallback prompt
            const fallbackResponse = await ai.models.generateContent({
                model: "gemini-2.0-flash-exp",
                contents: {
                    role: "user",
                    parts: [{ text: `Generate an image of: ${prompt}, ${traitConfig.artStyle} style, white background` }]
                }
            });

            // Check if fallback has image data (unlikely for flash-exp usually, but handles some multimodal out) or just return error
            // For now, if primary fails, we return error to let user know.
            throw new Error("Failed to generate image data from model.");
        }

        const imageData = imagePart.inlineData.data;

        return NextResponse.json({
            success: true,
            url: `data:image/png;base64,${imageData}`
        });

    } catch (error: any) {
        console.error('Trait generation error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to generate trait' },
            { status: 500 }
        );
    }
}
