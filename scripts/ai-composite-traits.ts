import { GoogleGenAI } from "@google/genai";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error("❌ No API key found");
    process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

/**
 * Professional AI Trait Compositor
 * Uses master prompt for seamless trait integration
 */

export async function compositeTraitToNFT(
    sampleImagePath: string,
    traitImagePath: string,
    traitCategory: string,
    outputPath: string
): Promise<string> {
    console.log(`   Compositing ${traitCategory}...`);

    // Read images
    const sampleBuffer = fs.readFileSync(sampleImagePath);
    const traitBuffer = fs.readFileSync(traitImagePath);

    const sampleBase64 = sampleBuffer.toString("base64");
    const traitBase64 = traitBuffer.toString("base64");

    // Professional master prompt
    const prompt = `Role: You are a professional character artist and NFT designer.

Input Data:

Image A (The Sample): This is the base character. You must preserve its pose, proportions, art style, line weight, and overall composition exactly.

Image B (The Trait - ${traitCategory}): This is the item/attribute that needs to be added to the character.

Objective: Redraw Image B so that it fits perfectly onto Image A (the base character). The resulting output should look like the character from Image A is naturally wearing or holding the item from Image B.

Strict Constraints:

1. Do Not Alter the Sample: The character's face, body shape, and existing features from Image A must remain unchanged.

2. Style Consistency: Render the new trait using the exact same artistic style, shading, and color palette found in Image A.

3. Perspective Alignment: Adjust the angle and perspective of the trait from Image B to match the character's head/body position in Image A.

4. Layering: Ensure the trait is layered correctly:
   - Headwear: Should sit on the head, behind ears but over forehead
   - Eyewear: Should fit on the face, aligned with eyes
   - Clothing: Should follow the torso's contour
   - Accessory: Should be held naturally or worn appropriately

5. Technical Style: Maintain the thick black outlines and flat cel-shading present in the sample.

6. Background: Keep the same solid background color from Image A.

Task: Generate the final composite image where the trait from Image B is seamlessly integrated into the base character from Image A.

Focus specifically on how the ${traitCategory} should be positioned and rendered to match the character's style and pose.

CRITICAL: The output must look like a single, cohesive character design, not a collage. The trait should appear as if it was always part of the original character.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-pro-image-preview",
            contents: {
                role: "user",
                parts: [
                    { text: prompt },
                    { inlineData: { mimeType: "image/png", data: sampleBase64 } },
                    { inlineData: { mimeType: "image/png", data: traitBase64 } }
                ]
            },
            config: {
                seed: Date.now() % 2147483647,
                temperature: 0.3  // Low for consistency
            }
        });

        const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);

        if (!imagePart || !imagePart.inlineData?.data) {
            throw new Error(`Failed to composite ${traitCategory}`);
        }

        const buffer = Buffer.from(imagePart.inlineData.data, 'base64');
        fs.writeFileSync(outputPath, buffer);

        return outputPath;

    } catch (error: any) {
        console.error(`   ❌ Failed to composite ${traitCategory}:`, error.message);
        throw error;
    }
}

/**
 * Composite multiple traits onto base NFT in a single AI call
 * Much faster than sequential compositing!
 */
export async function compositeMultipleTraits(
    baseImagePath: string,
    traits: Array<{ category: string; imagePath: string }>,
    outputPath: string
): Promise<string> {
    console.log(`\n🎨 Compositing ${traits.length} traits onto base NFT...`);

    // Read all images
    const baseBuffer = fs.readFileSync(baseImagePath);
    const baseBase64 = baseBuffer.toString("base64");

    const traitImages = traits.map(t => {
        const buffer = fs.readFileSync(t.imagePath);
        return {
            category: t.category,
            base64: buffer.toString("base64")
        };
    });

    // Build comprehensive prompt with all traits
    const traitList = traits.map((t, idx) => `${idx + 1}. ${t.category}`).join("\n");

    const prompt = `Role: You are a professional character artist and NFT designer.

Input Data:

Image 1 (The Sample): This is the base character. You must preserve its pose, proportions, art style, line weight, and overall composition exactly.

${traitImages.map((_, idx) => `Image ${idx + 2} (${traits[idx].category}): Trait to be added`).join("\n")}

Objective: Composite ALL trait images onto the base character in a single, cohesive design. The resulting output should look like the character from Image 1 is naturally wearing/holding all the items.

Traits to Apply:
${traitList}

Strict Constraints:

1. Do Not Alter the Sample: The character's face, body shape, pose, and existing features from Image 1 must remain unchanged.

2. Style Consistency: Render ALL traits using the exact same artistic style, shading, and color palette found in Image 1.

3. Perspective Alignment: Adjust the angle and perspective of each trait to match the character's position.

4. Proper Layering: Apply traits in the correct order:
   - Clothing: Base layer, follows torso contour
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

    try {
        // Build parts array: base image + all trait images
        const parts: any[] = [
            { text: prompt },
            { inlineData: { mimeType: "image/png", data: baseBase64 } }
        ];

        // Add all trait images
        traitImages.forEach(t => {
            parts.push({ inlineData: { mimeType: "image/png", data: t.base64 } });
        });

        console.log(`\n🎨 Sending to AI: Base + ${traits.length} traits in single call...`);

        const response = await ai.models.generateContent({
            model: "gemini-3-pro-image-preview",
            contents: {
                role: "user",
                parts
            },
            config: {
                seed: Date.now() % 2147483647,
                temperature: 0.3  // Low for consistency
            }
        });

        const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);

        if (!imagePart || !imagePart.inlineData?.data) {
            throw new Error("Failed to composite traits");
        }

        const buffer = Buffer.from(imagePart.inlineData.data, 'base64');

        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        fs.writeFileSync(outputPath, buffer);

        console.log(`✅ NFT with all traits saved!`);
        return outputPath;

    } catch (error: any) {
        console.error(`❌ Failed to composite traits:`, error.message);
        throw error;
    }
}

// Example usage
if (require.main === module) {
    (async () => {
        const baseImage = process.argv[2];
        const traitImage = process.argv[3];
        const category = process.argv[4] || "accessory";
        const output = process.argv[5] || "output/composited_nft.png";

        if (!baseImage || !traitImage) {
            console.log(`
🎨 AI Trait Compositor - Professional NFT Trait Integration

Usage:
  npx tsx ai-composite-traits.ts <base-image> <trait-image> <category> [output]

Arguments:
  base-image    Path to base NFT sample
  trait-image   Path to trait image to add
  category      Trait category (headwear, eyewear, clothing, accessory)
  output        Output path (optional)

Example:
  npx tsx ai-composite-traits.ts nft-templates/sample_ape.png generated-traits/headwear/hat_1.png headwear output/ape_with_hat.png
            `);
            process.exit(1);
        }

        const outputDir = path.dirname(output);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        await compositeTraitToNFT(baseImage, traitImage, category, output);

        console.log(`\n✨ Trait composited successfully!`);
        console.log(`📁 Output: ${output}`);

    })().catch(console.error);
}
