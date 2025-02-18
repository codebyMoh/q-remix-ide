import React, { useState, useEffect, useRef } from "react";
import {JsfileIcon,JsonfileIcon,SolidityfileIcon,TsfileIcon,Folder,Readme,Code} from "@/assets/index";
import { initDB, saveFile, deleteFile, listFiles } from "@/utils/IndexDB";
const useFileWorkspace = () => {
  const [selectedWorkspace, setSelectedWorkspace] =
    useState("Default Workspace");
  const [isExpanded, setIsExpanded] = useState(true);
  const [folders, setFolders] = useState<any[]>([]);
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<number | null>(null);
  const [showNewFileInput, setShowNewFileInput] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [expandedFolders, setExpandedFolders] = useState({});
  const [hoveredFolder, setHoveredFolder] = useState(null);
  const [hoveredFile, setHoveredFile] = useState(null);
  const folderInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const createFolder = async () => {
    if (newFolderName.trim()) {
      const folderExists = folders.some(
        (folder) => folder.name === newFolderName
      );
      if (folderExists) {
        alert("A folder with this name already exists!");
        return;
      }
      const newFolder = { name: newFolderName, type: "folder", files: [] };
      await saveFile(newFolderName, newFolder);
      const updatedFolders = await listFiles();
      setFolders(updatedFolders);
      setNewFolderName("");
      setShowNewFolderInput(false);
    }
  };

  const toggleFolder = (folderName: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderName]: !prev[folderName],
    }));
  };

  const createFile = async () => {
    if (newFileName.trim() && selectedFolder !== null) {
      const folderName = folders[selectedFolder].name;
      const newFile = { name: newFileName, type: "file" };
      const updatedFolder = { ...folders[selectedFolder] };

      // Check if file already exists
      const fileExists = updatedFolder.files.some(
        (file) => file.name === newFileName
      );
      if (fileExists) {
        alert("A file with this name already exists!");
        return;
      }
      updatedFolder.files.push(newFile);
      updatedFolder.files.sort((a, b) => a.name.localeCompare(b.name));

      await saveFile(folderName, updatedFolder);

      const updatedFolders = await listFiles();
      setFolders(updatedFolders);

      setNewFileName("");
      setShowNewFileInput(false);
      setSelectedFolder(null);
    }
  };

  const handleDeleteFolder = async (folderName) => {
    await deleteFile(folderName);
    const updatedFolders = await listFiles();
    setFolders(updatedFolders);
  };

  const handleDeleteFile = async (folderIndex, fileName) => {
    const updatedFolder = { ...folders[folderIndex] };
    updatedFolder.files = updatedFolder.files.filter(
      (file) => file.name !== fileName
    );

    await saveFile(updatedFolder.name, updatedFolder);
    const updatedFolders = await listFiles();
    setFolders(updatedFolders);
  };

  const handleFolderClick = (index: number) => {
    setSelectedFolder(index);
    toggleFolder(folders[index].name);
  };

  const handleFileKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      createFile();
    } else if (e.key === "Escape") {
      setShowNewFileInput(false);
      setNewFileName("");
      setSelectedFolder(null);
    }
  };

  const handleFolderKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      createFolder();
    } else if (e.key === "Escape") {
      setShowNewFolderInput(false);
      setNewFolderName("");
    }
  };

  const getIconForType = (type) => {
    const extension = type?.split(".").pop() || "unknown";
    switch (extension) {
      case "folder":
        return <Folder className="w-5 h-5 text-gray-500" />;
      case "code":
        return <Code className="w-[16px] h-[16px] text-gray-500" />;
      case "md":
        return <Readme className="w-[16px] h-[16px] text-gray-500" />;
      case "sol":
        return <SolidityfileIcon className="w-[16px] h-[16px] text-gray-500" />;
      case "js":
        return <JsfileIcon className="w-[16px] h-[16px] text-gray-500" />;
      case "json":
        return <JsonfileIcon className="w-[16px] h-[16px] text-gray-500" />;
      case "ts":
        return <TsfileIcon className="w-[16px] h-[16px] text-gray-500" />;
      default:
        return <Readme className="w-[16px] h-[16px] text-gray-500" />;
    }
  };

  return {
    selectedWorkspace,
    isExpanded,
    setIsExpanded,
    folders,
    setFolders,
    showNewFolderInput,
    setShowNewFolderInput,
    newFolderName,
    setNewFolderName,
    createFolder,
    createFile,
    handleDeleteFolder,
    handleDeleteFile,
    handleFolderClick,
    handleFileKeyPress,
    handleFolderKeyPress,
    getIconForType,
    selectedFolder,
    setSelectedFolder,
    showNewFileInput,
    setShowNewFileInput,
    expandedFolders,
    setExpandedFolders,
    hoveredFolder,
    setHoveredFolder,
    hoveredFile,
    setHoveredFile,
    folderInputRef,
    fileInputRef,
    initDB,
    saveFile,
    deleteFile,
    listFiles,
    newFileName,
     setNewFileName
  };
};

export default useFileWorkspace;
