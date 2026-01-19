"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import ReactFlow, {
    Node,
    Edge,
    applyEdgeChanges,
    applyNodeChanges,
    NodeChange,
    EdgeChange,
    Connection,
    addEdge,
    Background,
    Controls,
    MiniMap,
    Handle,
    Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import { cn } from '@/lib/utils';
import { Settings, Image as ImageIcon, Trash2, Dices, Move, Sparkles, Plus } from 'lucide-react';

// Custom Node Component
const CustomLayerNode = ({ data }: { data: { label: string, traits: any[], onSettings: () => void, onAddChild: () => void } }) => {
    return (
        <div
            onClick={data.onSettings}
            className="px-4 py-3 shadow-lg rounded-xl bg-background border border-primary/30 min-w-[200px] backdrop-blur-sm relative group hover:border-primary hover:shadow-[0_0_15px_rgba(0,245,255,0.2)] transition-all cursor-pointer"
        >
            <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-primary !border-2 !border-background" />

            <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
                <span className="text-xs font-bold text-primary uppercase tracking-wider">{data.label}</span>
                <Settings className="w-3 h-3 text-muted-foreground group-hover:text-white transition-colors" />
            </div>

            <div className="flex flex-col gap-2 max-h-[150px] overflow-y-auto custom-scrollbar">
                {data.traits && data.traits.map((trait: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-[10px] bg-white/5 p-1.5 rounded border border-white/5">
                        <span className="text-gray-300 truncate max-w-[100px]">{trait.name}</span>
                        <span className="font-mono text-primary/80">{trait.rarity}%</span>
                    </div>
                ))}
            </div>

            <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-secondary !border-2 !border-background opacity-0 group-hover:opacity-100 transition-opacity" />

            {/* Add Child Button on Right Edge */}
            <button
                onClick={(e) => { e.stopPropagation(); data.onAddChild(); }}
                className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-secondary text-black rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow-[0_0_10px_rgba(0,245,255,0.3)] z-50"
                title="Add Child Layer"
            >
                <Plus className="w-3 h-3" />
            </button>
        </div >
    );
};

const nodeTypes = {
    customLayer: CustomLayerNode,
};

const initialNodes: Node[] = [
    { id: '1', type: 'customLayer', position: { x: 100, y: 100 }, data: { label: 'Background', rarity: 100, position: { x: 0, y: 0, width: 1024, height: 1024 } } },
    { id: '2', type: 'customLayer', position: { x: 450, y: 100 }, data: { label: 'Body', rarity: 100, position: { x: 0, y: 0, width: 1024, height: 1024 } } },
    { id: '3', type: 'customLayer', position: { x: 800, y: 100 }, data: { label: 'Head', rarity: 100, position: { x: 0, y: 0, width: 1024, height: 1024 } } },
];

