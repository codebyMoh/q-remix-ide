"use client";
import React from "react";
import Editor from "@monaco-editor/react";

export default function EditorPage() {
  return (
    <div className="min-h-screen w-screen flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 text-white p-4 text-lg font-bold">
        Solidity Editor
      </div>

      {/* Editor Container */}
      <div className="flex-1">
        {/* 
            Set the height to fill the remaining viewport height.
            Here we subtract the approximate header height (e.g., 64px) 
            from the total viewport height (100vh).
        */}
        <Editor
          height={`calc(100vh - 64px)`}
          width="100%"
          defaultLanguage="solidity"
          defaultValue="// Write your Solidity contract here..."
          theme="vs-dark"  // You cn change to "vs-light" if you prefer a lighter theme
          options={{
            fontSize: 14,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true, 
          }}
        />
      </div>
    </div>
  );
}
