"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { ethers } from "ethers";

declare global {
    interface Window {
        ethereum: any;
    }
}

interface WalletContextType {
    address: string | null;
    isConnected: boolean;
    isConnecting: boolean;
    provider: ethers.BrowserProvider | null;
    signer: ethers.JsonRpcSigner | null;
    connect: () => Promise<void>;
    disconnect: () => void;
}

const WalletContext = createContext<WalletContextType>({
    address: null,
    isConnected: false,
    isConnecting: false,
    provider: null,
    signer: null,
    connect: async () => { },
    disconnect: () => { },
});

export const useSimpleWallet = () => useContext(WalletContext);

export const SimpleWalletProvider = ({ children }: { children: ReactNode }) => {
    const [address, setAddress] = useState<string | null>(null);
    const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
    const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);

    // Cronos Testnet Params
    const CRONOS_CHAIN_ID = "0x152"; // 338 in hex
    const CRONOS_PARAMS = {
        chainId: CRONOS_CHAIN_ID,
        chainName: "Cronos Testnet",
        nativeCurrency: { name: "Cronos", symbol: "TCRO", decimals: 18 },
        rpcUrls: ["https://evm-t3.cronos.org"],
        blockExplorerUrls: ["https://explorer.cronos.org/testnet"],
    };

    const checkConnection = async () => {
        if (typeof window.ethereum !== "undefined") {
            const browserProvider = new ethers.BrowserProvider(window.ethereum);
            setProvider(browserProvider);

            const accounts = await browserProvider.listAccounts();
            if (accounts.length > 0) {
                const currentSigner = await browserProvider.getSigner();
                setAddress(accounts[0].address);
                setSigner(currentSigner);
            }
        }
    };

    useEffect(() => {
        checkConnection();

        if (window.ethereum) {
            window.ethereum.on("accountsChanged", (accounts: string[]) => {
                if (accounts.length > 0) {
                    setAddress(accounts[0]);
                    // Re-instantiate signer
                    if (provider) provider.getSigner().then(setSigner);
                } else {
                    setAddress(null);
                    setSigner(null);
                }
            });
            window.ethereum.on("chainChanged", () => window.location.reload());
        }

        return () => {
            // Cleanup listeners if needed
        };
    }, []);

    const connect = async () => {
        setIsConnecting(true);
        try {
            if (!window.ethereum) {
                alert("Please install a wallet extension like Crypto.com Wallet or MetaMask");
                return;
            }

            const browserProvider = new ethers.BrowserProvider(window.ethereum);
            setProvider(browserProvider);

            // Request Account
            await browserProvider.send("eth_requestAccounts", []);
            const currentSigner = await browserProvider.getSigner();
            setAddress(await currentSigner.getAddress());
            setSigner(currentSigner);

            // Switch Chain
            try {
                await window.ethereum.request({
                    method: "wallet_switchEthereumChain",
                    params: [{ chainId: CRONOS_CHAIN_ID }],
                });
            } catch (switchError: any) {
                // This error code indicates that the chain has not been added to MetaMask.
                if (switchError.code === 4902) {
                    try {
                        await window.ethereum.request({
                            method: "wallet_addEthereumChain",
                            params: [CRONOS_PARAMS],
                        });
                    } catch (addError) {
                        console.error("Failed to add Cronos Testnet", addError);
                    }
                }
            }

        } catch (error) {
            console.error("Connection failed", error);
        } finally {
            setIsConnecting(false);
        }
    };

    const disconnect = () => {
        // Soft disconnect for UI
        setAddress(null);
        setSigner(null);
    };

    return (
        <WalletContext.Provider
            value={{
                address,
                isConnected: !!address,
                isConnecting,
                provider,
                signer,
                connect,
                disconnect,
            }}
        >
            {children}
        </WalletContext.Provider>
    );
};
