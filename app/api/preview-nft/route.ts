import { NextRequest, NextResponse } from 'next/server';
import { compositeTraits } from '@/lib/ai/composite';
import { prisma } from '@/lib/prisma';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
    try {
        const { traits, projectId } = await request.json();

        if (!projectId || !traits) {
            return NextResponse.json({ error: 'Missing projectId or traits' }, { status: 400 });
        }

        console.log(`🎨 Generating preview for project ${projectId} with ${traits.length} traits...`);

        // Fetch project to get base image from Body layer
        const project = await prisma.project.findUnique({
            where: { id: projectId }
        });

        if (!project || !project.layers) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        const layers = project.layers as any[];
        const bodyLayer = layers.find(l => l.name === "Body");

        if (!bodyLayer || !bodyLayer.traits || bodyLayer.traits.length === 0) {
            return NextResponse.json({ error: 'Base character not found in project' }, { status: 404 });
        }

        // Helper to ensure base64
        const ensureBase64 = (img: string) => {
            return img.replace(/^data:image\/\w+;base64,/, '');
        };

        // Get base image from Body layer
        const baseImageUrl = bodyLayer.traits[0].imageUrl;
        const cleanBaseImage = ensureBase64(baseImageUrl);

        // Fetch traits if needed
        const cleanTraits = await Promise.all(traits.map(async (t: any) => {
            let imageData = t.imageUrl || t.imageData;

            // If we have an ID but no image data, fetch from DB
            if (t.id && (!imageData || imageData.length < 100)) {
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
                return null;
            }

            return {
                category: t.category.toLowerCase(),
                imageData: ensureBase64(imageData)
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
