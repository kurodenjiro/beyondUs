import { NextResponse } from "next/server";
import { sendServerPayment } from "@/lib/server-wallet";

export async function GET() {
    try {
        const recipient = process.env.NEXT_PUBLIC_PAYMENT_RECIPIENT;
        if (!recipient) {
            return NextResponse.json({ error: "No recipient configured" }, { status: 400 });
        }

        console.log("🧪 Starting Manual Wallet Test...");
        // Send a tiny amount for testing
        const txHash = await sendServerPayment(recipient, 0.01);

        return NextResponse.json({
            success: true,
            message: "Test Payment Successful",
            txHash
        });

    } catch (error: any) {
        console.error("Test failed:", error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
