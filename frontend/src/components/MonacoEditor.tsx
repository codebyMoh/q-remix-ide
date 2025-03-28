"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import Editor, { Monaco, OnMount } from "@monaco-editor/react";
import { getNodeById, updateNode } from "../utils/IndexDB";
import type { FileSystemNode } from "../types";
import { useEditor } from "../context/EditorContext";
import axios from "axios";
import * as monaco from 'monaco-editor';

interface MonacoEditorProps {
  file?: FileSystemNode;
  error?: string;
  compilationResult?: any;
  code?: string;
}

const MonacoEditor: React.FC<MonacoEditorProps> = ({
  file,
  error,
  compilationResult,
  code,
}) => {
  // State Management
  const [content, setContent] = useState(file?.content || code || "");
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Refs
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);

  // Context
  const { updateActiveFileContent } = useEditor();

  // Trigger Characters for AI Suggestions
  const TRIGGER_CHARS = [" ", "(", "{", ".", ">", "<", "=", "+", "-", "*", "/", "&", "|", "!", "?", ":", ";", ","];

  // Load File Content
  useEffect(() => {
    const loadContent = async () => {
      if (file?.id) {
        try {
          const latestFile = await getNodeById(file.id);
          if (latestFile) {
            setContent(latestFile.content || "");
            setIsDirty(false);
          }
        } catch (error) {
          console.error("Failed to load file content:", error);
        }
      }
    };
    loadContent();
  }, [file?.id]);

  // Save File Handler
  const handleSave = useCallback(async () => {
    try {
      setIsSaving(true);
      const latestContent = editorRef.current?.getValue() || content;
      
      if (!file?.id) {
        throw new Error("File ID is required for saving");
      }
      
      const updatedFile: FileSystemNode = {
        ...file,
        content: latestContent,
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
  }, [file, content]);

  // Editor Mount Handler
  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Custom Theme
    monaco.editor.defineTheme("my-light-theme", {
      base: "vs",
      inherit: true,
      rules: [
        { token: "keyword", foreground: "0070f3", fontStyle: "bold" },
        { token: "type", foreground: "D73A49" },
        { token: "number", foreground: "098658" },
        { token: "string", foreground: "A31515" },
      ],
      colors: {
        "editor.foreground": "#000000",
        "editor.background": "#FFFFFF",
      },
    });

    // Register Solidity Language Support
    monaco.languages.register({ id: 'solidity' });
    
    // Register AI Completion Provider
    monaco.languages.registerCompletionItemProvider('solidity', {
      triggerCharacters: TRIGGER_CHARS,
      provideCompletionItems: async (model, position) => {
        try {
          const textUntilPosition = model.getValueInRange({
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: position.lineNumber,
            endColumn: position.column,
          });

          const response = await axios.post("/api/ai-suggestion", {
            prompt: textUntilPosition,
          });

          const suggestion = response.data.suggestion || "No suggestion from AI";
          const wordUntil = model.getWordUntilPosition(position);
          const range = new monaco.Range(
            position.lineNumber,
            wordUntil.startColumn,
            position.lineNumber,
            wordUntil.endColumn
          );

          return {
            suggestions: [
              // Standard Solidity Suggestions
              {
                label: "pragma solidity",
                kind: monaco.languages.CompletionItemKind.Keyword,
                insertText: "pragma solidity ^0.8.0;",
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                range,
              },
              {
                label: "contract",
                kind: monaco.languages.CompletionItemKind.Keyword,
                insertText: "contract ${1:ContractName} {\n\t$0\n}",
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                range,
              },
              {
                label: "function",
                kind: monaco.languages.CompletionItemKind.Keyword,
                insertText: "function ${1:myFunction}() public {\n\t$0\n}",
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                range,
              },
              // AI Suggestion
              {
                label: `AI: ${suggestion.slice(0, 20)}...`,
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: suggestion,
                detail: "Generated by AI",
                range,
              }
            ],
          };
        } catch (error) {
          console.error("AI Completion Error:", error);
          return { suggestions: [] };
        }
      }
    });
  };

  // Editor Change Handler
  const handleEditorChange = (value: string | undefined) => {
    const newValue = value || "";
    setContent(newValue);
    setIsDirty(true);
    updateActiveFileContent(newValue);
  };

  // Determine Language Based on File Extension
  const getLanguage = (fileName?: string): string => {
    const ext = fileName?.split(".").pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      js: "javascript",
      ts: "typescript",
      jsx: "javascript", 
      tsx: "typescript",
      json: "json",
      md: "markdown",
      sol: "solidity",
    };
    return languageMap[ext || ""] || "plaintext";
  };

  // Global Save Shortcut
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
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, [isDirty, isSaving, handleSave]);

  return (
    <div className="flex flex-col h-full">
      {/* Status Indicators */}
      <div className="bg-gray-50 flex justify-between items-center">
        {isDirty && (
          <span className="text-sm text-gray-500 p-2">(unsaved changes)</span>
        )}
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 relative" style={{ minHeight: "200px" }}>
        <Editor
          height="100%"
          language={getLanguage(file?.name)}
          value={content}
          theme="my-light-theme"
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          options={{
            fontSize: 14,
            minimap: { enabled: false },
            automaticLayout: true,
            lineNumbers: "on",
            roundedSelection: false,
            readOnly: false,
            cursorStyle: "line",
          }}
          loading={<div className="p-4">Loading editor...</div>}
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2">
          Error: {error}
        </div>
      )}

      {/* Compilation Result Display */}
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