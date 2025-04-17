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
  const TRIGGER_CHARS = [" ", "(", "{", ".", ">", "<", "=", "+", "-", "*", "/", "&", "|", "!", "?", ":", ";", ",", "\n", "@"];

  // Solidity keywords and snippets
  const SOLIDITY_KEYWORDS = [
    'pragma', 'solidity', 'contract', 'function', 'returns', 'memory',
    'storage', 'calldata', 'address', 'uint', 'bool', 'string', 'public',
    'private', 'internal', 'external', 'view', 'pure', 'payable', 'event',
    'emit', 'constructor', 'modifier', 'require', 'if', 'else', 'for',
    'while', 'do', 'break', 'continue', 'return', 'import', 'is', 'interface',
    'library', 'struct', 'enum', 'mapping', 'using', 'assembly', 'try', 'catch',
    'revert', 'selfdestruct', 'delegatecall', 'staticcall', 'callcode', 'call',
    'transfer', 'send', 'balance', 'gas', 'block', 'msg', 'tx', 'now', 'this',
    'super', 'virtual', 'override', 'abstract', 'immutable', 'constant', 'indexed'
  ];

  // Common OpenZeppelin imports
  const OPENZEPPELIN_IMPORTS = [
    '@openzeppelin/contracts/token/ERC20/ERC20.sol',
    '@openzeppelin/contracts/token/ERC721/ERC721.sol',
    '@openzeppelin/contracts/token/ERC1155/ERC1155.sol',
    '@openzeppelin/contracts/access/Ownable.sol',
    '@openzeppelin/contracts/security/ReentrancyGuard.sol',
    '@openzeppelin/contracts/security/Pausable.sol',
    '@openzeppelin/contracts/utils/Counters.sol',
    '@openzeppelin/contracts/utils/Strings.sol',
    '@openzeppelin/contracts/utils/Address.sol',
    '@openzeppelin/contracts/utils/Context.sol',
    '@openzeppelin/contracts/utils/math/SafeMath.sol',
    '@openzeppelin/contracts/utils/cryptography/ECDSA.sol',
    '@openzeppelin/contracts/utils/cryptography/MerkleProof.sol',
    '@openzeppelin/contracts/proxy/utils/Initializable.sol',
    '@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol',
    '@openzeppelin/contracts/governance/utils/IVotes.sol',
    '@openzeppelin/contracts/governance/Governor.sol',
    '@openzeppelin/contracts/governance/TimelockController.sol'
  ];

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
        border-left: 2px solid #0070f3;
        display: inline-block;
        pointer-events: none;
      }
      .multiline-ghost {
        border-left: 2px solid #0070f3;
        padding-left: 8px;
        margin-top: 4px;
        background: rgba(0, 112, 243, 0.08);
        display: block;
        pointer-events: none;
      }
    `;
    document.head.appendChild(style);

    let currentGhostTextDecoration: monaco.editor.IEditorDecorationsCollection | null = null;
    let currentTabHandler: monaco.IDisposable | null = null;
    let currentSuggestion: string | null = null;
    let currentAIRequest: AbortController | null = null;

    // Register Monaco's default completion provider for Solidity
    monaco.languages.registerCompletionItemProvider("solidity", {
      triggerCharacters: [".", " ", "(", "{", "=", "\n", "@", ";", ":", ",", "+", "-", "*", "/", "&", "|", "!", "?", "<", ">"],
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
        
        // Get context from previous lines
        const context = model.getValueInRange({
          startLineNumber: Math.max(1, position.lineNumber - 10),
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column
        });
        
        return `Here's the relevant code around my cursor: ${beforeText}`;
      }
    }
    
    // Fallback to first 500 chars
    return `Here's the file context: ${fullContent.substring(0, 500)}${fullContent.length > 500 ? '...' : ''}`;
  };
  
  const extractCodeFromResponse = (response: string) => {
    // Extract code blocks from markdown response
    const codeBlockRegex = /```(?:\w+)?\s*([\s\S]*?)```/g;
    const matches = [...response.matchAll(codeBlockRegex)];
    
    if (matches.length > 0) {
      return matches[0][1].trim();
    }
    
    // If no code blocks, return the whole response
    return response;
  };
  
  // Insert the suggestion directly into the editor
  const insertSuggestion = (suggestion: string) => {
    if (!editorRef.current || !monacoRef.current || !cursorPosition) return;
    
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const model = editor.getModel();
    
    if (!model) return;
    
    // Insert the suggestion at cursor
    const suggestionId = 'ai-suggestion-' + Date.now();
    
    // Step 1: Insert the suggestion at the cursor position
    editor.executeEdits('ai-suggestion', [{
      range: {
        startLineNumber: cursorPosition.lineNumber,
        startColumn: cursorPosition.column,
        endLineNumber: cursorPosition.lineNumber,
        endColumn: cursorPosition.column
      },
      text: suggestion,
      forceMoveMarkers: true
    }]);
    
    // Step 2: Calculate the range where we inserted the suggestion
    const endPosition = model.getPositionAt(
      model.getOffsetAt(cursorPosition) + suggestion.length
    );
    
    const suggestionRange = new monaco.Range(
      cursorPosition.lineNumber,
      cursorPosition.column,
      endPosition.lineNumber,
      endPosition.column
    );
    
    // Step 3: Add decoration to highlight the suggestion
    // const decorations = editor.deltaDecorations([], [
    //   {
    //     range: suggestionRange,
    //     options: {
    //       inlineClassName: 'ai-suggestion-highlight',
    //       stickiness: monaco.editor.TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges,
    //       className: 'ai-suggestion-highlight',
    //       isWholeLine: false,
    //       afterContentClassName: 'ai-suggestion-controls'
    //     }
    //   }
    // ]);
    const decorationIds = editor.deltaDecorations([], [
      {
        range: suggestionRange,
        options: {
          inlineClassName: 'ai-suggestion-highlight',
          stickiness: monaco.editor.TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges,
          className: 'ai-suggestion-highlight',
          isWholeLine: false,
          afterContentClassName: 'ai-suggestion-controls'
        }
      }
    ]);
    
    editor._aiDecorationIds = decorationIds;    
    
    
    // // Store the decoration ID to remove it later
    // editor._aiDecorationId = decorations[0];
    
    // Step 4: Add inline controls after the suggestion
    const lineAfter = endPosition.lineNumber;
    const columnAfter = endPosition.column;
    
    // Add a content widget for the accept/reject controls
    const controlsWidget = {
      getId: function() {
        return 'ai-suggestion-controls';
      },
      getDomNode: function() {
        const containerEl = document.createElement('span');
        containerEl.className = 'ai-controls-container';
        containerEl.style.cssText = `
          display: inline-flex;
          align-items: center;
          margin-left: 8px;
          vertical-align: middle;
        `;
        
        // Update the part where you define the controls widget in the insertSuggestion function
// Look for the part where you create acceptBtn and rejectBtn and update their onclick handlers

// Store the current values that will be needed for accept/reject
const capturedSuggestion = suggestion;
const capturedCursorPosition = cursorPosition;


// Add these new functions for use with the button click handlers
const acceptSuggestionWithCapture = (editor: any, suggestion: string, position: monaco.Position) => {
  try {
    // Keep the suggestion in the editor
    const currentContent = editor.getValue();
    
    // Move cursor to the end of the suggestion
    const model = editor.getModel();
    if (model && position) {
      const endPosition = model.getPositionAt(
        model.getOffsetAt(position) + suggestion.length
      );
      editor.setPosition(endPosition);
      editor.focus();
    }

    // Clean up UI elements
    if (editor._aiDecorationIds) {
      editor.deltaDecorations(editor._aiDecorationIds, []);
      editor._aiDecorationIds = [];
    }
    
    if (editor._aiControlsWidget) {
      editor.removeContentWidget(editor._aiControlsWidget);
      editor._aiControlsWidget = undefined;
    }
    
    if (editor._aiSuggestionDisposable) {
      editor._aiSuggestionDisposable.dispose();
      editor._aiSuggestionDisposable = undefined;
    }
    
    if (editor._aiStyleElement && editor._aiStyleElement.parentNode) {
      editor._aiStyleElement.parentNode.removeChild(editor._aiStyleElement);
      editor._aiStyleElement = undefined;
    }
    
    // Update React state
    setContent(currentContent);
    setIsDirty(true);
    updateActiveFileContent(currentContent);
    setAiSuggestion(null);
    setCursorPosition(null);
    
  } catch (error) {
    console.error("Error accepting suggestion:", error);
  }
};

const rejectSuggestionWithCapture = (editor: any, suggestion: string, position: monaco.Position) => {
  try {
    const model = editor.getModel();
    if (!model) {
      console.error("Monaco model is missing during rejection.");
      return;
    }

    let editApplied = false;

    // Remove the suggestion text using decoration range if available
    const decorationIds = editor._aiDecorationIds;
    if (decorationIds?.length) {
      const decorationRange = model.getDecorationRange(decorationIds[0]);
      if (decorationRange) {
        editor.executeEdits("reject-suggestion", [
          { range: decorationRange, text: "" },
        ]);
        editApplied = true;
      }
    }

    // Fallback: calculate the range from position and suggestion length
    if (!editApplied && position) {
      const endPosition = model.getPositionAt(
        model.getOffsetAt(position) + suggestion.length
      );
      editor.executeEdits("reject-suggestion", [
        {
          range: {
            startLineNumber: position.lineNumber,
            startColumn: position.column,
            endLineNumber: endPosition.lineNumber,
            endColumn: endPosition.column,
          },
          text: "",
        },
      ]);
    }

    // Update state with content after rejection
    const newContent = editor.getValue();
    
    // Restore cursor to original position
    if (position) {
      editor.setPosition(position);
      editor.focus();
    }

    // Clean up UI elements
    if (editor._aiDecorationIds) {
      editor.deltaDecorations(editor._aiDecorationIds, []);
      editor._aiDecorationIds = [];
    }
    
    if (editor._aiControlsWidget) {
      editor.removeContentWidget(editor._aiControlsWidget);
      editor._aiControlsWidget = undefined;
    }
    
    if (editor._aiSuggestionDisposable) {
      editor._aiSuggestionDisposable.dispose();
      editor._aiSuggestionDisposable = undefined;
    }
    
    if (editor._aiStyleElement && editor._aiStyleElement.parentNode) {
      editor._aiStyleElement.parentNode.removeChild(editor._aiStyleElement);
      editor._aiStyleElement = undefined;
    }
    
    // Update React state
    setContent(newContent);
    setIsDirty(true);
    updateActiveFileContent(newContent);
    setAiSuggestion(null);
    setCursorPosition(null);
    
  } catch (error) {
    console.error("Error rejecting suggestion:", error);
  }
};

// Use the existing capturedCursorPosition or rename if necessary
const capturedCursorPositionCopy = { ...cursorPosition }; // Clone to ensure we keep a stable copy

// Accept button
const acceptBtn = document.createElement('button');
acceptBtn.innerHTML = '✓';
acceptBtn.title = 'Accept (Tab)';
acceptBtn.style.cssText = `
  padding: 2px 6px;
  margin-right: 4px;
  background-color: #CE192D;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 11px;
  line-height: 1;
`;
acceptBtn.onclick = (e) => {
  e.preventDefault();
  e.stopPropagation();
  if (editor && capturedSuggestion) {
    acceptSuggestionWithCapture(editor, capturedSuggestion, capturedCursorPosition);
  }
};

// Reject button
const rejectBtn = document.createElement('button');
rejectBtn.innerHTML = '✗';
rejectBtn.title = 'Reject (Esc)';
rejectBtn.style.cssText = `
  padding: 2px 6px;
  background-color: gray;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 11px;
  line-height: 1;
`;
rejectBtn.onclick = (e) => {
  e.preventDefault();
  e.stopPropagation();
  if (editor && capturedSuggestion && capturedCursorPosition) {
    rejectSuggestionWithCapture(editor, capturedSuggestion, capturedCursorPosition);
  }
};
        
        containerEl.appendChild(acceptBtn);
        containerEl.appendChild(rejectBtn);
        return containerEl;
      },
      getPosition: function() {
        return {
          position: endPosition,
          preference: [monaco.editor.ContentWidgetPositionPreference.AFTER]
        };
      }
    };
    
    // Add the widget to the editor
    editor.addContentWidget(controlsWidget);
    editor._aiControlsWidget = controlsWidget;
    
    // Add keyboard handlers for Tab and Esc
    const disposable = editor.onKeyDown((e) => {
      if (e.keyCode === monaco.KeyCode.Tab && aiSuggestion) {
        // Tab key - accept suggestion
        e.preventDefault();
        e.stopPropagation();
        acceptSuggestion();
      } else if (e.keyCode === monaco.KeyCode.Escape && aiSuggestion) {
        // Esc key - reject suggestion
        e.preventDefault();
        e.stopPropagation();
        rejectSuggestion();
      }
    });
    
    // Store disposable to clean up later
    editor._aiSuggestionDisposable = disposable;
    
    // Add some CSS for the highlight
    const styleEl = document.createElement('style');
    styleEl.innerHTML = `
      .ai-suggestion-highlight {
        background-color: rgba(86, 182, 255, 0.1);
        border-bottom: 1px dashed #56b6ff;
      }
    `;
    document.head.appendChild(styleEl);
    editor._aiStyleElement = styleEl;
  };
  
  const acceptSuggestion = () => {
    if (!editorRef.current || !aiSuggestion) {
      console.warn("Cannot accept suggestion: Missing editor or suggestion.");
      return;
    }
  
    try {
      const editor = editorRef.current;
      const currentContent = editor.getValue();
      
      setContent(currentContent);
      setIsDirty(true);
      updateActiveFileContent(currentContent);
  
      if (cursorPosition) {
        const model = editor.getModel();
        if (model) {
          const endPosition = model.getPositionAt(
            model.getOffsetAt(cursorPosition) + aiSuggestion.length
          );
          editor.setPosition(endPosition);
          editor.focus();
          console.log("Cursor moved to end of accepted suggestion at:", endPosition);
        }
      }
  
      console.log("Suggestion accepted. Cleaning up UI.");
      cleanupSuggestionUI();
    } catch (error) {
      console.error("Error accepting suggestion:", error);
    }
  };
  
  
  const rejectSuggestion = () => {
    if (!editorRef.current || !aiSuggestion || !cursorPosition) {
      console.warn("Cannot reject suggestion: Missing editor, suggestion, or cursor position.");
      return;
    }
  
    try {
      const editor = editorRef.current;
      const model = editor.getModel();
      if (!model) {
        console.error("Monaco model is missing during rejection.");
        return;
      }
  
      let editApplied = false;
  
      const decorationIds = editor._aiDecorationIds;
      if (decorationIds?.length) {
        const decorationRange = model.getDecorationRange(decorationIds[0]);
        if (decorationRange) {
          editor.executeEdits("reject-suggestion", [
            { range: decorationRange, text: "" },
          ]);
          console.log("Suggestion rejected using decoration range:", decorationRange);
          editApplied = true;
        }
      }
  
      if (!editApplied) {
        const endPosition = model.getPositionAt(
          model.getOffsetAt(cursorPosition) + aiSuggestion.length
        );
        editor.executeEdits("reject-suggestion", [
          {
            range: {
              startLineNumber: cursorPosition.lineNumber,
              startColumn: cursorPosition.column,
              endLineNumber: endPosition.lineNumber,
              endColumn: endPosition.column,
            },
            text: "",
          },
        ]);
        console.log("Suggestion rejected using fallback position range.");
      }
  
      const newContent = editor.getValue();
      setContent(newContent);
      setIsDirty(true);
      updateActiveFileContent(newContent);
  
      editor.setPosition(cursorPosition);
      editor.focus();
  
      console.log("Editor updated and focused back after rejecting suggestion.");
      cleanupSuggestionUI();
    } catch (error) {
      console.error("Error rejecting suggestion:", error);
    }
  };
  
  const cleanupSuggestionUI = () => {
    try {
      if (!editorRef.current) {
        console.debug("Editor reference not available for cleanup.");
        return false;
      }
  
      const editor = editorRef.current;
      const cleanupOperations = {
        decorations: false,
        widget: false,
        listener: false,
        style: false,
        state: false
      };
  
      if (Array.isArray(editor._aiDecorationIds) && editor._aiDecorationIds.length) {
        editor.deltaDecorations(editor._aiDecorationIds, []);
        editor._aiDecorationIds = [];
        cleanupOperations.decorations = true;
        console.log("AI decorations removed.");
      }
  
      if (editor._aiControlsWidget) {
        editor.removeContentWidget(editor._aiControlsWidget);
        editor._aiControlsWidget = undefined;
        cleanupOperations.widget = true;
        console.log("AI control widget removed.");
      }
  
      if (editor._aiSuggestionDisposable) {
        editor._aiSuggestionDisposable.dispose();
        editor._aiSuggestionDisposable = undefined;
        cleanupOperations.listener = true;
        console.log("AI suggestion listener disposed.");
      }
  
      if (editor._aiStyleElement && editor._aiStyleElement.parentNode) {
        editor._aiStyleElement.parentNode.removeChild(editor._aiStyleElement);
        editor._aiStyleElement = undefined;
        cleanupOperations.style = true;
        console.log("AI style element removed.");
      }
  
      setAiSuggestion(null);
      setCursorPosition(null);
      cleanupOperations.state = true;
      console.log("AI state reset (suggestion & cursor).");
  
      editor._lastCleanupReason = "manual";
  
      console.debug("Copilot suggestion UI cleanup complete:", cleanupOperations);
      return true;
    } catch (error) {
      console.error("Error during copilot suggestion cleanup:", error);
  
      try {
        if (editorRef.current) {
          setAiSuggestion(null);
          setCursorPosition(null);
          console.warn("Emergency fallback: AI state forcibly cleared.");
        }
      } catch (recoveryError) {
        console.error("Failed recovery attempt during cleanup:", recoveryError);
      }
  
      return false;
    }
  };
  
  
  // Capture editor instance on mount
  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    
    // Add keyboard shortcut for AI prompt (Ctrl+I)
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyI,
      handleShowPromptInput
    );
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
            <div className="p-3 border-b border-gray-100 rounded-t-lg">
              <h3 className="text-sm text-[#94969C]  font-medium">AI Code Assistant</h3>
            </div>
            <form onSubmit={handleFetchSuggestion} className="p-3">
              <input
                ref={promptInputRef}
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Ask for code, explanations, or fixes..."
                className="w-full px-3 py-2 border border-gray-300   text-sm text-gray-600 rounded-md focus:outline-none"
                autoFocus
              />
              <div className="flex justify-end gap-2 mt-3">
                <button
                  type="button"
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  onClick={handleHidePromptInput}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-[26px] py-2 text-sm font-medium text-white bg-red-500 rounded-md hover:bg-red-600"
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