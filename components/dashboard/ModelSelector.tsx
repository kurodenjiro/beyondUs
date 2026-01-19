"use client";

import { useState } from "react";
import { ChevronDown, Check, Bot, Zap, BrainCircuit } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const MODELS = [
    { id: "nano-banana", name: "Nano Banana", icon: Zap, description: "Fastest generation, cute style" },
    { id: "gpt-4", name: "GPT Generated", icon: Bot, description: "High fidelity, detailed prompts" },
    { id: "stable-diff", name: "Stable Diffusion v3", icon: BrainCircuit, description: "Realistic textures & lighting" },
];

export const ModelSelector = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedModel, setSelectedModel] = useState(MODELS[0]);

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="bg-black/40 backdrop-blur border border-white/5 rounded-full px-6 py-3 flex items-center gap-3 hover:border-primary/50 transition-colors cursor-pointer group"
            >
                <div className="flex items-center gap-2">
                    <selectedModel.icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="text-sm font-medium">{selectedModel.name}</span>
                </div>
                <ChevronDown className={cn("w-4 h-4 text-muted-foreground group-hover:text-primary transition-all duration-300", isOpen ? "rotate-180" : "")} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute bottom-full mb-2 left-0 w-[240px] bg-[#0A0A0A]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.5)] overflow-hidden z-50 p-1"
                    >
                        <div className="flex flex-col gap-1">
                            {MODELS.map((model) => (
                                <button
                                    key={model.id}
                                    onClick={() => {
                                        setSelectedModel(model);
                                        setIsOpen(false);
                                    }}
                                    className={cn(
                                        "flex items-start gap-3 p-2 rounded-lg text-left transition-all",
                                        selectedModel.id === model.id
                                            ? "bg-primary/10 border border-primary/20"
                                            : "hover:bg-white/5 border border-transparent"
                                    )}
                                >
                                    <div className={cn(
                                        "p-2 rounded-md bg-black/40 border border-white/5",
                                        selectedModel.id === model.id ? "text-primary" : "text-muted-foreground"
                                    )}>
                                        <model.icon className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <span className={cn(
                                                "text-sm font-bold",
                                                selectedModel.id === model.id ? "text-primary" : "text-white"
                                            )}>
                                                {model.name}
                                            </span>
                                            {selectedModel.id === model.id && <Check className="w-3 h-3 text-primary" />}
                                        </div>
                                        <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                                            {model.description}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
