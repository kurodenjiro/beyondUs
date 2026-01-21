"use client";

import { motion } from "framer-motion";
import { Sparkles, Settings2, Box, Layers, Zap } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { useX402 } from "@/hooks/useX402";
import { ModelSelector } from "@/components/dashboard/ModelSelector";
import { StyleSelector } from "@/components/dashboard/StyleSelector";
import { AdvancedSettings } from "@/components/dashboard/AdvancedSettings";
import { useSimpleWallet } from "@/components/providers/SimpleWalletProvider";
import { Carousel } from "@/components/home/Carousel";

export default function Home() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isStyleOpen, setIsStyleOpen] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState("none");
  const [selectedRatio, setSelectedRatio] = useState("1:1");
  const [selectedUpscale, setSelectedUpscale] = useState("Original");
  const [supply, setSupply] = useState(8);
  const { mintCollection } = useX402();
  const { address } = useSimpleWallet();

  const [status, setStatus] = useState<string>("");



  const handleGenerate = async () => {
    if (!prompt) return;
    setIsGenerating(true);

    try {
      if (!address) throw new Error("Please connect your wallet first");

      console.log("💰 processing payment...");
      setStatus("PROCESSING PAYMENT...");

      const paymentResult = await mintCollection(null);
      if (!paymentResult.success) {
        throw new Error(paymentResult.error || "Payment failed");
      }

      console.log("✅ Payment successful:", paymentResult.txHash);
      setStatus("INITIALIZING PROJECT...");

      // 1. Init Project
      const initRes = await fetch('/api/projects/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, ownerAddress: address })
      });
      const initData = await initRes.json();
      if (!initData.projectId) throw new Error(initData.error || "Failed to init project");

      const { projectId, config } = initData;
      console.log("✅ Project initialized:", projectId);

      // 2. Generate Base
      setStatus("GENERATING BASE CHARACTER...");
      const baseRes = await fetch(`/api/projects/${projectId}/generate-base`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config })
      });
      const baseData = await baseRes.json();
      if (!baseData.success) throw new Error(baseData.error || "Failed to generate base");

      const { baseImageData } = baseData;
      console.log("✅ Base generated");

      // 3. Generate Traits
      const categories = ["background", "headwear", "eyewear", "accessory", "clothing"];
      const traitsPerCategory = 2; // Fixed for now, can be dynamic
      const generatedTraits: any[] = [];
      let failureCount = 0;

      for (const category of categories) {
        setStatus(`GENERATING ${category.toUpperCase()}...`);

        const promises = [];
        for (let i = 1; i <= traitsPerCategory; i++) {
          promises.push(
            (async () => {
              try {
                const res = await fetch(`/api/projects/${projectId}/generate-trait`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ category, variationNumber: i, config })
                });
                const data = await res.json();
                if (data.success && data.trait) {
                  return data.trait;
                }
                return null;
              } catch (e) {
                console.warn(`Failed trait ${category} ${i}`, e);
                return null;
              }
            })()
          );
        }

        const results = await Promise.all(promises);
        results.forEach(t => {
          if (t) generatedTraits.push(t);
          else failureCount++;
        });
      }

      // 4. Finalize
      setStatus("FINALIZING RELEASE...");
      const finalizeRes = await fetch(`/api/projects/${projectId}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseImageData,
          traits: generatedTraits,
          config,
          nftsToGenerate: supply
        })
      });
      const finalizeData = await finalizeRes.json();

      if (finalizeData.success) {
        setStatus("REDIRECTING...");
        router.push(`/editor?id=${projectId}`);
      } else {
        throw new Error(finalizeData.error || "Failed to finalize project");
      }

    } catch (error: any) {
      console.error("Generation failed:", error);
      setStatus(`Error: ${error.message}`);
      setIsGenerating(false);
    }
  };

  // Helper functions
  const getParentLayer = (category: string): string => {
    const hierarchy: Record<string, string> = {
      'Background': '',
      'Body': 'Background',
      'Head': 'Body',
      'Hair': 'Head',
      'Eyes': 'Head',
      'Mouth': 'Head',
      'Clothes': 'Body',
      'Accessory': 'Head',
      'Weapon': 'Body'
    };
    return hierarchy[category] || '';
  };

  const getDefaultPosition = (category: string) => {
    const positions: Record<string, any> = {
      'Background': { x: 0, y: 0, width: 1024, height: 1024 },
      'Body': { x: 256, y: 400, width: 512, height: 624 },
      'Head': { x: 352, y: 100, width: 320, height: 320 },
      'Hair': { x: 312, y: 0, width: 400, height: 200 },
      'Eyes': { x: 400, y: 180, width: 224, height: 80 },
      'Mouth': { x: 450, y: 280, width: 124, height: 60 },
      'Clothes': { x: 256, y: 400, width: 512, height: 624 },
      'Accessory': { x: 350, y: 50, width: 324, height: 200 },
      'Weapon': { x: 100, y: 500, width: 200, height: 400 }
    };
    return positions[category] || { x: 0, y: 0, width: 1024, height: 1024 };
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] container mx-auto px-4 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Hero Carousel (Background) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ duration: 1 }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0"
      >
        <Carousel />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12 relative z-10"
      >
        <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tighter">
          Generate <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">NFTs</span> with AI.
        </h1>
        <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto">
          Create and deploy ultra-high quality NFT artwork in seconds on the Cronos Testnet.
        </p>
      </motion.div>

      {/* Main Input Section */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-4xl relative z-20"
      >
        <div className="bg-background/80 backdrop-blur-xl border border-white/10 p-2 rounded-2xl shadow-2xl flex flex-col md:flex-row gap-2">
          <input
            type="text"
            placeholder="A collection of cute cyberpunk robots..."
            className="flex-1 bg-transparent border-none text-lg px-6 py-4 focus:ring-0 text-white placeholder:text-muted-foreground outline-none"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <div className="flex items-center gap-2 px-2">
            <button
              onClick={async () => {
                if (isGenerating) return;
                const btn = document.getElementById('suggest-btn');
                if (btn) btn.classList.add('animate-pulse');

                try {
                  const res = await fetch('/api/suggest', { method: 'POST' });
                  const data = await res.json();
                  if (data.prompt) setPrompt(data.prompt);
                } catch (e) {
                  console.error("Suggest failed", e);
                } finally {
                  if (btn) btn.classList.remove('animate-pulse');
                }
              }}
              id="suggest-btn"
              className="p-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-muted-foreground hover:text-white flex items-center gap-2"
              title="Get a creative AI suggestion"
            >
              <Sparkles className="w-5 h-5" />
              <span className="hidden md:inline text-sm font-medium">Suggest</span>
            </button>



            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="bg-primary hover:bg-primary/90 text-black font-bold px-8 py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(0,245,255,0.4)] hover:shadow-[0_0_30px_rgba(0,245,255,0.6)] flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Zap className={`w-5 h-5 fill-current ${isGenerating ? 'animate-pulse' : ''}`} />
              {isGenerating ? (status ? status.toUpperCase() : 'GENERATING...') : 'GENERATE'}
            </button>
          </div>
        </div>

        {/* Controls / Settings */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
          <ModelSelector />
          <div
            onClick={() => setIsStyleOpen(true)}
            className="bg-black/40 backdrop-blur border border-white/5 rounded-full px-6 py-3 flex items-center gap-3 hover:border-primary/50 transition-colors cursor-pointer group"
          >
            <Box className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="text-sm font-medium">Add Styles +</span>
          </div>

          <div className="bg-black/40 backdrop-blur border border-white/5 rounded-full px-6 py-3 flex items-center gap-3 hover:border-primary/50 transition-colors group relative">
            <Layers className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Supply:</span>
              <input
                type="number"
                min="1"
                max="8"
                value={supply}
                onChange={(e) => setSupply(parseInt(e.target.value) || 1)}
                className="w-16 bg-transparent border-none focus:ring-0 text-sm font-bold text-primary p-0 outline-none"
              />
            </div>
          </div>

          <div
            onClick={() => setIsAdvancedOpen(true)}
            className="bg-black/40 backdrop-blur border border-white/5 rounded-full px-6 py-3 flex items-center gap-3 hover:border-primary/50 transition-colors cursor-pointer group"
          >
            <Settings2 className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="text-sm font-medium">Advanced Settings</span>
          </div>
        </div>
      </motion.div>

      <StyleSelector
        isOpen={isStyleOpen}
        onClose={() => setIsStyleOpen(false)}
        selectedStyle={selectedStyle}
        onSelect={setSelectedStyle}
      />

      <AdvancedSettings
        isOpen={isAdvancedOpen}
        onClose={() => setIsAdvancedOpen(false)}
        selectedRatio={selectedRatio}
        setSelectedRatio={setSelectedRatio}
        selectedUpscale={selectedUpscale}
        setSelectedUpscale={setSelectedUpscale}
      />
    </div>
  );
}
