import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { compositeTraits } from '@/lib/ai/composite';

export const maxDuration = 60;

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const projectId = id;

        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status');

        const where: any = { projectId: projectId };
        if (status) {
            where.mintStatus = status;
        }

        const nfts = await prisma.nft.findMany({
            where: where,
            orderBy: { name: 'asc' }
        });

        return NextResponse.json({ nfts });

    } catch (error: any) {
        console.error("Error fetching NFTs:", error);
        return NextResponse.json({ error: "Failed to fetch NFTs" }, { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const projectId = id;
        const { image: providedImage, attributes } = await request.json();

        let finalImage = providedImage;

        // If image not provided, generate it server-side from attributes
        if (!finalImage && attributes && Array.isArray(attributes)) {
            console.log("🎨 Generating NFT image server-side from attributes...");

            const project = await prisma.project.findUnique({ where: { id: projectId } });
            if (!project) throw new Error("Project not found");

            const layers = project.layers as any[];

            // 1. Get Base Image (Body)
            const bodyLayer = layers.find(l => l.name === "Body");
            const bodyAttr = attributes.find((a: any) => a.trait_type === "Body");
            const bodyTrait = bodyAttr
                ? bodyLayer?.traits.find((t: any) => t.name === bodyAttr.value)
                : bodyLayer?.traits[0];

            if (!bodyTrait) throw new Error("Base character (Body) not found");

            // Helper
            const getBase64 = (url: string) => url.replace(/^data:image\/\w+;base64,/, "");
            const baseImageData = getBase64(bodyTrait.imageUrl);

            // 2. Get Other Traits
            const traitsToComposite = attributes
                .filter((a: any) => a.trait_type !== "Body")
                .map((a: any) => {
                    const layer = layers.find(l => l.name === a.trait_type);
                    const trait = layer?.traits.find((t: any) => t.name === a.value);
                    if (!trait) return null;
                    return {
                        category: a.trait_type.toLowerCase(),
                        imageData: getBase64(trait.imageUrl)
                    };
                })
                .filter((t: any): t is { category: string; imageData: string } => t !== null);

            // 3. Composite
            const compositedBase64 = await compositeTraits(baseImageData, traitsToComposite);
            finalImage = `data:image/png;base64,${compositedBase64}`;
        }

        if (!finalImage) {
            return NextResponse.json(
                { error: 'Missing image or attributes to generate image' },
                { status: 400 }
            );
        }

        // Create NFT in database
        const nft = await prisma.nft.create({
            data: {
                projectId,
                name: `NFT #${Date.now()}`,
                image: finalImage,
                attributes: attributes as any
            }
        });

        return NextResponse.json(nft);
    } catch (error: any) {
        console.error('Failed to save NFT:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to save NFT' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const projectId = id;
        const { nftId, image: providedImage, attributes } = await request.json();

        if (!nftId) {
            return NextResponse.json(
                { error: 'Missing required field: nftId' },
                { status: 400 }
            );
        }

        let finalImage = providedImage;

        // If image not provided, generate it server-side from attributes
        if (!finalImage && attributes && Array.isArray(attributes)) {
            console.log("🎨 Regenerating NFT image server-side from attributes...");

            const project = await prisma.project.findUnique({ where: { id: projectId } });
            if (!project) throw new Error("Project not found");

            const layers = project.layers as any[];

            // 1. Get Base Image (Body)
            const bodyLayer = layers.find(l => l.name === "Body");
            const bodyAttr = attributes.find((a: any) => a.trait_type === "Body");
            const bodyTrait = bodyAttr
                ? bodyLayer?.traits.find((t: any) => t.name === bodyAttr.value)
                : bodyLayer?.traits[0];

            if (!bodyTrait) throw new Error("Base character (Body) not found");

            // Helper
            const getBase64 = (url: string) => url.replace(/^data:image\/\w+;base64,/, "");
            const baseImageData = getBase64(bodyTrait.imageUrl);

            // 2. Get Other Traits
            const traitsToComposite = attributes
                .filter((a: any) => a.trait_type !== "Body")
                .map((a: any) => {
                    const layer = layers.find(l => l.name === a.trait_type);
                    const trait = layer?.traits.find((t: any) => t.name === a.value);
                    if (!trait) return null;
                    return {
                        category: a.trait_type.toLowerCase(),
                        imageData: getBase64(trait.imageUrl)
                    };
                })
                .filter((t: any): t is { category: string; imageData: string } => t !== null);

            // 3. Composite
            const compositedBase64 = await compositeTraits(baseImageData, traitsToComposite);
            finalImage = `data:image/png;base64,${compositedBase64}`;
        }

        if (!finalImage) {
            return NextResponse.json(
                { error: 'Missing image or attributes to generate image' },
                { status: 400 }
            );
        }

        // Update NFT in database
        const updatedNft = await prisma.nft.update({
            where: { id: nftId },
            data: {
                image: finalImage,
                attributes: attributes || undefined,
                updatedAt: new Date()
            }
        });

        return NextResponse.json(updatedNft);
    } catch (error: any) {
        console.error('Failed to update NFT:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to update NFT' },
            { status: 500 }
        );
    }
}
