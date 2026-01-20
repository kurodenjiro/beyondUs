import { useSimpleWallet } from "@/components/providers/SimpleWalletProvider";
import { useState } from "react";
import { parseGwei } from "viem"; // Helper if you need formatting, else ethers
import { ethers } from "ethers";

// Contract Config (Moved to shared constant or env)
const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_FACTORY_ADDRESS || "0xcCf663c7938a387dC8Df10E632Bf41b359595Bf0";
// ABIs
import UsBeyondFactoryABI from "@/lib/abis/UsBeyondFactory.json";
import UsBeyondNFTABI from "@/lib/abis/UsBeyondNFT.json";


export const useUsBeyond = () => {
    const { signer, address, isConnected, connect, provider } = useSimpleWallet();
    const [isLoading, setIsLoading] = useState(false);

    // ... (rest of the file)

    // 1. Create Collection via Factory
    const createCollection = async (name: string, symbol: string) => {
        if (!signer) {
            console.error("No signer available");
            connect();
            return null;
        }

        setIsLoading(true);
        console.log("Creating collection on Cronos...", { name, symbol });

        try {
            const factoryContract = new ethers.Contract(FACTORY_ADDRESS, UsBeyondFactoryABI.abi, signer);

            const tx = await factoryContract.createCollection(name, symbol);
            console.log("Factory Transaction Sent:", tx.hash);

            const receipt = await tx.wait(); // Wait for confirmation
            console.log("Transaction Confirmed:", receipt.hash);

            // Parse Event to get new address
            // Event: CollectionCreated(address indexed collectionAddress, address indexed owner, string name, string symbol)
            // In Ethers v6, we might need to filter logs or parse receipt logs
            // Simple approach: Check emitted events
            let deployedAddress = null;
            // Ethers v6 parsing might vary, assuming typical log parsing:
            const filter = factoryContract.filters.CollectionCreated(null, address);
            // This grabs past events if we needed, but for receipt we can iterate logs

            for (const log of receipt.logs) {
                try {
                    // Attempt to parse validation
                    const parsed = factoryContract.interface.parseLog(log);
                    if (parsed?.name === "CollectionCreated") {
                        deployedAddress = parsed.args[0];
                        break;
                    }
                } catch (e) { /* ignore other events */ }
            }

            console.log("Deployed Collection Address:", deployedAddress);
            return { hash: receipt.hash, address: deployedAddress };

        } catch (error) {
            console.error("Failed to create collection:", error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    // 2. Mint NFT on Collection
    const mintNFT = async (collectionAddress: string, to: string, uri: string) => {
        if (!signer) {
            console.error("No signer available");
            connect();
            return null;
        }

        setIsLoading(true);
        try {
            const nftContract = new ethers.Contract(collectionAddress, UsBeyondNFTABI.abi, signer);
            const tx = await nftContract.mint(to, uri);
            console.log("Mint Transaction Sent:", tx.hash);

            await tx.wait();
            return tx.hash;

        } catch (error) {
            console.error("Mint failed:", error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    // 3. Fetch My NFTs via Hybrid: Enumerable + Scanning Fallback
    const fetchMyNFTsFromChain = async () => {
        if (!address || !provider) return [];

        setIsLoading(true);
        const myNFTs: any[] = [];

        try {
            // A. Get All Collections from Factory
            const factoryContract = new ethers.Contract(FACTORY_ADDRESS, UsBeyondFactoryABI.abi, provider);
            const allCollections = await factoryContract.getAllCollections();

            console.log(`Found ${allCollections.length} collections. Checking balances...`);

            const currentBlock = await provider.getBlockNumber();

            // Helper: Fetch Logs with Chunking (for fallback)
            const getLogsChunked = async (contract: any, filter: any, fromBlock: number, toBlock: number) => {
                const logs = [];
                const CHUNK_SIZE = 2000;
                for (let i = fromBlock; i <= toBlock; i += CHUNK_SIZE) {
                    const end = Math.min(i + CHUNK_SIZE - 1, toBlock);
                    try {
                        const chunkLogs = await contract.queryFilter(filter, i, end);
                        logs.push(...chunkLogs);
                    } catch (e) {
                        console.warn(`Failed to fetch logs for range ${i}-${end}`, e);
                    }
                }
                return logs;
            };

            // B. Iterate Collections
            for (const collection of allCollections) {
                const nftContract = new ethers.Contract(collection.collectionAddress, UsBeyondNFTABI.abi, provider);

                // Strategy 1: Check Standard ERC721 Balance First
                // This filters out collections where user has 0 items instantly
                let balance = 0n;
                try {
                    balance = await nftContract.balanceOf(address);
                } catch (e) {
                    console.warn(`Failed to check balance for ${collection.name}`, e);
                    continue;
                }

                if (balance === 0n) continue; // User owns nothing here, skip.

                console.log(`User owns ${balance} items in ${collection.name}. Fetching IDs...`);

                // Strategy 2: Attempt ERC721Enumerable
                let successViaEnumerable = false;
                try {
                    const promises = [];
                    for (let i = 0; i < Number(balance); i++) {
                        promises.push(nftContract.tokenOfOwnerByIndex(address, i));
                    }
                    const tokenIds = await Promise.all(promises);

                    // Fetch Metadata for IDs
                    for (const tokenId of tokenIds) {
                        try {
                            const tokenUri = await nftContract.tokenURI(tokenId);
                            let metadata = { name: `NFT #${tokenId}`, image: null };
                            try {
                                const httpUri = tokenUri.replace('ipfs://', 'https://ipfs.io/ipfs/');
                                const metaRes = await fetch(httpUri);
                                if (metaRes.ok) metadata = await metaRes.json();
                            } catch (e) { /* ignore */ }

                            myNFTs.push({
                                id: tokenId.toString(),
                                collectionName: collection.name,
                                collectionAddress: collection.collectionAddress,
                                name: metadata.name || `${collection.symbol} #${tokenId}`,
                                image: metadata.image,
                                mintStatus: 'minted',
                            });
                        } catch (e) { console.warn("Failed to load token metadata", e) }
                    }
                    successViaEnumerable = true;
                    console.log(`Fetched ${balance} NFTs via Enumerable for ${collection.name}`);

                } catch (e) {
                    // tokenOfOwnerByIndex failed (likely not implemented on old contract)
                    console.log(`Enumerable failed (legacy contract?), falling back to scanning for ${collection.name}`);
                }

                if (successViaEnumerable) continue;

                // Strategy 3: Fallback to Event Scanning (Legacy)
                // Filter: Transfer(from, to, tokenId) -> 'to' = address
                const filter = nftContract.filters.Transfer(null, address);

                let startBlock = 0;
                if (collection.createdAt) {
                    const ageSeconds = Math.floor(Date.now() / 1000) - Number(collection.createdAt);
                    const blocksAgo = Math.floor(ageSeconds / 5.5);
                    startBlock = Math.max(0, currentBlock - blocksAgo - 1000);
                }

                console.log(`Scanning collection ${collection.name} from block ${startBlock} (Fallback)`);

                const events = await getLogsChunked(nftContract, filter, startBlock, currentBlock);
                const candidateTokenIds = new Set<bigint>();
                events.forEach((event: any) => {
                    if (event.args && event.args[2]) candidateTokenIds.add(event.args[2]);
                });

                if (candidateTokenIds.size > 0) {
                    for (const tokenId of candidateTokenIds) {
                        try {
                            // Verify ownership is still current
                            const owner = await nftContract.ownerOf(tokenId);
                            if (owner.toLowerCase() === address.toLowerCase()) {
                                const tokenUri = await nftContract.tokenURI(tokenId);
                                let metadata = { name: `NFT #${tokenId}`, image: null };
                                try {
                                    const httpUri = tokenUri.replace('ipfs://', 'https://ipfs.io/ipfs/');
                                    const metaRes = await fetch(httpUri);
                                    if (metaRes.ok) metadata = await metaRes.json();
                                } catch (e) { /* ignore */ }

                                myNFTs.push({
                                    id: tokenId.toString(),
                                    collectionName: collection.name,
                                    collectionAddress: collection.collectionAddress,
                                    name: metadata.name || `${collection.symbol} #${tokenId}`,
                                    image: metadata.image,
                                    mintStatus: 'minted',
                                });
                            }
                        } catch (e) { /* ignore */ }
                    }
                }
            }

        } catch (error) {
            console.error("Failed to fetch NFTs from chain:", error);
        } finally {
            setIsLoading(false);
        }

        return myNFTs;
    };

    return {
        createCollection,
        mintNFT,
        fetchMyNFTsFromChain, // Export the correct function
        isLoading,
        userAddress: address,
        isConnected
    };
};
