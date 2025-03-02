"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import type { FileSystemNode } from "../types";

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
}

const EditorContext = createContext<EditorContextProps | undefined>(undefined);

export const EditorProvider = ({ children }: { children: React.ReactNode }) => {
  // State for tracking open files
  const [openFiles, setOpenFiles] = useState<FileSystemNode[]>([]);
  // State for tracking the active file ID
  const [activeFileId, setActiveFileId] = useState<string | null>("Home");
  const [showHome, setShowHome] = useState(true);
  // Handler for selecting/opening a file
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
    // Remove file from openFiles
    setOpenFiles((prev) => prev.filter((f) => f.id !== fileId));

    // If the closed file was active, set a new active file
    if (activeFileId === fileId) {
      const remainingFiles = openFiles.filter((f) => f.id !== fileId);
      setActiveFileId(
        remainingFiles.length > 0
          ? remainingFiles[remainingFiles.length - 1].id
          : null
      );
    }
  };

  // Find the active file object
  const activeFile = openFiles.find((f) => f.id === activeFileId) || null;

  // Debug logging
  useEffect(() => {
    if (openFiles.length == 0 && activeFileId !== "editor") {
      if (showHome) {
        setActiveFileId("Home");
      } else {
        setActiveFileId("editor");
      }
    } else if (openFiles.length != 0 && activeFileId === "editor") {
      setActiveFileId(openFiles[openFiles.length - 1].id);
    }
  }, [openFiles, activeFileId, handleCloseFile]);

  // Provide context values
  const contextValue: EditorContextProps = {
    files: openFiles,
    activeFileId,
    activeFile,
    onFileSelect: handleFileSelect,
    onCloseFile: handleCloseFile,
    setActiveFileId,
    showHome,
    setShowHome,
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
