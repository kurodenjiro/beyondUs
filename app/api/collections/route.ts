import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const ownerAddress = searchParams.get('ownerAddress');

        if (!ownerAddress) {
            return NextResponse.json({ error: 'Owner address required' }, { status: 400 });
        }

        const collections = await prisma.project.findMany({
            where: {
                ownerAddress,
                status: { in: ['saved', 'published'] }
            },
            orderBy: {
                updatedAt: 'desc'
            }
        });

        return NextResponse.json(collections);
    } catch (error) {
        console.error('Failed to fetch collections:', error);
        return NextResponse.json({ error: 'Failed to fetch collections' }, { status: 500 });
    }
}
