"use client";

import { Button } from "@/components/ui/button";
import { Copy, LogOut, Check, Wallet } from "lucide-react";
import { useSimpleWallet } from "@/components/providers/SimpleWalletProvider";
import { useState } from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const WalletDisplay = () => {
    const { address, isConnected, disconnect } = useSimpleWallet();
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = () => {
        if (address) {
            navigator.clipboard.writeText(address);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        }
    };

    if (!isConnected || !address) return null;

    const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:border-white/20 cursor-pointer transition-all select-none">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-sm font-mono text-white/90">
                        {shortAddress}
                    </span>
                    <Wallet className="w-3 h-3 text-muted-foreground ml-1" />
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-black/90 backdrop-blur border border-white/10 text-white">
                <DropdownMenuLabel>My Wallet</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem onClick={handleCopy} className="cursor-pointer hover:bg-white/10 focus:bg-white/10">
                    {isCopied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                    <span>{isCopied ? "Copied" : "Copy Address"}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem onClick={disconnect} className="cursor-pointer text-red-400 hover:text-red-300 hover:bg-red-900/20 focus:bg-red-900/20 focus:text-red-300">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Disconnect</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
