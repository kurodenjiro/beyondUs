const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Configuration - check multiple green targets
const GREEN_THRESHOLD = 60;
const CLEANING_THRESHOLD = 80; // More aggressive for cleaning fringing
const TARGETS = [
    { r: 148, g: 196, b: 111 }, // Yellowish-green
    { r: 0, g: 255, b: 0 },     // Pure green
    { r: 120, g: 227, b: 43 }   // Rick & Morty Lime Green
];

const isBackgroundGreen = (r, g, b, threshold = GREEN_THRESHOLD) => {
    // Check against all target greens
    return TARGETS.some(target => {
        const diff = Math.abs(r - target.r) + Math.abs(g - target.g) + Math.abs(b - target.b);
        return diff < threshold;
    });
};

async function extractAndAssemble() {
    console.log('🎨 Starting sprite sheet extraction test...\n');

    // Load the new sprite sheet with green background
    const inputPath = '/Users/mac/.gemini/antigravity/brain/83701b75-1a03-482a-91b0-fc5eef64eb89/uploaded_image_1767979446802.png';
    const image = sharp(inputPath);
    const metadata = await image.metadata();
    const { width, height } = metadata;

    console.log(`📐 Image size: ${width}x${height}`);

    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

    const getPixel = (x, y) => {
        const idx = (y * info.width + x) * info.channels;
        return {
            r: data[idx],
            g: data[idx + 1],
            b: data[idx + 2]
        };
    };

    const visited = new Set();
    const regions = [];

    const floodFill = (startX, startY) => {
        const queue = [[startX, startY]];
        let minX = startX, maxX = startX;
        let minY = startY, maxY = startY;
        let pixelCount = 0;

        while (queue.length > 0) {
            const [x, y] = queue.shift();
            const key = `${x},${y}`;

            if (visited.has(key)) continue;
            if (x < 0 || x >= info.width || y < 0 || y >= info.height) continue;

            const pixel = getPixel(x, y);
            if (isBackgroundGreen(pixel.r, pixel.g, pixel.b)) continue;

            visited.add(key);
            pixelCount++;

            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);

            queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
        }

        if (pixelCount < 5000) return null;

        return {
            left: minX,
            top: minY,
            width: maxX - minX + 1,
            height: maxY - minY + 1,
            pixelCount
        };
    };

    console.log('\n🔍 Scanning for regions...');
    for (let y = 0; y < info.height; y += 10) {
        for (let x = 0; x < info.width; x += 10) {
            if (visited.has(`${x},${y}`)) continue;

            const pixel = getPixel(x, y);
            if (!isBackgroundGreen(pixel.r, pixel.g, pixel.b)) {
                const region = floodFill(x, y);
                if (region) {
                    regions.push(region);
                }
            }
        }
    }

    console.log(`\n✅ Found ${regions.length} regions\n`);

    const extractedTraits = [];
    const outputDir = '/Users/mac/dev/UsBeyondMove/test-output';
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log('✂️ Extracting and cleaning traits...\n');
    for (let i = 0; i < regions.length; i++) {
        const region = regions[i];

        // Add padding and ensure bounds are within image
        const padding = 10;
        const left = Math.max(0, region.left - padding);
        const top = Math.max(0, region.top - padding);
        const right = Math.min(info.width, region.left + region.width + padding);
        const bottom = Math.min(info.height, region.top + region.height + padding);

        const extractRegion = {
            left,
            top,
            width: right - left,
            height: bottom - top
        };

        const croppedBuffer = await sharp(inputPath)
            .extract(extractRegion)
            .toBuffer();

        // Conservative background removal
        const transparentBuffer = await sharp(croppedBuffer)
            .removeAlpha()
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });

        const { data: pixelData, info: cropInfo } = transparentBuffer;
        for (let j = 0; j < pixelData.length; j += 4) {
            const r = pixelData[j];
            const g = pixelData[j + 1];
            const b = pixelData[j + 2];

            // Only make transparent if it's green background
            // Use stricter cleaning threshold to remove fringing
            if (isBackgroundGreen(r, g, b, CLEANING_THRESHOLD)) {
                pixelData[j + 3] = 0;
            }
        }

        const finalBuffer = await sharp(pixelData, {
            raw: {
                width: cropInfo.width,
                height: cropInfo.height,
                channels: 4
            }
        })
            .png()
            .trim()
            .toBuffer();

        const traitPath = path.join(outputDir, `trait_${i + 1}.png`);
        fs.writeFileSync(traitPath, finalBuffer);

        extractedTraits.push({
            index: i,
            path: traitPath,
            boundingBox: region,
            size: { width: cropInfo.width, height: cropInfo.height }
        });

        console.log(`  ✅ Trait ${i + 1}: ${cropInfo.width}x${cropInfo.height} saved`);
    }

    console.log('\n🎨 Assembling character on 1024x1024 canvas...\n');

    const heads = extractedTraits.filter(t => t.boundingBox.top < height / 2 && t.boundingBox.left < width * 0.6);
    const bodies = extractedTraits.filter(t => t.boundingBox.top > height / 2 && t.boundingBox.left < width * 0.4);
    const background = extractedTraits.filter(t => t.boundingBox.left > width * 0.6);

    console.log(`Found ${heads.length} heads, ${bodies.length} bodies, ${background.length} backgrounds`);

    const canvas = sharp({
        create: {
            width: 1024,
            height: 1024,
            channels: 4,
            background: { r: 255, g: 255, b: 255, alpha: 1 }
        }
    });

    const composites = [];

    if (background.length > 0) {
        composites.push({
            input: background[0].path,
            top: 0,
            left: 0
        });
        console.log(`  Background at (0, 0)`);
    }

    if (bodies.length > 0) {
        composites.push({
            input: bodies[0].path,
            top: 400,
            left: 256
        });
        console.log(`  Body at (256, 400)`);
    }

    if (heads.length > 0) {
        composites.push({
            input: heads[0].path,
            top: 120,
            left: 312
        });
        console.log(`  Head at (312, 120)`);
    }

    const assembledPath = path.join(outputDir, 'assembled_character.png');
    await canvas
        .composite(composites)
        .png()
        .toFile(assembledPath);

    console.log(`\n✅ Character assembled: ${assembledPath}`);
    console.log(`\n📁 All files saved to: ${outputDir}`);
    console.log('\n🎉 Test complete! Check the output directory for results.');
}

extractAndAssemble().catch(console.error);
