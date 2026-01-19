import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { z } from 'zod';

export const maxDuration = 30;

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { prompt, style, supply } = await z
            .object({
                prompt: z.string(),
                style: z.string().optional(),
                supply: z.number().default(1),
            })
            .parseAsync(body);

        // If no API key is present, mock the response to avoid crashing in demo
        if (!process.env.OPENAI_API_KEY) {
            return new Response(JSON.stringify({
                success: true,
                message: "Simulated AI Response (No API Key): " + prompt
            }), { status: 200 });
        }

        const { text } = await generateText({
            model: openai('gpt-4o'),
            system: 'You are an expert NFT artist assistant. Your goal is to enhance the user\'s prompt into a detailed, high-quality image generation prompt suitable for high-end NFT art. Keep it concise but descriptive.',
            prompt: `Enhance this prompt for a ${style || 'general'} style NFT collection of size ${supply}: ${prompt}`,
        });

        return new Response(JSON.stringify({ success: true, text }), { status: 200 });
    } catch (error) {
        console.error("AI Generation failed:", error);
        return new Response(JSON.stringify({ success: false, error: "Failed to generate" }), { status: 500 });
    }
}
