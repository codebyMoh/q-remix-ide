"use client";
import React, { createContext, useContext, useState } from "react";
import type { FileSystemNode } from "../types";

export interface ContractData {
  contractName: string;
  abi: any[];
  byteCode: string;
}

export interface EditorContextProps {
  files: FileSystemNode[];
  activeFileId: string | null;
  activeFile: FileSystemNode | null;
  onFileSelect: (file: FileSystemNode | null) => void;
  onCloseFile: (fileId: string) => void;
  allFiles: FileSystemNode[];
  setAllFiles: (files: FileSystemNode[]) => void;
  updateActiveFileContent: (content: string) => void;
  compiledContracts: ContractData[];
  setCompiledContracts: (contracts: ContractData[]) => void;
  compileFile: (file: FileSystemNode, compilerVersion?: string) => Promise<void>;
}

const EditorContext = createContext<EditorContextProps | undefined>(undefined);

export const EditorProvider = ({ children }: { children: React.ReactNode }) => {
  const [openFiles, setOpenFiles] = useState<FileSystemNode[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [allFiles, setAllFiles] = useState<FileSystemNode[]>([]);
  const [compiledContracts, setCompiledContracts] = useState<ContractData[]>([]);

  const handleFileSelect = (file: FileSystemNode | null) => {
    if (!file || file.type !== "file") return;

    if (!openFiles.find((f) => f.id === file.id)) {
      setOpenFiles((prev) => [...prev, file]);
    }
    setActiveFileId(file.id);
  };

  const handleCloseFile = (fileId: string) => {
    setOpenFiles((prev) => prev.filter((f) => f.id !== fileId));

    if (activeFileId === fileId) {
      const remainingFiles = openFiles.filter((f) => f.id !== fileId);
      setActiveFileId(
        remainingFiles.length > 0
          ? remainingFiles[remainingFiles.length - 1].id
          : null
      );
    }
  };

  const updateActiveFileContent = (content: string) => {
    setOpenFiles((prev) =>
      prev.map((f) => (f.id === activeFileId ? { ...f, content } : f))
    );
  };

  const compileFile = async (file: FileSystemNode, compilerVersion = "0.8.26+commit.8a97fa7a") => {
    if (!file || !file.content || !file.name.endsWith(".sol")) {
      console.error("Invalid file for compilation:", file);
      return;
    }

    console.log("EditorContext - Compiling file:", file.name);
    const worker = new Worker(new URL("../workers/solc.worker.ts", import.meta.url), { type: "module" });

    const timestamp = Date.now();
    worker.postMessage({
      contractCode: file.content,
      filename: file.name,
      compilerVersion,
      timestamp,
    });

    return new Promise<void>((resolve, reject) => {
      worker.onmessage = (event) => {
        if (event.data.error) {
          console.error("EditorContext - Compilation error:", event.data.error);
          reject(new Error(event.data.error));
        } else {
          const contracts = Array.isArray(event.data.contracts) ? event.data.contracts : [];
          console.log("EditorContext - Compilation result:", contracts);
          setCompiledContracts(contracts);
          resolve();
        }
        worker.terminate();
      };

      worker.onerror = (err) => {
        console.error("EditorContext - Worker error:", err);
        reject(err);
        worker.terminate();
      };
    });
  };

  const activeFile = openFiles.find((f) => f.id === activeFileId) || null;

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