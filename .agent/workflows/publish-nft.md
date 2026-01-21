---
description: How to publish an NFT collection on Movement Testnet
---

# Publishing NFT Collections

## Prerequisites
- **Wallet**: Petra Wallet, Martian Wallet, or any Aptos-compatible wallet extension
- **Funds**: Movement Testnet tokens (get from faucet: https://faucet.testnet.bardock.movementlabs.xyz/)
- **Network**: Wallet must be connected to Movement Testnet

## Steps

### 1. Create Your Collection
```
1. Go to the home page (/)
2. Enter a prompt (e.g., "Cyberpunk Robots")
3. Click "Generate without traits" button
4. Wait for the AI to plan, generate, and map your collection
5. You'll be redirected to /collections
```

### 2. Publish On-Chain
```
1. Navigate to /collections
2. Find your draft collection
3. Click the "Publish NFT" button
4. Your wallet will prompt you to sign a transaction
5. Approve the transaction to create the collection on Movement Testnet
6. Wait for confirmation (5-10 seconds)
7. Status will change to "PUBLISHED" with a green badge
```

### 3. Share Your Mint Page
```
1. Click the "Mint Page" button on your published collection
2. Copy the URL (format: /mint/[id])
3. Share this link with others to let them mint your NFTs
```

## On-Chain Details

**Contract Address:** `0xb8d93aa049419e32be220fe5c456e25a4fd9287127626a9ea2b9c46cf6734222`

**Functions Used:**
- `create_collection`: Called when you click "Publish NFT"
- `mint_nft`: Called when someone mints from your collection

**Network:** Movement Bardock Testnet
**RPC:** https://testnet.movementnetwork.xyz/v1

## Troubleshooting

### "Failed to submit transaction"
- Ensure your wallet supports Aptos/Movement transactions
- Check that you're connected to Movement Testnet (not Aptos Testnet or Mainnet)

### "Insufficient balance"
- Get testnet tokens from: https://faucet.testnet.bardock.movementlabs.xyz/
- Or join Movement Discord for faucet assistance

### Wallet Not Connecting
- Install Petra Wallet: https://petra.app/
- Or Martian Wallet: https://martianwallet.xyz/
- Refresh the page after installation
