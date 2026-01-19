import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        const project = await prisma.project.findUnique({
            where: { id },
            include: { nfts: true },
        });

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        return NextResponse.json(project);
    } catch (error) {
        console.error('Failed to fetch project:', error);
        return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 });
    }
}
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        const { layers, name, status, previewImage, contractAddress } = await request.json();

        const updateData: any = { layers };
        if (name) updateData.name = name;
        if (status) updateData.status = status;
        if (previewImage) updateData.previewImage = previewImage;
        if (contractAddress) updateData.contractAddress = contractAddress;

        const project = await prisma.project.update({
            where: { id },
            data: updateData,
        });

        return NextResponse.json(project);
    } catch (error) {
        console.error('Failed to update project:', error);
        return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
    }
}
