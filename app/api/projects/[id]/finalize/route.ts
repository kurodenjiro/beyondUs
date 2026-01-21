import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { compositeTraits } from '@/lib/ai/composite';

interface TraitInput {
    category: string;
    description: string;
    imageData: string;
}

// Use params context correctly for Next.js 13+ app directory dynamic routes
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { baseImageData, config, nftsToGenerate = 5 } = await request.json();

        if (!baseImageData || !config) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        // Fetch generated traits from DB
        const projectTraits = await prisma.projectTrait.findMany({
            where: { projectId: id }
        });

        console.log(`🚀 Finalizing project ${id} with ${projectTraits.length} traits from DB`);

        // 1. Create Layers Structure
        const layerMap = new Map<string, any>();

        // Background Layer
        const bgTraits = projectTraits.filter(t => t.category === "background");
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

        // Body Layer
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

        // Other Layers
        const categories = ["clothing", "accessory", "headwear", "eyewear"];
        categories.forEach(category => {
            const categoryTraits = projectTraits.filter(t => t.category === category);
            if (categoryTraits.length > 0) {
                const displayName = category.charAt(0).toUpperCase() + category.slice(1);
                layerMap.set(displayName, {
                    name: displayName,
                    parentLayer: "Body",
                    position: { x: 0, y: 0, width: 1024, height: 1024 },
                    aiPrompt: `${category} for ${config.subject}`,
                    traits: categoryTraits.map(t => ({
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
        const allCategories = ["background", ...categories];

        // 2. Generate NFT Variants
        const nfts = [];

        for (let i = 1; i <= nftsToGenerate; i++) {
            // Randomly select one trait per category
            const selectedTraits = allCategories.map(cat => {
                const categoryTraits = projectTraits.filter(t => t.category === cat);
                if (categoryTraits.length === 0) return null;
                return categoryTraits[Math.floor(Math.random() * categoryTraits.length)];
            }).filter((t): t is typeof projectTraits[0] => t !== null);

            const traitsToComposite = selectedTraits.map(t => ({
                category: t.category,
                imageData: t.imageData
            }));

            // Composite
            const compositedImage = await compositeTraits(baseImageData, traitsToComposite);

            nfts.push({
                name: `${config.subject} #${i}`,
                image: `data:image/png;base64,${compositedImage}`,
                attributes: selectedTraits.map(t => ({
                    trait_type: t.category,
                    value: t.description
                }))
            });
        }

        // 3. Update Project
        await prisma.project.update({
            where: { id },
            data: {
                layers,
                status: 'saved',
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

        return NextResponse.json({ success: true, projectId: id });

    } catch (error: any) {
        console.error('Finalize error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to finalize project' },
            { status: 500 }
        );
    }
}
