import { createConfig, http } from "wagmi";
import { sepolia } from "viem/chains";
import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import { metaMaskWallet } from "@rainbow-me/rainbowkit/wallets";

// Define your project ID for WalletConnect
const projectId = "YOUR_WALLETCONNECT_PROJECT_ID"; // Replace with your WalletConnect project ID

// Define connectors for wallets
const connectors = connectorsForWallets(
  [
    {
      groupName: "Recommended",
      wallets: [metaMaskWallet({ projectId })],
    },
  ],
  { appName: "Solidity IDE", projectId }
);

// Create the Wagmi config
export const config = createConfig({
  connectors,
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(), // Use HTTP provider for Sepolia
  },
});