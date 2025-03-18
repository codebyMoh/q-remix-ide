"use client";
import React, { useEffect, useState } from "react";
import { useDebugger } from "../context/DebuggerContext";
import { useEditor } from "../context/EditorContext";
import { FileSystemNode } from "../types";

const SourceCodeViewer: React.FC = () => {
  const { isDebugging, currentState } = useDebugger();
  const { allFiles, highlightCode } = useEditor();
  
  const [currentFile, setCurrentFile] = useState<FileSystemNode | null>(null);
  const [currentLine, setCurrentLine] = useState<number | null>(null);
  
  useEffect(() => {
    if (!isDebugging || !currentState?.callStack || currentState.callStack.length === 0) {
      return;
    }
    
    // Get the topmost call stack item
    const topCall = currentState.callStack[currentState.callStack.length - 1];
    
    if (topCall.sourceLocation) {
      // Find the file in allFiles
      const file = allFiles.find(f => f.name === topCall.sourceLocation?.file);
      
      if (file) {
        setCurrentFile(file);
        setCurrentLine(topCall.sourceLocation.start);
        
        // Highlight the code in the editor
        highlightCode(
          topCall.sourceLocation.file,
          topCall.sourceLocation.start,
          topCall.sourceLocation.end
        );
      }
    }
  }, [currentState, allFiles, highlightCode, isDebugging]);
  
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
      <div className="bg-gray-100 p-2 text-sm font-medium border-b">
        {currentFile.name} {currentLine !== null ? `- Line ${currentLine}` : ''}
      </div>
      
      <div className="flex-1 overflow-auto">
        {/* The actual code is displayed in the Monaco Editor via the highlightCode function */}
        <div className="p-4">
          <p className="text-sm text-gray-600">
            The code is being displayed in the main editor. Source mapping is active.
          </p>
          
          {currentState?.callStack && currentState.callStack.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
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
      </div>
    </div>
  );
};

export default SourceCodeViewer;