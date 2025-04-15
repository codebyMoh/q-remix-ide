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
        
        // Check if we're inside a contract
        const isInsideContract = context.includes("contract") && context.includes("{") && 
                                context.lastIndexOf("contract") < context.lastIndexOf("{");
        
        // Check if we're inside a function
        const isInsideFunction = context.includes("function") && context.includes("{") && 
                                context.lastIndexOf("function") < context.lastIndexOf("{");
        
        // Check if we're at the beginning of a line
        const isBeginningOfLine = position.column <= 2 || 
                                 lineContent.substring(0, position.column - 1).trim() === "";
        
        // Check if we're typing an import
        const isImporting = lineContent.trim().startsWith("import") || 
                           (isBeginningOfLine && wordBeforeCursor === "");
        
        // Check if we're typing a pragma
        const isPragma = lineContent.trim().startsWith("pragma") || 
                         (isBeginningOfLine && wordBeforeCursor === "");
        
        // Check if we're typing a contract
        const isContract = lineContent.trim().startsWith("contract") || 
                          (isBeginningOfLine && wordBeforeCursor === "");
        
        // Check if we're typing a function
        const isFunction = lineContent.trim().startsWith("function") || 
                          (isBeginningOfLine && wordBeforeCursor === "");
        
        // Check if we're typing an event
        const isEvent = lineContent.trim().startsWith("event") || 
                       (isBeginningOfLine && wordBeforeCursor === "");
        
        // Check if we're typing a modifier
        const isModifier = lineContent.trim().startsWith("modifier") || 
                          (isBeginningOfLine && wordBeforeCursor === "");
        
        // Check if we're typing a mapping
        const isMapping = lineContent.trim().startsWith("mapping") || 
                         (isBeginningOfLine && wordBeforeCursor === "");
        
        // Check if we're typing a require
        const isRequire = lineContent.trim().startsWith("require") || 
                         (isBeginningOfLine && wordBeforeCursor === "");
        
        // Check if we're typing an OpenZeppelin import
        const isOpenZeppelin = lineContent.includes("@openzeppelin") || 
                              (isImporting && wordBeforeCursor === "@");
        
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
          { label: "uint8", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "uint8", range },
          { label: "uint16", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "uint16", range },
          { label: "uint32", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "uint32", range },
          { label: "uint64", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "uint64", range },
          { label: "uint128", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "uint128", range },
          { label: "int256", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "int256", range },
          { label: "int8", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "int8", range },
          { label: "int16", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "int16", range },
          { label: "int32", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "int32", range },
          { label: "int64", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "int64", range },
          { label: "int128", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "int128", range },
          { label: "bytes", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "bytes", range },
          { label: "bytes1", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "bytes1", range },
          { label: "bytes2", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "bytes2", range },
          { label: "bytes3", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "bytes3", range },
          { label: "bytes4", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "bytes4", range },
          { label: "bytes5", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "bytes5", range },
          { label: "bytes6", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "bytes6", range },
          { label: "bytes7", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "bytes7", range },
          { label: "bytes8", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "bytes8", range },
          { label: "bytes9", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "bytes9", range },
          { label: "bytes10", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "bytes10", range },
          { label: "bytes11", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "bytes11", range },
          { label: "bytes12", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "bytes12", range },
          { label: "bytes13", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "bytes13", range },
          { label: "bytes14", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "bytes14", range },
          { label: "bytes15", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "bytes15", range },
          { label: "bytes16", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "bytes16", range },
          { label: "bytes17", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "bytes17", range },
          { label: "bytes18", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "bytes18", range },
          { label: "bytes19", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "bytes19", range },
          { label: "bytes20", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "bytes20", range },
          { label: "bytes21", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "bytes21", range },
          { label: "bytes22", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "bytes22", range },
          { label: "bytes23", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "bytes23", range },
          { label: "bytes24", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "bytes24", range },
          { label: "bytes25", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "bytes25", range },
          { label: "bytes26", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "bytes26", range },
          { label: "bytes27", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "bytes27", range },
          { label: "bytes28", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "bytes28", range },
          { label: "bytes29", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "bytes29", range },
          { label: "bytes30", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "bytes30", range },
          { label: "bytes31", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "bytes31", range },
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
          },
          {
            label: "struct",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: [
              "struct ${1:StructName} {",
              "\t${2:type} ${3:name};",
              "\t$0",
              "}"
            ].join('\n'),
            detail: "Create a struct",
            documentation: "Declares a new struct type",
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range
          },
          {
            label: "enum",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: [
              "enum ${1:EnumName} {",
              "\t${2:Option1},",
              "\t${3:Option2}",
              "\t$0",
              "}"
            ].join('\n'),
            detail: "Create an enum",
            documentation: "Declares a new enum type",
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range
          },
          {
            label: "interface",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: [
              "interface ${1:InterfaceName} {",
              "\t$0",
              "}"
            ].join('\n'),
            detail: "Create an interface",
            documentation: "Declares a new interface",
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range
          },
          {
            label: "library",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: [
              "library ${1:LibraryName} {",
              "\t$0",
              "}"
            ].join('\n'),
            detail: "Create a library",
            documentation: "Declares a new library",
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range
          },
          {
            label: "using",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "using ${1:LibraryName} for ${2:type};",
            detail: "Use a library",
            documentation: "Uses a library for a specific type",
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range
          },
          {
            label: "assembly",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: [
              "assembly {",
              "\t$0",
              "}"
            ].join('\n'),
            detail: "Inline assembly",
            documentation: "Uses inline assembly for low-level operations",
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range
          },
          {
            label: "try",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: [
              "try ${1:contract}.${2:function}(${3:args}) {",
              "\t$0",
              "} catch Error(string memory reason) {",
              "\t",
              "} catch (bytes memory lowLevelData) {",
              "\t",
              "}"
            ].join('\n'),
            detail: "Try-catch block",
            documentation: "Handles external call errors",
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range
          },
          {
            label: "revert",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'revert("${1:error message}");',
            detail: "Revert with message",
            documentation: "Reverts the transaction with an error message",
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range
          },
          {
            label: "selfdestruct",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "selfdestruct(${1:address payable recipient});",
            detail: "Self-destruct contract",
            documentation: "Destroys the contract and sends remaining ETH to recipient",
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range
          },
          {
            label: "delegatecall",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "(bool success, ) = ${1:target}.delegatecall(abi.encodeWithSignature(\"${2:functionSignature}\", ${3:args}));",
            detail: "Delegate call",
            documentation: "Executes a delegate call to another contract",
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range
          },
          {
            label: "staticcall",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "(bool success, ) = ${1:target}.staticcall(abi.encodeWithSignature(\"${2:functionSignature}\", ${3:args}));",
            detail: "Static call",
            documentation: "Executes a static call to another contract",
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range
          },
          {
            label: "call",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "(bool success, ) = ${1:target}.call{value: ${2:amount}}(abi.encodeWithSignature(\"${3:functionSignature}\", ${4:args}));",
            detail: "Call with value",
            documentation: "Executes a call to another contract with ETH value",
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range
          },
          {
            label: "transfer",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "${1:recipient}.transfer(${2:amount});",
            detail: "Transfer ETH",
            documentation: "Transfers ETH to a recipient",
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range
          },
          {
            label: "send",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "${1:recipient}.send(${2:amount});",
            detail: "Send ETH",
            documentation: "Sends ETH to a recipient",
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range
          },
          {
            label: "balance",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "${1:address}.balance",
            detail: "Get balance",
            documentation: "Gets the ETH balance of an address",
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range
          },
          {
            label: "gas",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "gasleft()",
            detail: "Get gas left",
            documentation: "Gets the remaining gas",
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range
          },
          {
            label: "block",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "block.${1|number,timestamp,hash,difficulty,gaslimit,basefee,coinbase|}",
            detail: "Block properties",
            documentation: "Accesses block properties",
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range
          },
          {
            label: "msg",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "msg.${1|sender,value,data,sig|}",
            detail: "Message properties",
            documentation: "Accesses message properties",
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range
          },
          {
            label: "tx",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "tx.${1|origin,gasprice|}",
            detail: "Transaction properties",
            documentation: "Accesses transaction properties",
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range
          },
          {
            label: "now",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "block.timestamp",
            detail: "Current timestamp",
            documentation: "Gets the current block timestamp",
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range
          },
          {
            label: "this",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "this",
            detail: "Current contract",
            documentation: "References the current contract",
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range
          },
          {
            label: "super",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "super.${1:functionName}(${2:args})",
            detail: "Call parent function",
            documentation: "Calls a function from the parent contract",
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range
          },
          {
            label: "virtual",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "virtual",
            detail: "Virtual function",
            documentation: "Marks a function as virtual (can be overridden)",
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range
          },
          {
            label: "override",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "override",
            detail: "Override function",
            documentation: "Marks a function as overriding a parent function",
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range
          },
          {
            label: "abstract",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "abstract",
            detail: "Abstract contract",
            documentation: "Marks a contract as abstract",
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range
          },
          {
            label: "immutable",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "immutable",
            detail: "Immutable variable",
            documentation: "Marks a state variable as immutable",
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range
          },
          {
            label: "constant",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "constant",
            detail: "Constant variable",
            documentation: "Marks a state variable as constant",
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range
          },
          {
            label: "indexed",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "indexed",
            detail: "Indexed event parameter",
            documentation: "Marks an event parameter as indexed",
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
      triggerCharacters: TRIGGER_CHARS,
      provideCompletionItems: async (model: monaco.editor.ITextModel, position: monaco.Position) => {
        try {
          // Get current line and position info
          const lineContent = model.getLineContent(position.lineNumber);
          
          // Get context from previous lines
          const context = model.getValueInRange({
            startLineNumber: Math.max(1, position.lineNumber - 10),
            startColumn: 1,
            endLineNumber: position.lineNumber,
            endColumn: position.column
          });

          // Get the current word being typed
          const word = model.getWordUntilPosition(position);
          const currentWord = word.word;
          
          // Get the word before the cursor
          const wordBeforeCursor = lineContent.substring(0, position.column - 1).trim().split(/\s+/).pop() || "";
          
          // Check if we're at the beginning of a line
          const isBeginningOfLine = position.column <= 2 || 
                                   lineContent.substring(0, position.column - 1).trim() === "";
          
          // Check if we're typing an import
          const isImporting = lineContent.trim().startsWith("import") || 
                             (isBeginningOfLine && wordBeforeCursor === "");
          
          // Check if we're typing a pragma
          const isPragma = lineContent.trim().startsWith("pragma") || 
                           (isBeginningOfLine && wordBeforeCursor === "");
          
          // Check if we're typing a contract
          const isContract = lineContent.trim().startsWith("contract") || 
                            (isBeginningOfLine && wordBeforeCursor === "");
          
          // Check if we're typing a function
          const isFunction = lineContent.trim().startsWith("function") || 
                            (isBeginningOfLine && wordBeforeCursor === "");
          
          // Check if we're typing an event
          const isEvent = lineContent.trim().startsWith("event") || 
                         (isBeginningOfLine && wordBeforeCursor === "");
          
          // Check if we're typing a modifier
          const isModifier = lineContent.trim().startsWith("modifier") || 
                            (isBeginningOfLine && wordBeforeCursor === "");
          
          // Check if we're typing a mapping
          const isMapping = lineContent.trim().startsWith("mapping") || 
                           (isBeginningOfLine && wordBeforeCursor === "");
          
          // Check if we're typing a require
          const isRequire = lineContent.trim().startsWith("require") || 
                           (isBeginningOfLine && wordBeforeCursor === "");
          
          // Check if we're typing an OpenZeppelin import
          const isOpenZeppelin = lineContent.includes("@openzeppelin") || 
                                (isImporting && wordBeforeCursor === "@");
          
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
            // Prepare the prompt data
            const promptData = {
              code: context,
              currentLine: lineContent,
              cursorPosition: position.column,
              currentWord: currentWord,
              wordBeforeCursor: wordBeforeCursor,
              isBeginningOfLine: isBeginningOfLine,
              isImporting: isImporting,
              isPragma: isPragma,
              isContract: isContract,
              isFunction: isFunction,
              isEvent: isEvent,
              isModifier: isModifier,
              isMapping: isMapping,
              isRequire: isRequire,
              isOpenZeppelin: isOpenZeppelin
            };
            
            console.log('Making AI request with context:', context);
            const response = await axiosInstance.post('/generate', 
              { prompt: context, promptData: promptData },
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
            if (isMultiline) {
              // For multiline suggestions, create a separate decoration for each line
              const lines = suggestion.split('\n');
              const decorations = lines.map((line: string, index: number) => ({
                range: {
                  startLineNumber: position.lineNumber + index,
                  startColumn: index === 0 ? position.column : 1,
                  endLineNumber: position.lineNumber + index,
                  endColumn: index === 0 ? position.column : 1
                },
                options: {
                  isWholeLine: false,
                  after: {
                    content: line,
                    inlineClassName: 'ghost-text'
                  },
                  className: index === 0 ? 'multiline-ghost' : ''
                }
              }));
              
              currentGhostTextDecoration = editor.createDecorationsCollection(decorations);
            } else {
              // For single-line suggestions
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
                  }
                }
              }]);
            }

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