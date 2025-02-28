import { useState,useEffect } from "react";
import type { FileSystemNode } from "./types";

const useEditor = () => {
  const [openFiles, setOpenFiles] = useState<FileSystemNode[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);


  
  const handleFileSelect = (file: FileSystemNode | null) => {
    if (!file || file.type !== "file") return;

    if (!openFiles.find((f) => f.id === file.id)) {
      setOpenFiles((prev) => [...prev, file]);
    }
    setActiveFileId(file.id);
  
  };
  console.log("op enFiles", openFiles);
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

  const activeFile = openFiles.find((f) => f.id === activeFileId);


  return {
    files: openFiles,
    activeFileId: activeFileId,
    onFileSelect: handleFileSelect,
    onCloseFile: handleCloseFile,
    activeFile: activeFile,
  };
};

export default useEditor;
