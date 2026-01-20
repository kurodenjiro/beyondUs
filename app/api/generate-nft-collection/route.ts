import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from "@google/genai";
import { prisma } from '@/lib/prisma';
import * as fs from 'fs';
import * as path from 'path';

const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
if (!apiKey) {
    throw new Error("No API key found");
}

const ai = new GoogleGenAI({ apiKey });

interface NFTConfig {
    subject: string;
    theme: string;
    artStyle: string;
    mood: string;
    faceOrientation: string;
    colorPalette: string[];
}

interface GeneratedTrait {
    category: string;
    description: string;
    imageData: string; // base64
}

// Parse prompt to config using AI
async function parsePromptToConfig(prompt: string): Promise<NFTConfig> {
    const aiPrompt = `Analyze this NFT collection prompt and extract configuration details.

Prompt: "${prompt}"

Provide a JSON response with:
{
    "subject": "main character type (e.g., cat, robot, dragon, alien)",
    "theme": "theme/style (e.g., cyberpunk, fantasy, horror, cute)",
    "artStyle": "art style (e.g., cartoon, anime, realistic, pixel art)",
    "mood": "mood/expression (e.g., cool, fierce, cute, mysterious)",
    "faceOrientation": "face view (frontal, three-quarter, or profile)",
    "colorPalette": ["#hex1", "#hex2", "#hex3"]
}`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash-exp",
            contents: {
                role: "user",
                parts: [{ text: aiPrompt }]
            }
        });

        const analysisText = response.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
        const config = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

        if (!config) throw new Error("Failed to parse prompt");

        // Ensure all fields have valid defaults
        config.subject = config.subject || "character";
        config.theme = config.theme || "modern";
        config.artStyle = config.artStyle || "cartoon";
        config.mood = config.mood || "cool";
        config.faceOrientation = config.faceOrientation || "three-quarter";

        if (!config.colorPalette || !Array.isArray(config.colorPalette) || config.colorPalette.length === 0) {
            config.colorPalette = ["#00FF00", "#FF00FF", "#FFFF00"];
        }

        return config;
    } catch (error) {
        // Fallback
        console.warn("Prompt parsing failed, using fallback config", error);
        const words = prompt.toLowerCase().split(" ");
        return {
            subject: words[words.length - 1] || "character",
            theme: words[0] || "modern",
            artStyle: "cartoon",
            mood: "cool",
            faceOrientation: "three-quarter",
            colorPalette: ["#00FF00", "#FF00FF", "#FFFF00"]
        };
    }
}

