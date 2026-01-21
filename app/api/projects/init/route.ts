import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parsePromptToConfig } from '@/lib/ai/generators';

export async function POST(request: NextRequest) {
    try {
        const { prompt, ownerAddress } = await request.json();

        if (!prompt || !ownerAddress) {
            return NextResponse.json({ error: 'Prompt and Owner Address are required' }, { status: 400 });
        }

        // Parse prompt to config first
        const config = await parsePromptToConfig(prompt);

        // Create project shell
        const project = await prisma.project.create({
            data: {
                ownerAddress,
                prompt,
                name: `${config.subject} ${config.theme} Collection`,
                layers: [], // Empty initially
                status: 'generating', // Custom status
                previewImage: null // Will be set in generate-base
            }
        });

        return NextResponse.json({
            projectId: project.id,
            config
        });

    } catch (error: any) {
        console.error('Project init error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to initialize project' },
            { status: 500 }
        );
    }
}
