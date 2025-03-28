"use client";
import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import Editor, { Monaco } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import { getNodeById, updateNode } from "../utils/IndexDB";
import type { FileSystemNode } from "../types";
import { useEditor } from "../context/EditorContext";
import { useDebugger } from '../context/DebuggerContext';

interface MonacoEditorProps {
  file: FileSystemNode;
  zoom: number;
  editCode?: string;
  error?: string;
  compilationResult?: any;
}

export interface EditorRef {
  highlightCode: (line: number, end?: number) => void;
}

const MonacoEditor = forwardRef<EditorRef, MonacoEditorProps>(({
  file,
  zoom,
  editCode,
  error,
  compilationResult,
}, ref) => {
  // Use file.content if defined; if not, fallback to editCode (if provided)
  const initialContent =
    file.content !== undefined && file.content !== "undefined"
      ? file.content
      : editCode || "";
  const [content, setContent] = useState(initialContent);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeDecorations, setActiveDecorations] = useState<string[]>([]);
  const editorRef = useRef<any>(null);
  const { updateActiveFileContent } = useEditor();

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
    
    // Clear decorations when file changes
    if (editorRef.current && activeDecorations.length > 0) {
      editorRef.current.deltaDecorations(activeDecorations, []);
      setActiveDecorations([]);
    }
  }, [file.id, activeDecorations]);

  const handleEditorDidMount = (editor: any, _monaco: Monaco) => {
    editorRef.current = editor;
  };

  // Highlight code implementation
  const highlightCode = useCallback((line: number, end?: number) => {
    if (!editorRef.current) {
      console.error("Editor reference not available");
      return;
    }
    
    const endLineToUse = end || line;
    
    // Clear previous decorations
    if (activeDecorations.length > 0) {
      editorRef.current.deltaDecorations(activeDecorations, []);
    }
    
    // Create a decoration for the highlighted line(s)
    const decorations = editorRef.current.deltaDecorations([], [{
      range: new monaco.Range(line, 1, endLineToUse, 1),
      options: {
        isWholeLine: true,
        className: 'debug-line',
        glyphMarginClassName: 'debug-line-glyph',
        linesDecorationsClassName: 'debug-line-decoration',
        marginClassName: 'debug-line-margin'
      }
    }]);
    
    // Scroll the editor to make the highlighted line visible
    editorRef.current.revealLineInCenter(line);
    
    // Store the decoration IDs so they can be removed later
    setActiveDecorations(decorations);
  }, [activeDecorations]);

  // Add global styles for debug line highlighting
  useEffect(() => {
    // Add global styles for Monaco Editor debug highlighting
    const style = document.createElement('style');
    style.textContent = `
      .debug-line {
        background-color: rgba(33, 150, 243, 0.1) !important;
        border-left: 3px solid #2196f3 !important;
      }
      .debug-line-glyph {
        background-color: #2196f3;
        width: 3px !important;
        margin-left: 5px;
      }
      .debug-line-decoration {
        background-color: #2196f3;
        width: 3px !important;
      }
      .debug-line-margin {
        background-color: #2196f3;
        width: 3px !important;
      }
      .monaco-editor .margin-view-overlays .debug-line-glyph {
        background-color: #2196f3;
      }
      .monaco-editor .current-line {
        border: none !important;
        background-color: rgba(33, 150, 243, 0.1) !important;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Expose the highlightCode function
  useImperativeHandle(ref, () => ({
    highlightCode
  }));

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

  const getLanguage = (fileName: string): string => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "js":
      case "jsx":
        return "javascript";
      case "ts":
      case "tsx":
        return "typescript";
      case "json":
        return "json";
      case "md":
        return "markdown";
      case "sol":
        return "solidity";
      case "css":
        return "css";
      case "html":
        return "html";
      default:
        return "plaintext";
    }
  };

  return (
    <div className="flex flex-col h-full" onKeyDown={handleKeyDown}>
      <div className="bg-gray-50 border-b px-4 py-2 flex justify-between items-center">
        <div className="flex items-center gap-2">
          {isDirty && (
            <span className="text-sm text-gray-500">(unsaved changes)</span>
          )}
        </div>
        {isDirty && (
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="px-2 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        )}
      </div>
      <div className="flex-1 relative" style={{ minHeight: "200px" }}>
        <Editor
          height="100%"
          defaultLanguage={getLanguage(file.name)}
          value={content}
          theme="vs-light"
          onChange={handleEditorChange}
          options={{
            fontSize: 14 * (zoom || 1),
            minimap: { enabled: false },
            automaticLayout: true,
            lineNumbers: "on",
            roundedSelection: false,
            readOnly: false,
            cursorStyle: "line",
          }}
          onMount={handleEditorDidMount}
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
});

MonacoEditor.displayName = "MonacoEditor";

export default MonacoEditor;