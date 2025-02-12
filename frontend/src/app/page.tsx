"use client";
import React, { useState, useCallback } from "react";
import Editor from "@monaco-editor/react";
import Web3Workspace from "@/components/Web3Workspace";
import FeaturesShow from "@/components/FeaturesShow";
import Header from "@/components/Header";
import FileTabs from "@/components/FileTabs";
import { useEditor } from "@/context/EditorContext";

const MemoizedWeb3Workspace = React.memo(Web3Workspace);
const MemoizedFeaturesShow = React.memo(FeaturesShow);
const MemoizedHeader = React.memo(Header);

export default function HomePage() {
  // "home" view shows Web3Workspace/FeaturesShow; "editor" view shows the code editor with tabs.
  const [activeTab, setActiveTab] = useState("home");
  const { currentFile, setCurrentFile } = useEditor();
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

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 0.1, 2.0));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - 0.1, 0.5));
  }, []);

  const handleCompile = async () => {
    try {
      const sourceCode = activeTab === "editor" && currentFile ? currentFile.content : code;
      const response = await fetch("http://localhost:5000/api/editor/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceCode }),
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

  const handleRun = useCallback(() => {
    handleCompile();
  }, [code, currentFile, activeTab]);

  const handleEditorChange = (value: string | undefined) => {
    if (activeTab === "editor" && currentFile) {
      setCurrentFile({ ...currentFile, content: value || "" });
    } else {
      setCode(value || "");
    }
  };

  return (
    <div className="flex flex-col h-full">
      <MemoizedHeader
        handleZoomIn={handleZoomIn}
        handleRun={handleRun}
        handleZoomOut={handleZoomOut}
        setActiveTab={setActiveTab}
      />
      <div className="flex-1 relative overflow-hidden">
        {activeTab === "home" ? (
          <div className="flex w-full h-full">
            <MemoizedWeb3Workspace />
            <MemoizedFeaturesShow />
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {currentFile ? <FileTabs /> : null}
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
                  value={currentFile ? currentFile.content : code}
                  theme="vs-light"
                  options={{
                    fontSize: 14,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                  }}
                  onChange={handleEditorChange}
                />
              </div>
            </div>
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
