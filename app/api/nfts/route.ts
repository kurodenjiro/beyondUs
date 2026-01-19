import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const ownerAddress = searchParams.get("ownerAddress");

        if (!ownerAddress) {
            return NextResponse.json({ error: "Owner address is required" }, { status: 400 });
        }

        const nfts = await prisma.nft.findMany({
            where: {
                Project: {
                    ownerAddress: ownerAddress
                }
            },
            include: {
                Project: {
                    select: {
                        name: true,
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return NextResponse.json(nfts);
    } catch (error) {
        console.error("Failed to fetch NFTs:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
