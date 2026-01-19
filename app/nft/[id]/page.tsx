"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Layers, Sparkles, Share2, ExternalLink } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function NftDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [nft, setNft] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (id) {
            fetchNftDetails();
        }
    }, [id]);

    const fetchNftDetails = async () => {
        try {
            const res = await fetch(`/api/nfts/${id}`);
            if (!res.ok) throw new Error("NFT not found");
            const data = await res.json();
            setNft(data);
        } catch (error) {
            console.error("Error loading NFT:", error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!nft) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center text-muted-foreground gap-4">
                <p>NFT not found.</p>
                <button onClick={() => router.back()} className="text-primary hover:underline">Go Back</button>
            </div>
        );
    }

    // Prepare attributes for display
    // Explicitly cast attributes to array if needed, though Prisma Json type usually parses dynamically
    const attributes = Array.isArray(nft.attributes) ? nft.attributes : [];

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors text-sm text-muted-foreground hover:text-white"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back
                    </button>
                    <div className="font-bold flex items-center gap-2">
                        <span className="text-muted-foreground">{nft.Project?.name || "Collection"} /</span>
                        <span>{nft.name}</span>
                    </div>
                    <div className="w-[80px] flex justify-end">
                        {/* Placeholder for actions */}
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 pt-24 pb-12 flex flex-col lg:flex-row gap-8 lg:gap-12 h-[calc(100vh-theme(spacing.24))]">

                {/* Visual Preview (Left) */}
                <div className="flex-1 flex items-center justify-center bg-white/5 rounded-3xl border border-white/10 p-8 relative overflow-hidden group">
                    {/* Background Grid Pattern */}
                    <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

                    {/* Image Container */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative w-full max-w-2xl aspect-square shadow-2xl rounded-xl overflow-hidden bg-black/50"
                    >
                        {nft.image ? (
                            <img src={nft.image} alt={nft.name} className="w-full h-full object-contain" />
                        ) : (
                            <div className="relative w-full h-full">
                                {attributes.map((attr: any, idx: number) => {
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
                        )}

                        {!nft.image && attributes.length === 0 && (
                            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                                <Layers className="w-12 h-12 opacity-50" />
                            </div>
                        )}
                    </motion.div>
                </div>

                {/* Details (Right) */}
                <div className="flex-1 lg:max-w-md space-y-8 overflow-y-auto pr-2">
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight mb-2">{nft.name}</h1>
                        <p className="text-muted-foreground text-lg leading-relaxed">{nft.description || "No description available."}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
                            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Status</span>
                            <div className="flex items-center gap-2 mt-1">
                                <div className={`w-2 h-2 rounded-full ${nft.mintStatus === 'minted' ? 'bg-white' : 'bg-yellow-500'}`} />
                                <span className="font-semibold capitalize">{nft.mintStatus || 'Pending'}</span>
                            </div>
                        </div>
                        <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
                            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Rarity Score</span>
                            <div className="flex items-center gap-2 mt-1">
                                <Sparkles className="w-4 h-4 text-primary" />
                                <span className="font-semibold">{Math.round(nft.rarityScore || 0)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Attributes */}
                    <div>
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Layers className="w-5 h-5 text-primary" />
                            Attributes
                        </h3>
                        <div className="space-y-3">
                            {attributes.map((attr: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors group">
                                    <div className="flex items-center gap-3">
                                        {attr.image_url ? (
                                            <img src={attr.image_url} alt={attr.value} className="w-10 h-10 rounded-md object-cover bg-black/50" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-md bg-white/10" />
                                        )}
                                        <div>
                                            <p className="text-xs text-muted-foreground uppercase font-bold">{attr.trait_type}</p>
                                            <p className="font-medium text-sm">{attr.value}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="px-2 py-1 bg-black/20 rounded text-xs text-muted-foreground group-hover:text-white transition-colors">
                                            {/* Simulate % rarity or use real if available */}
                                            {attr.rarity || Math.floor(Math.random() * 20) + 1}%
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-4 border-t border-white/10">
                        <button className="w-full py-4 bg-primary text-black font-bold rounded-xl hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(0,245,255,0.2)] hover:shadow-[0_0_30px_rgba(0,245,255,0.4)] flex items-center justify-center gap-2">
                            <ExternalLink className="w-5 h-5" />
                            View on Explorer
                        </button>
                    </div>

                </div>
            </main>
        </div>
    );
}
