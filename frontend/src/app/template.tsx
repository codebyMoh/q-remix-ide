"use client";
import React, { useState, useRef, useCallback } from "react";
import "./globals.css";
import { WagmiConfig, createConfig, http } from "wagmi";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { sepolia } from "viem/chains";
import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import { metaMaskWallet } from "@rainbow-me/rainbowkit/wallets";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Sidebar from "@/components/Sidebar";
import FileExplorer from "@/components/FileExplorer";
import ToggleDeployAndRun from "@/components/ToggleDeployAndRun";
import SolidityCompiler from "@/components/SolidityCompiler";
import SearchFiles from "@/components/SearchFiles";
import Git from "@/components/Git";
import Settings from "@/components/Settings";
import Debugger from "@/components/Debugger";
import Terminal from "@/components/Terminal";
import Footer from "@/components/Footer";
import { EditorProvider } from "@/context/EditorContext";
import { Urbanist } from "next/font/google";

const urbanist = Urbanist({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const projectId = "YOUR_WALLETCONNECT_PROJECT_ID"; // Replace with your WalletConnect project ID
if (!projectId) {
  throw new Error("WalletConnect project ID is required. Please set it in the configuration.");
}

const connectors = connectorsForWallets(
  [
    {
      groupName: "Recommended",
      wallets: [metaMaskWallet],
    },
  ],
  { appName: "Solidity IDE", projectId }
);

const config = createConfig({
  connectors,
  chains: [sepolia],
  autoConnect: true,
  publicClient: http(),
});

const queryClient = new QueryClient();

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [activeSection, setActiveSection] = useState<string>("workspace");
  const [terminalHeight, setTerminalHeight] = useState(150);
  const terminalRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isResizerHovered, setIsResizerHovered] = useState(false);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingRef.current) return;
    const screenHeight = window.innerHeight;
    const newHeight = Math.min(Math.max(screenHeight - e.clientY, 90), screenHeight * 0.73);
    setTerminalHeight(newHeight);
  }, []);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    setIsResizing(false);
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  }, [handleMouseMove]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
      isDraggingRef.current = true;
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [handleMouseMove, handleMouseUp]
  );

  const [savedTerminalHeight, setSavedTerminalHeight] = useState(150);
  const toggleHeight = () => {
    if (terminalHeight === 90) {
      setTerminalHeight(savedTerminalHeight);
    } else {
      setSavedTerminalHeight(terminalHeight);
      setTerminalHeight(90);
    }
  };

  const handleActiveSectionChange = (section: string) => {
    setActiveSection(section);
  };

  const renderActiveSection = () => {
    switch (activeSection) {
      case "compiler":
        return <SolidityCompiler />;
      case "deploy-run":
        return <ToggleDeployAndRun />;
      case "debugger":
        return <Debugger />;
      case "settings":
        return <Settings />;
      case "git":
        return <Git />;
      case "search":
        return <SearchFiles />;
      case "workspace":
      default:
        return <FileExplorer />;
    }
  };

  return (
        <WagmiConfig config={config}>
          <QueryClientProvider client={queryClient}>
            <RainbowKitProvider>
              <EditorProvider>
                <div className="flex h-screen">
                  <Sidebar onSectionChange={handleActiveSectionChange} />
                  <div className="h-full pb-[36px]">{renderActiveSection()}</div>
                  <div className="flex-1 flex flex-col h-screen overflow-hidden">
                    <div
                      className="flex-1 overflow-auto"
                      style={{ height: `calc(100vh - ${terminalHeight}px)` }}
                    >
                      {children}
                    </div>
                    <div
                      ref={terminalRef}
                      className="w-full bg-white text-black flex flex-col"
                      style={{ height: `${terminalHeight}px`, transition: "height 0.2s ease-in-out" }}
                    >
                      <div
                        onMouseDown={handleMouseDown}
                        onMouseEnter={() => setIsResizerHovered(true)}
                        onMouseLeave={() => setIsResizerHovered(false)}
                        className={`cursor-row-resize w-full h-1 ${
                          isResizing || isResizerHovered ? "bg-red-500" : "bg-gray-300"
                        }`}
                      />
                      <Terminal toggleHeight={toggleHeight} />
                    </div>
                  </div>
                  <Footer />
                </div>
              </EditorProvider>
            </RainbowKitProvider>
          </QueryClientProvider>
        </WagmiConfig>
   
    
  );
}