"use client";
import React, { useState, useCallback, useEffect } from "react";
import Web3Workspace from "@/components/Web3Workspace";
import FeaturesShow from "@/components/FeaturesShow";
import Header from "@/components/Header";
import config from "@/config";
import { useEditor } from "../context/EditorContext";
import MonacoEditor from "@/components/MonacoEditor";
const MemoizedWeb3Workspace = React.memo(Web3Workspace);
const MemoizedFeaturesShow = React.memo(FeaturesShow);
// const MemoizedHeader = React.memo(Header);

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
      const sourceCode =
        activeTab === "editor" && currentFile ? currentFile.content : code;
      const response = await fetch(
        `${config.backendUrl}${config.routes.compile}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sourceCode }),
        }
      );
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
  

  const {
    files,
    activeFileId,
    onFileSelect,
    onCloseFile,
    activeFile,
    setActiveFileId,
    showHome,
    setShowHome
  } = useEditor();

  useEffect(() => {}, [files]);
  return (
    <div className="flex flex-col h-full">
      <Header
        handleZoomIn={handleZoomIn}
        handleZoomOut={handleZoomOut}
        setActiveTab={setActiveTab}
        files={files}
        activeFileId={activeFileId}
        onFileSelect={onFileSelect}
        onCloseFile={onCloseFile}
        setActiveFileId={setActiveFileId}
        showHome={showHome}
        setShowHome={setShowHome}
      />
      <div className="flex-1 relative overflow-hidden">
        {activeFileId === "Home" ? (
          <div className="flex w-full h-full overflow-auto">
            <MemoizedWeb3Workspace />
            <MemoizedFeaturesShow />
          </div>
        ) : activeFile || (activeFileId==="editor" && files.length === 0) ? (
          <div
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "top left",
              height: "calc(100vh - 84px)"
            }}
            className="flex-1 overflow-hidden"
          >
            <MonacoEditor
              file={activeFile}
              zoom={zoom}
              error={error}
              code={code}
              compilationResult={compilationResult}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}


