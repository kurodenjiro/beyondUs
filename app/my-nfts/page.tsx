"use client";

import { useEffect, useState } from "react";
import { useSimpleWallet } from "@/components/providers/SimpleWalletProvider";
import Link from "next/link";
import { Sparkles, ArrowRight, LayoutGrid, Layers, Globe } from "lucide-react";
import { motion } from "framer-motion";

export default function MyNFTsPage() {
    const { address, isConnected, connect } = useSimpleWallet();
    const [nfts, setNfts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isConnected && address) {
            fetchMyNFTs();
        } else {
            setLoading(false);
        }
    }, [isConnected, address]);

    const fetchMyNFTs = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/nfts?ownerAddress=${address}`);
            if (res.ok) {
                const data = await res.json();
                setNfts(data);
            }
        } catch (error) {
            console.error("Failed to fetch NFTs:", error);
        } finally {
            setLoading(false);
        }
    };

    if (!isConnected) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-4">
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <LayoutGrid className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">Connect Wallet</h1>
                    <p className="text-muted-foreground max-w-md">
                        Connect your wallet to view your collected NFTs.
                    </p>
                    <button
                        onClick={() => connect()}
                        className="bg-primary hover:bg-primary/90 text-black font-bold px-6 py-2 rounded-full mt-4"
                    >
                        Connect Now
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">My NFTs</h1>
                    <p className="text-muted-foreground">
                        View and manage your minted NFTs.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Link
                        href="/collections"
                        className="flex items-center gap-2 px-4 py-2 bg-white/5 text-white font-semibold rounded-lg hover:bg-white/10 transition-colors"
                    >
                        <Layers className="w-4 h-4" />
                        Collections
                    </Link>
                    <Link
                        href="/"
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-black font-semibold rounded-lg hover:bg-primary/90 transition-colors"
                    >
                        <Sparkles className="w-4 h-4" />
                        Create New
                    </Link>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="aspect-[3/4] rounded-xl bg-white/5 animate-pulse" />
                    ))}
                </div>
            ) : nfts.length === 0 ? (
                <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/10 border-dashed">
                    <LayoutGrid className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No NFTs found</h3>
                    <p className="text-muted-foreground mb-6">
                        You haven't minted any NFTs yet.
                    </p>
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-semibold rounded-lg hover:bg-white/90 transition-colors"
                    >
                        Start Creating <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {nfts.map((nft, index) => (
                        <motion.div
                            key={nft.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.05 }}
                            className="bg-black/40 border border-white/10 rounded-xl overflow-hidden hover:border-primary/50 transition-colors group"
                        >
                            <div className="aspect-square relative bg-white/5">
                                {nft.image ? (
                                    <img
                                        src={nft.image}
                                        alt={nft.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                        <Sparkles className="w-8 h-8 opacity-20" />
                                    </div>
                                )}
                                <div className="absolute top-2 right-2">
                                    <span className="text-[10px] uppercase font-bold bg-black/60 backdrop-blur px-2 py-1 rounded border border-white/10 text-white/80">
                                        #{nft.id.slice(-4)}
                                    </span>
                                </div>
                            </div>
                            <div className="p-4">
                                <h3 className="font-bold text-sm truncate">{nft.name}</h3>
                                <p className="text-xs text-muted-foreground mt-1 truncate">
                                    {nft.Project?.name || "Unknown Collection"}
                                </p>

                                <div className="mt-3 flex justify-between items-center">
                                    <span className="text-[10px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">
                                        {nft.mintStatus === 'minted' ? 'ON-CHAIN' : 'PENDING'}
                                    </span>
                                    {nft.txHash && (
                                        <a
                                            href={`https://explorer.cronos.org/testnet/tx/${nft.txHash}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-white/40 hover:text-white transition-colors"
                                            title="View on Explorer"
                                        >
                                            <Globe className="w-3 h-3" />
                                        </a>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
