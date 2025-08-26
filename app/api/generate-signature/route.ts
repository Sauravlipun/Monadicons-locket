import { NextRequest, NextResponse } from "next/server";
import { createThirdwebClient, getContract } from "thirdweb";
import { upload } from "thirdweb/storage"; // v5 storage import
import { ethers } from "ethers";

const client = createThirdwebClient({ clientId: process.env.THIRDWEB_CLIENT_ID! });

// Define Monad Testnet for v5
const monadTestnet = {
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: {
    name: "MON",
    symbol: "MON",
    decimals: 18,
  },
  rpc: ["https://testnet-rpc.monad.xyz"],
};

function generateSvg(profilePic: string) {
  return `
    <svg width="400" height="400" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <path id="diamond" d="M200 20 L380 200 L200 380 L20 200 Z" fill="none" stroke="#836EF9" stroke-width="10"/>
      <clipPath id="clip">
        <use xlink:href="#diamond"/>
      </clipPath>
      <image xlink:href="${profilePic}" width="400" height="400" preserveAspectRatio="xMidYMid slice" clip-path="url(#clip)" />
    </svg>
  `;
}

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");
  const handle = req.nextUrl.searchParams.get("handle")?.replace(/^@/, "");
  if (!wallet || !handle) {
    return NextResponse.json({ error: "Missing wallet or handle" }, { status: 400 });
  }

  try {
    const provider = new ethers.JsonRpcProvider(monadTestnet.rpc[0]);
    const count = await provider.getTransactionCount(wallet);
    if (count < 5000) {
      return NextResponse.json({ error: "Not eligible" }, { status: 403 });
    }

    const contract = getContract({
      address: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!,
      chain: monadTestnet,
      client,
    });

    // Check balance for 1 NFT per wallet
    const balance = await contract.erc721.balanceOf(wallet);
    if (balance > BigInt(0)) {
      return NextResponse.json({ error: "Already claimed 1 NFT" }, { status: 403 });
    }

    const picRes = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || "https://monadicons-locket.vercel.app"}/api/get-profile-pic?handle=@${handle}`);
    if (!picRes.ok) {
      return NextResponse.json({ error: "Invalid handle" }, { status: 400 });
    }
    const { url: profilePic } = await picRes.json();

    // Upload SVG image to IPFS via v5 storage
    const svg = generateSvg(profilePic);
    const imageUri = await upload({ data: svg });

    // Upload metadata to IPFS
    const metadata = {
      name: `Monad Soulbound NFT for @${handle}`,
      description: "Soulbound NFT with your X profile embedded in the official Monad diamond locket.",
      image: imageUri,
    };
    const metadataUri = await upload({ data: metadata });

    // Generate signature payload (v5 compatible)
    const payload = await contract.erc721.signature.createMintPayload({
      metadata: metadataUri,
      to: wallet,
      quantity: 1, // 1 NFT
    });

    // Sign the payload (requires admin wallet integration; use private key for signing)
    const signature = await contract.erc721.signature.sign(payload, { privateKey: process.env.ADMIN_PRIVATE_KEY! });

    return NextResponse.json({ payload, signature });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
