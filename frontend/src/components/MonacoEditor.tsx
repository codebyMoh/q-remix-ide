import React, { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { updateNode, getNodeById } from "../utils/IndexDB";
import type { FileSystemNode } from "../types";

interface MonacoEditorProps {
  file: FileSystemNode;
  zoom: number;
}

const MonacoEditor: React.FC<MonacoEditorProps> = ({
  file,
  editCode,
  error,
  compilationResult,
}) => {
  const [content, setContent] = useState(
    file.content == "undefined" ? editCode : file.content
  );
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadContent = async () => {
      const latestFile = await getNodeById(file.id);
      if (latestFile) {
        setContent(latestFile.content || '');
        setIsDirty(false);
      }
    };
    loadContent();
  }, [file.id]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const updatedFile = {
        ...file,
        content,
        updatedAt: Date.now()
      };
      await updateNode(updatedFile);
      setIsDirty(false);
    } catch (error) {
      console.error('Failed to save file:', error);
      alert('Failed to save file. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      if (!isSaving && isDirty) {
        handleSave();
      }
    }
  };
  // Capture global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault(); // Prevent browser's default save dialog
        if (!isSaving && isDirty) {
          handleSave();
        }
      }
    };

      document.addEventListener('keydown', handleKeyDown);
    return () => {
        document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDirty, isSaving, handleSave]);

  const getLanguage = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
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
          onChange={(value) => {
            setContent(value || '');
            setIsDirty(true);
          }}
          options={{
            fontSize: 14,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            lineNumbers: "on",
            roundedSelection: false,
            scrollBeyondLastLine: false,
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