// Generate NFT sample
async function generateNFTSample(config: NFTConfig): Promise<string> {
    const prompt = `Create a CLEAN, MINIMAL NFT character base with NO accessories or traits.

SUBJECT & STYLE:
- Subject: ${config.subject}
- Theme: ${config.theme}
- Art Style: ${config.artStyle}
- Mood/Expression: ${config.mood}
- Face Orientation: ${config.faceOrientation} view
- Color Palette: ${config.colorPalette.join(", ")}

CRITICAL REQUIREMENTS - CLEAN BASE ONLY:
1. Create a ${config.subject} character in ${config.artStyle} style
2. ${config.mood} expression
3. ${config.faceOrientation} face orientation
4. NO accessories, clothing, jewelry, or items
5. Clean, simple, minimal design
6. Solid background color
7. Professional NFT quality
8. Centered composition, portrait orientation`;

    const response = await ai.models.generateContent({
        model: "gemini-3-pro-image-preview",
        contents: {
            role: "user",
            parts: [{ text: prompt }]
        },
        config: {
            seed: Date.now() % 2147483647,
            temperature: 0.5
        }
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);
    if (!imagePart || !imagePart.inlineData?.data) {
        throw new Error("Failed to generate NFT sample");
    }

    return imagePart.inlineData.data;
}

// Generate trait
async function generateTrait(category: string, config: NFTConfig, variationNumber: number): Promise<GeneratedTrait | null> {
    const prompt = `Generate a single ${category} trait for an NFT character.

STYLE TO MATCH:
- Art Style: ${config.artStyle}
- Theme: ${config.theme}
- Mood: ${config.mood}
- Color Palette: ${config.colorPalette.join(", ")}

REQUIREMENTS:
1. Create ONLY the ${category} item (not the full character)
2. Match the art style exactly
3. Use the specified color palette
4. Transparent or solid background
5. Professional NFT quality
6. Variation ${variationNumber} - make it unique

EXAMPLES:
- background: gradient, pattern, scene, abstract, solid color
- headwear: hat, cap, crown, helmet, headband
- eyewear: sunglasses, glasses, goggles, visor
- accessory: chain, earring, watch, badge
- clothing: shirt, jacket, vest, hoodie

OUTPUT: Just the ${category} item, ready to be composited onto a character.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-pro-image-preview",
            contents: {
                role: "user",
                parts: [{ text: prompt }]
            },
            config: {
                seed: (Date.now() + variationNumber) % 2147483647,
                temperature: 0.7
            }
        });

        const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);
        if (!imagePart || !imagePart.inlineData?.data) return null;

        return {
            category,
            description: `${category} variation ${variationNumber}`,
            imageData: imagePart.inlineData.data
        };
    } catch (error) {
        console.error(`Failed to generate ${category} ${variationNumber}`);
        return null;
    }
}

import { compositeTraits } from '@/lib/ai/composite';

export async function POST(request: NextRequest) {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            let isClosed = false;

            const safeClose = () => {
                if (!isClosed) {
                    isClosed = true;
                    try { controller.close(); } catch (e) { console.warn("Stream close error:", e); }
                }
            };

            const send = (data: any) => {
                if (isClosed) return;
                try {
                    controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"));
                } catch (e) {
                    console.warn("Failed to send to stream:", e);
                    safeClose();
                }
            };

            try {
                const { prompt, ownerAddress, traitsPerCategory = 2, nftsToGenerate = 5 } = await request.json();

                if (!prompt) {
                    send({ error: 'Prompt is required' });
                    return; // finally will close
                }

                console.log(`🚀 Starting NFT generation for: "${prompt}"`);
                send({ status: "Parsing prompt..." });

                // Step 1: Parse prompt to config
                const config = await parsePromptToConfig(prompt);
                console.log("✅ Config:", config);

                // Step 2: Generate base NFT sample
                send({ status: "Generating base NFT sample..." });
                const baseImageData = await generateNFTSample(config);
                console.log("✅ Base NFT generated");
                send({ status: "Base NFT generated" });

                // Step 3: Generate traits
                send({ status: `Generating ${traitsPerCategory} traits per category...` });
                const categories = ["background", "headwear", "eyewear", "accessory", "clothing"];
                const generatedTraits: GeneratedTrait[] = [];

                for (const category of categories) {
                    for (let i = 1; i <= traitsPerCategory; i++) {
                        // Check if we can still send
                        if (isClosed) break;

                        send({ status: `Generating ${category} ${i}/${traitsPerCategory}...` });
                        const trait = await generateTrait(category, config, i);
                        if (trait) {
                            generatedTraits.push(trait);
                            console.log(`  ✅ ${category} ${i}/${traitsPerCategory}`);
                        }
                    }
                    if (isClosed) break;
                }

                if (isClosed) return;

                console.log(`✅ Generated ${generatedTraits.length} traits`);
                send({ status: "Generating collection variants..." });

                // Step 4: Create NFT variations
                const nfts: Array<{
                    name: string;
                    image: string;
                    attributes: Array<{ trait_type: string; value: string }>;
                }> = [];

                for (let i = 1; i <= nftsToGenerate; i++) {
                    if (isClosed) break;

                    send({ status: `Creating NFT variant ${i}/${nftsToGenerate}...` });
                    // Randomly select traits
                    const selectedTraits = categories.map(cat => {
                        const categoryTraits = generatedTraits.filter(t => t.category === cat);
                        return categoryTraits[Math.floor(Math.random() * categoryTraits.length)];
                    }).filter(Boolean);

                    const traitsToComposite = selectedTraits.map(t => ({
                        category: t.category,
                        imageData: t.imageData
                    }));

                    const compositedImage = await compositeTraits(baseImageData, traitsToComposite);

                    nfts.push({
                        name: `${config.subject} #${i}`,
                        image: `data:image/png;base64,${compositedImage}`,
                        attributes: selectedTraits.map(t => ({
                            trait_type: t.category,
                            value: t.description
                        }))
                    });

                    console.log(`  ✅ NFT ${i}/${nftsToGenerate}`);
                }

                if (isClosed) return;

                console.log("✅ All NFTs generated");
                send({ status: "Saving to database..." });

                // Step 5: Save to database
                // Create layers structure for editor
                const layerMap = new Map<string, any>();

                // 1. Add Background Layer
                const bgTraits = generatedTraits.filter(t => t.category === "background");
                layerMap.set("Background", {
                    name: "Background",
                    parentLayer: "",
                    position: { x: 0, y: 0, width: 1024, height: 1024 },
                    aiPrompt: `Background for ${config.subject}`,
                    traits: bgTraits.length > 0 ? bgTraits.map(t => ({
                        name: t.description,
                        rarity: 100 / bgTraits.length,
                        imageUrl: `data:image/png;base64,${t.imageData}`,
                        description: t.description,
                        anchorPoints: { top: false, bottom: false, left: false, right: false }
                    })) : []
                });

                // 2. Add Base/Body Layer (The sample)
                layerMap.set("Body", {
                    name: "Body",
                    parentLayer: "Background",
                    position: { x: 0, y: 0, width: 1024, height: 1024 },
                    aiPrompt: `Base character ${config.subject}`,
                    traits: [{
                        name: "Base Character",
                        rarity: 100,
                        imageUrl: `data:image/png;base64,${baseImageData}`,
                        description: "Original generated base",
                        anchorPoints: { top: false, bottom: false, left: false, right: false }
                    }]
                });

                // 3. Add other accessory layers attached to Body
                const accessoryCategories = ["clothing", "accessory", "headwear", "eyewear"];

                accessoryCategories.forEach(category => {
                    const categoryTraits = generatedTraits.filter(t => t.category === category);
                    if (categoryTraits.length > 0) {
                        const displayName = category.charAt(0).toUpperCase() + category.slice(1);

                        layerMap.set(displayName, {
                            name: displayName,
                            parentLayer: "Body",
                            position: { x: 0, y: 0, width: 1024, height: 1024 },
                            aiPrompt: `${category} for ${config.subject}`,
                            traits: categoryTraits.map((t, idx) => ({
                                name: t.description,
                                rarity: 100 / categoryTraits.length,
                                imageUrl: `data:image/png;base64,${t.imageData}`,
                                description: t.description,
                                anchorPoints: { top: false, bottom: false, left: false, right: false }
                            }))
                        });
                    }
                });

                const layers = Array.from(layerMap.values());

                const project = await prisma.project.create({
                    data: {
                        ownerAddress: ownerAddress || "anonymous",
                        prompt,
                        name: `${config.subject} ${config.theme} Collection`,
                        layers,
                        previewImage: `data:image/png;base64,${baseImageData}`,
                        status: "saved",
                        nfts: {
                            create: nfts.map(nft => ({
                                name: nft.name,
                                image: nft.image,
                                attributes: nft.attributes,
                                description: `${config.subject} with ${nft.attributes.length} traits`
                            }))
                        }
                    }
                });

                console.log(`✅ Saved project: ${project.id}`);
                send({
                    success: true,
                    result: {
                        projectId: project.id,
                        nftsCreated: nfts.length,
                        config
                    }
                });

            } catch (error: any) {
                console.error('NFT generation error:', error);
                send({ error: error.message || 'Failed to generate NFTs' });
            } finally {
                safeClose();
            }
        }
    });

    return new NextResponse(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}
