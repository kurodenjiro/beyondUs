# NFT Generation Scripts

## Overview

This directory contains the complete NFT generation workflow powered by AI.

## Scripts

### 1. `generate-complete-nft.ts`
**Main script** - Complete NFT generation workflow

**Features**:
- Generate new NFT samples or use existing ones
- Auto-detect style from images
- Generate matching traits (headwear, eyewear, accessories, clothing)
- Create NFT collections with professional trait compositing

**Usage**:
```bash
# Generate from scratch
npx tsx scripts/generate-complete-nft.ts new \
  robot cyberpunk cartoon cool frontal \
  "#406440ff,#FF00FF,#FFFF00" 5 10

# Use existing NFT
npx tsx scripts/generate-complete-nft.ts existing \
  nft-templates/sample_ape.png 5 10
```

### 2. `ai-composite-traits.ts`
**Utility module** - Professional AI trait compositor

**Features**:
- Uses master prompt for seamless trait integration
- Single-call compositing (all traits at once)
- Preserves base character style and pose
- Gemini 3 Pro powered

**Used by**: `generate-complete-nft.ts`

---

## Sample NFTs

Located in `nft-templates/`:
- `sample_ape.png` - Vibrant streetwear style ape
- `bored_ape_sample.png` - Classic bored ape style

---

## Quick Start

**Generate a complete NFT collection**:
```bash
npx tsx scripts/generate-complete-nft.ts new \
  cat fantasy cartoon cute frontal \
  "#FFB6C1,#87CEEB,#FFD700" 5 10
```

**Output**:
- 1 clean cat NFT sample
- 20 fantasy-themed traits
- 10 unique cat NFTs

---

## Workflow

1. **NFT Sample** → Generate or use existing
2. **Style Detection** → Auto-analyze art style, theme, mood, colors
3. **Trait Generation** → Create matching traits
4. **Collection Creation** → Composite traits onto base NFT

---

## Configuration

**Model**: `gemini-3-pro-image-preview`
**Temperature**: `0.3` (balanced creativity/consistency)
**Compositing**: Single-call (all traits at once)

---

## Output Structure

```
nft-templates/generated/
  └── {subject}_{theme}_{timestamp}.png

generated-traits/auto-generated/
  ├── headwear/
  ├── eyewear/
  ├── accessory/
  └── clothing/

nft-collection/auto-generated/
  ├── nft_1.png
  ├── nft_2.png
  └── ...
```

---

## Requirements

- Node.js
- Google AI API key in `.env.local`
- Dependencies: `@google/genai`, `sharp`

---

## Examples

**Cyberpunk Robot**:
```bash
npx tsx scripts/generate-complete-nft.ts new robot cyberpunk "neon cartoon" futuristic frontal "#00FF00,#FF00FF" 5 10
```

**Fantasy Dragon**:
```bash
npx tsx scripts/generate-complete-nft.ts new dragon fantasy cartoon majestic three-quarter "#FFD700,#4B0082" 5 10
```

**From Existing Ape**:
```bash
npx tsx scripts/generate-complete-nft.ts existing nft-templates/sample_ape.png 5 15
```

---

## Tips

- Use 3-6 complementary colors
- Start with 3-5 traits per category for testing
- Generate 5-10 NFTs initially
- Scale up after validating results

---

## Support

For help:
```bash
npx tsx scripts/generate-complete-nft.ts --help
```
