import { useState } from "react";
import { Sliders, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface RaritySettingsProps {
    layerName: string;
    rarity: number;
    onClose: () => void;
}

export const RaritySettings = ({ layerName, rarity, onClose }: RaritySettingsProps) => {
    const [currentRarity, setCurrentRarity] = useState(rarity);

    return (
        <div className="absolute top-4 right-4 w-80 bg-background/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-right-10 fade-in duration-300 z-50">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                <h3 className="font-bold text-sm tracking-wide flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-primary" />
                    {layerName} Settings
                </h3>
                <button onClick={onClose} className="hover:text-white text-muted-foreground transition-colors">
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="p-6 space-y-6">
                {/* Rarity Slider */}
                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <label className="text-xs font-medium text-muted-foreground uppercase">Rarity Probability</label>
                        <span className="text-sm font-mono text-primary font-bold">{currentRarity}%</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={currentRarity}
                        onChange={(e) => setCurrentRarity(Number(e.target.value))}
                        className="w-full h-2 bg-secondary/20 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                </div>

                {/* Blacklisted Traits */}
                <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase">Blocked Traits (Logic)</label>
                    <div className="p-3 bg-black/40 rounded border border-white/5 text-xs text-muted-foreground">
                        No traits blocked.
                    </div>
                    <button className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-xs font-medium transition-colors">
                        + Add Rule
                    </button>
                </div>

                <div className="pt-2">
                    <button className="w-full py-2 bg-primary text-black font-bold rounded shadow-[0_0_10px_rgba(0,245,255,0.2)] hover:shadow-[0_0_15px_rgba(0,245,255,0.4)] transition-all">
                        Save Configuration
                    </button>
                </div>
            </div>
        </div>
    );
};
