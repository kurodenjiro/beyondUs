"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, Layers, Box, Globe } from "lucide-react";
import { motion } from "framer-motion";

export default function ExplorePage() {
    const [collections, setCollections] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPublishedCollections();
    }, []);

    const fetchPublishedCollections = async () => {
        try {
            // Fetch ALL published collections
            // Note: We need to update the API to support fetching published status without ownerAddress filtering or specific owner = "published"
            const res = await fetch(`/api/collections?status=published`);
            if (res.ok) {
                const data = await res.json();
                setCollections(data);
            }
        } catch (error) {
            console.error("Failed to fetch collections:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-12">
                <div className="space-y-2">
                    <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3">
                        <Globe className="w-8 h-8 text-primary" />
                        Explore Collections
                    </h1>
                    <p className="text-lg text-muted-foreground max-w-2xl">
                        Discover and mint NFT collections created by the community on the Cronos Testnet.
                    </p>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="aspect-square rounded-2xl bg-white/5 animate-pulse" />
                    ))}
                </div>
            ) : collections.length === 0 ? (
                <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/10 border-dashed">
                    <Globe className="w-16 h-16 text-muted-foreground mx-auto mb-6" />
                    <h3 className="text-2xl font-bold mb-2">No collections yet</h3>
                    <p className="text-muted-foreground mb-8 text-lg">
                        Be the first to publish a collection to the world!
                    </p>
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-black font-bold rounded-xl hover:bg-primary/90 transition-all hover:scale-105 shadow-[0_0_20px_rgba(0,245,255,0.3)]"
                    >
                        Create Collection <ArrowRight className="w-5 h-5" />
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {collections.map((collection, index) => (
                        <motion.div
                            key={collection.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.05 }}
                            whileHover={{ y: -5 }}
                        >
                            <Link href={`/mint/${collection.id}`} className="group block h-full">
                                <div className="relative aspect-square rounded-2xl bg-white/5 border border-white/10 overflow-hidden mb-4 group-hover:border-primary/50 transition-colors shadow-lg">
                                    {collection.previewImage ? (
                                        <img
                                            src={collection.previewImage}
                                            alt={collection.name}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-black/20">
                                            <Box className="w-12 h-12 opacity-20" />
                                        </div>
                                    )}

                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />

                                    <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-2 group-hover:translate-y-0 transition-transform">
                                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-white text-black font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-all w-full justify-center">
                                            <Sparkles className="w-4 h-4" /> Mint Now
                                        </span>
                                    </div>

                                    <div className="absolute top-3 right-3 px-2 py-1 bg-black/60 backdrop-blur rounded-full text-xs font-mono text-white/80 border border-white/10">
                                        ED: 1/5
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <h3 className="font-bold text-xl truncate group-hover:text-primary transition-colors">
                                        {collection.name || "Untitled Collection"}
                                    </h3>
                                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                            <Layers className="w-3 h-3" /> Cronos Testnet
                                        </span>
                                        <span>
                                            {new Date(collection.updatedAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
