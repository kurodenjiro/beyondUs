import { motion, AnimatePresence } from "framer-motion";
import { X, Save, Image as ImageIcon } from "lucide-react";
import { useState, useEffect } from "react";

interface SaveCollectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (name: string) => void;
    previewImage: string | null;
    isSaving: boolean;
}

export const SaveCollectionModal = ({ isOpen, onClose, onSave, previewImage, isSaving }: SaveCollectionModalProps) => {
    const [name, setName] = useState("");

    // Reset name when modal opens
    useEffect(() => {
        if (isOpen) {
            setName("My Awesome Collection");
        }
    }, [isOpen]);

    const handleSave = () => {
        if (name.trim()) {
            onSave(name);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Save className="w-5 h-5 text-primary" />
                            Save Collection
                        </h2>
                        <button
                            onClick={onClose}
                            disabled={isSaving}
                            className="p-2 rounded-full hover:bg-white/10 transition-colors disabled:opacity-50"
                        >
                            <X className="w-5 h-5 text-muted-foreground" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-6">
                        {/* Preview Image */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Preview</label>
                            <div className="aspect-square w-full bg-white/5 rounded-xl border border-white/10 overflow-hidden flex items-center justify-center relative group">
                                {previewImage ? (
                                    <img src={previewImage} alt="Collection Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                        <ImageIcon className="w-8 h-8" />
                                        <span className="text-xs">No preview available</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Name Input */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Collection Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Enter collection name..."
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-muted-foreground/50"
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-white/10 flex justify-end gap-3 bg-[#0a0a0a]">
                        <button
                            onClick={onClose}
                            disabled={isSaving}
                            className="px-6 py-2 rounded-lg text-sm font-semibold hover:bg-white/5 transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving || !name.trim()}
                            className="px-6 py-2 rounded-lg bg-primary text-black text-sm font-bold hover:bg-primary/90 transition-colors shadow-[0_0_15px_rgba(0,245,255,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isSaving ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                'Save Collection'
                            )}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
