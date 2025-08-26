"use client";

import { createThirdwebClient, getContract } from "thirdweb";
import { ConnectButton, WalletButton } from "@thirdweb-dev/react";
import { useActiveWallet } from "@thirdweb-dev/react/somewhere"; // Adjust if needed for v5 wallet hook
import { createWallet, inAppWallet } from "thirdweb/wallets"; // Example; use actual v5 wallet imports
import { ethers } from "ethers";
import { useState } from "react";

const client = createThirdwebClient({ clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID });

// Define Monad Testnet chain for v5
const monadTestnet = {
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: {
    name: "MON",
    symbol: "MON",
    decimals: 18,
  },
  rpc: ["https://testnet-rpc.monad.xyz"],
  explorers: [
    {
      name: "Monad Explorer",
      url: "https://testnet.monadexplorer.com",
      standard: "EIP3091",
    },
  ],
};

function generateSvgPreview(profilePic: string) {
  return `data:image/svg+xml;base64,${btoa(`
    <svg width="400" height="400" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <path id="diamond" d="M200 20 L380 200 L200 380 L20 200 Z" fill="none" stroke="#836EF9" stroke-width="10"/>
      <clipPath id="clip">
        <use xlink:href="#diamond"/>
      </clipPath>
      <image xlink:href="${profilePic}" width="400" height="400" preserveAspectRatio="xMidYMid slice" clip-path="url(#clip)" />
    </svg>
  `)}`;
}

export default function Home() {
  const [wallet, setWallet] = useState("");
  const [eligible, setEligible] = useState(false);
  const [handle, setHandle] = useState("");
  const [profilePic, setProfilePic] = useState("");
  const [preview, setPreview] = useState("");
  const [txHash, setTxHash] = useState("");
  const [tokenId, setTokenId] = useState("");

  // Active wallet hook for v5
  const walletAddress = useActiveWallet()?.address || "";

  const checkEligibility = async () => {
    if (!ethers.isAddress(wallet)) {
      alert("Invalid wallet address");
      return;
    }
    const provider = new ethers.JsonRpcProvider(monadTestnet.rpc[0]);
    const count = await provider.getTransactionCount(wallet);
    if (count >= 5000) {
      setEligible(true);
    } else {
      alert(`Not eligible. Transaction count: ${count}`);
    }
  };

  const verifyHandle = async () => {
    if (!handle.startsWith("@")) {
      alert("Handle must start with @");
      return;
    }
    const res = await fetch(`/api/get-profile-pic?handle=${encodeURIComponent(handle)}`);
    if (!res.ok) {
      alert(await res.text());
      return;
    }
    const { url } = await res.json();
    if (url) {
      setProfilePic(url);
      const svgPreview = generateSvgPreview(url);
      setPreview(svgPreview);
    } else {
      alert("Invalid X handle or profile pic not found");
    }
  };

  const claimNFT = async () => {
    if (!walletAddress || walletAddress.toLowerCase() !== wallet.toLowerCase()) {
      alert("Connected wallet must match entered address");
      return;
    }
    const res = await fetch(`/api/generate-signature?wallet=${walletAddress}&handle=${encodeURIComponent(handle)}`);
    if (!res.ok) {
      alert(await res.text());
      return;
    }
    const { payload, signature } = await res.json();

    const contract = getContract({
      address: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!,
      chain: monadTestnet,
      client,
      wallet: useActiveWallet(), // Use active wallet for signing
    });

    try {
      const result = await contract.erc721.signature.mint({
        payload,
        signature,
      });
      setTxHash(result.receipt.transactionHash);
      setTokenId(result.id.toString());
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-text">
      <h1 className="text-4xl font-bold text-primary mb-8">Claim Your Monad Soulbound NFT</h1>
      <div className="w-full max-w-md space-y-4">
        <input
          type="text"
          placeholder="Enter your Monad wallet address"
          value={wallet}
          onChange={(e) => setWallet(e.target.value)}
          className="w-full p-3 border border-secondary rounded-lg text-text bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          onClick={checkEligibility}
          className="w-full bg-primary text-white p-3 rounded-lg font-semibold hover:bg-opacity-90 transition"
        >
          Check Eligibility
        </button>
        {eligible && (
          <>
            <input
              type="text"
              placeholder="Enter your X handle (e.g., @username)"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              className="w-full p-3 border border-secondary rounded-lg text-text bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              onClick={verifyHandle}
              className="w-full bg-primary text-white p-3 rounded-lg font-semibold hover:bg-opacity-90 transition"
            >
              Verify Handle & Preview
            </button>
            {preview && (
              <>
                <img src={preview} alt="NFT Preview" className="w-64 h-64 mx-auto mb-4 rounded-lg shadow-lg" />
                <ConnectButton />
                <button
                  onClick={claimNFT}
                  className="w-full bg-primary text-white p-3 rounded-lg font-semibold hover:bg-opacity-90 transition"
                >
                  Claim NFT (Pay MON Gas)
                </button>
              </>
            )}
          </>
        )}
        {txHash && (
          <div className="text-center space-y-2">
            <p className="text-lg font-semibold">Claim Successful!</p>
            <a
              href={`https://testnet.monadexplorer.com/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              View Transaction on Explorer
            </a>
            <br />
            <a
              href={`https://testnet.monadexplorer.com/tokens/${process.env.NEXT_PUBLIC_CONTRACT_ADDRESS}/instances/${tokenId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              View Your Soulbound NFT on Explorer
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
