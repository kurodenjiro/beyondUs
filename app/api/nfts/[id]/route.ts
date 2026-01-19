
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const nft = await prisma.nft.findUnique({
            where: { id },
            include: {
                Project: true // Include project info for context
            }
        });

        if (!nft) {
            return NextResponse.json({ error: "NFT not found" }, { status: 404 });
        }

        // Format as standard NFT Metadata
        const metadata = {
            name: nft.name,
            description: nft.description,
            image: nft.image, // Fallback or composite needed if null
            external_url: `${req.nextUrl.origin}/nft/${nft.id}`,
            attributes: nft.attributes,
            properties: {
                rarityScore: nft.rarityScore,
                mintStatus: nft.mintStatus,
                projectId: nft.projectId,
                projectName: nft.Project?.name
            }
        };

        return NextResponse.json(metadata);
    } catch (error: any) {
        console.error("Error fetching NFT:", error);
        return NextResponse.json({ error: "Failed to fetch NFT" }, { status: 500 });
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await req.json();

        const { mintStatus, txHash } = body;

        const updatedNft = await prisma.nft.update({
            where: { id },
            data: {
                mintStatus,
                txHash
            }
        });

        return NextResponse.json(updatedNft);
    } catch (error: any) {
        console.error("Error updating NFT:", error);
        return NextResponse.json({ error: "Failed to update NFT" }, { status: 500 });
    }
}
