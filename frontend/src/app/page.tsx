"use client";
import React, { useState, useRef, useCallback } from "react";
import Editor from "@monaco-editor/react";
import Web3Workspace from "@/components/Web3Workspace";
import FeaturesShow from "@/components/FeaturesShow";
import Header from "@/components/Header";
import Terminal from "@/components/Terminal";

// Memoized components to avoid unnecessary re-renders
const MemoizedWeb3Workspace = React.memo(Web3Workspace);
const MemoizedFeaturesShow = React.memo(FeaturesShow);
const MemoizedHeader = React.memo(Header);

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("home");
  const [code, setCode] = useState(`// Welcome to Q Remix IDE! 
// Visit all Quranium websites at: https://quranium.org
//
// Write your Solidity contract here...
pragma solidity ^0.8.7;
contract MyContract {
    // Your contract code goes here
}`);
  const [zoom, setZoom] = useState(1.0);
  const [compilationResult, setCompilationResult] = useState(null);
  const [error, setError] = useState("");

  // Terminal resizing
  const [terminalHeight, setTerminalHeight] = useState(150);
  const terminalRef = useRef(null);
  const isDraggingRef = useRef(false);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    isDraggingRef.current = true;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isDraggingRef.current) return;
    const screenHeight = window.innerHeight;
    const newHeight = Math.min(
      Math.max(screenHeight - e.clientY, 60),
      screenHeight * 0.6
    ); // Min 60px, Max 60% of screen
    setTerminalHeight(newHeight);
  }, []);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 0.1, 2.0));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - 0.1, 0.5));
  }, []);

  // Function to compile Solidity code
  const handleCompile = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/editor/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceCode: code }),
      });
      const result = await response.json();

      if (result.error) {
        setError(result.error);
        setCompilationResult(null);
      } else {
        setCompilationResult(result);
        setError("");
      }
    } catch (err) {
      setError("Failed to compile Solidity code");
      setCompilationResult(null);
    }
  };

  // Update handleRun to trigger Solidity compilation
  const handleRun = useCallback(() => {
    handleCompile();
  }, [code]);

  const toggleHeight = () => {
    setTerminalHeight((prevHeight) => (prevHeight === 90 ? 150 : 90));
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <MemoizedHeader
        handleZoomIn={handleZoomIn}
        handleRun={handleRun}
        handleZoomOut={handleZoomOut}
        setActiveTab={setActiveTab}
      />

      {/* Content Area */}
      <div className="flex-1 relative overflow-hidden">
        {activeTab === "home" ? (
          <div className="flex flex-col h-full">
            {/* Scrollable workspace and features */}
            <div
              className="flex-1 overflow-auto"
              style={{ paddingBottom: `${terminalHeight}px` }}
            >
              <div className="flex w-full">
                <MemoizedWeb3Workspace />
                <MemoizedFeaturesShow />
              </div>
            </div>

            {/* Terminal Positioned Below These Components */}
            <div
              ref={terminalRef}
              className="w-full bg-white text-black absolute bottom-0 left-0"
              style={{
                height: `${terminalHeight}px`,
                transition: "height 0.1s linear",
              }}
            >
              {/* Drag Handle */}
              <div
                onMouseDown={handleMouseDown}
                className="cursor-row-resize bg-white-300 hover:bg-white-400 w-full h-1"
              />
              {/* Terminal Component */}
              <Terminal toggleHeight={toggleHeight} />
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-auto">
              <div
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: "top left",
                }}
                className="w-full h-full"
              >
                <Editor
                  height="100%"
                  width="100%"
                  defaultLanguage="solidity"
                  value={code}
                  theme="vs-light"
                  options={{
                    fontSize: 14,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                  }}
                  onChange={(value) => setCode(value || "")}
                />
              </div>
            </div>

            {/* Compilation Result */}
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2">
                Error: {error}
              </div>
            )}

            {compilationResult && (
              <div className="bg-gray-100 border border-gray-400 text-gray-700 px-4 py-2">
                <h2 className="font-bold">Compilation Result</h2>
                <pre>{JSON.stringify(compilationResult, null, 2)}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
