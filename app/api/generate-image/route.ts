import { GoogleGenAI } from "@google/genai";

export const maxDuration = 60;

export async function POST(req: Request) {
    try {
        const { prompt, style } = await req.json();
        const paymentHash = req.headers.get("X-Payment-Hash");

        if (paymentHash) console.log("x402 Image Gen Proof:", paymentHash);
        console.log("🎨 Image Promt:", prompt);

        // Check for Google AI API key
        const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.error("❌ No Google AI API key found. Set GOOGLE_AI_API_KEY in .env.local");
            return new Response(JSON.stringify({
                error: "No API key configured"
            }), { status: 500 });
        }

        console.log("✅ Generating image with Gemini 2.5 Flash...");

        const ai = new GoogleGenAI({ apiKey });

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-image",
            contents: prompt,
        });

        // Extract image data from response (following official example)
        let imageData: string | null = null;

        const parts = response.candidates?.[0]?.content?.parts || [];

        for (const part of parts) {
            if (part.text) {
                console.log("Text response:", part.text);
            }
            if (part.inlineData) {
                imageData = part.inlineData.data || null;
                console.log("✅ Found image data in response");
            }
        }

        // Check if we got image data
        if (!imageData) {
            throw new Error("No image data returned from Gemini");
        }

        // --- NEW: Background Removal & Trimming using sharp ---
        let finalImageData = imageData;
        try {
            const sharp = (await import('sharp')).default;
            const buffer = Buffer.from(imageData, 'base64');

            // 1. Convert white background to transparency
            // We use raw pixel manipulation for high accuracy on the "Pure White" background
            const { data, info } = await sharp(buffer)
                .ensureAlpha()
                .raw()
                .toBuffer({ resolveWithObject: true });

            const pixelData = new Uint8Array(data);
            for (let i = 0; i < pixelData.length; i += 4) {
                const r = pixelData[i];
                const g = pixelData[i + 1];
                const b = pixelData[i + 2];

                // If pixel is white or near-white, make it transparent
                // Gemini is instructed to use #FFFFFF, but we allow a tiny threshold
                if (r > 250 && g > 250 && b > 250) {
                    pixelData[i + 3] = 0;
                }
            }

            // 2. Trim the resulting transparent image and convert back to PNG buffer
            const processedBuffer = await sharp(pixelData, {
                raw: {
                    width: info.width,
                    height: info.height,
                    channels: 4
                }
            })
                .trim() // Sharp trim now works on the Alpha channel we just created
                .png()
                .toBuffer();

            finalImageData = processedBuffer.toString('base64');
            console.log("✅ Background removed and image trimmed with sharp");
        } catch (processError) {
            console.error("⚠️ Sharp processing failed (falling back to original):", processError);
        }

        // Convert to base64 data URL
        const imageUrl = `data:image/png;base64,${finalImageData}`;

        console.log("✅ Image processed successfully");
        return new Response(JSON.stringify({ url: imageUrl }), { status: 200 });

    } catch (error: any) {
        console.error("❌ Image Generation failed:", error);

        // Check if it's a quota error
        if (error.status === 429 || error.message?.includes("quota")) {
            return new Response(JSON.stringify({
                error: "Gemini API quota exceeded. Please wait or upgrade your plan."
            }), { status: 429 });
        }

        return new Response(JSON.stringify({
            error: error.message || "Failed to generate image"
        }), { status: 500 });
    }
}
