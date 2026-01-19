import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        const { prompt, layers, ownerAddress } = await req.json();

        if (!ownerAddress) {
            return NextResponse.json({ error: 'Owner address required' }, { status: 400 });
        }

        const project = await prisma.project.create({
            data: {
                prompt,
                layers,
                ownerAddress,
            },
        });

        return NextResponse.json({ id: project.id }, { status: 201 });
    } catch (error) {
        console.error('Failed to create project:', error);
        return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
    }
}
