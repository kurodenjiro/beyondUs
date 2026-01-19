"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSimpleWallet } from "@/components/providers/SimpleWalletProvider";
import { motion } from "framer-motion";
import { Sparkles, Box, CheckCircle } from "lucide-react";
import { useUsBeyond } from "@/hooks/useUsBeyond";


export default function MintPage() {
    const { id } = useParams();
    const { address, isConnected, connect } = useSimpleWallet();
    const { mintNFT } = useUsBeyond();


    // Project State
    const [project, setProject] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Mint State
    const [minting, setMinting] = useState(false);
    const [minted, setMinted] = useState(false);
    const [txHash, setTxHash] = useState<string>("");
    const [currentSupply, setCurrentSupply] = useState<number>(0);
    const [maxSupply, setMaxSupply] = useState<number>(100);

    // Carousel & Reveal State
    const [nfts, setNfts] = useState<any[]>([]);
    const [currentNftIndex, setCurrentNftIndex] = useState(0);
    const [mintedNft, setMintedNft] = useState<any>(null);

    // Fetch Project
    useEffect(() => {
        if (id) {
            fetchProject();
        }
    }, [id]);

    const fetchProject = async () => {
        try {
            const res = await fetch(`/api/projects/${id}`);
            if (res.ok) {
                const data = await res.json();
                setProject(data);
            }
        } catch (error) {
            console.error("Failed to fetch project:", error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch Supply
    useEffect(() => {
        if (project) {
            fetchSupply();
        }
    }, [project]);

    const fetchSupply = async () => {
        try {
            // Query blockchain for current supply
            // For now, we'll increment locally after each mint
            console.log('[Supply] Fetching current supply from blockchain...');
        } catch (error) {
            console.error('Failed to fetch supply:', error);
        }
    };

    // Fetch NFTs for Carousel (Only Pending)
    useEffect(() => {
        if (id) {
            fetch(`/api/projects/${id}/nfts?status=pending`)
                .then(res => res.json())
                .then(data => {
                    if (data.nfts && data.nfts.length > 0) {
                        const shuffled = [...data.nfts].sort(() => 0.5 - Math.random());
                        setNfts(shuffled);
                    } else {
                        setNfts([]);
                    }
                })
                .catch(err => console.error("Failed to load carousel nfts", err));
        }
    }, [id]);

    // Carousel Timer
    useEffect(() => {
        if (nfts.length > 0 && !minted) {
            const interval = setInterval(() => {
                setCurrentNftIndex((prev) => (prev + 1) % nfts.length);
            }, 3000);
            return () => clearInterval(interval);
        }
    }, [nfts, minted]);

    const markAsMinted = async (nftId: string, txHash: string) => {
        try {
            await fetch(`/api/nfts/${nftId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mintStatus: 'minted',
                    txHash: txHash
                })
            });
            console.log(`✅ Marked NFT ${nftId} as minted in DB.`);
        } catch (e) {
            console.error("Failed to mark NFT as minted:", e);
        }
    };

    const handleMint = async () => {
        if (!isConnected) {
            connect();
            return;
        }

        if (nfts.length === 0) {
            return;
        }

        setMinting(true);

        try {
            // 1. Reveal Mechanic: Pick a random NFT from pending list
            const reveal = nfts[Math.floor(Math.random() * nfts.length)];
            const nftUri = `${window.location.origin}/api/nfts/${reveal.id}`;
            const userAddress = address;

            if (!userAddress) throw new Error("No wallet address");

            // 2. Mint
            if (!project.contractAddress) {
                throw new Error("Collection contract address not found on project. Has it been published?");
            }

            // Real minting on Cronos
            const hash = await mintNFT(project.contractAddress, userAddress, nftUri);

            console.log("Success! Mint Hash:", hash);

            // 4. Update Database Status
            await markAsMinted(reveal.id, hash);

            setTxHash(hash);
            setCurrentSupply(prev => prev + 1);
            setMintedNft(reveal);
            setMinted(true);

            // Optimistically update local list
            setNfts(prev => prev.filter(n => n.id !== reveal.id));

        } catch (error: any) {
            console.error("Minting failed:", error);
            alert(error?.message || "Minting failed");
        } finally {
            setMinting(false);
        }
    };

    // Helper to render composite if image is missing
    const renderNftImage = (nft: any) => {
        if (!nft) return null;
        if (nft.image) return <img src={nft.image} alt={nft.name} className="w-full h-full object-cover" />;

        if (nft.attributes && Array.isArray(nft.attributes)) {
            return (
                <div className="relative w-full h-full bg-black">
                    {nft.attributes.map((attr: any, idx: number) => {
                        if (!attr.image_url) return null;
                        const pos = attr.position || { x: 0, y: 0, width: 1024, height: 1024 };
                        const left = `${(pos.x / 1024) * 100}%`;
                        const top = `${(pos.y / 1024) * 100}%`;
                        const width = `${(pos.width / 1024) * 100}%`;
                        const height = `${(pos.height / 1024) * 100}%`;

                        return (
                            <img
                                key={idx}
                                src={attr.image_url}
                                alt={attr.trait_type}
                                className="absolute object-fill pointer-events-none"
                                style={{ left, top, width, height }}
                            />
                        );
                    })}
                </div>
            )
        }
        return <div className="w-full h-full bg-white/5 flex items-center justify-center p-4 text-center text-muted-foreground">Generating Preview...</div>;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!project) {
        return (
            <div className="flex items-center justify-center min-h-screen text-muted-foreground">
                Project not found.
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Blob */}
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />

            <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-12 items-center relative z-10">
                {/* Visual - Carousel or Reveal */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="relative aspect-square rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-black/40"
                >
                    {minted && mintedNft ? (
                        // REVEAL STATE
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="w-full h-full relative"
                        >
                            <div className="absolute inset-0 bg-primary/10 animate-pulse z-0" />
                            {renderNftImage(mintedNft)}
                            <div className="absolute bottom-6 left-6 right-6 z-20 text-center">
                                <h2 className="text-3xl font-extrabold text-white drop-shadow-[0_0_10px_rgba(0,0,0,0.8)]">
                                    {mintedNft.name}
                                </h2>
                                <span className="inline-block mt-2 px-3 py-1 bg-primary text-black font-bold text-sm rounded-full shadow-lg">
                                    Official Owner
                                </span>
                            </div>
                        </motion.div>
                    ) : (
                        // CAROUSEL STATE
                        nfts.length > 0 ? (
                            <motion.div
                                key={currentNftIndex}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.5 }}
                                className="w-full h-full"
                            >
                                {renderNftImage(nfts[currentNftIndex])}

                                {/* Overlay Info */}
                                <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between z-20">
                                    <div>
                                        <span className="px-3 py-1 bg-black/50 backdrop-blur border border-white/10 rounded-full text-xs font-mono mb-2 inline-block text-white/80">
                                            # {Math.floor(Math.random() * 1000)}
                                        </span>
                                        <h2 className="text-2xl font-bold truncate text-white drop-shadow-md">{nfts[currentNftIndex].name}</h2>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-1 rounded border border-primary/20">
                                            Rarity: {Math.round(nfts[currentNftIndex].rarityScore || 0)}
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            // Fallback to project preview
                            <div className="w-full h-full relative">
                                {project?.previewImage ? (
                                    <img
                                        src={project.previewImage}
                                        alt={project.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-white/5 flex items-center justify-center">
                                        <Box className="w-20 h-20 text-white/20" />
                                    </div>
                                )}
                                <div className="absolute bottom-6 left-6">
                                    <h2 className="text-3xl font-bold">{project?.name}</h2>
                                </div>
                            </div>
                        )
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                </motion.div>

                {/* Info & Action */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-8"
                >
                    {minted && mintedNft ? (
                        // SUCCESS MESSAGE
                        <div className="space-y-6 text-center md:text-left">
                            <h1 className="text-4xl font-bold text-white mb-2">Mint Successful!</h1>
                            <p className="text-xl text-white">
                                You are now the owner of <span className="text-primary font-bold">{mintedNft.name}</span>.
                            </p>

                            <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-left">
                                <p className="text-sm text-muted-foreground mb-1">Details</p>
                                <div className="flex items-center gap-4">
                                    <div>
                                        <span className="text-xs text-muted-foreground block">Rarity Score</span>
                                        <span className="text-lg font-mono text-primary">{Math.round(mintedNft.rarityScore || 0)}</span>
                                    </div>
                                    <div>
                                        <span className="text-xs text-muted-foreground block">Rank</span>
                                        <span className="text-lg font-mono text-white"># {Math.floor(Math.random() * 1000)}</span>
                                    </div>
                                </div>
                            </div>

                            {txHash && (
                                <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-left">
                                    <p className="text-xs text-muted-foreground mb-2">Transaction Hash:</p>
                                    <a
                                        href={`https://explorer.cronos.org/testnet/tx/${txHash}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-primary hover:text-primary/80 break-all font-mono"
                                    >
                                        {txHash}
                                    </a>
                                </div>
                            )}

                            <button
                                onClick={() => { setMinted(false); setMintedNft(null); }}
                                className="w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-white/90 transition-colors"
                            >
                                Mint Another
                            </button>
                        </div>
                    ) : (
                        // MINT ACTION
                        <div>
                            <h1 className="text-5xl font-bold mb-4 tracking-tight">
                                Mint <span className="text-primary">{project.name}</span>
                            </h1>
                            <p className="text-xl text-muted-foreground leading-relaxed">
                                Join the collection on the Cronos Testnet.
                                Secure your unique digital asset today.
                            </p>

                            <div className="flex gap-8 border-y border-white/10 py-6 my-8">
                                <div>
                                    <p className="text-sm text-muted-foreground uppercase tracking-widest mb-1">Price</p>
                                    <p className="text-2xl font-bold font-mono">0.0 MOVE</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground uppercase tracking-widest mb-1">Supply</p>
                                    <p className="text-2xl font-bold font-mono">{currentSupply} / {maxSupply}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground uppercase tracking-widest mb-1">Status</p>
                                    <p className="text-2xl font-bold text-white font-mono flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                        LIVE
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={handleMint}
                                disabled={minting || nfts.length === 0}
                                className="w-full py-6 bg-primary text-black text-xl font-bold rounded-2xl hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_40px_rgba(0,245,255,0.3)] flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none bg-primary"
                            >
                                {minting ? (
                                    <Sparkles className="w-6 h-6 animate-spin" />
                                ) : (
                                    <Box className="w-6 h-6" />
                                )}
                                {minting ? "Minting..." : (
                                    nfts.length === 0 ? "SOLD OUT" : (isConnected ? "Mint on Testnet" : "Connect Wallet to Mint")
                                )}
                            </button>

                            <p className="text-center text-sm text-muted-foreground mt-6">
                                Powered by UsBeyondMove & Cronos Testnet
                            </p>
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
}
