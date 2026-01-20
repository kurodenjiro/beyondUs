import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
if (!apiKey) {
    throw new Error("No API key found");
}

const ai = new GoogleGenAI({ apiKey });

// Composite traits onto base
export async function compositeTraits(
    baseImageData: string,
    traits: Array<{ category: string; imageData: string }>
): Promise<string> {
    const traitList = traits.map((t, idx) => `${idx + 1}. ${t.category}`).join("\n");

    const prompt = `Role: You are a professional character artist and NFT designer.

Input Data:

Image 1 (The Sample): This is the base character. You must preserve its pose, proportions, art style, line weight, and overall composition exactly.

${traits.map((t, idx) => `Image ${idx + 2} (${t.category}): Trait to be added`).join("\n")}

Objective: Composite ALL trait images onto the base character in a single, cohesive design. The resulting output should look like the character from Image 1 is naturally wearing/holding all the items.

Traits to Apply:
${traitList}

Strict Constraints:

1. Do Not Alter the Sample: The character's face, body shape, pose, and existing features from Image 1 must remain unchanged.

2. Style Consistency: Render ALL traits using the exact same artistic style, shading, and color palette found in Image 1.

3. Perspective Alignment: Adjust the angle and perspective of each trait to match the character's position.

4. Proper Layering: Apply traits in the correct order:
   - Background: Bottom layer, behind character
   - Clothing: Base layer on character, follows torso contour
   - Accessories: Mid layer, positioned naturally
   - Headwear: Sits on head, behind ears but over forehead
   - Eyewear: Top layer, aligned with eyes and face

5. Technical Style: Maintain the thick black outlines and flat cel-shading present in the sample.

6. Background: Keep the same solid background color from Image 1.

7. Natural Integration: Each trait should look like it was always part of the original character design.

Task: Generate the final composite image where ALL traits are seamlessly integrated into the base character in a single, cohesive design.

Tips for Better Results:
- Focus specifically on how each trait type should be positioned
- Maintain the thick black outlines and flat cel-shading present in the sample
- Render the output with the same solid background color

CRITICAL: The output must look like a single, unified character design, not a collage. All traits should appear as if they were always part of the original character.`;

    const parts: any[] = [
        { text: prompt },
        { inlineData: { mimeType: "image/png", data: baseImageData } }
    ];

    traits.forEach(t => {
        parts.push({ inlineData: { mimeType: "image/png", data: t.imageData } });
    });

    const response = await ai.models.generateContent({
        model: "gemini-3-pro-image-preview",
        contents: {
            role: "user",
            parts
        },
        config: {
            seed: Date.now() % 2147483647,
            temperature: 0.3 // Increased slightly from 0.1 for better blending
        }
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);
    if (!imagePart || !imagePart.inlineData?.data) {
        throw new Error("Failed to composite traits");
    }

    return imagePart.inlineData.data;
}
