"use client";
import React, { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import { getNodeById, updateNode } from "../utils/IndexDB";
import type { FileSystemNode } from "../types";
import { useEditor } from "../context/EditorContext";
import axios from "axios";

interface MonacoEditorProps {
  file?: FileSystemNode;
  zoom?: number;
  editCode?: string;
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
  const [content, setContent] = useState(file?.content || code || "");
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const editorRef = useRef<any>(null);
  const { updateActiveFileContent } = useEditor();

  useEffect(() => {
    const loadContent = async () => {
      if (file?.id) {
        const latestFile = await getNodeById(file.id);
        if (latestFile) {
          setContent(latestFile.content || "");
          setIsDirty(false);
        }
      }
    };
    loadContent();
  }, [file?.id]);

  const handleSave = async () => {
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
  };

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;

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

    import("monaco-editor/esm/vs/basic-languages/solidity/solidity.contribution")
      .then(() => {
        console.log("Solidity contribution loaded");

        // Register AI completion provider
        const disposable = monaco.languages.registerCompletionItemProvider("solidity", {
          triggerCharacters: [" ", "(", "{", ".", ">", "<", "=", "+", "-", "*", "/", "&", "|", "!", "?", ":", ";", ","],
          provideCompletionItems: async (
            model: monaco.editor.ITextModel,
            position: monaco.Position
          ) => {
            console.log("Completion provider triggered"); // Debug 1
            const textUntilPosition = model.getValueInRange({
              startLineNumber: 1,
              startColumn: 1,
              endLineNumber: position.lineNumber,
              endColumn: position.column,
            });
            console.log("Text until position:", textUntilPosition); // Debug 2

            const wordUntil = model.getWordUntilPosition(position);
            const range = new monaco.Range(
              position.lineNumber,
              wordUntil.startColumn,
              position.lineNumber,
              wordUntil.endColumn
            );

            try {
              console.log("Sending AI request..."); // Debug 3
              const response = await axios.post("/api/ai-suggestion", {
                prompt: textUntilPosition,
              });
              console.log("AI response:", response.data); // Debug 4
              const suggestion = response.data.suggestion || "No suggestion from AI";

              return {
                suggestions: [
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
              console.error("AI completion error:", error); // Debug 5
              return {
                suggestions: [
                  {
                    label: "ERROR: AI Failed",
                    kind: monaco.languages.CompletionItemKind.Text,
                    insertText: "AI suggestion failed",
                    detail: "Check console",
                    range,
                  },
                ],
              };
            }
          },
        });

        // Log when provider is registered
        console.log("Completion provider registered"); // Debug 6
      })
      .catch((err) => console.error("Failed to load Solidity contribution:", err));
  };

  const handleEditorChange = (value: string | undefined) => {
    const newValue = value || "";
    setContent(newValue);
    setIsDirty(true);
    updateActiveFileContent(newValue);
  };

  const getLanguage = (fileName?: string) => {
    const ext = fileName?.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "js": return "javascript";
      case "ts": return "typescript";
      case "jsx": return "javascript";
      case "tsx": return "typescript";
      case "json": return "json";
      case "md": return "markdown";
      case "sol": return "solidity";
      default: return "plaintext";
    }
  };

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
  }, [isDirty, isSaving]);

  return (
    <div className="flex flex-col h-full">
      <div className="bg-gray-50 flex justify-between items-center">
        <div className="flex items-center gap-2">
          {isDirty && (
            <span className="text-sm text-gray-500">(unsaved changes)</span>
          )}
        </div>
      </div>
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