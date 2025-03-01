"use client";
import React, { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { getNodeById, updateNode } from "../utils/IndexDB";
import type { FileSystemNode } from "../types";
import { useEditor } from "../context/EditorContext";

interface MonacoEditorProps {
  file: FileSystemNode;
  zoom: number;
  editCode?: string;
  error?: string;
  compilationResult?: any;
}

const MonacoEditor: React.FC<MonacoEditorProps> = ({
  file,
  zoom,
  editCode,
  error,
  compilationResult,
}) => {
  // Use file.content if defined; if not, fallback to editCode (if provided)
  const initialContent =
    file.content !== undefined && file.content !== "undefined"
      ? file.content
      : editCode || "";
  const [content, setContent] = useState(initialContent);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // When file changes externally, load its latest content from IndexedDB.
  useEffect(() => {
    const loadContent = async () => {
      const latestFile = await getNodeById(file.id);
      if (latestFile) {
        setContent(latestFile.content || "");
        setIsDirty(false);
      }
    };
    loadContent();
  }, [file.id]);

  const { updateActiveFileContent } = useEditor();

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const updatedFile = {
        ...file,
        content,
        updatedAt: Date.now(),
      };
      await updateNode(updatedFile);
      setIsDirty(false);
    } catch (error) {
      console.error("Failed to save file:", error);
      alert("Failed to save file. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // When the editor changes, update local state and context.
  const handleEditorChange = (value: string | undefined) => {
    const newValue = value || "";
    setContent(newValue);
    setIsDirty(true);
    updateActiveFileContent(newValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault();
      if (!isSaving && isDirty) {
        handleSave();
      }
    }
  };

  // Global keyboard save shortcut
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (!isSaving && isDirty) {
          handleSave();
        }
      }
    };
    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      document.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [isDirty, isSaving]);

  const getLanguage = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "js":
        return "javascript";
      case "ts":
        return "typescript";
      case "jsx":
        return "javascript";
      case "tsx":
        return "typescript";
      case "json":
        return "json";
      case "md":
        return "markdown";
      case "sol":
        return "solidity";
      default:
        return "plaintext";
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="bg-gray-50 border-b px-4 py-2 flex justify-between items-center">
        <div className="flex items-center gap-2">
          {isDirty && (
            <span className="text-sm text-gray-500">(unsaved changes)</span>
          )}
        </div>
      </div>
      <div className="flex-1 relative" style={{ minHeight: "200px" }}>
        <Editor
          height="100%"
          defaultLanguage={getLanguage(file.name)}
          value={content}
          theme="vs-light"
          onChange={handleEditorChange}
          options={{
            fontSize: 14,
            minimap: { enabled: false },
            automaticLayout: true,
            lineNumbers: "on",
            roundedSelection: false,
            readOnly: false,
            cursorStyle: "line",
          }}
          onKeyDown={handleKeyDown}
          loading={<div className="p-4">Loading editor...</div>}
        />
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
  );
};

export default MonacoEditor;
