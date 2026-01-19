import { createWalletClient, http, parseEther, createPublicClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { cronosTestnet } from "viem/chains";

// Cronos Testnet Configuration
const rpcUrl = "https://evm-t3.cronos.org";

export async function sendServerPayment(recipient: string, amountMove: number) {
    // 1. Get Private Key
    // 1. Get Private Key
    const privateKeyHex = process.env.CRONOS_PRIVATE_KEY;

    if (!privateKeyHex) {
        throw new Error("CRONOS_PRIVATE_KEY is not set");
    }

    if (!privateKeyHex.startsWith("0x")) {
        console.warn("Private key does not start with 0x. Ensure it is a valid EVM private key.");
    }

    // 2. Initialize Account
    const account = privateKeyToAccount(privateKeyHex as `0x${string}`);

    // 3. Initialize Clients
    const client = createWalletClient({
        account,
        chain: cronosTestnet,
        transport: http(rpcUrl)
    });

    const publicClient = createPublicClient({
        chain: cronosTestnet,
        transport: http(rpcUrl)
    });

    console.log(`💸 Server (Cronos) sending ${amountMove} TCRO to ${recipient}...`);

    try {
        // 4. Send Transaction
        const hash = await client.sendTransaction({
            to: recipient as `0x${string}`,
            value: parseEther(amountMove.toString())
        });

        console.log(`⏳ Payment submitted: ${hash}`);

        // 5. Wait for Confirmation
        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        if (receipt.status !== "success") {
            throw new Error(`Transaction failed on-chain: ${hash}`);
        }

        console.log(`✅ Payment confirmed: ${hash}`);
        return hash;

    } catch (error: any) {
        console.error("Server payment (Cronos) failed:", error);
        throw error;
    }
}
