---
description: How to batch generate NFT asset traits using the automated script
---

# Batch Generate NFT Traits

 This workflow explains how to use the `scripts/batch-generate-traits.ts` script to automatically generate multiple NFT traits (eyes, mouths, headwear, etc.) using the "Master Prompt" technique and Google Gemini 2.5 Flash.

## Prerequisites

-   Google AI API Key set in `.env.local` (`GOOGLE_AI_API_KEY`).
-   `tsx` installed or use `npx tsx`.

## Steps

1.  **Configure the Generation**
    Open `scripts/batch-generate-traits.ts` and edit the `TRAIT_CONFIG` object to define what you want to generate.

    ```typescript
    const TRAIT_CONFIG: TraitConfig = {
        layerType: "Eyes", // e.g., "Mouth", "Head", "Accessory"
        names: [
            "Cyber Eyes",
            "Laser Eyes",
            // ... add more trait names
        ],
        styles: [
            "glowing pupils",
            "pixel-inspired",
            // ... add style descriptors
        ],
        // ... (x, y coordinates)
    };
    ```

2.  **Run the Script**
    Execute the script using `npx tsx`:

    ```bash
    npx tsx scripts/batch-generate-traits.ts
    ```

3.  **Review Output**
    The generated images will be saved in the `generated-traits/` directory.

    ```bash
    open generated-traits
    ```

## Customization

-   **Batch Size**: Change `const BATCH_SIZE = 5;` to generate more variations.
-   **Canvas Size**: Adjust `CANVAS_WIDTH` and `CANVAS_HEIGHT` if needed (default 1024x1024).
-   **Prompt Template**: Modify `MASTER_PROMPT_TEMPLATE` in the script to change the art style instructions.
