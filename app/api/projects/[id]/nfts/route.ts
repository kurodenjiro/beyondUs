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
