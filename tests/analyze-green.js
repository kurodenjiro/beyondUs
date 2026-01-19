const sharp = require('sharp');

async function analyze() {
    const inputPath = '/Users/mac/.gemini/antigravity/brain/83701b75-1a03-482a-91b0-fc5eef64eb89/uploaded_image_1767979446802.png';
    const image = sharp(inputPath);
    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

    // Helper to get pixel
    const getPixel = (x, y) => {
        const idx = (y * info.width + x) * info.channels;
        return {
            r: data[idx],
            g: data[idx + 1],
            b: data[idx + 2]
        };
    };

    // Sample a few points likely to be background
    const points = [
        { x: 0, y: 0 },
        { x: 10, y: 10 },
        { x: info.width - 10, y: 10 },
        { x: info.width - 10, y: info.height - 10 },
        { x: 400, y: 400 }, // Middle area
        { x: 50, y: 300 }   // Between items potentially
    ];

    console.log('🎨 Analyzing background colors:');
    points.forEach(p => {
        const pixel = getPixel(p.x, p.y);
        console.log(`Point (${p.x}, ${p.y}): RGB(${pixel.r}, ${pixel.g}, ${pixel.b})`);
    });
}

analyze().catch(console.error);
