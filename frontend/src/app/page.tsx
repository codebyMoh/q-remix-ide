"use client";
import React, { useState, useCallback } from "react";
import Editor from "@monaco-editor/react";
import Web3Workspace from "@/components/Web3Workspace";
import FeaturesShow from "@/components/FeaturesShow";
import Header from "@/components/Header";
import Terminal from "@/components/Terminal";
// Memoize Web3Workspace and FeaturesShow to avoid unnecessary re-renders
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

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 0.1, 2.0));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - 0.1, 0.5));
  }, []);

  const handleRun = useCallback(() => {
    alert("Please select a .sol, .js, or .ts file to compile.");
  }, []);

  return (
    <div className="flex flex-col h-screen">
      {/* Tab Bar */}
      <MemoizedHeader
        handleZoomIn={handleZoomIn}
        handleRun={handleRun}
        handleZoomOut={handleZoomOut}
        setActiveTab={setActiveTab}
      />

      {/* Content Area */}
      <div className="flex-1">
        {activeTab === "home" ? (
          <div className="flex">
            <MemoizedWeb3Workspace />
            <MemoizedFeaturesShow />
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* Editor Container */}
            <div className="flex-1 overflow-auto relative">
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
                  defaultValue={code}
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
          </div>
        )}
      </div>
      <div className="w-full h-[60px]">
        <Terminal />
      </div>
    </div>
  );
}
