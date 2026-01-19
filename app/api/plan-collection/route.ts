import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import { NextResponse } from 'next/server';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Initialize Google Provider with explicit API Key
    const google = createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY,
    });

    const systemPrompt = `
You are an expert NFT collection planner.Your goal is to generate a JSON manifest for a small "pfp" collection based on the user's theme.
The user wants a collection of 5 unique characters.

You must design specific traits for:
      - Background
        - Body
        - Head(or Face / Eyes / Headwear combined into Head)

Output a JSON array of 5 objects, where each object represents a character.
Format matches this example:
    [
      {
        "name": "Collection Name #0001",
        "description": "...",
        "image": "ipfs://YOUR_CID_HERE/1.png",
        "dna": "unique_id_string",
        "edition": 1,
        "date": 1736458593,
        "attributes": [
          { "trait_type": "Background", "value": "Specific Value" },
          { "trait_type": "Body", "value": "Specific Value" },
          { "trait_type": "Head", "value": "Specific Value" },
          { "trait_type": "Rarity Class", "value": "Common" }
        ]
      }
    ]

    Requirements:
    - "dna": Generate a unique pseudo - random hex string(e.g., "cn_8829a1b2").
- "edition": Incrementing number(1 - 5).
- "date": Use the current timestamp provided in the prompt or default to now.
- "image": Use "ipfs://YOUR_CID_HERE/{edition}.png".
- "attributes": "value"s must be descriptive and visual.
- Reuse some traits across characters to create a cohesive collection, but ensure each character is unique.
- Return ONLY valid JSON.
        `;

    const timestamp = Math.floor(Date.now() / 1000);

    const { text } = await generateText({
      model: google('gemini-2.0-flash-exp'),
      system: systemPrompt,
      prompt: `Theme: ${prompt} \nCurrent Timestamp: ${timestamp} `,
    });

    console.log("PLAN_COLLECTION_TEXT:", text);

    // Clean up markdown block if present
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const manifest = JSON.parse(jsonStr);

    return NextResponse.json({ manifest, rawPlan: text });

  } catch (error) {
    console.error("Plan Collection Error:", error);
    return NextResponse.json({ error: "Failed to plan collection" }, { status: 500 });
  }
}
