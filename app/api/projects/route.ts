import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const ownerAddress = searchParams.get('ownerAddress');
        const status = searchParams.get('status');

        const where: any = {};

        if (ownerAddress) {
            where.ownerAddress = ownerAddress;
        }

        if (status) {
            where.status = status;
        } else {
            // Default behavior if no specific status requested but ownerAddress is present?
            // Original collections logic: status: { in: ['saved', 'published'] }
            if (ownerAddress) {
                where.status = { in: ['saved', 'published'] };
            }
        }

        // If listing public/explore (e.g. status=published), simpler query
        if (!ownerAddress && status === 'published') {
            // explore logic
            where.status = 'published';
        }

        const projects = await prisma.project.findMany({
            where,
            orderBy: {
                updatedAt: 'desc'
            }
        });

        return NextResponse.json(projects);
    } catch (error) {
        console.error('Failed to fetch projects:', error);
        return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
    }
}

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
