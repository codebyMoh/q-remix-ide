"use client";
import React, { createContext, useContext, useState, useRef } from "react";
import type { FileSystemNode } from "../types";
import type { EditorRef } from "../components/MonacoEditor"; // Add this import

export interface EditorContextProps {
  // Files currently open in the editor
  files: FileSystemNode[];
  // ID of the currently active file
  activeFileId: string | null;
  // The currently active file object
  activeFile: FileSystemNode | null;
  // Handler for selecting/opening a file
  onFileSelect: (file: FileSystemNode | null) => void;
  // Handler for closing a file
  onCloseFile: (fileId: string) => void;
  allFiles: FileSystemNode[];
  setAllFiles: (files: FileSystemNode[]) => void;
  updateActiveFileContent: (content: string) => void;
  compiledContracts: ContractData[];
  setCompiledContracts: (contracts: ContractData[]) => void;
  compileFile: (file: FileSystemNode, compilerVersion?: string) => Promise<void>;
  highlightCode: (file: string, line: number, end?: number) => void; // Add this line
}

const EditorContext = createContext<EditorContextProps | undefined>(undefined);

export const EditorProvider = ({ children }: { children: React.ReactNode }) => {
  // State for tracking open files
  const [openFiles, setOpenFiles] = useState<FileSystemNode[]>([]);
  // State for tracking the active file ID
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [allFiles, setAllFiles] = useState<FileSystemNode[]>([]);
  const [compiledContracts, setCompiledContracts] = useState<ContractData[]>([]);
  const editorRef = useRef<EditorRef | null>(null); // Add this line

  // Add this function
  const setEditorRef = (ref: EditorRef | null) => {
    editorRef.current = ref;
  };

  const handleFileSelect = (file: FileSystemNode | null) => {
    if (!file || file.type !== "file") return;

    // Add file to openFiles if it's not already open
    if (!openFiles.find((f) => f.id === file.id)) {
      setOpenFiles((prev) => [...prev, file]);
    }

    // Set as active file
    setActiveFileId(file.id);
  };

  // Handler for closing a file
  const handleCloseFile = (fileId: string) => {
    // Existing code...
  };

  const updateActiveFileContent = (content: string) => {
    // Existing code...
  };

  const compileFile = async (file: FileSystemNode, compilerVersion = "0.8.26+commit.8a97fa7a") => {
    // Existing code...
  };

  // Add this function
  const highlightCode = (fileName: string, line: number, end?: number) => {
    // First, find the file by name
    const file = allFiles.find(f => f.name === fileName);
    if (!file) {
      console.error(`File ${fileName} not found`);
      return;
    }

    // If the file isn't currently active, select it first
    if (activeFileId !== file.id) {
      handleFileSelect(file);
      // We need to wait for the file to load before highlighting
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.highlightCode(line, end);
        }
      }, 100);
    } else {
      // File is already active, highlight immediately
      if (editorRef.current) {
        editorRef.current.highlightCode(line, end);
      }
    }
  };

  const activeFile = openFiles.find((f) => f.id === activeFileId) || null;

  // Debug logging
  useEffect(() => {}, [openFiles, activeFileId]);

  // Provide context values
  const contextValue: EditorContextProps = {
    files: openFiles,
    activeFileId,
    activeFile,
    onFileSelect: handleFileSelect,
    onCloseFile: handleCloseFile,
    allFiles,
    setAllFiles,
    updateActiveFileContent,
    compiledContracts,
    setCompiledContracts,
    compileFile,
    highlightCode, // Add this line
  };

  return (
    <EditorContext.Provider value={contextValue}>
      {children}
    </EditorContext.Provider>
  );
};

export const useEditor = () => {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error("useEditor must be used within an EditorProvider");
  }
  return context;
};
