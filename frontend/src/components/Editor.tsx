"use client";
import { useState, useRef } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';

// Temporary file structure until context is implemented
const initialFiles = [
  {
    name: "contracts",
    type: "folder",
    isOpen: true,
    children: [
      { name: "MyContract.sol", type: "file", content: "// SPDX-License-Identifier: MIT\n\npragma solidity ^0.8.0;\n\ncontract MyContract {\n    // Your contract code here\n}" },
    ]
  },
  {
    name: "scripts",
    type: "folder",
    isOpen: false,
    children: [
      { name: "deploy.js", type: "file", content: "// Deployment script" }
    ]
  },
  {
    name: "tests",
    type: "folder",
    isOpen: false,
    children: [
      { name: "test.js", type: "file", content: "// Test cases" }
    ]
  }
];

const EditorComponent = () => {
  const [code, setCode] = useState<string>('// Select a file to start editing');
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [files, setFiles] = useState(initialFiles);
  const editorRef = useRef<any>(null);

  const handleEditorDidMount = (editor: any, monaco: Monaco) => {
    editorRef.current = editor;
  
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
  
    // Define custom colors
    monaco.editor.defineTheme('solidity-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '569CD6' },  // Blue
        { token: 'type', foreground: '4EC9B0' },     // Greenish
        { token: 'modifier', foreground: 'C586C0' }, // Purple
        { token: 'comment', foreground: '6A9955' },  // Green
        { token: 'string', foreground: 'CE9178' },   // Red
        { token: 'number', foreground: 'B5CEA8' },   // Light green
      ],
      colors: {
        'editor.foreground': '#D4D4D4',
        'editor.background': '#1E1E1E',
        'editorCursor.foreground': '#FFFFFF',
        'editor.lineHighlightBackground': '#2A2D2E',
        'editorLineNumber.foreground': '#858585',
        'editor.selectionBackground': '#264F78',
      }
    });
  
    monaco.editor.setTheme('solidity-dark');
  };
  

  const handleFileClick = (file: any) => {
    if (file.type === 'file') {
      setCurrentFile(file.name);
      setCode(file.content || '');
    }
  };

  return (
    <div className="flex h-full bg-[#1E1E1E]">
      {/* File Tree */}
      <div className="w-64 bg-[#252526] border-r border-[#333333] overflow-y-auto">
        <div className="p-4">
          <FileTree files={files} onFileClick={handleFileClick} />
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1">
        <Editor
          height="100vh"
          theme="vs-dark"
          
          language="solidity"
          value={code}
          onChange={(value) => setCode(value || '')}
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: true },
            fontSize: 14,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: 'on',
            formatOnPaste: true,
            formatOnType: true,
            lineNumbers: 'on',
            glyphMargin: true,
            folding: true,
            renderLineHighlight: 'all',
            scrollbar: {
              vertical: 'hidden',
              horizontal: 'hidden',
              handleMouseWheel: true
            },
          }}
        />
      </div>
    </div>
  );
};

// File Tree Components
const FileTree = ({ files, onFileClick }: { files: any[], onFileClick: (file: any) => void }) => {
  return (
    <div className="text-[#CCCCCC]">
      {files.map((file, index) => (
        <FileTreeNode key={index} file={file} onFileClick={onFileClick} />
      ))}
    </div>
  );
};

const FileTreeNode = ({ file, onFileClick }: { file: any, onFileClick: (file: any) => void }) => {
  const [isOpen, setIsOpen] = useState(file.isOpen || false);

  return (
    <div className="ml-2">
      <div 
        className="flex items-center hover:bg-[#2A2D2E] px-2 py-1 rounded cursor-pointer transition-colors"
        onClick={() => {
          if (file.type === 'folder') {
            setIsOpen(!isOpen);
          } else {
            onFileClick(file);
          }
        }}
      >
        {file.type === 'folder' && (
          <span className={`mr-2 transition-transform ${isOpen ? 'rotate-90' : ''}`}>
            ▸
          </span>
        )}
        <span className="text-sm">
          {file.name}
          {file.type === 'file' && (
            <span className="ml-2 text-xs text-[#666666]">
              {file.name.split('.').pop()}
            </span>
          )}
        </span>
      </div>
      {isOpen && file.children && (
        <div className="ml-4">
          <FileTree files={file.children} onFileClick={onFileClick} />
        </div>
      )}
    </div>
  );
};

export default EditorComponent;