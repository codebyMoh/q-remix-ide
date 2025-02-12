"use client";
import React, { useState, useRef, useCallback } from "react";
import { Urbanist } from "next/font/google";
import Editor from "@monaco-editor/react";
import Sidebar from "@/components/Sidebar";
import ToggleWorkspace from "@/components/ToggleWorkspace";
import Footer from "@/components/Footer";
import Terminal from "@/components/Terminal";
import SolidiyCompiler from "@/components/SolidiyCompiler";
import "./globals.css";

const urbanist = Urbanist({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export default function Layout({ children }: { children: React.ReactNode }) {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [terminalHeight, setTerminalHeight] = useState(150);
  const terminalRef = useRef(null);
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
      <body>
        <div className="flex h-screen">
          {/* Sidebar */}
          <Sidebar onSectionChange={handleActiveSectionChange} />
          
          {/* Workspace Area (ToggleWorkspace or SolidityCompiler) */}
          <div className="h-full">
            {activeSection === "compiler" ? (
              <SolidiyCompiler />
            ) : (
              <ToggleWorkspace />
            )}
          </div>

          {/* Main Content + Terminal */}
          <div className="flex-1 flex flex-col relative">
            {/* Main Content Area */}
            <div 
              className="flex-1 overflow-auto"
              style={{ paddingBottom: `${terminalHeight}px` }}
            >
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
                className={`cursor-row-resize w-full h-1 ${
                  isResizing || isResizerHovered ? "bg-red-500" : "bg-gray-300"
                }`}
              />
              <Terminal toggleHeight={toggleHeight} />
            </div>
          </div>

          {/* Footer */}
          <Footer />
        </div>
      </body>
    </html>
  );
}