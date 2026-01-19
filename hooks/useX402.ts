"use client";

import { useSimpleWallet } from "@/components/providers/SimpleWalletProvider";
import { useCallback, useState } from "react";
import { ethers } from "ethers";
import { Facilitator } from "@crypto.com/facilitator-client/dist/lib/client";
import { CronosNetwork, Contract } from "@crypto.com/facilitator-client/dist/integrations/facilitator.interface";

const PAYMENT_RECIPIENT = process.env.NEXT_PUBLIC_PAYMENT_RECIPIENT || "0xab17a7a513c015797c555365511bd2918841fac2cb49553757421cb47eb71110";
const PAYMENT_AMOUNT = "1000000"; // 1.0 USDCe (6 decimals) - Adjust based on requirement

export const useX402 = () => {
    const { signer, address, isConnected, connect } = useSimpleWallet();
    const [isMinting, setIsMinting] = useState(false);

    const mintCollection = useCallback(async (collectionData: any) => {
        if (!isConnected || !signer) {
            console.error("User not connected.");
            connect();
            return { success: false, error: "Please connect wallet" };
        }

        setIsMinting(true);
        console.log("Initiating User Payment via Facilitator...");

        try {
            // 2. Initialize Facilitator
            const facilitator = new Facilitator({
                network: CronosNetwork.CronosTestnet,
            });

            // 3. Generate Payment Header (EIP-3009)
            // The signer from SimpleWalletProvider is an ethers.JsonRpcSigner which supports typed data signing
            const header = await facilitator.generatePaymentHeader({
                to: PAYMENT_RECIPIENT,
                value: PAYMENT_AMOUNT,
                asset: Contract.DevUSDCe, // Use Testnet USDCe
                signer: signer,
            });

            console.log("Payment Header Generated:", header);

            // 4. Send to Backend for Settlement
            const response = await fetch("/api/pay", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    paymentHeader: header,
                    gameId: "manual_mint",
                    agentName: address
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Backend settlement failed");
            }

            console.log("Settlement Complete:", data.txHash);

            return { success: true, paymentHeader: header, txHash: data.txHash };

        } catch (error: any) {
            console.error("Payment failed:", error);
            return { success: false, error: error.message || "Payment failed" };
        } finally {
            setIsMinting(false);
        }
    }, [signer, address, isConnected, connect]);

    return { mintCollection, isMinting };
};
