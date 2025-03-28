"use client";
import React, { useEffect, useState, useRef } from "react";
import { useDebugger } from "../context/DebuggerContext";
import { useEditor } from "../context/EditorContext";
import { FileSystemNode } from "../types";
import dynamic from "next/dynamic";
import type { editor } from 'monaco-editor';

// Import Monaco Editor dynamically
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
});

const SourceCodeViewer: React.FC = () => {
  const { isDebugging, currentState, currentStep } = useDebugger();
  const { allFiles, highlightCode } = useEditor();
  
  const [currentFile, setCurrentFile] = useState<FileSystemNode | null>(null);
  const [currentLine, setCurrentLine] = useState<number | null>(null);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const decorationsRef = useRef<string[]>([]);
  
  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
  };

  useEffect(() => {
    if (!isDebugging || !currentState?.callStack || currentState.callStack.length === 0) {
      return;
    }
    
    // Get the current opcode and gas info
    const opcode = currentState.opcodes?.current || '';
    const pc = currentState.opcodes?.pc || 0;
    const gasCost = currentState.opcodes?.gasCost || 0;
    const gasRemaining = currentState.opcodes?.gasRemaining || 0;
    
    // Get the topmost call stack item
    const topCall = currentState.callStack[currentState.callStack.length - 1];
    
    if (topCall.sourceLocation) {
      // Find the file in allFiles
      const file = allFiles.find(f => f.name === topCall.sourceLocation?.file);
      
      if (file) {
        setCurrentFile(file);
        const lineNumber = topCall.sourceLocation.start;
        setCurrentLine(lineNumber);
        
        // Add line decoration for current debug line
        if (editorRef.current) {
          // Remove previous decorations
          if (decorationsRef.current.length > 0) {
            editorRef.current.deltaDecorations(decorationsRef.current, []);
          }

          // Create the line decoration content
          const lineDecoration = {
            range: new (window as any).monaco.Range(lineNumber, 1, lineNumber, 1),
            options: {
              isWholeLine: true,
              className: 'debug-line',
              glyphMarginClassName: 'debug-line-glyph',
              linesDecorationsClassName: 'debug-line-decoration',
              after: {
                content: ` ${opcode} (Gas Cost: ${gasCost}, Remaining: ${gasRemaining}, PC: ${pc})`,
                inlineClassName: 'debug-line-info'
              }
            }
          };

          // Apply new decorations
          const newDecorations = editorRef.current.deltaDecorations(
            [],
            [lineDecoration]
          );
          decorationsRef.current = newDecorations;

          // Reveal the line in the editor with some context
          editorRef.current.revealLineInCenter(lineNumber);
        }
      }
    } else {
      // If no source location, show a message in the editor
      if (editorRef.current) {
        const message = `${opcode} (No source mapping available)`;
        const decoration = {
          range: new (window as any).monaco.Range(1, 1, 1, 1),
          options: {
            isWholeLine: true,
            className: 'debug-line',
            glyphMarginClassName: 'debug-line-glyph',
            after: {
              content: message,
              inlineClassName: 'debug-line-info'
            }
          }
        };
        
        const newDecorations = editorRef.current.deltaDecorations(
          decorationsRef.current,
          [decoration]
        );
        decorationsRef.current = newDecorations;
      }
    }
  }, [currentState, allFiles, highlightCode, isDebugging, currentStep]);
  
  if (!isDebugging || !currentFile) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-gray-400">
          No source code to display
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-full flex flex-col">
      <style jsx global>{`
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
        .debug-line-info {
          color: #888;
          font-style: italic;
          margin-left: 1em;
          font-family: monospace;
          font-size: 12px;
        }
        .monaco-editor .margin-view-overlays .debug-line-glyph {
          background-color: #2196f3;
        }
        .monaco-editor .current-line {
          border: none !important;
          background-color: rgba(33, 150, 243, 0.1) !important;
        }
      `}</style>
      
      <div className="bg-gray-100 p-2 text-sm font-medium border-b">
        {currentFile.name} {currentLine !== null ? `- Line ${currentLine}` : ''}
      </div>
      
      <div className="flex-1 overflow-hidden">
        <MonacoEditor
          height="100%"
          language="solidity"
          theme="vs-dark"
          value={currentFile.content}
          onMount={handleEditorDidMount}
          options={{
            readOnly: true,
            minimap: { enabled: false },
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            folding: true,
            wordWrap: "on",
            glyphMargin: true,
            lineDecorationsWidth: 5,
            contextmenu: false,
            scrollbar: {
              vertical: 'visible',
              horizontal: 'visible'
            }
          }}
        />
      </div>
      
      {currentState?.callStack && currentState.callStack.length > 0 && (
        <div className="p-4 bg-gray-100 border-t">
          <h3 className="font-medium mb-2">Current Execution Context</h3>
          {currentState.callStack.map((call, index) => (
            <div key={index} className="mb-1 text-sm">
              {index === currentState.callStack.length - 1 ? '→ ' : '  '}
              <span className="font-mono">{call.functionName}</span>
              {call.sourceLocation && (
                <span className="text-gray-500 ml-2">
                  ({call.sourceLocation.file}:{call.sourceLocation.start})
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SourceCodeViewer;