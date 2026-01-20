import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Facilitator } from "@crypto.com/facilitator-client/dist/lib/client";
import { CronosNetwork, Contract } from "@crypto.com/facilitator-client/dist/integrations/facilitator.interface";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { paymentHeader, gameId, agentName } = body;

        if (!paymentHeader) {
            return NextResponse.json({ error: "Missing payment header" }, { status: 400 });
        }

        console.log(`Verifying Payment Header...`);

        // Initialize Facilitator (Server-Side)
        // Note: For settlement, we don't strictly need a signer if the facilitator API handles the relay,
        // but the SDK structure implies we might simply relay the signed header to the API.
        // The SDK performs Verify/Settle against the remote API.
        const facilitator = new Facilitator({
            network: CronosNetwork.CronosTestnet,
        });

        // Construct Requirements (Must match what client agreed to)
        const recipient = process.env.NEXT_PUBLIC_PAYMENT_RECIPIENT || "0xab17a7a513c015797c555365511bd2918841fac2cb49553757421cb47eb71110";
        const amount = "1000000"; // 1.0 USDCe

        const requirements = facilitator.generatePaymentRequirements({
            payTo: recipient,
            asset: Contract.DevUSDCe,
            maxAmountRequired: amount,
            description: "Agent Payment"
        });

        const verifyRequest = facilitator.buildVerifyRequest(paymentHeader, requirements);

        // 1. Verify
        const verifyRes = await facilitator.verifyPayment(verifyRequest);
        if (!verifyRes.isValid) {
            console.error("Verification failed:", verifyRes.invalidReason);
            return NextResponse.json({ error: "Payment verification failed", reason: verifyRes.invalidReason }, { status: 400 });
        }

        // 2. Settle
        console.log("Settling Payment...");
        const settleRes = await facilitator.settlePayment(verifyRequest);

        if (!settleRes.txHash) {
            console.error("Settlement failed, no hash returned:", settleRes.error);
            return NextResponse.json({ error: "Payment settlement failed", details: settleRes }, { status: 500 });
        }

        console.log(`✅ Payment Settled: ${settleRes.txHash}`);

        // 3. Store in DB
        // Determine from/to from payload if possible, or use API data
        // For now, we use the header data if we decode it, or just logs.
        // Settle response has 'from' and 'to'.

        const txRecord = await prisma.x402_transactions.create({
            data: {
                game_id: gameId || "unknown_game",
                from_agent: settleRes.from || agentName || "unknown_agent",
                to_agent: "platform", // or recipient
                amount_chips: 0, // This is a real payment, maybe map to chips?
                amount_sol: 0, // Using Decimal for SOL, maybe 0 for now as it's USDCe
                transaction_signature: settleRes.txHash,
                status: "success",
                // Additional fields if needed
            }
        });

        return NextResponse.json({
            success: true,
            txHash: settleRes.txHash,
            dbId: txRecord.id
        });

    } catch (error: any) {
        console.error("Payment API Error:", error);

        // Handle specific EVM errors
        const errorMessage = error.message || "";
        if (errorMessage.includes("transfer amount exceeds balance") || errorMessage.includes("insufficient funds")) {
            return NextResponse.json({ error: "Insufficient USDCe balance for payment" }, { status: 400 });
        }

        return NextResponse.json({ error: errorMessage || "Server Error" }, { status: 500 });
    }
}
