import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export const maxDuration = 30;

export async function POST(req: Request) {
    try {
        const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { prompt: "A futuristic cyberpunk samurai with neon armor and a glowing katana, detailed digital art style." },
                { status: 200 }
            );
        }

        const ai = new GoogleGenAI({ apiKey });

        const systemPrompt = `Generate a single, creative, and detailed prompt for a 2D PFP NFT collection.
        
        GUIDELINES:
        - Theme: Pick ONE random theme (Cyberpunk, Steampunk, Fantasy, Sci-Fi, Horror, Anime, Pixel Art, Abstract, Retro).
        - Format: "A collection of [adjective] [subject] with [specific details] in [art style] style."
        - Keep it under 25 words.
        - Make it exciting and visual.
        - Do NOT include quotes or prefixes like "Prompt:".
        
        Examples:
        - "A collection of cute pixel art dragons breathing fire with unique elemental scales."
        - "A collection of dystopian mecha-rabbits with battle scars and rusty metal plating."
        - "A collection of ethereal ghost spirits floating in a void with glowing pastel auras."`;

        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash-exp",
            contents: {
                role: "user",
                parts: [{ text: systemPrompt }]
            },
            config: {
                temperature: 0.9, // High creativity
            }
        });

        const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const cleanPrompt = text.replace(/^["']|["']$/g, '').trim();

        return NextResponse.json({ prompt: cleanPrompt });

    } catch (error) {
        console.error("Suggest API Error:", error);
        // Fallback
        return NextResponse.json(
            { prompt: "A collection of cool 3D rendered abstract shapes with glass textures and colorful lighting." },
            { status: 200 }
        );
    }
}
