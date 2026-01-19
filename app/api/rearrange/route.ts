import { GoogleGenAI } from "@google/genai";

export const maxDuration = 30;

export async function POST(req: Request) {
    try {
        const { prompt, compositeImage, layers } = await req.json();

        const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return new Response(JSON.stringify({ error: "No API key configured" }), { status: 500 });
        }

        console.log('🔍 Analyzing composite image for rearrangement...');

        const ai = new GoogleGenAI({ apiKey });

        // Remove data URL prefix if present
        const base64Data = compositeImage.replace(/^data:image\/\w+;base64,/, '');

        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash-exp",
            contents: {
                role: "user",
                parts: [
                    {
                        text: `You are an expert NFT character positioning specialist. Analyze this composite character image and optimize the layer positions.

PROJECT: "${prompt}"

CURRENT LAYER POSITIONS:
${JSON.stringify(layers, null, 2)}

POSITIONING RULES:
1. CENTER HORIZONTAL: All character components MUST be centered on x=512 axis
2. NATURAL NECK JOINT (Y=400): Optimal meeting point for Head and Body
3. HEAD: Bottom edge around y=410-420 for slight overlap (e.g., y=100, height=320)
4. BODY: Top edge at y=400 (e.g., y=400, height=600)
5. OVERLAP: Allow 10-20px overlap for seamless assembly
6. FACIAL FEATURES (Eyes, Mouth) - CONCRETE EXAMPLES:
   **CRITICAL**: These are ABSOLUTE canvas positions, not relative to head!
   
   Example 1: If Head is at y=100, height=320 (so head spans y=100 to y=420):
   - Eyes should be at y=180-220 (about 30% down from head top)
   - Mouth should be at y=300-340 (about 70% down from head top)
   
   Example 2: If Head is at y=80, height=340 (so head spans y=80 to y=420):
   - Eyes should be at y=160-200 (head_y + head_height * 0.3)
   - Mouth should be at y=300-340 (head_y + head_height * 0.7)
   
   Formula: eyes_y = head_y + (head_height * 0.3)
   Formula: mouth_y = head_y + (head_height * 0.7)
   
7. HAIR/ACCESSORIES: Can extend beyond head bounds but should anchor to head position
8. CLOTHES: Position to align with the Body's upper torso area
9. VISUAL ANALYSIS: Look at the actual image and identify any gaps, overlaps, or misalignments
10. PROPORTIONS: Ensure natural character proportions based on what you see
11. FIX FLOATING ELEMENTS: If you see elements that don't align with their parent (like eyes floating above the head), calculate their correct Y position using the formulas above

Analyze the visual result and provide optimized positions for ALL layers. Include reasoning for each adjustment.

Return JSON with this structure:
{
  "layers": [
    {
      "name": "LayerName",
      "reasoning": "Why this position was chosen",
      "position": { "x": 0, "y": 0, "width": 1024, "height": 1024 }
    }
  ]
}`
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
                                    reasoning: { type: "string" },
                                    position: {
                                        type: "object",
                                        properties: {
                                            x: { type: "number" },
                                            y: { type: "number" },
                                            width: { type: "number" },
                                            height: { type: "number" }
                                        },
                                        required: ["x", "y", "width", "height"]
                                    }
                                },
                                required: ["name", "reasoning", "position"]
                            }
                        }
                    },
                    required: ["layers"]
                }
            }
        });

        const resultText = response.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

        // Strip markdown if present
        const cleanedText = resultText.replace(/^```json\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

        const result = JSON.parse(cleanedText);

        console.log("✅ Vision-based rearrangement complete:", JSON.stringify(result, null, 2));
        return new Response(JSON.stringify(result), { status: 200 });
    } catch (error: any) {
        console.error("❌ Rearrange failed:", error);
        return new Response(JSON.stringify({ error: error.message || "Failed to rearrange layers" }), { status: 500 });
    }
}
