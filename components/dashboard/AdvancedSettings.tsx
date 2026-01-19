"use client";

import { useState } from "react";
import { X, Image as ImageIcon, Scaling, Ratio, GripHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface AdvancedSettingsProps {
    isOpen: boolean;
    onClose: () => void;
    selectedRatio: string;
    setSelectedRatio: (ratio: string) => void;
    selectedUpscale: string;
    setSelectedUpscale: (upscale: string) => void;
}

const RATIOS = [
    { id: "1:1", label: "AR 1:1", dim: "512x512" },
    { id: "2:3", label: "AR 2:3", dim: "512x768" },
    { id: "3:2", label: "AR 3:2", dim: "768x512" },
];

const UPSCALES = ["Original", "1X", "2X"];

export const AdvancedSettings = ({ isOpen, onClose, selectedRatio, setSelectedRatio, selectedUpscale, setSelectedUpscale }: AdvancedSettingsProps) => {

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
                    <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
                        <span className="text-sm font-bold tracking-widest text-muted-foreground uppercase">Advanced Options</span>
                        <button onClick={onClose} className="text-muted-foreground hover:text-white transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="p-6 space-y-8">
                        {/* Aspect Ratio */}
                        <div className="space-y-4">
                            <label className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-2">
                                <Ratio className="w-4 h-4" /> Image Aspect Ratio
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                                {RATIOS.map((r) => (
                                    <div key={r.id} className="group cursor-pointer" onClick={() => setSelectedRatio(r.id)}>
                                        <div className={cn(
                                            "flex items-center justify-center py-3 rounded-lg border text-xs font-bold transition-all",
                                            r.id === selectedRatio
                                                ? "bg-white/10 border-white/20 text-white"
                                                : "bg-black/40 border-white/5 text-muted-foreground hover:bg-white/5"
                                        )}>
                                            {r.id === selectedRatio && <span className="mr-1 text-primary">✓</span>}
                                            {r.label}
                                        </div>
                                        <div className="text-center mt-2">
                                            <ImageIcon className="w-8 h-8 mx-auto text-muted-foreground/30 mb-1" />
                                            <span className="text-[10px] text-muted-foreground">{r.dim}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Upscale */}
                        <div className="space-y-4">
                            <label className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-2">
                                <Scaling className="w-4 h-4" /> Upscale
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                                {UPSCALES.map((u) => (
                                    <div key={u} className={cn(
                                        "flex items-center justify-center py-3 rounded-lg border text-xs font-bold transition-all cursor-pointer",
                                        u === selectedUpscale
                                            ? "bg-white/10 border-white/20 text-white"
                                            : "bg-black/40 border-white/5 text-muted-foreground hover:bg-white/5"
                                    )}
                                        onClick={() => setSelectedUpscale(u)}
                                    >
                                        {u === selectedUpscale && <span className="mr-1 text-primary">✓</span>}
                                        {u}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
