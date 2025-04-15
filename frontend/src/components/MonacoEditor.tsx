"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import Editor, { Monaco, OnMount } from "@monaco-editor/react";
import { getNodeById, updateNode } from "../utils/IndexDB";
import type { FileSystemNode } from "../types";
import { useEditor } from "../context/EditorContext";
import axios from "axios";
import * as monaco from 'monaco-editor';

// Add API URL configuration
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Create axios instance with default config
const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add simple retry logic
const fetchWithRetry = async (url: string, options: any, maxRetries = 2) => {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      const response = await axiosInstance(options);
      return response;
    } catch (error) {
      if (i === maxRetries) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  throw new Error('Failed after retries');
};

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
  const [showPromptInput, setShowPromptInput] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isFetchingSuggestion, setIsFetchingSuggestion] = useState(false);
  const promptInputRef = useRef<HTMLInputElement>(null);

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
  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Register Solidity language
    monaco.languages.register({ id: 'solidity' });

    // Define Solidity syntax highlighting
    monaco.languages.setMonarchTokensProvider('solidity', {
      keywords: [
        'pragma', 'solidity', 'contract', 'function', 'returns', 'memory',
        'storage', 'calldata', 'address', 'uint', 'bool', 'string', 'public',
        'private', 'internal', 'external', 'view', 'pure', 'payable', 'event',
        'emit', 'constructor', 'modifier', 'require', 'if', 'else', 'for',
        'while', 'do', 'break', 'continue', 'return', 'import', 'is'
      ],
      tokenizer: {
        root: [
          [/\/\/.*/, 'comment'],
          [/\/\*/, 'comment', '@comment'],
          [/(contract|function|event|struct|enum|modifier|interface|library)\b/, 'keyword'],
          [/["'].*["']/, 'string'],
          [/[0-9]+/, 'number'],
          [/\b(address|uint256|bool|string)\b/, 'type'],
          [/(\bpublic\b|\bprivate\b|\binternal\b|\bexternal\b)/, 'modifier'],
        ],
        comment: [
          [/[^\/*]+/, 'comment'],
          [/\*\//, 'comment', '@pop'],
          [/[\/*]/, 'comment']
        ]
      }
    });

    monaco.editor.defineTheme("my-light-theme", {
      base: "vs",
      inherit: true,
      rules: [
        { token: "keyword", foreground: "0070f3", fontStyle: "bold" },
        { token: "type", foreground: "D73A49" },
        { token: "number", foreground: "098658" },
        { token: "string", foreground: "A31515" },
        { token: "comment", foreground: "6A9955" },
        { token: "modifier", foreground: "C586C0" },
      ],
      colors: {
        "editor.foreground": "#000000",
        "editor.background": "#FFFFFF",
      },
    });

    // Add CSS for ghost text
    const style = document.createElement('style');
    style.textContent = `
      .ghost-text {
        color: #666;
        opacity: 0.9;
        font-family: inherit;
        padding-left: 4px;
        background: rgba(0, 112, 243, 0.08);
        border-radius: 3px;
        margin-left: 2px;
      }
      .multiline-ghost {
        border-left: 2px solid #0070f3;
        padding-left: 8px;
        margin-top: 4px;
        background: rgba(0, 112, 243, 0.08);
      }
    `;
    document.head.appendChild(style);

    let currentGhostTextDecoration: monaco.editor.IEditorDecorationsCollection | null = null;
    let currentTabHandler: monaco.IDisposable | null = null;
    let currentSuggestion: string | null = null;
    let currentAIRequest: AbortController | null = null;

    // Register Monaco's default completion provider for Solidity
    monaco.languages.registerCompletionItemProvider("solidity", {
      triggerCharacters: [".", " "],
      provideCompletionItems: (model: monaco.editor.ITextModel, position: monaco.Position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn
        };

        // Get current line text
        const lineContent = model.getLineContent(position.lineNumber);
        const wordBeforeCursor = lineContent.substring(0, position.column - 1).trim().split(/\s+/).pop() || "";

        // Define common Solidity snippets
        const suggestions = [
          {
            label: "pragma solidity",
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: "pragma solidity ^0.8.0;",
            detail: "Specify Solidity version",
            documentation: "Declares the Solidity compiler version",
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range
          },
          {
            label: "contract",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: [
              "contract ${1:ContractName} {",
              "\t// State variables",
              "\taddress public owner;",
              "\t",
              "\t// Constructor",
              "\tconstructor() {",
              "\t\towner = msg.sender;",
              "\t}",
              "\t",
              "\t$0",
              "}"
            ].join('\n'),
            detail: "Create a new contract",
            documentation: "Creates a new Solidity contract with basic structure",
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range
          },
          {
            label: "function",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: [
              "function ${1:functionName}(${2:parameters}) ${3:public} ${4:returns (${5:returnType})} {",
              "\t$0",
              "}"
            ].join('\n'),
            detail: "Create a new function",
            documentation: "Declares a new function with customizable visibility and return type",
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range
          },
          {
            label: "event",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "event ${1:EventName}(${2:address indexed sender}, ${3:uint256 value});",
            detail: "Declare an event",
            documentation: "Creates a new event declaration",
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range
          },
          {
            label: "modifier",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: [
              "modifier ${1:modifierName}() {",
              "\t${2:require(msg.sender == owner, \"Not authorized\");}",
              "\t_;",
              "}"
            ].join('\n'),
            detail: "Create a modifier",
            documentation: "Creates a new modifier for function access control",
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range
          },
          // Data types
          { label: "uint256", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "uint256", range },
          { label: "address", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "address", range },
          { label: "bool", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "bool", range },
          { label: "string", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "string", range },
          { label: "bytes32", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "bytes32", range },
          
          // Common statements
          {
            label: "require",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'require(${1:condition}, "${2:error message}");',
            detail: "Add a require statement",
            documentation: "Adds a condition check that reverts if false",
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range
          },
          {
            label: "mapping",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "mapping(${1:keyType} => ${2:valueType})",
            detail: "Create a mapping",
            documentation: "Declares a new mapping type",
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range
          }
        ];

        // Add visibility modifiers if after a function declaration
        if (wordBeforeCursor === "function") {
          return {
            suggestions: [
              { label: "public", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "public", range },
              { label: "private", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "private", range },
              { label: "internal", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "internal", range },
              { label: "external", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "external", range }
            ]
          };
        }

        return { suggestions };
      }
    });

    // Register AI completion provider separately
    const aiProvider = monaco.languages.registerCompletionItemProvider("solidity", {
      triggerCharacters: [" ", ".", "(", "{", "=", "\n"],
      provideCompletionItems: async (model: monaco.editor.ITextModel, position: monaco.Position) => {
        try {
          // Get current line and position info
          const lineContent = model.getLineContent(position.lineNumber);
          
          // Get context from previous lines
          const context = model.getValueInRange({
            startLineNumber: Math.max(1, position.lineNumber - 3),
            startColumn: 1,
            endLineNumber: position.lineNumber,
            endColumn: position.column
          });

          // Don't make API call if context is too short
          if (context.trim().length < 2) {
            return { suggestions: [] };
          }

          // Cancel previous request if any
          if (currentAIRequest) {
            currentAIRequest.abort();
          }

          const controller = new AbortController();
          currentAIRequest = controller;

          // Make API request with proper error handling
          try {
            console.log('Making AI request with context:', context);
            const response = await axiosInstance.post('/generate', 
              { prompt: context },
              { 
                signal: controller.signal,
                timeout: 10000
              }
            );

            console.log('AI response:', response.data);

            if (!response?.data?.suggestion) {
              console.log('No suggestion in response');
              return { suggestions: [] };
            }

            const suggestion = response.data.suggestion.trim();
            if (!suggestion) {
              console.log('Empty suggestion after trim');
              return { suggestions: [] };
            }

            // Clear existing decorations
            if (currentGhostTextDecoration) {
              currentGhostTextDecoration.clear();
              currentGhostTextDecoration = null;
            }
            if (currentTabHandler) {
              currentTabHandler.dispose();
              currentTabHandler = null;
            }

            // Store suggestion and create decoration
            currentSuggestion = suggestion;
            const isMultiline = suggestion.includes("\n");

            // Create ghost text decoration with better visibility
            currentGhostTextDecoration = editor.createDecorationsCollection([{
              range: {
                startLineNumber: position.lineNumber,
                startColumn: position.column,
                endLineNumber: position.lineNumber,
                endColumn: position.column
              },
              options: {
                isWholeLine: false,
                after: {
                  content: suggestion,
                  inlineClassName: 'ghost-text'
                },
                className: isMultiline ? 'multiline-ghost' : ''
              }
            }]);

            // Handle Tab key press
            currentTabHandler = editor.onKeyDown((e: monaco.IKeyboardEvent) => {
              if (e.keyCode === monaco.KeyCode.Tab && currentSuggestion) {
                e.preventDefault();
                e.stopPropagation();

                const insertText = currentSuggestion;
                const insertPosition = editor.getPosition();
                if (!insertPosition) return;

                editor.executeEdits('ai-suggestion', [{
                  range: {
                    startLineNumber: insertPosition.lineNumber,
                    startColumn: insertPosition.column,
                    endLineNumber: insertPosition.lineNumber,
                    endColumn: insertPosition.column
                  },
                  text: insertText
                }]);

                // Clear ghost text
                if (currentGhostTextDecoration) {
                  currentGhostTextDecoration.clear();
                  currentGhostTextDecoration = null;
                }

                // Move cursor to end of inserted text
                const lines = insertText.split('\n');
                const lastLineLength = lines[lines.length - 1].length;
                const newPosition = {
                  lineNumber: insertPosition.lineNumber + lines.length - 1,
                  column: lines.length === 1 
                    ? insertPosition.column + lastLineLength 
                    : lastLineLength + 1
                };
                editor.setPosition(newPosition);

                currentSuggestion = null;
                if (currentTabHandler) {
                  currentTabHandler.dispose();
                  currentTabHandler = null;
                }
              }
            });

            return { suggestions: [] };
          } catch (error: any) {
            if (axios.isCancel(error)) {
              console.log('Request was cancelled');
            } else {
              console.error('AI suggestion error:', error?.message || error);
            }
            return { suggestions: [] };
          }
        } catch (error) {
          console.error('Provider error:', error);
          return { suggestions: [] };
        }
      }
    });

    // Clean up providers on unmount
    return () => {
      aiProvider.dispose();
      if (currentGhostTextDecoration) {
        currentGhostTextDecoration.clear();
      }
      if (currentTabHandler) {
        currentTabHandler.dispose();
      }
    };
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

  const handleFetchSuggestion = async () => {
    if (!aiPrompt.trim()) return;
    setIsFetchingSuggestion(true);
    try {
      const response = await fetch("http://localhost:8000/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: aiPrompt }),
      });
      const data = await response.json();
      if (data.suggestion) {
        setContent((prev) => prev + "\n" + data.suggestion);
      }
    } catch (error) {
      console.error("Error fetching suggestion:", error);
    } finally {
      setIsFetchingSuggestion(false);
      setShowPromptInput(false);
      setAiPrompt("");
    }
  };

  const handleHidePromptInput = () => {
    setShowPromptInput(false);
    setAiPrompt("");
  };

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
        
        {/* AI Prompt Input Modal */}
        {showPromptInput && (
          <div className="absolute left-1/2 top-8 transform -translate-x-1/2 z-10 bg-white rounded-lg shadow-lg border border-gray-200 w-96">
            <div className="p-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
              <h3 className="text-sm font-medium">AI Code Assistant</h3>
            </div>
            <form onSubmit={handleFetchSuggestion} className="p-3">
              <input
                ref={promptInputRef}
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Ask for code, explanations, or fixes..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <div className="flex justify-end gap-2 mt-3">
                <button
                  type="button"
                  className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
                  onClick={handleHidePromptInput}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  disabled={!aiPrompt.trim() || isFetchingSuggestion}
                >
                  {isFetchingSuggestion ? 'Fetching...' : 'Get Suggestion'}
                </button>
              </div>
            </form>
          </div>
        )}
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