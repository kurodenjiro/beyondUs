import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const projectId = id;

        // Fetch the project to get layers
        const project = await prisma.project.findUnique({
            where: { id: projectId }
        });

        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        const layers = project.layers as any[];

        if (!layers || layers.length === 0) {
            return NextResponse.json({ error: "No layers found" }, { status: 400 });
        }

        // 1. Filter active layers and traits
        const activeLayers = layers.filter(layer => layer.traits && layer.traits.length > 0);

        // 1.5 Sort layers by visual depth (Mirroring ManageLayers logic)
        const getDepth = (layerName: string, allLayers: any[], visited = new Set<string>()): number => {
            if (visited.has(layerName)) return 0; // Prevent infinite loops
            visited.add(layerName);

            const layer = allLayers.find(l => l.name === layerName);
            if (!layer || !layer.parentLayer) return 0;
            return 1 + getDepth(layer.parentLayer, allLayers, visited);
        };

        const sortedLayers = [...activeLayers].sort((a: any, b: any) => {
            const depthA = getDepth(a.name, activeLayers);
            const depthB = getDepth(b.name, activeLayers);
            // If depths are equal, preserve original index (stable sort surrogate)
            if (depthA === depthB) {
                return activeLayers.indexOf(a) - activeLayers.indexOf(b);
            }
            return depthA - depthB;
        });

        // 2. Generate all combinations (Cartesian Product)
        const generateCombinations = (layers: any[], currentCombination: any[] = []): any[] => {
            if (layers.length === 0) {
                return [currentCombination];
            }

            const currentLayer = layers[0];
            const remainingLayers = layers.slice(1);
            const combinations: any[] = [];

            for (const trait of currentLayer.traits) {
                const traitData = {
                    layer: currentLayer.name,
                    trait: trait.name,
                    imageUrl: trait.imageUrl,
                    rarity: trait.rarity,
                    // Capture Layer Position
                    position: currentLayer.position,
                    zIndex: currentCombination.length // implicit z-index based on order
                };

                const subCombinations = generateCombinations(remainingLayers, [...currentCombination, traitData]);
                combinations.push(...subCombinations);
            }

            return combinations;
        };

        const allCombinations = generateCombinations(sortedLayers);

        console.log(`Generated ${allCombinations.length} combinations for project ${projectId}`);

        // Limit to a reasonable number for safety (e.g., 10,000)
        const MAX_NFTS = 10000;
        const combinationsToSave = allCombinations.slice(0, MAX_NFTS);

        // 3. Prepare data for bulk insert
        const nftsData = combinationsToSave.map((combo, index) => {
            // Calculate rarity score (simple sum or average for now)
            const totalRarity = combo.reduce((acc: number, item: any) => acc + (item.rarity || 100), 0);
            const avgRarity = totalRarity / combo.length;

            return {
                projectId: projectId,
                name: `${project.name || 'NFT'} #${index + 1}`,
                description: project.prompt,
                attributes: combo.map((c: any) => ({
                    trait_type: c.layer,
                    value: c.trait, // Name of the trait
                    image_url: c.imageUrl,
                    // Store detailed composition data
                    position: c.position || { x: 0, y: 0, width: 1024, height: 1024 }
                })),
                rarityScore: avgRarity,
                mintStatus: 'pending',
                // We're not generating one single composite image URL here to save space/time.
                // The client or a background worker can compose them using the attributes.image_url
                image: null
            };
        });

        // 4. Delete existing generated NFTs for this project (optional, to allow regeneration)
        await prisma.nft.deleteMany({
            where: { projectId: projectId }
        });

        // 5. Bulk Create
        // Prisma's createMany is optimal here
        await prisma.nft.createMany({
            data: nftsData
        });

        return NextResponse.json({
            success: true,
            count: nftsData.length,
            message: `Generated ${nftsData.length} NFTs`
        });

    } catch (error: any) {
        console.error("Error generating NFTs:", error);
        return NextResponse.json({ error: error.message || "Failed to generate NFTs" }, { status: 500 });
    }
}
