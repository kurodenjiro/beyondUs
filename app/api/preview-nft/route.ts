import { NextRequest, NextResponse } from 'next/server';
import { compositeTraits } from '@/lib/ai/composite';
import { prisma } from '@/lib/prisma';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
    try {
        const { baseImage, traits, projectId } = await request.json();

        if (!baseImage || !traits) {
            return NextResponse.json({ error: 'Missing baseImage or traits' }, { status: 400 });
        }

        console.log(`🎨 Generating preview with ${traits.length} traits...`);

        // Prepare traits for composite function
        // Expecting traits to have { category: string, imageData?: string, id?: string }
        // If imageData is missing but id is present, fetch from DB

        // Helper to ensure base64
        const ensureBase64 = async (img: string) => {
            if (img.startsWith('http')) {
                const res = await fetch(img);
                const buffer = await res.arrayBuffer();
                return Buffer.from(buffer).toString('base64');
            }
            return img.replace(/^data:image\/\w+;base64,/, '');
        };

        const cleanBaseImage = await ensureBase64(baseImage);

        // Fetch traits if needed
        const cleanTraits = await Promise.all(traits.map(async (t: any) => {
            let imageData = t.imageUrl || t.imageData;

            // If we have an ID but no image data (or just want to be safe), fetch from DB
            if (t.id && (!imageData || imageData.length < 100)) {
                // Fetch from DB if projectId is available (actually t.id should be unique globally)
                // But we can just use findUnique on ProjectTrait
                const dbTrait = await prisma.projectTrait.findUnique({
                    where: { id: t.id }
                });

                if (dbTrait) {
                    imageData = dbTrait.imageData;
                } else {
                    console.warn(`Trait ${t.id} not found in DB`);
                }
            }

            if (!imageData) {
                // Skip this trait if no data found
                return null;
            }

            return {
                category: t.category.toLowerCase(),
                imageData: await ensureBase64(imageData)
            };
        }));

        const validTraits = cleanTraits.filter(t => t !== null);

        const compositedImage = await compositeTraits(cleanBaseImage, validTraits);

        return NextResponse.json({
            success: true,
            image: `data:image/png;base64,${compositedImage}`
        });

    } catch (error: any) {
        console.error('Preview generation error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to generate preview' },
            { status: 500 }
        );
    }
}
