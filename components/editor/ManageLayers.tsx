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
import { Settings, Image as ImageIcon, Trash2, Dices, Move, Sparkles, Plus, CheckCircle } from 'lucide-react';

// Custom Node Component
const CustomLayerNode = ({ data }: { data: { label: string, traits: any[], selectedTrait?: any, onTraitSelect: (trait: any) => void, onSettings: () => void, onAddChild: () => void } }) => {
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
                {data.traits && data.traits.map((trait: any, i: number) => {
                    const isSelected = data.selectedTrait?.name === trait.name;
                    return (
                        <div
                            key={i}
                            onClick={(e) => { e.stopPropagation(); data.onTraitSelect(trait); }}
                            className={cn(
                                "flex items-center gap-2 p-1.5 rounded border transition-all cursor-pointer group/trait",
                                isSelected ? "bg-primary/20 border-primary" : "bg-white/5 border-white/5 hover:bg-white/10"
                            )}
                        >
                            {trait.imageUrl ? (
                                <div className="w-8 h-8 shrink-0 rounded-sm overflow-hidden bg-black/50 border border-white/10 relative">
                                    <img src={trait.imageUrl} alt={trait.name} className="w-full h-full object-cover" />
                                    {isSelected && <div className="absolute inset-0 bg-primary/30 flex items-center justify-center"><Sparkles className="w-4 h-4 text-white" /></div>}
                                </div>
                            ) : (
                                <div className="w-8 h-8 shrink-0 rounded-sm bg-white/10 flex items-center justify-center">
                                    <span className="text-[8px] text-muted-foreground">AG</span>
                                </div>
                            )}
                            <div className="flex flex-col min-w-0 flex-1">
                                <div className="flex items-center justify-between">
                                    <span className={cn("text-[10px] font-medium truncate", isSelected ? "text-primary" : "text-gray-300")} title={trait.name}>{trait.name}</span>
                                    <span className="text-[9px] font-mono text-muted-foreground">{trait.rarity}%</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
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

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

import { LayerSettingsModal } from './LayerSettingsModal';
import { useSimpleWallet } from '@/components/providers/SimpleWalletProvider';
import { useUsBeyond } from '@/hooks/useUsBeyond';

export const ManageLayers = () => {
    const { address } = useSimpleWallet();
    const { createCollection } = useUsBeyond();
    const searchParams = useSearchParams();
    const projectId = searchParams.get('id');
    const [nodes, setNodes] = useState<Node[]>(initialNodes);
    const [edges, setEdges] = useState<Edge[]>(initialEdges);
    const [projectPrompt, setProjectPrompt] = useState<string>('');
    const [projectName, setProjectName] = useState<string>('');

    const [contractAddress, setContractAddress] = useState<string | null>(null);
    const [isDeploying, setIsDeploying] = useState(false);

    // Restored missing state variables
    const [nfts, setNfts] = useState<any[]>([]);
    const [selectedTraits, setSelectedTraits] = useState<Record<string, any>>({});
    const [isManualSelection, setIsManualSelection] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [existingNFT, setExistingNFT] = useState<any | null>(null);
    const [isSavingNFT, setIsSavingNFT] = useState(false);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [selectedLayer, setSelectedLayer] = useState<any>(null);

    // ... (existing helper functions)

    // Hydrate from DB


    // ...

    const handleDeploy = async () => {
        if (!projectId) return;
        setIsDeploying(true);
        try {
            // 1. Deploy to Blockchain
            // Generate symbol from name (First 3-4 chars, uppercase, no spaces)
            const symbol = (projectName || "NFT").replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase() || "NFT";

            const deployment = await createCollection(projectName || "My Collection", symbol);
            if (!deployment || !deployment.address) throw new Error("Deployment failed");

            console.log("✅ Deployed at:", deployment.address);

            // 2. Update Database
            const response = await fetch(`/api/projects/${projectId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contractAddress: deployment.address,
                    status: 'published'
                })
            });

            if (!response.ok) throw new Error("Failed to update project");

            setContractAddress(deployment.address);
            alert("Collection published successfully!");
        } catch (error) {
            console.error("Deploy failed:", error);
            alert("Failed to deploy collection. Check console.");
        } finally {
            setIsDeploying(false);
        }
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

    // Handle Trait Selection
    const handleTraitSelect = useCallback((layerName: string, trait: any) => {
        // Clear manual selection flag when user manually changes traits
        setIsManualSelection(false);

        setSelectedTraits(prev => {
            const newState = { ...prev };
            // Always set the trait, don't toggle off
            newState[layerName] = trait;
            return newState;
        });
    }, []);

    // Live Preview Effect
    useEffect(() => {
        const updatePreview = async () => {
            // Find existing NFT match first
            const allSelectedTraits = Object.values(selectedTraits).map((t: any) => t.name);

            // Exclude Body layer from matching (it's the base, not stored in NFT attributes)
            const selectedTraitNames = allSelectedTraits.filter(name =>
                !name.toLowerCase().includes('base character') &&
                !name.toLowerCase().includes('body')
            );

            console.log("🔍 Preview Update - Selected traits (excluding body):", selectedTraitNames);
            console.log("🔍 Total NFTs:", nfts.length, "| isManualSelection:", isManualSelection);

            if (selectedTraitNames.length === 0) {
                // Reset to base image if nothing selected
                const baseNode = nodes.find(n => n.data.label.toLowerCase() === "body");
                if (baseNode && baseNode.data.traits[0]) {
                    setPreviewImage(baseNode.data.traits[0].imageUrl);
                }
                setExistingNFT(null);
                return;
            }

            // Improved exact match logic - check both directions
            const matchedNFT = nfts.find(nft => {
                if (!nft.attributes || !Array.isArray(nft.attributes)) return false;

                const nftTraitValues = nft.attributes.map((a: any) => a.value);

                console.log(`  Checking "${nft.name}": [${nftTraitValues.join(", ")}]`);

                // Check if all selected traits are in this NFT AND
                // all NFT traits are in selected traits (exact match both ways)
                const allSelectedInNFT = selectedTraitNames.every(name => nftTraitValues.includes(name));
                const allNFTInSelected = nftTraitValues.every((value: any) => selectedTraitNames.includes(value));

                return allSelectedInNFT && allNFTInSelected;
            });

            if (matchedNFT) {
                console.log("✅ Found exact NFT match:", matchedNFT.name);
                setPreviewImage(matchedNFT.image);
                setExistingNFT(matchedNFT);
                setIsManualSelection(false); // Clear manual flag when we find a match
                return;
            } else {
                console.log("❌ No exact match found");
                setExistingNFT(null);

                // Don't auto-generate, just clear the preview
                if (!isManualSelection) {
                    setPreviewImage(null);
                }
            }
        };

        // Debounce slightly
        const timer = setTimeout(() => {
            if (nfts.length > 0 && nodes.length > 0) {
                updatePreview();
            }
        }, 800);

        return () => clearTimeout(timer);
    }, [selectedTraits, nfts, nodes]);


    // Hydrate from DB with Auto-Layout
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
                setProjectName(data.name || 'My Collection');
                setNfts(data.nfts || []);
                setContractAddress(data.contractAddress || null); // Set contract address

                // Set initial preview if NFTs exist (show first one)
                if (data.nfts && data.nfts.length > 0) {
                    setPreviewImage(data.nfts[0].image);
                }

                if (data.layers && Array.isArray(data.layers)) {
                    // 1. Convert to Graph Nodes first (without positions)
                    const rawNodes = data.layers.map((layer: any, index: number) => ({
                        id: `ai-${index}`,
                        name: layer.name,
                        parentLayer: layer.parentLayer,
                        params: layer
                    }));

                    // 2. Build Hierarchy Tree
                    const buildTree = (nodes: any[]) => {
                        const nodeMap = new Map(nodes.map(n => [n.name, { ...n, children: [] }]));
                        const roots: any[] = [];

                        nodes.forEach(node => {
                            if (!node.parentLayer || node.parentLayer === "") {
                                roots.push(nodeMap.get(node.name));
                            } else {
                                const parent = nodeMap.get(node.parentLayer);
                                if (parent) {
                                    parent.children.push(nodeMap.get(node.name));
                                } else {
                                    // Fallback for orphan nodes
                                    roots.push(nodeMap.get(node.name));
                                }
                            }
                        });
                        return roots;
                    };

                    const treeRoots = buildTree(rawNodes);

                    // 3. Calculate Layout Recursive
                    const calculatedNodes: Node[] = [];
                    // Spacing constants
                    const X_GAP = 400;
                    const Y_GAP = 300;

                    const traverse = (node: any, depth: number, startY: number): number => {
                        // Calculate total height of this subtree to center parent
                        let childTotalHeight = 0;

                        if (node.children.length === 0) {
                            childTotalHeight = Y_GAP;
                        } else {
                            node.children.forEach((child: any) => {
                                // Accumulate height from children subtrees
                                // We need to dry-run or calculate height first. 
                                // Simple approach: just stack children equally
                            });
                        }

                        // Second pass approach:
                        // Just assign Y based on cumulative sibling index for now, simpler
                        return 0;
                    }

                    // Simpler Tree Layout:
                    // Just count global Y index for leaf placement, or simple recursive stack
                    let globalY = 100;

                    const layoutNode = (node: any, x: number, yOffset: number, visited: Set<string>) => {
                        const myY = yOffset;

                        // Cycle detection
                        if (visited.has(node.id || node.name)) {
                            console.warn("Cycle detected in layer hierarchy:", node.name);
                            return;
                        }
                        visited.add(node.id || node.name);

                        // Push React Node
                        calculatedNodes.push({
                            id: node.id,
                            type: 'customLayer',
                            position: { x: x, y: myY },
                            data: {
                                label: node.params.name,
                                traits: node.params.traits,
                                description: node.params.description,
                                parentLayer: node.params.parentLayer,
                                rarity: node.params.rarity,
                                position: node.params.position || { x: 0, y: 0, width: 1024, height: 1024 }
                            }
                        });

                        // Layout Children
                        if (node.children.length > 0) {
                            // Center children vertically relative to parent if possible,
                            // OR just stack them to the right

                            // Calculate child block height
                            // This simple logic stacks children centered around parent Y
                            const effectiveHeight = Math.max(node.children.length * Y_GAP, Y_GAP);
                            let startChildY = myY - (effectiveHeight / 2) + (Y_GAP / 2);

                            node.children.forEach((child: any, i: number) => {
                                // Create a new set for the branch to avoid false positives in siblings if using path-based, 
                                // BUT for tree layout we just need to avoid cycles, so shared set is okay if we are strictly tree.
                                // Actually, for pure tree conversion, any revisit is a cycle.
                                layoutNode(child, x + X_GAP, startChildY + (i * Y_GAP), new Set(visited));
                            });
                        }
                    };

                    // Execute Layout
                    let rootY = 300;
                    treeRoots.forEach((root, i) => {
                        // Spacing between separate trees (like logical islands)
                        layoutNode(root, 100, rootY + (i * 600), new Set());
                    });


                    // Create edges
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
                                    type: 'smoothstep' // Better for tree layout
                                });
                            }
                        }
                    });

                    setNodes(calculatedNodes);
                    setEdges(newEdges);

                    // Auto-select first trait from each layer as default
                    const defaultTraits: Record<string, any> = {};
                    calculatedNodes.forEach(node => {
                        if (node.data.traits && node.data.traits.length > 0) {
                            // Select the first trait as default
                            defaultTraits[node.data.label] = node.data.traits[0];
                        }
                    });
                    setSelectedTraits(defaultTraits);
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
    const handleSettingsClick = (nodeId: string, nodeData: any) => {
        setSelectedNodeId(nodeId);
        // Map node data back to the format expected by the modal
        setSelectedLayer({
            label: nodeData.label,
            traits: nodeData.traits,
            description: nodeData.description,
            parentLayer: nodeData.parentLayer,
            rarity: nodeData.rarity,
            position: nodeData.position
        });
        setIsModalOpen(true);
    };

    const handleGenerateAndSave = async () => {
        console.log("🎨 Generate & Save clicked!");
        console.log("  - projectId:", projectId);
        console.log("  - selectedTraits:", selectedTraits);

        if (!projectId || Object.keys(selectedTraits).length === 0) {
            console.warn("⚠️ Cannot save: missing projectId or no traits selected");
            return;
        }

        setIsSavingNFT(true);
        setIsPreviewLoading(true);

        try {
            console.log("📸 Step 1: Generating NFT image...");
            // 1. Generate the NFT image
            const baseNode = nodes.find(n => n.data.label.toLowerCase() === "body");
            const baseImage = selectedTraits[baseNode?.data.label]?.imageUrl || baseNode?.data.traits[0]?.imageUrl;

            const traitsForGeneration = Object.keys(selectedTraits)
                .filter(layer => layer.toLowerCase() !== 'body')
                .map(layer => {
                    const trait = selectedTraits[layer];
                    return {
                        id: trait.id, // Send ID if available
                        category: layer,
                        // Only send imageData if we don't have an ID
                        // Or maybe send it anyway if it's small? 
                        // To solve 413, we MUST NOT send it if we have ID.
                        imageData: trait.id ? undefined : trait.imageUrl
                    };
                });

            console.log("  - Base image:", baseImage?.substring(0, 50) + "...");
            console.log("  - Traits to composite:", traitsForGeneration.length);

            const response = await fetch('/api/preview-nft', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId, // Add projectId context
                    baseImage,
                    traits: traitsForGeneration
                })
            });

            const data = await response.json();
            console.log("  - Generation response:", data.success ? "✅ Success" : "❌ Failed");

            if (!data.success) throw new Error("Failed to generate NFT");

            let savedNFT: any;

            if (existingNFT) {
                console.log("♻️ Step 2: Regenerating - Updating existing NFT...");
                // UPDATE existing NFT
                const updateResponse = await fetch(`/api/projects/${projectId}/nfts`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        nftId: existingNFT.id,
                        image: data.image
                    })
                });

                if (!updateResponse.ok) throw new Error("Failed to update NFT");
                savedNFT = await updateResponse.json();
                console.log("✅ NFT updated successfully!", savedNFT);

                // Update local state: replace the old NFT with the new one
                setNfts(prev => prev.map(n => n.id === savedNFT.id ? savedNFT : n));

            } else {
                console.log("💾 Step 2: Saving new NFT to database...");
                // CREATE new NFT
                const attributes = Object.keys(selectedTraits)
                    .filter(layer => layer.toLowerCase() !== 'body')
                    .map(layer => ({
                        trait_type: layer,
                        value: selectedTraits[layer].name
                    }));

                const saveResponse = await fetch(`/api/projects/${projectId}/nfts`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        image: data.image,
                        attributes
                    })
                });

                if (!saveResponse.ok) throw new Error("Failed to save NFT");
                savedNFT = await saveResponse.json();
                console.log("✅ NFT saved successfully!", savedNFT);

                // Add to local state
                setNfts(prev => [...prev, savedNFT]);
            }

            // Update preview and existing reference
            setPreviewImage(savedNFT.image);
            setExistingNFT(savedNFT);

            console.log("🎉 Generate/Update complete!");
        } catch (error) {
            console.error("❌ Failed to process NFT:", error);
        } finally {
            setIsSavingNFT(false);
            setIsPreviewLoading(false);
        }
    };

    const handleCollectionClick = (nft: any) => {
        console.log("🖼️ Collection NFT clicked:", nft);

        // Set manual selection flag to prevent auto-update override
        setIsManualSelection(true);

        // Set preview image
        setPreviewImage(nft.image);

        // Auto-populate selectedTraits from NFT attributes
        const newSelectedTraits: Record<string, any> = {};

        if (nft.attributes && Array.isArray(nft.attributes)) {
            console.log("📋 NFT attributes:", nft.attributes);

            nft.attributes.forEach((attr: any) => {
                const layerName = attr.trait_type;
                const traitValue = attr.value;

                console.log(`🔍 Looking for layer "${layerName}" with trait "${traitValue}"`);

                // Find the matching node (case-insensitive)
                const node = nodes.find(n => n.data.label.toLowerCase() === layerName.toLowerCase());
                if (node) {
                    console.log(`✅ Found layer node:`, node.data.label);
                    const trait = node.data.traits.find((t: any) => t.name === traitValue);
                    if (trait) {
                        console.log(`✅ Found matching trait:`, trait.name);
                        newSelectedTraits[node.data.label] = trait; // Use actual node label (capitalized)
                    } else {
                        console.warn(`❌ Trait "${traitValue}" not found in layer "${layerName}"`);
                    }
                } else {
                    console.warn(`❌ Layer "${layerName}" not found in nodes`);
                }
            });

            // Ensure Body layer is always selected (fallback if not in attributes)
            const bodyNode = nodes.find(n => n.data.label.toLowerCase() === 'body');
            if (bodyNode && !newSelectedTraits[bodyNode.data.label]) {
                if (bodyNode.data.traits && bodyNode.data.traits.length > 0) {
                    console.log("⚠️ Body layer not in NFT attributes, using first trait as fallback");
                    newSelectedTraits[bodyNode.data.label] = bodyNode.data.traits[0];
                }
            }

            console.log("🎯 Final selected traits:", newSelectedTraits);
            setSelectedTraits(newSelectedTraits);
        } else {
            console.warn("⚠️ NFT has no attributes array");
        }
    };

    const handleSaveCollectionClick = async () => { };
    const confirmSaveCollection = async () => { };





    return (
        <div className="flex gap-6 h-screen">
            {/* Left: Node Graph (takes most space) */}
            <div className="flex-1 border border-white/10 rounded-xl bg-black/40 backdrop-blur-xl relative overflow-hidden flex flex-col">
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
                    <div className="flex items-center gap-2">
                        <div className="bg-background/80 backdrop-blur-md px-3 py-1.5 rounded-md border border-white/10 text-xs font-mono text-muted-foreground uppercase">
                            Node Graph
                        </div>
                    </div>
                </div>

                <div className="flex-1 w-full h-full">
                    <ReactFlow
                        nodes={nodes.map(n => ({
                            ...n,
                            data: {
                                ...n.data,
                                selectedTrait: selectedTraits[n.data.label],
                                onTraitSelect: (t: any) => handleTraitSelect(n.data.label, t),
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
            </div>

            {/* Right: Live Preview & Collection */}
            <div className="w-[400px] flex flex-col gap-6">
                {/* Live Preview Panel */}
                <div className="flex-1 bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            <ImageIcon className="w-4 h-4 text-primary" />
                            Live Preview
                        </h3>
                        <div className="flex items-center gap-2">
                            {isPreviewLoading && <div className="text-[10px] text-primary animate-pulse font-mono mr-2">GENERATING...</div>}

                            {!contractAddress ? (
                                <button
                                    onClick={handleDeploy}
                                    disabled={isDeploying}
                                    className="text-xs bg-secondary text-black px-3 py-1.5 rounded-md font-bold hover:bg-secondary/80 disabled:opacity-50 transition-colors flex items-center gap-2"
                                >
                                    {isDeploying ? <div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" /> : null}
                                    {isDeploying ? "Deploying..." : "Deploy to Testnet"}
                                </button>
                            ) : (
                                <div className="px-3 py-1.5 rounded-md bg-green-500/20 border border-green-500/50 text-green-400 text-xs font-bold flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3" />
                                    Deployed
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 bg-black/20 relative flex items-center justify-center p-4 overflow-y-auto">
                        {previewImage ? (
                            <img
                                src={previewImage}
                                alt="Live Preview"
                                className={cn("w-full h-full object-contain rounded-lg shadow-2xl transition-all", isPreviewLoading ? "opacity-50 blur-[2px]" : "opacity-100")}
                            />
                        ) : (
                            <div className="text-center text-muted-foreground">
                                <div className="text-4xl mb-2">🔍</div>
                                <div className="text-sm font-medium">No NFT Found</div>
                                <div className="text-xs mt-1">Click "Generate & Save" to create</div>
                            </div>
                        )}
                    </div>

                    {/* Generate & Save / Regenerate Button */}
                    {Object.keys(selectedTraits).length > 0 && (
                        <div className="p-4 border-t border-white/10 bg-black/20">
                            <button
                                onClick={handleGenerateAndSave}
                                disabled={isSavingNFT}
                                className={cn(
                                    "w-full py-2 px-4 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2",
                                    isSavingNFT
                                        ? "bg-primary/50 cursor-not-allowed"
                                        : "bg-primary text-black hover:bg-primary/80 hover:shadow-[0_0_15px_rgba(0,245,255,0.5)]"
                                )}
                            >
                                {isSavingNFT ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                        {existingNFT ? "Regenerating..." : "Generating..."}
                                    </>
                                ) : (
                                    <>
                                        {existingNFT ? <Sparkles className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                                        {existingNFT ? "Regenerate Variant" : "Generate & Save"}
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>

                {/* Collection Panel */}
                <div className="flex-1 bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            <Dices className="w-4 h-4 text-primary" />
                            Collection ({nfts.length})
                        </h3>
                    </div>
                    <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
                        <div className="grid grid-cols-3 gap-2">
                            {nfts.map((nft) => (
                                <div
                                    key={nft.id}
                                    onClick={() => handleCollectionClick(nft)}
                                    className="aspect-square rounded border border-white/10 overflow-hidden cursor-pointer hover:border-primary transition-all relative group"
                                >
                                    <img src={nft.image} alt={nft.name} className="w-full h-full object-cover" />
                                </div>
                            ))}
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
        </div>
    );
};
