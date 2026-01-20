import { NextRequest, NextResponse } from 'next/server';
import { compositeTraits } from '@/lib/ai/composite';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
    try {
        const { baseImage, traits } = await request.json();

        if (!baseImage || !traits) {
            return NextResponse.json({ error: 'Missing baseImage or traits' }, { status: 400 });
        }

        console.log(`🎨 Generating preview with ${traits.length} traits...`);

        // Prepare traits for composite function
        // Expecting traits to have { category: string, imageData: string (base64) }
        // If image is a URL, we might need to fetch it first, but assuming base64 for now based on editor context

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

        const cleanTraits = await Promise.all(traits.map(async (t: any) => ({
            category: t.category.toLowerCase(),
            imageData: await ensureBase64(t.imageUrl || t.imageData)
        })));

        const compositedImage = await compositeTraits(cleanBaseImage, cleanTraits);

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
