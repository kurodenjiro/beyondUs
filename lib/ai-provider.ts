import { createGateway } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

export type AIProvider = 'openai' | 'vercel-ai-gateway';

/**
 * Create a model instance based on the API Key format.
 * Automatically switches to 'vercel-ai-gateway' if key starts with 'vck_'.
 */
export function createModelInstance(modelId: string = 'gpt-4o') {
    const apiKey = process.env.VERCEL_GATEWAY_API_KEY || process.env.OPENAI_API_KEY || "";

    // Logic: If key is 'vck_', use createGateway (Vercel AI Gateway)
    // Else: Use standard OpenAI provider

    if (apiKey.startsWith('vck_')) {
        console.log("Using Vercel AI Gateway (vck_ key detected)");
        const gateway = createGateway({
            apiKey: apiKey,
        });
        return gateway(modelId);
    } else {
        // Standard OpenAI
        console.log("Using Standard OpenAI Provider");
        const openai = createOpenAI({
            apiKey: apiKey,
        });
        return openai(modelId);
    }
}
