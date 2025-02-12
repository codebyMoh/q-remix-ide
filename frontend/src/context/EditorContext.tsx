"use client";
import React, { createContext, useContext, useState } from "react";

export interface FileType {
  name: string;
  content: string;
  language: string;
}

export interface EditorContextProps {
  files: FileType[];
  currentFile: FileType | null;
  setFiles: React.Dispatch<React.SetStateAction<FileType[]>>;
  setCurrentFile: React.Dispatch<React.SetStateAction<FileType | null>>;
}

const EditorContext = createContext<EditorContextProps | undefined>(undefined);

export const EditorProvider = ({ children }: { children: React.ReactNode }) => {
  const [files, setFiles] = useState<FileType[]>([]);
  const [currentFile, setCurrentFile] = useState<FileType | null>(null);

  return (
    <EditorContext.Provider value={{ files, setFiles, currentFile, setCurrentFile }}>
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
