"use client";

import { useEffect, useState } from "react";
import { useSimpleWallet } from "@/components/providers/SimpleWalletProvider";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles, ArrowRight, Layers, Upload, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useUsBeyond } from "@/hooks/useUsBeyond";


export default function CollectionsPage() {
    const router = useRouter();
    const { address, isConnected, connect } = useSimpleWallet();
    const [collections, setCollections] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [publishingId, setPublishingId] = useState<string | null>(null);
    const { createCollection } = useUsBeyond();


    useEffect(() => {
        if (isConnected && address) {
            fetchCollections();
        }
    }, [isConnected, address]);

    const fetchCollections = async () => {
        try {
            const res = await fetch(`/api/collections?ownerAddress=${address}`);
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

    const handlePublish = async (e: React.MouseEvent, collection: any) => {
        e.preventDefault();
        e.stopPropagation();

        setPublishingId(collection.id);
        try {
            console.log("Publishing Collection to Cronos:", collection.name);

            // 1. Create Collection On-Chain
            const txHash = await createCollection(
                collection.name || "Untitled Collection",
                "USBYD" // Symbol
            );

            console.log("✅ Collection created:", txHash);

            // 2. Update Project Status in Database
            const updateRes = await fetch(`/api/projects/${collection.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: 'published',
                    // TODO: Store contract address if we can retrieve it from event logs or if we rely on factory registry
                    // For now, we assume success marks it published. 
                    // Ideally, we'd wait for receipt and get the address.
                })
            });

            if (!updateRes.ok) throw new Error("Failed to update status");

            // Update Local State
            setCollections(prev => prev.map(c =>
                c.id === collection.id ? { ...c, status: 'published' } : c
            ));

            alert(`Collection published to Cronos! Tx: ${txHash}`);

        } catch (error: any) {
            console.error("Publishing failed:", error);
            alert(error?.message || "Failed to publish collection");
        } finally {
            setPublishingId(null);
        }
    };

    if (!isConnected) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-4">
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Layers className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">Connect Wallet</h1>
                    <p className="text-muted-foreground max-w-md">
                        Connect your wallet to view your saved collections.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">My Collections</h1>
                    <p className="text-muted-foreground">
                        Manage and edit your saved NFT collections.
                    </p>
                </div>
                <Link
                    href="/"
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-black font-semibold rounded-lg hover:bg-primary/90 transition-colors"
                >
                    <Sparkles className="w-4 h-4" />
                    Create New
                </Link>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="aspect-square rounded-xl bg-white/5 animate-pulse" />
                    ))}
                </div>
            ) : collections.length === 0 ? (
                <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/10 border-dashed">
                    <Layers className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No collections found</h3>
                    <p className="text-muted-foreground mb-6">
                        You haven't saved any collections yet.
                    </p>
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-semibold rounded-lg hover:bg-white/90 transition-colors"
                    >
                        Start Creating <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {collections.map((collection, index) => (
                        <motion.div
                            key={collection.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                        >
                            <div
                                onClick={() => router.push(`/collections/${collection.id}`)}
                                className="group block h-full cursor-pointer"
                            >
                                <div className="relative aspect-square rounded-xl bg-white/5 border border-white/10 overflow-hidden mb-3 group-hover:border-primary/50 transition-colors">
                                    {/* Status Badge */}
                                    <div className="absolute top-3 right-3 z-10">
                                        {collection.status === 'published' ? (
                                            <div className="px-2 py-1 bg-white/20 backdrop-blur-md border border-white/30 rounded-full flex items-center gap-1.5 text-xs font-bold text-white">
                                                <CheckCircle className="w-3 h-3" />
                                                PUBLISHED
                                            </div>
                                        ) : (
                                            <div className="px-2 py-1 bg-black/40 backdrop-blur-md border border-white/10 rounded-full text-xs font-medium text-white/60">
                                                UNPUBLISHED
                                            </div>
                                        )}
                                    </div>

                                    {collection.previewImage ? (
                                        <img
                                            src={collection.previewImage}
                                            alt={collection.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                            <Layers className="w-8 h-8 opacity-20" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                    <div className="absolute bottom-4 left-4 right-4 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all flex flex-col gap-2">
                                        <span className="inline-flex items-center gap-2 text-white font-medium text-sm">
                                            View Details <ArrowRight className="w-4 h-4" />
                                        </span>

                                        {/* Publish Action - Always Visible */}
                                        <button
                                            onClick={(e) => handlePublish(e, collection)}
                                            className="w-full py-2 bg-white text-black font-bold rounded-lg hover:bg-white/90 transition-colors flex items-center justify-center gap-2 text-sm"
                                            disabled={publishingId === collection.id}
                                        >
                                            {publishingId === collection.id ? (
                                                <span className="animate-spin">⌛</span>
                                            ) : (
                                                <Upload className="w-4 h-4" />
                                            )}
                                            {publishingId === collection.id ? 'Processing...' : (collection.status === 'published' ? 'Mint More NFTs' : 'Publish Collection')}
                                        </button>

                                        {/* Mint Page Link - Visible if Published */}
                                        {collection.status === 'published' && (
                                            <Link
                                                href={`/mint/${collection.id}`}
                                                onClick={(e) => e.stopPropagation()}
                                                className="w-full py-2 bg-white text-black font-bold rounded-lg hover:bg-white/90 transition-colors flex items-center justify-center gap-2 text-sm"
                                            >
                                                <Sparkles className="w-4 h-4" />
                                                Mint Page
                                            </Link>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg truncate group-hover:text-primary transition-colors">
                                        {collection.name || "Untitled Collection"}
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        Last updated {new Date(collection.updatedAt).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
