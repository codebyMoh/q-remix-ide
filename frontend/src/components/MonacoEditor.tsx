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

  useEffect(() => {
    const loadContent = async () => {
      const latestFile = await getNodeById(file.id);
      if (latestFile) {
        setContent(latestFile.content || '');
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

  const { updateActiveFileContent } = useEditor();

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
        className: 'debugger-highlighted-line',
        glyphMarginClassName: 'debugger-breakpoint-glyph'
      }
    }]);
    
    // Scroll the editor to make the highlighted line visible
    editorRef.current.revealLineInCenter(line);
    
    // Store the decoration IDs so they can be removed later
    setActiveDecorations(decorations);
  }, [activeDecorations]);

  // Expose the highlightCode function
  useImperativeHandle(ref, () => ({
    highlightCode
  }));

  const handleSave = async () => {
    // Existing code...
  };

  const handleEditorChange = (value: string | undefined) => {
    // Existing code...
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Existing code...
  };
  // Capture global keyboard shortcuts
  useEffect(() => {
    // Existing code...
  }, [isDirty, isSaving]);

  const getLanguage = (fileName: string): string | undefined => {
    // Implement logic to determine the language based on the file name
    if (fileName.endsWith('.ts') || fileName.endsWith('.tsx')) {
      return 'typescript';
    } else if (fileName.endsWith('.js') || fileName.endsWith('.jsx')) {
      return 'javascript';
    } else if (fileName.endsWith('.css')) {
      return 'css';
    } else if (fileName.endsWith('.html')) {
      return 'html';
    }
    return undefined;
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

export default MonacoEditor;