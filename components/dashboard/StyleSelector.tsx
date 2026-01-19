"use client";

import { X, Image as ImageIcon, Box, Camera, Frame } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface StyleSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    selectedStyle: string;
    onSelect: (style: string) => void;
}

const STYLES = [
    { id: "none", name: "None", icon: X },
    { id: "detailed", name: "Detailed Textures", icon: ImageIcon },
    { id: "hdr", name: "Enhance (HDR)", icon: SparklesIcon }, // Custom icon helper below
    { id: "3d", name: "3D Model", icon: Box },
    { id: "cinematic", name: "Cinematic", icon: Camera },
    { id: "photographic", name: "Photographic", icon: Frame },
];

function SparklesIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
        </svg>
    )
}

export const StyleSelector = ({ isOpen, onClose, selectedStyle, onSelect }: StyleSelectorProps) => {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-[#0A0A0A] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden relative z-[101] shadow-2xl"
                >
                    <div className="flex items-center justify-between p-4 border-b border-white/10">
                        <div className="flex items-center gap-2">
                            <span className="bg-white/10 text-xs px-1.5 py-0.5 rounded text-muted-foreground">{STYLES.length}</span>
                            <span className="text-sm font-bold tracking-widest text-muted-foreground uppercase">Select a Style</span>
                        </div>
                        <button onClick={onClose} className="text-muted-foreground hover:text-white transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="p-6 grid grid-cols-3 gap-4">
                        {STYLES.map((style) => (
                            <button
                                key={style.id}
                                onClick={() => onSelect(style.id)}
                                className={cn(
                                    "flex flex-col items-center justify-center gap-3 p-4 rounded-xl border transition-all aspect-square group relative overflow-hidden",
                                    selectedStyle === style.id
                                        ? "bg-primary/10 border-primary shadow-[0_0_15px_rgba(0,245,255,0.2)]"
                                        : "bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/10"
                                )}
                            >
                                {/* Selection Check */}
                                {selectedStyle === style.id && (
                                    <div className="absolute top-2 left-2 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                                        <span className="text-black text-[10px]">✓</span>
                                    </div>
                                )}

                                <div className={cn(
                                    "p-3 rounded-full bg-black/40 border border-white/10 transition-transform group-hover:scale-110",
                                    selectedStyle === style.id ? "text-primary" : "text-muted-foreground"
                                )}>
                                    <style.icon className="w-6 h-6" />
                                </div>
                                <span className={cn(
                                    "text-xs font-medium text-center",
                                    selectedStyle === style.id ? "text-primary" : "text-muted-foreground group-hover:text-white"
                                )}>
                                    {style.name}
                                </span>
                            </button>
                        ))}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
