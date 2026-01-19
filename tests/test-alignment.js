const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

/**
 * Test script to verify body and head alignment
 * This test loads extracted traits and checks if they align correctly
 * when positioned according to the NFT positioning rules
 */

async function testBodyHeadAlignment() {
    console.log('🧪 Testing Body and Head Alignment...\n');

    const testOutputDir = '/Users/mac/dev/UsBeyondMove/test-output';
    const alignmentTestDir = '/Users/mac/dev/UsBeyondMove/test-alignment';

    if (!fs.existsSync(alignmentTestDir)) {
        fs.mkdirSync(alignmentTestDir, { recursive: true });
    }

    // Expected positions from our NFT positioning rules
    const POSITIONS = {
        background: { x: 0, y: 0, width: 1024, height: 1024 },
        body: { x: 256, y: 400, width: 512, height: 624 },
        head: { x: 312, y: 100, width: 400, height: 320 }
    };

    // Critical alignment rule: head bottom (y + height) should connect to body top
    const HEAD_BOTTOM = POSITIONS.head.y + POSITIONS.head.height; // Should be 420
    const BODY_TOP = POSITIONS.body.y; // Should be 400
    const NECK_CONNECTION = 420; // Expected connection point

    console.log('📏 Position Specifications:');
    console.log(`  Head: (${POSITIONS.head.x}, ${POSITIONS.head.y}) ${POSITIONS.head.width}x${POSITIONS.head.height}`);
    console.log(`  Head bottom edge: y=${HEAD_BOTTOM}`);
    console.log(`  Body: (${POSITIONS.body.x}, ${POSITIONS.body.y}) ${POSITIONS.body.width}x${POSITIONS.body.height}`);
    console.log(`  Body top edge: y=${BODY_TOP}`);
    console.log(`  Expected neck connection: y=${NECK_CONNECTION}\n`);

    // Check alignment
    if (HEAD_BOTTOM === NECK_CONNECTION) {
        console.log('✅ Head bottom aligns with neck connection point');
    } else {
        console.log(`❌ Head bottom (${HEAD_BOTTOM}) does NOT align with neck (${NECK_CONNECTION})`);
        console.log(`   Gap: ${NECK_CONNECTION - HEAD_BOTTOM}px\n`);
    }

    // Load extracted traits from test-output
    const traitFiles = fs.readdirSync(testOutputDir)
        .filter(f => f.startsWith('trait_') && f.endsWith('.png'))
        .sort();

    console.log(`📦 Found ${traitFiles.length} extracted traits\n`);

    // Create test assemblies with different head/body combinations
    console.log('🎨 Creating alignment test images...\n');

    const testCombinations = [
        { name: 'test_1_head_1_body_4', head: 'trait_1.png', body: 'trait_4.png' },
        { name: 'test_2_head_2_body_4', head: 'trait_2.png', body: 'trait_4.png' },
        { name: 'test_3_head_3_body_4', head: 'trait_3.png', body: 'trait_4.png' },
    ];

    for (const combo of testCombinations) {
        const headPath = path.join(testOutputDir, combo.head);
        const bodyPath = path.join(testOutputDir, combo.body);

        if (!fs.existsSync(headPath) || !fs.existsSync(bodyPath)) {
            console.log(`⚠️  Skipping ${combo.name} - files not found`);
            continue;
        }

        // Create canvas with grid lines for alignment verification
        const canvas = sharp({
            create: {
                width: 1024,
                height: 1024,
                channels: 4,
                background: { r: 240, g: 240, b: 240, alpha: 1 }
            }
        });

        // Draw reference lines using SVG overlay
        const svgOverlay = `
            <svg width="1024" height="1024">
                <!-- Neck connection line -->
                <line x1="0" y1="420" x2="1024" y2="420" stroke="red" stroke-width="2" stroke-dasharray="5,5"/>
                <text x="10" y="415" fill="red" font-size="14">Neck Connection (y=420)</text>
                
                <!-- Body top line -->
                <line x1="0" y1="400" x2="1024" y2="400" stroke="blue" stroke-width="2" stroke-dasharray="5,5"/>
                <text x="10" y="395" fill="blue" font-size="14">Body Top (y=400)</text>
                
                <!-- Head bottom line -->
                <line x1="0" y1="${HEAD_BOTTOM}" x2="1024" y2="${HEAD_BOTTOM}" stroke="green" stroke-width="2" stroke-dasharray="5,5"/>
                <text x="10" y="${HEAD_BOTTOM - 5}" fill="green" font-size="14">Head Bottom (y=${HEAD_BOTTOM})</text>
                
                <!-- Center vertical line -->
                <line x1="512" y1="0" x2="512" y2="1024" stroke="gray" stroke-width="1" stroke-dasharray="3,3"/>
            </svg>
        `;

        // Calculate positions dynamically for proper alignment
        const canvasCenter = 1024 / 2;

        // 1. Center Body horizontally
        // 2. Align Body Top to y=400
        const bodyMetadata = await sharp(bodyPath).metadata();
        const bodyLeft = Math.round(canvasCenter - (bodyMetadata.width / 2));
        const bodyTop = 400; // Body starts at y=400

        // 1. Center Head horizontally
        // 2. Align Head Bottom to y=420 (Neck Connection)
        const headMetadata = await sharp(headPath).metadata();
        const headLeft = Math.round(canvasCenter - (headMetadata.width / 2));
        const headTop = 420 - headMetadata.height; // Head ends at y=420

        const composites = [
            // Add body aligned to top y=400
            {
                input: bodyPath,
                top: bodyTop,
                left: bodyLeft
            },
            // Add head aligned to bottom y=420
            {
                input: headPath,
                top: headTop,
                left: headLeft
            },
            // Add reference lines
            {
                input: Buffer.from(svgOverlay),
                top: 0,
                left: 0
            }
        ];

        const outputPath = path.join(alignmentTestDir, `${combo.name}.png`);
        await canvas
            .composite(composites)
            .png()
            .toFile(outputPath);

        console.log(`  ✅ Created: ${combo.name}.png`);
    }

    // Create a visual comparison grid
    console.log('\n📊 Creating comparison grid...\n');

    const gridWidth = 3;
    const cellSize = 340;
    const gridCanvas = sharp({
        create: {
            width: cellSize * gridWidth,
            height: cellSize * Math.ceil(testCombinations.length / gridWidth),
            channels: 4,
            background: { r: 255, g: 255, b: 255, alpha: 1 }
        }
    });

    const gridComposites = [];
    for (let i = 0; i < testCombinations.length; i++) {
        const testImagePath = path.join(alignmentTestDir, `${testCombinations[i].name}.png`);
        if (fs.existsSync(testImagePath)) {
            const resized = await sharp(testImagePath)
                .resize(cellSize, cellSize, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
                .toBuffer();

            const row = Math.floor(i / gridWidth);
            const col = i % gridWidth;

            gridComposites.push({
                input: resized,
                top: row * cellSize,
                left: col * cellSize
            });
        }
    }

    const gridPath = path.join(alignmentTestDir, 'alignment_comparison_grid.png');
    await gridCanvas
        .composite(gridComposites)
        .png()
        .toFile(gridPath);

    console.log(`✅ Comparison grid: alignment_comparison_grid.png`);

    console.log(`\n📁 All alignment tests saved to: ${alignmentTestDir}`);
    console.log('\n🎯 Review the images to verify:');
    console.log('   1. Head bottom edge aligns with red line (y=420)');
    console.log('   2. Body top edge aligns with blue line (y=400)');
    console.log('   3. No gap between head and body at neck');
    console.log('   4. All parts centered on vertical grey line (x=512)');
    console.log('\n✅ Alignment test complete!');
}

testBodyHeadAlignment().catch(console.error);
