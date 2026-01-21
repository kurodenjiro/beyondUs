import { NextRequest, NextResponse } from 'next/server';
import { generateTrait } from '@/lib/ai/generators';

// Use params context correctly for Next.js 13+ app directory dynamic routes
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { category, variationNumber, config } = await request.json();

        if (!category || !config || variationNumber === undefined) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        console.log(`🎨 Generating ${category} ${variationNumber} for project ${params.id}`);
        const trait = await generateTrait(category, config, variationNumber);

        if (!trait) {
            throw new Error(`Failed to generate trait for ${category}`);
        }

        return NextResponse.json({
            success: true,
            trait
        });

    } catch (error: any) {
        console.error('Trait generation error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to generate trait' },
            { status: 500 }
        );
    }
}
