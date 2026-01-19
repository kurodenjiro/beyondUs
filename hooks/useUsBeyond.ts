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
    const { signer, address, isConnected, connect } = useSimpleWallet();
    const [isLoading, setIsLoading] = useState(false);

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

    return {
        createCollection,
        mintNFT,
        isLoading,
        userAddress: address,
        isConnected
    };
};