const initialEdges: Edge[] = [
    { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#00F5FF' } },
    { id: 'e1-3', source: '1', target: '3', animated: true, style: { stroke: '#00F5FF' } },
];

import { LayerSettingsModal } from './LayerSettingsModal';
import { SaveCollectionModal } from './SaveCollectionModal';
import { useSimpleWallet } from '@/components/providers/SimpleWalletProvider';

export const ManageLayers = () => {
    const { address } = useSimpleWallet();
    const searchParams = useSearchParams();
    const projectId = searchParams.get('id');
    const [nodes, setNodes] = useState<Node[]>(initialNodes);
    const [edges, setEdges] = useState<Edge[]>(initialEdges);
    const [projectPrompt, setProjectPrompt] = useState<string>('');

    const [isLoading, setIsLoading] = useState(!!projectId);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedLayer, setSelectedLayer] = useState<any>(null);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isRearranging, setIsRearranging] = useState(false);
    const [selectedTraits, setSelectedTraits] = useState<Record<string, number>>({});

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isSavingCollection, setIsSavingCollection] = useState(false);

    // Modal State - Moved to top to avoid Hooks Order Violation
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [previewToSave, setPreviewToSave] = useState<string | null>(null);

    // Canvas Rendering Effect
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size
        canvas.width = 1024;
        canvas.height = 1024;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Helper to load images
        const loadImage = (src: string): Promise<HTMLImageElement> => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.crossOrigin = 'anonymous';
                img.src = src;
            });
        };

        // Render character
        const renderCharacter = async () => {
            try {
                // Get layers sorted by depth (parent below child)
                const layersToRender = nodes
                    .filter(n => n.data.traits?.some((t: any) => t.imageUrl))
                    .sort((a, b) => getLayerDepth(a, nodes) - getLayerDepth(b, nodes));

                // Draw each layer in order
                for (const node of layersToRender) {
                    const traitIndex = selectedTraits[node.id] || 0;
                    const trait = node.data.traits?.[traitIndex]?.imageUrl
                        ? node.data.traits[traitIndex]
                        : node.data.traits?.find((t: any) => t.imageUrl);

                    if (!trait?.imageUrl) continue;

                    // Load image
                    const img = await loadImage(trait.imageUrl);

                    // Get position from trait or node data
                    const pos = trait.position || node.data.position || { x: 0, y: 0, width: 1024, height: 1024 };

                    // Draw at specified position
                    ctx.drawImage(
                        img,
                        pos.x,
                        pos.y,
                        pos.width,
                        pos.height
                    );
                }
            } catch (err) {
                console.error("Error rendering character:", err);
            }
        };

        renderCharacter();
    }, [nodes, selectedTraits]); // Re-render when nodes or selection changes

    // Calculate Layer Depth for proper stacking
    const getLayerDepth = (node: Node, allNodes: Node[]): number => {
        if (!node.data.parentLayer || node.data.parentLayer === '') return 0;
        const parent = allNodes.find(n => n.data.label === node.data.parentLayer);
        // Avoid infinite loops and self-referencing
        if (!parent || parent.id === node.id) return 0;
        return 1 + getLayerDepth(parent, allNodes);
    };

    const handleRandomizeMix = () => {
        const newSelectedTraits: Record<string, number> = {};
        nodes.forEach(node => {
            const traitsWithImages = node.data.traits
                ?.map((t: any, idx: number) => ({ ...t, originalIndex: idx }))
                .filter((t: any) => t.imageUrl) || [];

            if (traitsWithImages.length > 0) {
                const randomIdx = Math.floor(Math.random() * traitsWithImages.length);
                newSelectedTraits[node.id] = traitsWithImages[randomIdx].originalIndex;
            }
        });
        setSelectedTraits(newSelectedTraits);
    };

    const handleSettingsClick = (nodeId: string, layerData: any) => {
        setSelectedNodeId(nodeId);
        setSelectedLayer(layerData); // Use metadata position, not graph position
        setIsModalOpen(true);
    };

    const handleRearrange = async () => {
        if (!projectId || isRearranging) return;

        try {
            setIsRearranging(true);

            // Step 1: Create composite image from all traits
            console.log('🎨 Creating composite image...');
            const canvas = document.createElement('canvas');
            canvas.width = 1024;
            canvas.height = 1024;
            const ctx = canvas.getContext('2d');

            if (!ctx) throw new Error('Failed to get canvas context');

            // Fill with white background
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, 1024, 1024);

            // Draw each layer's traits
            const layerData = [];
            for (const node of nodes) {
                const traits = node.data.traits || [];
                const position = node.data.position || { x: 0, y: 0, width: 1024, height: 1024 };

                // Draw all traits for this layer
                for (const trait of traits) {
                    if (trait.imageUrl) {
                        try {
                            await new Promise<void>((resolve, reject) => {
                                const img = new Image();
                                img.crossOrigin = 'anonymous';
                                img.onload = () => {
                                    ctx.drawImage(img, position.x, position.y, position.width, position.height);
                                    resolve();
                                };
                                img.onerror = () => reject(new Error(`Failed to load ${trait.name}`));
                                img.src = trait.imageUrl;
                            });
                        } catch (error) {
                            console.warn(`⚠️ Skipping trait ${trait.name}:`, error);
                        }
                    }
                }

                layerData.push({
                    name: node.data.label,
                    parentLayer: node.data.parentLayer,
                    position: position,
                    traits: traits.map((t: any) => ({ name: t.name, hasImage: !!t.imageUrl })),
                    aiPrompt: node.data.aiPrompt
                });
            }

            // Convert canvas to base64
            const compositeImage = canvas.toDataURL('image/png');
            console.log('✅ Composite image created');

            // Step 2: Send to AI for analysis
            const response = await fetch('/api/rearrange', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: projectPrompt,
                    compositeImage: compositeImage,
                    layers: layerData
                })
            });

            if (!response.ok) throw new Error("Failed to rearrange");

            const data = await response.json();
            console.log("Rearrange AI Response:", data);

            // Map the new positions to the nodes
            setNodes((nds) => {
                const updatedNodes = nds.map(node => {
                    const aiLayer = data.layers.find((l: any) => l.name === node.data.label);
                    if (aiLayer) {
                        console.log(`Updating ${node.data.label} position:`, aiLayer.position);
                        return {
                            ...node,
                            data: {
                                ...node.data,
                                position: aiLayer.position
                            }
                        };
                    }
                    return node;
                });

                // Auto-save after update
                handleSaveProject(updatedNodes, edges);
                return updatedNodes;
            });

            console.log("✅ Layers rearranged by AI");
        } catch (error) {
            console.error("❌ Rearrange failed:", error);
        } finally {
            setIsRearranging(false);
        }
    };

    const handleSaveProject = async (currentNodes: Node[], currentEdges: Edge[]) => {
        if (!projectId) return;

        try {
            const layers = currentNodes.map(node => ({
                name: node.data.label,
                traits: node.data.traits,
                description: node.data.description,
                parentLayer: node.data.parentLayer,
                rarity: node.data.rarity,
                position: node.data.position || node.position
            }));

            const response = await fetch(`/api/projects/${projectId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ layers })
            });

            if (!response.ok) throw new Error("Failed to save project");
            console.log("✅ Project saved successfully");
        } catch (error) {
            console.error("❌ Failed to save project:", error);
        }
    };

    const handleAddChild = (parentNodeId: string) => {
        const parentNode = nodes.find(n => n.id === parentNodeId);
        if (!parentNode) return;

        const newNodeId = `layer-${Date.now()}`;
        // Position to the right and slightly down to avoid direct overlap if usually grid based
        const newPosition = { x: parentNode.position.x + 350, y: parentNode.position.y };

        const newNode: Node = {
            id: newNodeId,
            type: 'customLayer',
            position: newPosition,
            data: {
                label: 'New Layer',
                traits: [],
                parentLayer: parentNode.data.label,
                rarity: 100,
                position: { x: 0, y: 0, width: 1024, height: 1024 }
            }
        };

        const newEdge: Edge = {
            id: `e-${parentNodeId}-${newNodeId}`,
            source: parentNodeId,
            target: newNodeId,
            animated: true,
            style: { stroke: '#00F5FF' }
        };

        const updatedNodes = [...nodes, newNode];
        const updatedEdges = [...edges, newEdge];

        setNodes(updatedNodes);
        setEdges(updatedEdges);
        handleSaveProject(updatedNodes, updatedEdges);
    };

    const handleSaveSettings = (updatedData: any) => {
        // Update the node data and edges in a single pass if possible, or trigger sequentially correctly
        setNodes((nds) => {
            const newNodes = nds.map(node => {
                if (node.id === selectedNodeId) {
                    return {
                        ...node,
                        // Keep the graph position as is, or use node.position if we want to preserve drag
                        position: node.position,
                        data: {
                            ...node.data,
                            label: updatedData.label,
                            description: updatedData.description,
                            position: updatedData.position, // This is the 1024x1024 metadata from the modal
                            rarity: updatedData.rarity,
                            traits: updatedData.traits,
                            parentLayer: updatedData.parentLayer
                        }
                    };
                }
                return node;
            });

            // Calculate new edges based on the updated nodes
            const newEdges: Edge[] = [];
            newNodes.forEach((node) => {
                const nodeData = node.data;
                if (nodeData.parentLayer && nodeData.parentLayer !== '') {
                    const parentNode = newNodes.find(n => n.data.label === nodeData.parentLayer);
                    if (parentNode) {
                        newEdges.push({
                            id: `e-${parentNode.id}-${node.id}`,
                            source: parentNode.id,
                            target: node.id,
                            animated: true,
                            style: { stroke: '#00F5FF' },
                        });
                    }
                }
            });

            setEdges(newEdges);

            // Auto-save to database
            handleSaveProject(newNodes, newEdges);

            return newNodes;
        });

        setIsModalOpen(false);
    };

    const onNodesChange = useCallback(
        (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
        []
    );
    const onEdgesChange = useCallback(
        (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
        []
    );
    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#00F5FF' } }, eds)),
        []
    );

    // Hydrate from DB
    useEffect(() => {
        const fetchProject = async () => {
            if (!projectId) return;

            setIsLoading(true);
            try {
                const response = await fetch(`/api/projects/${projectId}`, {
                    headers: {
                        'x-wallet-address': address || ''
                    }
                });

                if (response.status === 403) {
                    console.error("Unauthorized Access");
                    return;
                }

                if (!response.ok) throw new Error("Failed to load project");

                const data = await response.json();
                console.log("Hydrating project from DB:", data);
                setProjectPrompt(data.prompt || '');

                if (data.layers && Array.isArray(data.layers)) {
                    const newNodes: Node[] = data.layers.map((layer: any, index: number) => {
                        console.log(`🔄 Hydrating layer "${layer.name}":`, {
                            traits: layer.traits,
                            position: layer.position
                        });

                        return {
                            id: `ai-${index}`,
                            type: 'customLayer',
                            // Use AI Position if available, else fallback to HORIZONTAL grid
                            position: layer.position ? { x: layer.position.x, y: layer.position.y } : { x: 50 + (index * 350), y: 250 },
                            data: {
                                label: layer.name,
                                traits: layer.traits, // Pass full traits array
                                description: layer.description,
                                parentLayer: layer.parentLayer, // Store parent layer name
                                rarity: layer.rarity,
                                position: layer.position ? {
                                    x: layer.position.x ?? 0,
                                    y: layer.position.y ?? 0,
                                    width: layer.position.width ?? 1024,
                                    height: layer.position.height ?? 1024
                                } : { x: 0, y: 0, width: 1024, height: 1024 }
                            }
                        };
                    });

                    // Create edges based on parentLayer relationships
                    const newEdges: Edge[] = [];
                    data.layers.forEach((layer: any, index: number) => {
                        if (layer.parentLayer && layer.parentLayer !== '') {
                            // Find the parent node
                            const parentIndex = data.layers.findIndex((l: any) => l.name === layer.parentLayer);
                            if (parentIndex !== -1) {
                                newEdges.push({
                                    id: `e-${parentIndex}-${index}`,
                                    source: `ai-${parentIndex}`,
                                    target: `ai-${index}`,
                                    animated: true,
                                    style: { stroke: '#00F5FF' },
                                });
                            }
                        }
                    });

                    setNodes(newNodes);
                    setEdges(newEdges);
                }
            } catch (e) {
                console.error("Failed to fetch project:", e);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProject();
    }, [projectId, address]);

    // Combinations calculation
    const totalCombinations = nodes.reduce((acc, node) => {
        const traitCount = node.data.traits?.filter((t: any) => t.name && t.name.trim() !== "").length || 0;
        return acc * (traitCount || 1);
    }, 1);

    if (isLoading) {
        return (
            <div className="w-full h-[600px] border border-white/10 rounded-xl bg-black/40 backdrop-blur-xl flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm font-mono text-muted-foreground animate-pulse">Loading Project...</span>
                </div>
            </div>
        );
    }



    const handleSaveCollectionClick = async () => {
        if (!canvasRef.current) return;
        const preview = canvasRef.current.toDataURL('image/png');
        setPreviewToSave(preview);
        setIsSaveModalOpen(true);
    };

    const confirmSaveCollection = async (name: string) => {
        if (!projectId || !previewToSave) return;

        try {
            setIsSavingCollection(true);

            // 1. Save Project Details
            const response = await fetch(`/api/projects/${projectId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    status: 'saved',
                    previewImage: previewToSave
                })
            });

            if (!response.ok) throw new Error("Failed to save collection");

            // 2. Trigger NFT Generation
            console.log("Triggering NFT generation...");
            const genResponse = await fetch(`/api/projects/${projectId}/generate`, {
                method: 'POST'
            });

            if (!genResponse.ok) {
                console.warn("NFT generation failed, but collection saved.");
            } else {
                const genData = await genResponse.json();
                console.log(`✅ Generated ${genData.count} NFTs`);
            }

            // alert("✅ Collection saved successfully! You can view it in the Collections page.");
            setIsSaveModalOpen(false);
        } catch (error) {
            console.error("Failed to save collection:", error);
            // alert("❌ Failed to save collection. Please try again.");
        } finally {
            setIsSavingCollection(false);
        }
    };

    return (
        <>
            <div className="w-full h-[600px] border border-white/10 rounded-xl bg-black/40 backdrop-blur-xl relative overflow-hidden">
                <div className="absolute top-4 left-4 z-10 flex gap-2">
                    <div className="bg-background/80 backdrop-blur-md px-3 py-1.5 rounded-md border border-white/10 text-xs font-mono text-muted-foreground">
                        Canvas Mode: Edit
                    </div>
                </div>

                <ReactFlow
                    nodes={nodes.map(n => ({
                        ...n,
                        data: {
                            ...n.data,
                            onSettings: () => handleSettingsClick(n.id, n.data),
                            onAddChild: () => handleAddChild(n.id)
                        }
                    }))}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    nodeTypes={nodeTypes}
                    fitView
                    className="bg-grid-white/[0.02]"
                >
                    <Background color="#1a1a1a" gap={20} size={1} />
                    <Controls className="react-flow__controls-custom" style={{
                        backgroundColor: '#000',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        padding: '4px',
                        fill: '#fff',
                        color: '#fff'
                    }} />
                    <MiniMap
                        nodeColor="#00F5FF"
                        maskColor="rgba(0, 0, 0, 0.7)"
                        style={{
                            backgroundColor: '#000',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px'
                        }}
                    />
                </ReactFlow>

            </div>

            {/* Combined Preview Section */}
            <div className="mt-8 p-6 bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <ImageIcon className="w-5 h-5 text-primary" />
                            Live Composite Preview
                        </h2>
                        <p className="text-xs text-muted-foreground mt-1 font-mono uppercase tracking-widest">
                            {totalCombinations.toLocaleString()} Possible Combinations
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleSaveCollectionClick}
                            disabled={isSavingCollection}
                            className="flex items-center gap-2 px-6 py-2 bg-primary text-black rounded-lg text-xs font-bold transition-all hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(0,245,255,0.3)] hover:shadow-[0_0_25px_rgba(0,245,255,0.5)] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSavingCollection ? <span className="animate-spin mr-1">⏳</span> : <Sparkles className="w-4 h-4" />}
                            {isSavingCollection ? 'Saving...' : 'Save Collection'}
                        </button>

                        <button
                            onClick={handleRandomizeMix}
                            className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-lg text-primary text-xs font-bold transition-all hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(0,245,255,0.1)]"
                        >
                            <Dices className="w-4 h-4" />
                            Random Mixed
                        </button>
                        <span className="text-xs font-mono text-muted-foreground bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                            {nodes.filter(n => n.data.traits?.some((t: any) => t.imageUrl)).length} Layers in Mix
                        </span>
                    </div>
                </div>

                {/* SVG Filter for Luma Key (White to Transparent) */}
                <svg style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }} aria-hidden="true">
                    <defs>
                        <filter id="luma-key" colorInterpolationFilters="sRGB">
                            {/* 1. Detect White pixels and turn them into Alpha mask */}
                            <feColorMatrix
                                type="matrix"
                                values="
                                    0 0 0 0 1
                                    0 0 0 0 1
                                    0 0 0 0 1
                                    -5 -5 -5 1 14"
                                result="mask"
                            />
                            {/* 2. Use the mask to 'cut' the original image (SourceIn) */}
                            <feComposite in="SourceGraphic" in2="mask" operator="in" />
                        </filter>
                    </defs>
                </svg>

                <div className="flex flex-col md:flex-row gap-10 items-start">
                    {/* Big Picture */}
                    <div className="relative w-80 h-80 bg-white rounded-2xl border-2 border-white/10 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] group">

                        {/* Canvas for Character Assembly */}
                        <canvas
                            ref={canvasRef}
                            className="absolute inset-0 w-full h-full"
                            style={{ imageRendering: 'crisp-edges' }}
                        />

                        {nodes.every(n => !n.data.traits?.some((t: any) => t.imageUrl)) && (
                            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm font-mono px-8 text-center bg-black/40">
                                <div>
                                    <p>Ready to combine</p>
                                    <p className="text-[10px] mt-2 opacity-50">Generate images in the layers above</p>
                                </div>
                            </div>
                        )}

                        <div className="absolute bottom-4 left-4 right-4 bg-black/80 backdrop-blur-md px-3 py-2 rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-[10px] text-primary font-bold uppercase tracking-widest">Composite Order</span>
                            <div className="flex gap-1 mt-1">
                                {nodes.sort((a, b) => getLayerDepth(a, nodes) - getLayerDepth(b, nodes)).map((n, i) => (
                                    <div key={n.id} className="w-2 h-2 rounded-full bg-primary" style={{ opacity: (i + 1) / nodes.length }} />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Layer & Trait Selector */}
                    <div className="flex-1 space-y-4">
                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] mb-4">Mixing Panel</h3>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {nodes.map((node) => {
                                const currentTraitIndex = selectedTraits[node.id] || 0;
                                const hasImages = node.data.traits?.some((t: any) => t.imageUrl);

                                return (
                                    <div key={node.id} className="group p-4 rounded-xl bg-white/5 border border-white/5 hover:border-primary/20 transition-all flex flex-col gap-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] uppercase font-bold text-white tracking-widest group-hover:text-primary transition-colors">
                                                {node.data.label}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground font-mono">
                                                {node.data.traits?.filter((t: any) => t.imageUrl).length || 0} Assets
                                            </span>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            {node.data.traits?.map((trait: any, idx: number) => (
                                                <button
                                                    key={idx}
                                                    disabled={!trait.imageUrl}
                                                    onClick={() => setSelectedTraits(prev => ({ ...prev, [node.id]: idx }))}
                                                    className={cn(
                                                        "relative w-12 h-12 rounded-lg border-2 transition-all overflow-hidden",
                                                        !trait.imageUrl ? "border-transparent opacity-20 cursor-not-allowed" :
                                                            currentTraitIndex === idx ? "border-primary shadow-[0_0_10px_rgba(0,245,255,0.3)] scale-105" :
                                                                "border-white/10 hover:border-white/30"
                                                    )}
                                                >
                                                    {trait.imageUrl && (
                                                        <img src={trait.imageUrl} className="w-full h-full object-cover" />
                                                    )}
                                                    {currentTraitIndex === idx && trait.imageUrl && (
                                                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                                        </div>
                                                    )}
                                                </button>
                                            ))}
                                            {!hasImages && (
                                                <div className="text-[10px] text-white/20 font-mono py-2">No assets generated</div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            <LayerSettingsModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                layerData={selectedLayer}
                onSave={handleSaveSettings}
                availableLayers={nodes.map(n => n.data.label)}
            />

            <SaveCollectionModal
                isOpen={isSaveModalOpen}
                onClose={() => setIsSaveModalOpen(false)}
                onSave={confirmSaveCollection}
                previewImage={previewToSave}
                isSaving={isSavingCollection}
            />
        </>
    );
};
