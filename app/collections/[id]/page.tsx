"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSimpleWallet } from "@/components/providers/SimpleWalletProvider";
import Link from "next/link";
import { ArrowLeft, Sparkles, Layers, Search, Filter } from "lucide-react";
import { motion } from "framer-motion";

export default function CollectionDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { address, isConnected } = useSimpleWallet();

    const [project, setProject] = useState<any>(null);
    const [nfts, setNfts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState("");

    useEffect(() => {
        if (id) {
            fetchCollectionData();
        }
    }, [id]);

    const fetchCollectionData = async () => {
        try {
            // Fetch Project Info
            const projectRes = await fetch(`/api/projects/${id}`);
            if (!projectRes.ok) throw new Error("Failed to load project");
            const projectData = await projectRes.json();
            setProject(projectData);

            // Fetch Generated NFTs (We need a new endpoint or query param on project)
            // For now, let's assume we can fetch them via a specific route or filtered query
            // If we don't have a specific listed endpoint, we might need to add one.
            // Let's create a GET route in the generate endpoint or just use a new one.
            // Actually, let's add a `GET` to `/api/projects/[id]/nfts` for cleanliness.
            // Wait, I haven't created that endpoint yet. I will create it momentarily.
            const nftsRes = await fetch(`/api/projects/${id}/nfts`);
            if (nftsRes.ok) {
                const nftsData = await nftsRes.json();
                setNfts(nftsData.nfts || []);
            }
        } catch (error) {
            console.error("Error loading collection:", error);
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

    if (!project) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center text-muted-foreground gap-4">
                <p>Collection not found.</p>
                <Link href="/collections" className="text-primary hover:underline">Back to Collections</Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white p-8 pt-24">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/collections"
                            className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold">{project.name}</h1>
                            <p className="text-muted-foreground flex items-center gap-2">
                                <span className={project.status === 'published' && project.contractAddress ? "text-green-400 font-bold tracking-wider text-xs border border-green-500/30 px-2 py-0.5 rounded bg-green-500/10" : "text-yellow-400 uppercase text-xs font-bold tracking-wider border border-yellow-500/30 px-2 py-0.5 rounded bg-yellow-500/10"}>
                                    {project.status === 'published' && project.contractAddress ? 'PUBLISHED' : 'DRAFT'}
                                </span>
                                • {nfts.length} Items
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link
                            href={`/editor?id=${project.id}`}
                            className="px-4 py-2 bg-white/10 border border-white/10 rounded-lg hover:bg-white/20 transition-colors text-sm font-medium"
                        >
                            Edit Collection
                        </Link>
                        <Link
                            href={`/mint/${project.id}`}
                            className="px-6 py-2 bg-primary text-black font-bold rounded-lg hover:bg-primary/90 transition-colors shadow-[0_0_20px_rgba(0,245,255,0.3)] flex items-center gap-2"
                        >
                            <Sparkles className="w-4 h-4" />
                            Mint Page
                        </Link>
                    </div>
                </div>

                {/* Filters & Search */}
                <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/10">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search by ID or trait..."
                            className="w-full pl-10 pr-4 py-2 bg-black/40 border border-white/10 rounded-lg focus:outline-none focus:border-primary/50 transition-colors text-sm"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                        />
                    </div>
                    <div className="h-6 w-px bg-white/10 mx-2" />
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Filter className="w-4 h-4" />
                        <span>Filter Attributes</span>
                    </div>
                </div>

                {/* Grid */}
                {nfts.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                        {nfts.filter(nft => nft.name.toLowerCase().includes(filter.toLowerCase())).map((nft) => (
                            <motion.div
                                key={nft.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="group relative bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-primary/50 transition-all cursor-pointer"
                            >
                                <div className="aspect-square bg-black/40 relative">
                                    {/* Since we don't generate the composite image on backend yet, we render simple preview or check image field */}
                                    {nft.image ? (
                                        <img src={nft.image} alt={nft.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center relative overflow-hidden">
                                            {/* Basic HTML Compositor for quick preview if images are available */}
                                            {nft.attributes && Array.isArray(nft.attributes) && (
                                                <div className="relative w-full h-full bg-white/5">
                                                    {nft.attributes.map((attr: any, idx: number) => {
                                                        if (!attr.image_url) return null;
                                                        // Default to full canvas if no position (backward compatibility)
                                                        const pos = attr.position || { x: 0, y: 0, width: 1024, height: 1024 };

                                                        // Convert 1024 coordinate system to percentages
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
                                                                style={{
                                                                    left,
                                                                    top,
                                                                    width,
                                                                    height
                                                                }}
                                                            />
                                                        );
                                                    })}
                                                </div>
                                            )}
                                            {!nft.attributes?.some((a: any) => a.image_url) && (
                                                <Layers className="w-8 h-8 text-white/20" />
                                            )}
                                        </div>
                                    )}
                                    <Link
                                        href={`/nft/${nft.id}`}
                                        className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4"
                                    >
                                        <button className="w-full py-2 bg-white text-black text-xs font-bold rounded">
                                            View Details
                                        </button>
                                    </Link>
                                </div>
                                <div className="p-3">
                                    <h3 className="font-bold text-sm truncate">{nft.name}</h3>
                                    <div className="flex items-center justify-between mt-1">
                                        <span className="text-xs text-muted-foreground">Rank #{Math.floor(Math.random() * 100)}</span>
                                        <span className="text-xs font-mono text-primary">Rarity: {Math.round(nft.rarityScore || 0)}</span>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 bg-white/5 rounded-2xl border border-white/10 border-dashed">
                        <Layers className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                        <h3 className="text-xl font-bold mb-2">No Generated Items</h3>
                        <p className="text-muted-foreground mb-6">This collection has no generated items yet.</p>
                        <Link
                            href={`/editor?id=${id}`}
                            className="px-6 py-2 bg-primary text-black font-bold rounded-lg hover:bg-primary/90 transition-colors"
                        >
                            Open Editor to Generate
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
