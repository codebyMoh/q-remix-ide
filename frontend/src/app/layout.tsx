// "use client";
// import React, { useState, useRef, useCallback } from "react";
// import "./globals.css";

// /* 1) Import Wagmi, RainbowKit, and their styles */
// import { WagmiConfig, createConfig, http } from "wagmi";
// import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
// import "@rainbow-me/rainbowkit/styles.css"; // <-- Important!

// /* 2) Import chains and connectors */
// import { sepolia } from "viem/chains";
// import { connectorsForWallets } from "@rainbow-me/rainbowkit";
// import { metaMaskWallet } from "@rainbow-me/rainbowkit/wallets";
// import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// import Sidebar from "@/components/Sidebar";
// import FileExplorer from "@/components/FileExplorer";
// import ToggleDeployAndRun from "@/components/ToggleDeployAndRun";
// import SolidiyCompiler from "@/components/SolidiyCompiler";
// import Debugger from "@/components/Debugger"; 
// import DeplyRun from "@/components/DeployRun"
// import Terminal from "@/components/Terminal";
// import Footer from "@/components/Footer";
// import { EditorProvider } from "@/context/EditorContext";

// /* 4) Google font example */
// import { Urbanist } from "next/font/google";
// const urbanist = Urbanist({
//   subsets: ["latin"],
//   weight: ["400", "600", "700"],
// });

// /* 5) Wagmi + RainbowKit config */
// const projectId = "YOUR_WALLETCONNECT_PROJECT_ID";
// const connectors = connectorsForWallets(
//   [
//     {
//       groupName: "Recommended",
//       wallets: [metaMaskWallet],
//     },
//   ],
//   { appName: "Solidity IDE", projectId }
// );

// const config = createConfig({
//   connectors,
//   chains: [sepolia],
//   autoConnect: true,
//   publicClient: http(),
// });

// const queryClient = new QueryClient();

// export default function RootLayout({
//   children,
// }: {
//   children: React.ReactNode;
// }) {
//   const [activeSection, setActiveSection] = useState<string>("workspace");
//   const [terminalHeight, setTerminalHeight] = useState(150);
  
//   const terminalRef = useRef<HTMLDivElement>(null);
//   const isDraggingRef = useRef(false);
//   const [isResizing, setIsResizing] = useState(false);
//   const [isResizerHovered, setIsResizerHovered] = useState(false);

//   /* Draggable terminal logic */
//   const handleMouseMove = useCallback((e: MouseEvent) => {
//     if (!isDraggingRef.current) return;
//     const screenHeight = window.innerHeight;
//     const newHeight = Math.min(
//       Math.max(screenHeight - e.clientY, 90),
//       screenHeight * 0.73
//     );
//     setTerminalHeight(newHeight);
//   }, []);

//   const handleMouseUp = useCallback(() => {
//     isDraggingRef.current = false;
//     setIsResizing(false);
//     document.removeEventListener("mousemove", handleMouseMove);
//     document.removeEventListener("mouseup", handleMouseUp);
//   }, [handleMouseMove]);

//   const handleMouseDown = useCallback(
//     (e: React.MouseEvent) => {
//       e.preventDefault();
//       setIsResizing(true);
//       isDraggingRef.current = true;
//       document.addEventListener("mousemove", handleMouseMove);
//       document.addEventListener("mouseup", handleMouseUp);
//     },
//     [handleMouseMove, handleMouseUp]
//   );

//   const [savedTerminalHeight, setSavedTerminalHeight] = useState(150);
//   const toggleHeight = () => {
//     if (terminalHeight === 90) {
//       setTerminalHeight(savedTerminalHeight);
//     } else {
//       setSavedTerminalHeight(terminalHeight);
//       setTerminalHeight(90);
//     }
//   };

//   /* Handle switching between sections */
//   const handleActiveSectionChange = (section: string) => {
//     setActiveSection(section);
//   };
  
//   return (
//     <html lang="en" className="light">
//       <body className={urbanist.className}>
//         {/* 6) Wrap everything in Wagmi + RainbowKit + QueryClient providers */}
//         <WagmiConfig config={config}>
//           <QueryClientProvider client={queryClient}>
//             <RainbowKitProvider>
//               <EditorProvider>
//                 <div className="flex h-screen">
//                   {/* Sidebar */}
//                   <Sidebar onSectionChange={handleActiveSectionChange} />

//                   {/* Toggle between sections */}
//                   <div className="h-full">
//                     {activeSection === "compiler" ? (
//                       <SolidiyCompiler />
//                     ) : activeSection === "deploy-run" ? (
//                       <ToggleDeployAndRun />
//                     ) : activeSection === "debugger" ? ( // <-- Added Debugger
//                       <Debugger />
//                     ) : (
//                       <FileExplorer/>
//                     )} 
//                   </div>

//                   {/* Main Content + Terminal Container */}
//                   <div className="flex-1 flex flex-col h-screen overflow-hidden">
//                     {/* Main Content Area - Fixed height */}
//                     <div
//                       className="flex-1 overflow-auto"
//                       style={{
//                         height: `calc(100vh - ${terminalHeight}px)`,
//                       }}
//                     >
//                       {children}
//                     </div>

