import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateTrait } from '@/lib/ai/generators';

// Use params context correctly for Next.js 13+ app directory dynamic routes
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { category, variationNumber, config } = await request.json();

        if (!category || !config || variationNumber === undefined) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        console.log(`🎨 Generating ${category} ${variationNumber} for project ${id}`);
        const trait = await generateTrait(category, config, variationNumber);

        if (!trait) {
            throw new Error(`Failed to generate trait for ${category}`);
        }

        // Save to DB
        const savedTrait = await prisma.projectTrait.create({
            data: {
                projectId: id,
                category: trait.category,
                description: trait.description,
                imageData: trait.imageData
            }
        });

        return NextResponse.json({
            success: true,
            trait: {
                ...trait,
                id: savedTrait.id
            }
        });

    } catch (error: any) {
        console.error('Trait generation error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to generate trait' },
            { status: 500 }
        );
    }
}
