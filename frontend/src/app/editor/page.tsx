"use client";
import React, { useState } from "react";
import Editor from "@monaco-editor/react";

export default function EditorPage() {
  const [solidityCode, setSolidityCode] = useState(`// Write your Solidity contract here...
pragma solidity ^0.8.0;

contract HelloWorld {
    string public message;

    constructor() {
        message = "Hello, World!";
    }
}`);
  const [compilationResult, setCompilationResult] = useState("");
  const [error, setError] = useState("");

  const handleCompile = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/editor/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceCode: solidityCode }),
      });
      const result = await response.json();

      if (result.error) {
        setError(result.error);
        setCompilationResult("");
      } else {
        const formattedResult = JSON.stringify(result, null, 2);
        setCompilationResult(formattedResult);
        setError("");
      }
    } catch (err) {
      setError("Failed to compile Solidity code");
      setCompilationResult("");
    }
  };

  return (
    <div className="min-h-screen w-screen flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 text-white p-4 text-lg font-bold flex justify-between items-center">
        <span>Solidity Editor</span>
        <button
          onClick={handleCompile}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Compile
        </button>
      </div>

      {/* Editor Container */}
      <div className="flex-1">
        <Editor
          height={`calc(100vh - 64px)`}
          width="100%"
          defaultLanguage="solidity"
          value={solidityCode}
          theme="vs-dark"
          options={{
            fontSize: 14,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
          }}
          onChange={(value) => setSolidityCode(value || "")}
        />
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
          <pre
            style={{
              backgroundColor: "#f5f5f5",
              padding: "10px",
              borderRadius: "5px",
              maxHeight: "400px",
              overflowY: "auto",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
            }}
          >
            {compilationResult}
          </pre>
        </div>
      )}
    </div>
  );
}