//                     {/* Terminal at the bottom */}
//                     <div
//                       ref={terminalRef}
//                       className="w-full bg-white text-black flex flex-col"
//                       style={{
//                         height: `${terminalHeight}px`,
//                         transition: "height 0.2s ease-in-out",
//                       }}
//                     >
//                       {/* The draggable bar */}
//                       <div
//                         onMouseDown={handleMouseDown}
//                         onMouseEnter={() => setIsResizerHovered(true)}
//                         onMouseLeave={() => setIsResizerHovered(false)}
//                         className={`cursor-row-resize w-full h-1 ${
//                           isResizing || isResizerHovered
//                             ? "bg-red-500"
//                             : "bg-gray-300"
//                         }`}
//                       />
//                       <Terminal toggleHeight={toggleHeight} />
//                     </div>
//                   </div>

//                   {/* Footer */}
//                   <Footer />
//                 </div>
//               </EditorProvider>
//             </RainbowKitProvider>
//           </QueryClientProvider>
//         </WagmiConfig>
//       </body>
//     </html>
//   );
// }



"use client";
import React, { useState, useRef, useCallback, useEffect } from "react";
import "./globals.css";

/* 1) Import Wagmi, RainbowKit, and their styles */
import { WagmiConfig, createConfig, http } from "wagmi";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css"; // <-- Important!

/* 2) Import chains and connectors */
import { sepolia } from "viem/chains";
import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import { metaMaskWallet } from "@rainbow-me/rainbowkit/wallets";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import Sidebar from "@/components/Sidebar";
import FileExplorer from "@/components/FileExplorer";
import ToggleDeployAndRun from "@/components/ToggleDeployAndRun";
import SolidiyCompiler from "@/components/SolidiyCompiler";
import Debugger from "@/components/Debugger"; 
import DeplyRun from "@/components/DeployRun";
import Terminal from "@/components/Terminal";
import Footer from "@/components/Footer";
import { EditorProvider } from "@/context/EditorContext";
import { TerminalProvider } from '@/components/Terminal';

/* 4) Google font example */
import { Urbanist } from "next/font/google";
const urbanist = Urbanist({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

/* 5) Wagmi + RainbowKit config */
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
  autoConnect: false, // Changed to false to prevent auto-connecting during render
  publicClient: http(),
});

const queryClient = new QueryClient();

function RootLayoutClient({ children }: { children: React.ReactNode }) {
  const [activeSection, setActiveSection] = useState<string>("workspace");
  const [terminalHeight, setTerminalHeight] = useState(150);
  
  const terminalRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isResizerHovered, setIsResizerHovered] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Only enable Wagmi after component is mounted
  useEffect(() => {
    setMounted(true);
  }, []);

  /* Draggable terminal logic */
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingRef.current) return;
    const screenHeight = window.innerHeight;
    const newHeight = Math.min(
      Math.max(screenHeight - e.clientY, 90),
      screenHeight * 0.73
    );
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

  /* Handle switching between sections */
  const handleActiveSectionChange = (section: string) => {
    setActiveSection(section);
  };
  
  // Don't render the full UI until client-side
  if (!mounted) {
    return (
      <div className={urbanist.className}>
        <div className="flex h-screen items-center justify-center">
          <p>Loading...</p>
        </div>
      </div>
    );
  }
  
  return (
    <WagmiConfig config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <EditorProvider>
            <TerminalProvider>
              <div className="flex h-screen">
                {/* Sidebar */}
                <Sidebar onSectionChange={handleActiveSectionChange} />

                {/* Toggle between sections */}
                <div className="h-full">
                  {activeSection === "compiler" ? (
                    <SolidiyCompiler />
                  ) : activeSection === "deploy-run" ? (
                    <DeplyRun />
                  ) : activeSection === "debugger" ? (
                    <Debugger />
                  ) : (
                    <FileExplorer />
                  )} 
                </div>

                {/* Main Content + Terminal Container */}
                <div className="flex-1 flex flex-col h-screen overflow-hidden">
                  {/* Main Content Area - Fixed height */}
                  <div
                    className="flex-1 overflow-auto"
                    style={{
                      height: `calc(100vh - ${terminalHeight}px)`,
                    }}
                  >
                    {children}
                  </div>

                  {/* Terminal at the bottom */}
                  <div
                    ref={terminalRef}
                    className="w-full bg-white text-black flex flex-col"
                    style={{
                      height: `${terminalHeight}px`,
                      transition: "height 0.2s ease-in-out",
                    }}
                  >
                    {/* The draggable bar */}
                    <div
                      onMouseDown={handleMouseDown}
                      onMouseEnter={() => setIsResizerHovered(true)}
                      onMouseLeave={() => setIsResizerHovered(false)}
                      className={`cursor-row-resize w-full h-1 ${
                        isResizing || isResizerHovered
                          ? "bg-red-500"
                          : "bg-gray-300"
                      }`}
                    />
                    <Terminal toggleHeight={toggleHeight} />
                  </div>
                </div>

                {/* Footer */}
                <Footer />
              </div>
            </TerminalProvider>
          </EditorProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiConfig>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="light">
      <body className={urbanist.className}>
        <RootLayoutClient>{children}</RootLayoutClient>
      </body>
    </html>
  );
}