import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get('file');

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        // Mock IPFS Upload
        // In a real app, you would use Pinata or another IPFS provider here.
        // const pinataResult = await pinata.upload(file);

        console.log("Mocking IPFS upload for file:", (file as File).name);

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Return a mock hash and gateway URL
        // Using a placeholder image or the same image as a "hash" for demo purposes
        const mockHash = "QmMockHash" + Math.random().toString(36).substring(7);

        return NextResponse.json({
            success: true,
            ipfsHash: mockHash,
            url: `https://gateway.pinata.cloud/ipfs/${mockHash}`
        });

    } catch (error) {
        console.error("IPFS Upload Error:", error);
        return NextResponse.json({ error: "Failed to upload to IPFS" }, { status: 500 });
    }
}
