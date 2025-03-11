"use client";
import React, { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import { getNodeById, updateNode } from "../utils/IndexDB";
import type { FileSystemNode } from "../types";
import { useEditor } from "../context/EditorContext";
import * as monaco from "monaco-editor";
import "monaco-editor/esm/vs/basic-languages/solidity/solidity.contribution";


interface MonacoEditorProps {
  file: FileSystemNode;
  zoom: number;
  editCode?: string;
  error?: string;
  compilationResult?: any;
}


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

const MonacoEditor: React.FC<MonacoEditorProps> = ({
  file,
  error,
  code,
  compilationResult,
}) => {
  const [content, setContent] = useState(file?.content || code);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const editorRef = useRef<any>(null);

  useEffect(() => {
    const loadContent = async () => {
      const latestFile = await getNodeById(file?.id);
      if (latestFile) {
        setContent(latestFile.content || "");
        setIsDirty(false);
      }
    };
    loadContent();
  }, [file?.id]);

  const { updateActiveFileContent } = useEditor();

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      // Ensure we fetch latest content directly from Monaco Editor
      const latestContent = editorRef.current?.getValue() || content;

      const updatedFile = {
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

  // Capture editor instance on mount
  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
  };

  // When the editor changes, update local state and context.
  const handleEditorChange = (value: string | undefined) => {
    const newValue = value || "";
    setContent(newValue);
    setIsDirty(true);
    updateActiveFileContent(newValue);
  };

  // Handle Ctrl + S save
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
    const ext = fileName?.split('.').pop()?.toLowerCase();
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
  useEffect(() => {
    monaco.languages.registerCompletionItemProvider("solidity", {
      provideCompletionItems: (model, position) => {
        const wordUntil = model.getWordUntilPosition(position);
        const range = new monaco.Range(
          position.lineNumber,
          wordUntil.startColumn,
          position.lineNumber,
          wordUntil.endColumn
        );
        console.log("Available languages:", monaco.languages.getLanguages());
        return {
          suggestions: [
            {
              label: "pragma solidity",
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: "pragma solidity ^0.8.0;",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range,
            },
            {
              label: "contract",
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText:
                "contract ${1:ContractName} {\n\t$0\n}",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range,
            },
            {
              label: "function",
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText:
                "function ${1:myFunction}() public {\n\t$0\n}",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range,
            },
            {
              label: "mapping",
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText:
                "mapping(${1:keyType} => ${2:valueType}) public ${3:myMapping};",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range,
            },
            {
              label: "event",
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText:
                "event ${1:EventName}(${2:Type} indexed ${3:param});",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range,
            },
          ],
        };
      },
    });
  }, []);
 
  console.log(monaco.languages.getLanguages().find(lang => lang.id === "solidity"));


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
