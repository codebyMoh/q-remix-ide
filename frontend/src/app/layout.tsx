"use client";
import React, { useState, useRef, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import ToggleWorkspace from "@/components/ToggleWorkspace";
import ToggleDeployAndRun from "@/components/ToggleDeployAndRun";
import Footer from "@/components/Footer";
import Terminal from "@/components/Terminal";
import SolidiyCompiler from "@/components/SolidiyCompiler";
import { EditorProvider } from "@/context/EditorContext";
import { WagmiProvider, createConfig, http } from "wagmi";
import { sepolia } from "viem/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, connectorsForWallets } from "@rainbow-me/rainbowkit";
import { metaMaskWallet } from "@rainbow-me/rainbowkit/wallets";
import { Urbanist } from "next/font/google";
import "./globals.css";

const urbanist = Urbanist({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const projectId = "YOUR_WALLETCONNECT_PROJECT_ID";
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
  transports: { [sepolia.id]: http() },
});
const queryClient = new QueryClient();

export default function Layout({ children }: { children: React.ReactNode }) {
  const [activeSection, setActiveSection] = useState<string | null>("workspace");
  const [terminalHeight, setTerminalHeight] = useState(150);
  const terminalRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isResizerHovered, setIsResizerHovered] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    isDraggingRef.current = true;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingRef.current) return;
    const screenHeight = window.innerHeight;
    const newHeight = Math.min(
      Math.max(screenHeight - e.clientY, 60),
      screenHeight * 0.6
    );
    setTerminalHeight(newHeight);
  }, []);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    setIsResizing(false);
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  }, []);

  const toggleHeight = () => {
    setTerminalHeight((prevHeight) => (prevHeight === 90 ? 150 : 90));
  };

  const handleActiveSectionChange = (section: string) => {
    setActiveSection(section);
  };

  return (
    <html lang="en">
      <body className={urbanist.className}>
        <WagmiProvider config={config}>
          <QueryClientProvider client={queryClient}>
            <RainbowKitProvider modalContainerClassName="rainbowkit-modal-container">
              <EditorProvider>
                <div className="flex h-screen">
                  {/* Sidebar */}
                  <Sidebar onSectionChange={handleActiveSectionChange} />

                  {/* Workspace Area */}
                  <div className="h-full">
                    {activeSection === "compiler" ? (
                      <SolidiyCompiler />
                    ) : activeSection === "deploy-run" ? (
                      <ToggleDeployAndRun />
                    ) : (
                      <ToggleWorkspace />
                    )}
                  </div>

                  {/* Main Content + Terminal */}
                  <div className="flex-1 flex flex-col relative">
                    {/* Main Content Area */}
                    <div className="flex-1 overflow-auto" style={{ paddingBottom: `${terminalHeight}px` }}>
                      {children}
                    </div>

                    {/* Terminal */}
                    <div
                      ref={terminalRef}
                      className="w-full bg-white text-black absolute bottom-0 left-0"
                      style={{
                        height: `${terminalHeight}px`,
                        transition: "height 0.1s linear",
                      }}
                    >
                      <div
                        onMouseDown={handleMouseDown}
                        onMouseEnter={() => setIsResizerHovered(true)}
                        onMouseLeave={() => setIsResizerHovered(false)}
                        className={`cursor-row-resize w-full h-1 ${isResizing || isResizerHovered ? "bg-red-500" : "bg-gray-300"}`}
                      />
                      <Terminal toggleHeight={toggleHeight} />
                    </div>
                  </div>

                  {/* Footer */}
                  <Footer />
                </div>
              </EditorProvider>
            </RainbowKitProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </body>
    </html>
  );
}


