"use client";

import Link from "next/link";
import { useSimpleWallet } from "@/components/providers/SimpleWalletProvider";
import { Button } from "@/components/ui/button";
import { WalletDisplay } from "@/components/wallet/WalletDisplay";

export function Navbar() {
    const { connect, isConnected } = useSimpleWallet();

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/50 backdrop-blur-xl">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                <Link href="/" className="font-bold text-xl tracking-tighter hover:opacity-80 transition-opacity">
                    BEYOND<span className="text-white/50">US</span>
                </Link>

                <div className="flex items-center gap-6">
                    <Link href="/collections" className="text-sm text-white/70 hover:text-white transition-colors hidden md:block">
                        Collections
                    </Link>
                    <Link href="/my-nfts" className="text-sm text-white/70 hover:text-white transition-colors hidden md:block">
                        My NFTs
                    </Link>

                    {isConnected ? (
                        <WalletDisplay />
                    ) : (
                        <Button
                            onClick={() => connect()}
                            className="h-9 px-6 bg-white text-black hover:bg-white/90 font-medium text-xs tracking-wider"
                        >
                            CONNECT WALLET
                        </Button>
                    )}
                </div>
            </div>
        </nav>
    );
}
