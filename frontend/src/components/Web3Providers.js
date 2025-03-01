"use client";
import React, { useState, useEffect } from 'react';
import { WagmiConfig, createConfig, http } from "wagmi";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { sepolia } from "viem/chains";
import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import { metaMaskWallet } from "@rainbow-me/rainbowkit/wallets";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Create providers only on client
const ClientOnlyProviders = ({ children }) => {
  // Wait for client-side hydration to complete
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Only set mounted to true after the component has mounted on the client
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return a placeholder with the same DOM structure to prevent layout shift
    return <div className="w-full h-full">{children}</div>;
  }

  // Create fresh instances on the client only
  const queryClient = new QueryClient();
  
  const config = createConfig({
    connectors: connectorsForWallets([
      {
        groupName: "Recommended",
        wallets: [metaMaskWallet],
      },
    ], { 
      projectId: "YOUR_WALLETCONNECT_PROJECT_ID", 
      appName: "Solidity IDE" 
    }),
    chains: [sepolia],
    autoConnect: false,
    publicClient: http(),
  });

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiConfig config={config}>
        <RainbowKitProvider coolMode>
          {children}
        </RainbowKitProvider>
      </WagmiConfig>
    </QueryClientProvider>
  );
};

export default function Web3Providers({ children }) {
  return <ClientOnlyProviders>{children}</ClientOnlyProviders>;
}