import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateNFTSample } from '@/lib/ai/generators';

// Use params context correctly for Next.js 13+ app directory dynamic routes
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { config } = await request.json();

        if (!config) {
            return NextResponse.json({ error: 'Config is required' }, { status: 400 });
        }

        console.log(`🎨 Generating base for project ${id}`);
        const baseImageData = await generateNFTSample(config);

        // Update project with preview image
        await prisma.project.update({
            where: { id },
            data: {
                previewImage: `data:image/png;base64,${baseImageData}`
            }
        });

        return NextResponse.json({
            success: true,
            baseImageData
        });

    } catch (error: any) {
        console.error('Base generation error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to generate base image' },
            { status: 500 }
        );
    }
}
