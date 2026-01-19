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

            <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto custom-scrollbar">
                {data.traits && data.traits.map((trait: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 bg-white/5 p-1.5 rounded border border-white/5 group/trait">
                        {trait.imageUrl ? (
                            <div className="w-8 h-8 shrink-0 rounded-sm overflow-hidden bg-black/50 border border-white/10">
                                <img src={trait.imageUrl} alt={trait.name} className="w-full h-full object-cover" />
                            </div>
                        ) : (
                            <div className="w-8 h-8 shrink-0 rounded-sm bg-white/10 flex items-center justify-center">
                                <span className="text-[8px] text-muted-foreground">AG</span>
                            </div>
                        )}
                        <div className="flex flex-col min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-medium text-gray-300 truncate" title={trait.name}>{trait.name}</span>
                                <span className="text-[9px] font-mono text-primary/80">{trait.rarity}%</span>
                            </div>
                        </div>
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


    // Modal State - Moved to top to avoid Hooks Order Violation

    const [nfts, setNfts] = useState<any[]>([]);

    // Hydrate from DB
    useEffect(() => {
        const fetchProject = async () => {
            if (!projectId) return;

            setIsLoading(true);
            try {
                const response = await fetch(`/api/projects/${projectId}`, {
                    headers: { 'x-wallet-address': address || '' }
                });

                if (response.status === 403) return;
                if (!response.ok) throw new Error("Failed to load project");

                const data = await response.json();
                console.log("Hydrating project:", data);
                setProjectPrompt(data.prompt || '');
                setNfts(data.nfts || []);

                if (data.layers && Array.isArray(data.layers)) {
                    const newNodes: Node[] = data.layers.map((layer: any, index: number) => ({
                        id: `ai-${index}`,
                        type: 'customLayer',
                        position: layer.position ? { x: layer.position.x, y: layer.position.y } : { x: 50 + (index * 350), y: 250 },
                        data: {
                            label: layer.name,
                            traits: layer.traits,
                            description: layer.description,
                            parentLayer: layer.parentLayer,
                            rarity: layer.rarity,
                            position: layer.position || { x: 0, y: 0, width: 1024, height: 1024 }
                        }
                    }));

                    const newEdges: Edge[] = [];
                    data.layers.forEach((layer: any, index: number) => {
                        if (layer.parentLayer && layer.parentLayer !== '') {
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

    // Calculate Layer Depth for proper stacking
    const getLayerDepth = (node: Node, allNodes: Node[]): number => {
        if (!node.data.parentLayer || node.data.parentLayer === '') return 0;
        const parent = allNodes.find(n => n.data.label === node.data.parentLayer);
        // Avoid infinite loops and self-referencing
        if (!parent || parent.id === node.id) return 0;
        return 1 + getLayerDepth(parent, allNodes);
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



    const handleSaveCollectionClick = async () => { };
    const confirmSaveCollection = async () => { };


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

            {/* Generated Collection Section */}
            <div className="mt-8 p-6 bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <ImageIcon className="w-5 h-5 text-primary" />
                            Generated Collection
                        </h2>
                        <p className="text-xs text-muted-foreground mt-1 font-mono uppercase tracking-widest">
                            {nfts.length} Items
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {nfts.map((nft) => (
                        <div key={nft.id} className="group relative rounded-lg overflow-hidden border border-white/10 hover:border-primary transition-all">
                            <img src={nft.image} alt={nft.name} className="w-full h-auto aspect-square object-cover" />
                            <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-md p-2 translate-y-full group-hover:translate-y-0 transition-transform">
                                <p className="text-xs font-bold text-white">{nft.name}</p>
                                <p className="text-[10px] text-muted-foreground">{nft.description}</p>
                            </div>
                        </div>
                    ))}
                    {nfts.length === 0 && (
                        <div className="col-span-full py-12 text-center text-muted-foreground">
                            No NFTs generated yet.
                        </div>
                    )}
                </div>

                {/* SVG Filter for Luma Key (White to Transparent) */}
                <svg style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }} aria-hidden="true">
                    <defs>
                        <filter id="luma-key" colorInterpolationFilters="sRGB">
                            <feColorMatrix
                                type="matrix"
                                values="
                                    0 0 0 0 1
                                    0 0 0 0 1
                                    0 0 0 0 1
                                    -5 -5 -5 1 14"
                                result="mask"
                            />
                            <feComposite in="SourceGraphic" in2="mask" operator="in" />
                        </filter>
                    </defs>
                </svg>

                <LayerSettingsModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    layerData={selectedLayer}
                    onSave={handleSaveSettings}
                    availableLayers={nodes.map(n => n.data.label)}
                />
            </div>
        </>
    );
};
