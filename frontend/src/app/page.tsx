"use client";
import React, { useState } from "react";
import Editor from "@monaco-editor/react";
import { FaTimes, FaSearchPlus, FaSearchMinus, FaPlay } from "react-icons/fa";

export default function HomePage() {
  // Track the active view: "home" or "editor"
  const [activeTab, setActiveTab] = useState("home");
  // Default Solidity code with a welcome message
  const [code, setCode] = useState(`// Welcome to Q Remix IDE!
// Visit all Quranium websites at: https://quranium.org
//
// Write your Solidity contract here...
pragma solidity ^0.8.7;

contract MyContract {
    // Your contract code goes here
}`);
  // Zoom factor (scale) for the editor (between 0.5 and 2.0)
  const [zoom, setZoom] = useState(1.0);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.1, 2.0));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.1, 0.5));
  };

  // When the Run icon is clicked, show an alert because no file is selected.
  const handleRun = () => {
    alert("Please select a .sol, .js, or .ts file to compile.");
    // In a real-world integration we would call your backend API here.
    // For example:
    // fetch('/api/compile', { method: 'POST', body: JSON.stringify({ fileName, code }) })
    //   .then(res => res.json()).then(data => { ... });
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Tab Bar (only shown when Home is active) */}
      {activeTab === "home" && (
        <div className="bg-gray-100 border-b border-gray-300 flex items-center p-2">
          <div className="flex items-center bg-white shadow rounded-t-lg px-4 py-2 ml-4">
            <span className="mr-2 font-bold text-gray-800">Home</span>
            <button
              onClick={() => setActiveTab("editor")}
              className="text-gray-600 hover:text-gray-800 focus:outline-none"
              title="Close Home Tab"
            >
              <FaTimes size={16} />
            </button>
          </div>
        </div>
      )}
      {/* Content Area */}
      <div className="flex-1">
        {activeTab === "home" ? (
          <div className="p-8">
            <h1 className="text-3xl font-bold text-gray-800">
              Welcome to Q Remix IDE
            </h1>
            <p className="mt-4 text-gray-600">
              Visit all Quranium websites at:{" "}
              <a
                href="https://quranium.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                https://quranium.com
              </a>
            </p>
            <p className="mt-2 text-gray-600">
              Click the cross icon on the Home tab to close it and open the code editor.
            </p>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* Editor Toolbar with Run and Zoom controls (icons aligned to the left) */}
            <div className="flex items-center p-2 bg-gray-100 border-b border-gray-300">
              <button
                onClick={handleRun}
                className="text-gray-600 hover:text-gray-800 mr-4"
                title="Run Code"
              >
                <FaPlay size={18} />
              </button>
              <button
                onClick={handleZoomOut}
                className="text-gray-600 hover:text-gray-800 mr-2"
                title="Zoom Out"
              >
                <FaSearchMinus size={18} />
              </button>
              <button
                onClick={handleZoomIn}
                className="text-gray-600 hover:text-gray-800"
                title="Zoom In"
              >
                <FaSearchPlus size={18} />
              </button>
            </div>
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
    </div>
  );
}
