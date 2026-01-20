import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
            orderBy: { name: 'asc' } // Simple ordering, or custom numeric sort
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
        const { image, attributes } = await request.json();

        if (!image || !attributes) {
            return NextResponse.json(
                { error: 'Missing required fields: image, attributes' },
                { status: 400 }
            );
        }

        // Create NFT in database
        const nft = await prisma.nft.create({
            data: {
                projectId,
                name: `NFT #${Date.now()}`,
                image,
                attributes: attributes as any
            }
        });

        return NextResponse.json(nft);
    } catch (error) {
        console.error('Failed to save NFT:', error);
        return NextResponse.json(
            { error: 'Failed to save NFT' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params; // projectID
        const { nftId, image } = await request.json();

        if (!nftId || !image) {
            return NextResponse.json(
                { error: 'Missing required fields: nftId, image' },
                { status: 400 }
            );
        }

        // Update NFT in database
        const updatedNft = await prisma.nft.update({
            where: { id: nftId },
            data: {
                image,
                updatedAt: new Date()
            }
        });

        return NextResponse.json(updatedNft);
    } catch (error) {
        console.error('Failed to update NFT:', error);
        return NextResponse.json(
            { error: 'Failed to update NFT' },
            { status: 500 }
        );
    }
}
