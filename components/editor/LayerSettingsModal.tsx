import { motion, AnimatePresence } from "framer-motion";
import { X, Eye, EyeOff, Sparkles, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface LayerSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    layerData: any;
    onSave: (updatedData: any) => void;
    availableLayers?: string[]; // List of available layer names for parent selection
}

export const LayerSettingsModal = ({ isOpen, onClose, layerData, onSave, availableLayers = [] }: LayerSettingsModalProps) => {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [parentLayer, setParentLayer] = useState("");
    const [position, setPosition] = useState({ x: 0, y: 0, width: 1024, height: 1024 });
    const [rarity, setRarity] = useState(100);
    const [isVisible, setIsVisible] = useState(true);
    const [activeTab, setActiveTab] = useState<'assets' | 'rules'>('assets');
    const [traits, setTraits] = useState<any[]>([]);
    const [aiPrompt, setAiPrompt] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        if (layerData) {
            setName(layerData.label || "");
            setDescription(layerData.description || "");
            setParentLayer(layerData.parentLayer || "");
            setPosition({
                x: layerData.position?.x ?? 0,
                y: layerData.position?.y ?? 0,
                width: layerData.position?.width ?? 1024,
                height: layerData.position?.height ?? 1024
            });
            setRarity(layerData.rarity ?? 100);
            setTraits(layerData.traits || []);
            setAiPrompt(layerData.aiPrompt || "");
        }
    }, [layerData]);

    const handleSave = () => {
        onSave({
            ...layerData,
            label: name,
            description,
            parentLayer: parentLayer || undefined,
            position,
            rarity,
            aiPrompt,
            traits
        });
        onClose();
    };

    const handleGenerateTrait = async () => {
        if (!aiPrompt || isGenerating) return;

        setIsGenerating(true);
        try {
            const response = await fetch('/api/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: aiPrompt })
            });

            if (!response.ok) throw new Error('Generation failed');

            const { url } = await response.json();

            // Add new trait
            const newTrait = {
                name: name || 'New Trait',
                rarity: 100,
                imageUrl: url,
                aiPrompt: aiPrompt
            };

            setTraits(prev => [...prev, newTrait]);
            console.log('✅ Trait generated successfully');
        } catch (error) {
            console.error('❌ Generation failed:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    const updateTraitRarity = (index: number, newRarity: number) => {
        setTraits(prev => {
            const newTraits = [...prev];
            newTraits[index] = { ...newTraits[index], rarity: newRarity };
            return newTraits;
        });
    };

    const updateTraitField = (index: number, field: string, value: any) => {
        setTraits(prev => {
            const newTraits = [...prev];
            newTraits[index] = { ...newTraits[index], [field]: value };
            return newTraits;
        });
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="w-full max-w-6xl bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
                        <h2 className="text-xl font-bold">{name || "Layer Settings"}</h2>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                            <X className="w-5 h-5 text-muted-foreground" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar min-h-0">

                        {/* Layer Metadata Section */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Layer Metadata</h3>
                            <p className="text-xs text-muted-foreground -mt-3">Layer details appearing in the token metadata.</p>

                            <div className="relative">
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Name</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:ring-1 focus:ring-primary outline-none transition-all"
                                    />
                                    <div
                                        className="flex items-center gap-2 px-3 py-3 bg-white/5 rounded-lg border border-white/10 cursor-pointer hover:bg-white/10"
                                        onClick={() => setIsVisible(!isVisible)}
                                    >
                                        <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${isVisible ? 'bg-white' : 'bg-gray-600'}`}>
                                            <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${isVisible ? 'translate-x-4' : 'translate-x-0'}`} />
                                        </div>
                                        {isVisible ? <Eye className="w-4 h-4 text-muted-foreground" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Description</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={2}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:ring-1 focus:ring-primary outline-none transition-all resize-none"
                                    placeholder="Layer description for generation..."
                                />
                            </div>

                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <div>
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Position X</label>
                                    <input
                                        type="number"
                                        value={position.x}
                                        onChange={(e) => setPosition({ ...position, x: parseInt(e.target.value) || 0 })}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:ring-1 focus:ring-primary outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Position Y</label>
                                    <input
                                        type="number"
                                        value={position.y}
                                        onChange={(e) => setPosition({ ...position, y: parseInt(e.target.value) || 0 })}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:ring-1 focus:ring-primary outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Width</label>
                                    <input
                                        type="number"
                                        value={position.width}
                                        onChange={(e) => setPosition({ ...position, width: parseInt(e.target.value) || 0 })}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:ring-1 focus:ring-primary outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Height</label>
                                    <input
                                        type="number"
                                        value={position.height}
                                        onChange={(e) => setPosition({ ...position, height: parseInt(e.target.value) || 0 })}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:ring-1 focus:ring-primary outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Layer Rarity</label>
                                    <span className="text-primary font-mono font-bold">{rarity}%</span>
                                </div>
                                <div className="h-6 bg-white/5 rounded-full p-1 relative">
                                    <div
                                        className="h-full bg-white rounded-full relative"
                                        style={{ width: `${rarity}%` }}
                                    >
                                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow cursor-pointer hover:scale-110 transition-transform" />
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={rarity}
                                        onChange={(e) => setRarity(parseInt(e.target.value))}
                                        className="absolute inset-0 w-full opacity-0 cursor-pointer"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Parent Layer</label>
                                <select
                                    value={parentLayer}
                                    onChange={(e) => setParentLayer(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:ring-1 focus:ring-primary outline-none transition-all"
                                >
                                    <option value="">None (Root Layer)</option>
                                    {availableLayers
                                        .filter(layerName => layerName !== name) // Exclude current layer
                                        .map((layerName, idx) => (
                                            <option key={`${layerName}-${idx}`} value={layerName}>{layerName}</option>
                                        ))
                                    }
                                </select>
                                <p className="text-[10px] text-muted-foreground mt-1">Select a parent layer to create a hierarchy (e.g., "Head" is child of "Body")</p>
                            </div>
                        </div>

                        {/* Assets / Rules Tabs */}
                        <div className="mt-8">
                            <div className="flex items-center gap-6 border-b border-white/10 mb-6">
                                <button
                                    onClick={() => setActiveTab('assets')}
                                    className={cn("pb-2 text-sm font-semibold transition-colors relative", activeTab === 'assets' ? "text-white" : "text-muted-foreground hover:text-white")}
                                >
                                    Assets
                                    <span className="ml-2 bg-white/10 text-[10px] px-1.5 py-0.5 rounded-full">{traits.length}</span>
                                    {activeTab === 'assets' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary" />}
                                </button>
                                <button
                                    onClick={() => setActiveTab('rules')}
                                    className={cn("pb-2 text-sm font-semibold transition-colors relative", activeTab === 'rules' ? "text-white" : "text-muted-foreground hover:text-white")}
                                >
                                    Rules
                                    <span className="ml-2 bg-white/10 text-[10px] px-1.5 py-0.5 rounded-full">0</span>
                                    {activeTab === 'rules' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary" />}
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                {/* Create New Asset Card */}
                                <button
                                    onClick={() => {
                                        setTraits(prev => [{
                                            name: `Asset ${prev.length + 1}`,
                                            rarity: 100,
                                            imageUrl: '',
                                            description: '',
                                            aiPrompt: ''
                                        }, ...prev]);
                                    }}
                                    className="flex flex-col items-center justify-center gap-3 p-4 bg-white/[0.02] border border-dashed border-white/10 rounded-xl hover:bg-white/[0.04] hover:border-primary/50 hover:shadow-[0_0_15px_rgba(0,245,255,0.1)] transition-all group min-h-[300px]"
                                >
                                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                        <svg className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                    </div>
                                    <span className="text-sm font-semibold text-muted-foreground group-hover:text-white transition-colors">Create New Asset</span>
                                </button>

                                {traits.map((trait, index) => (
                                    <div key={index} className="flex flex-col gap-3 p-4 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.04] transition-colors group relative">

                                        {/* Delete Button */}
                                        <button
                                            onClick={() => {
                                                setTraits(prev => prev.filter((_, i) => i !== index));
                                            }}
                                            className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-red-500/20 text-white/50 hover:text-red-500 rounded-lg transition-colors z-20"
                                            title="Remove Asset"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>

                                        {/* Header: Name and Rarity */}
                                        <div className="flex items-center justify-between pr-8">
                                            <input
                                                value={trait.name}
                                                onChange={(e) => updateTraitField(index, 'name', e.target.value)}
                                                className="flex-1 bg-transparent border border-transparent hover:border-white/10 focus:border-white/20 rounded px-2 py-1 outline-none font-semibold text-sm w-full"
                                                placeholder="Trait name"
                                            />
                                        </div>

                                        {/* Large Clickable Image */}
                                        <label className="cursor-pointer group/image relative">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={async (e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => {
                                                            updateTraitField(index, 'imageUrl', reader.result as string);
                                                        };
                                                        reader.readAsDataURL(file);
                                                    }
                                                }}
                                            />
                                            <div className="w-full aspect-square rounded-xl bg-gradient-to-br from-white/5 to-white/10 border-2 border-dashed border-white/20 flex items-center justify-center overflow-hidden transition-all group-hover/image:border-primary/50 group-hover/image:shadow-[0_0_30px_rgba(0,245,255,0.3)] relative">
                                                {/* Existing Image Logic ... */}
                                                {trait.isGenerating && (
                                                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-10">
                                                        <div className="flex flex-col items-center gap-3">
                                                            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                                                            <span className="text-xs font-medium text-primary">Generating...</span>
                                                        </div>
                                                    </div>
                                                )}
                                                {trait.imageUrl ? (
                                                    <img src={trait.imageUrl} alt={trait.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="flex flex-col items-center gap-2 text-muted-foreground group-hover/image:text-primary transition-colors">
                                                        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                        </svg>
                                                        <span className="text-xs font-medium">Click to upload</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* AI Generate Button Overlay */}
                                            {trait.imageUrl && (
                                                <div className="absolute top-2 right-2 opacity-0 group-hover/image:opacity-100 transition-opacity">
                                                    <button
                                                        type="button"
                                                        onClick={async (e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            updateTraitField(index, 'isGenerating', true);

                                                            try {
                                                                console.log('🎨 Generating image for trait:', trait.name);
                                                                console.log('📝 Using prompt:', trait.aiPrompt || trait.description || trait.name);

                                                                const response = await fetch('/api/generate-image', {
                                                                    method: 'POST',
                                                                    headers: { 'Content-Type': 'application/json' },
                                                                    body: JSON.stringify({
                                                                        prompt: `${trait.aiPrompt || trait.description || trait.name}, 2D game asset, minimalist flat vector, isolated on pure white background, high quality, digital art`,
                                                                        style: 'none'
                                                                    })
                                                                });

                                                                const data = await response.json();

                                                                if (data.url) {
                                                                    updateTraitField(index, 'imageUrl', data.url);
                                                                }
                                                            } catch (error) {
                                                                console.error('❌ Failed to generate image:', error);
                                                            } finally {
                                                                updateTraitField(index, 'isGenerating', false);
                                                            }
                                                        }}
                                                        disabled={trait.isGenerating}
                                                        className="w-10 h-10 bg-gradient-to-br from-primary to-cyan-400 hover:from-cyan-300 hover:to-primary rounded-lg flex items-center justify-center shadow-lg hover:shadow-primary/50 transition-all hover:scale-110 disabled:opacity-50"
                                                    >
                                                        {trait.isGenerating ? (
                                                            <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                                        ) : (
                                                            <svg className="w-5 h-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                                            </svg>
                                                        )}
                                                    </button>
                                                </div>
                                            )}
                                        </label>

                                        {/* Description and AI Prompt Below Image */}
                                        <div className="space-y-2">
                                            {/* Description Field */}
                                            <div>
                                                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Description</label>
                                                <textarea
                                                    value={trait.description || ''}
                                                    onChange={(e) => updateTraitField(index, 'description', e.target.value)}
                                                    placeholder="General description of this trait..."
                                                    rows={1}
                                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-300 focus:ring-1 focus:ring-primary outline-none transition-all resize-none"
                                                />
                                            </div>

                                            {/* AI Prompt Field */}
                                            <div>
                                                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">AI Prompt</label>
                                                <div className="flex gap-2">
                                                    <textarea
                                                        value={trait.aiPrompt || ''}
                                                        onChange={(e) => updateTraitField(index, 'aiPrompt', e.target.value)}
                                                        placeholder="Specific prompt for AI image generation..."
                                                        rows={2}
                                                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-300 focus:ring-1 focus:ring-primary outline-none transition-all resize-none"
                                                    />
                                                    {/* Generate Button */}
                                                    <button
                                                        type="button"
                                                        onClick={async () => {
                                                            updateTraitField(index, 'isGenerating', true);

                                                            try {
                                                                const response = await fetch('/api/generate-image', {
                                                                    method: 'POST',
                                                                    headers: { 'Content-Type': 'application/json' },
                                                                    body: JSON.stringify({
                                                                        prompt: trait.aiPrompt || trait.description || trait.name,
                                                                        style: 'none'
                                                                    })
                                                                });

                                                                const data = await response.json();
                                                                if (data.url) {
                                                                    updateTraitField(index, 'imageUrl', data.url);
                                                                }
                                                            } catch (error) {
                                                                console.error('Failed to generate image:', error);
                                                            } finally {
                                                                updateTraitField(index, 'isGenerating', false);
                                                            }
                                                        }}
                                                        disabled={trait.isGenerating || (!trait.aiPrompt && !trait.description)}
                                                        className="h-auto px-3 bg-gradient-to-br from-primary to-cyan-400 hover:from-cyan-300 hover:to-primary rounded-lg flex items-center justify-center shadow-lg hover:shadow-primary/50 transition-all hover:scale-105 disabled:opacity-30 disabled:cursor-not-allowed"
                                                    >
                                                        {trait.isGenerating ? (
                                                            <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                                        ) : (
                                                            <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                                            </svg>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Rarity Slider */}
                                        <div className="flex items-center gap-4">
                                            <div className="flex-1 relative h-10 flex flex-col justify-center">
                                                <div className="flex justify-between text-[9px] text-muted-foreground uppercase tracking-wider mb-1 px-1">
                                                    <span>Legendary</span>
                                                    <span>Epic</span>
                                                    <span>Rare</span>
                                                    <span>Common</span>
                                                </div>
                                                <div className="h-1.5 bg-white/10 rounded-full relative overflow-hidden">
                                                    <div
                                                        className="absolute left-0 top-0 h-full bg-gradient-to-r from-purple-500 via-blue-500 to-green-500"
                                                        style={{ width: `${trait.rarity}%` }}
                                                    />
                                                </div>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="100"
                                                    value={trait.rarity}
                                                    onChange={(e) => updateTraitRarity(index, parseInt(e.target.value))}
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-white/10 flex justify-end gap-3 bg-[#0a0a0a] flex-shrink-0">
                        <button onClick={onClose} className="px-6 py-2 rounded-lg text-sm font-semibold hover:bg-white/5 transition-colors">
                            Cancel
                        </button>
                        <button onClick={handleSave} className="px-6 py-2 rounded-lg bg-primary text-black text-sm font-bold hover:bg-primary/90 transition-colors shadow-[0_0_15px_rgba(0,245,255,0.3)]">
                            Save Changes
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
