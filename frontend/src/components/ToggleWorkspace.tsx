"use client";
import React, { useState, useEffect, useRef } from "react";
import GreenTick from "@/assets/svg/greentick.svg";
import RightArrow from "@/assets/svg/right-arrow.svg";
import Menu from "@/assets/svg/hamburger.svg";
import File from "@/assets/svg/file.svg";
import Folder from "@/assets/svg/folder.svg";
import Upload from "@/assets/svg/upload.svg";
import FolderImport from "@/assets/svg/folder-import.svg";
import Box from "@/assets/svg/box.svg";
import Link from "@/assets/svg/link.svg";
import GitLink from "@/assets/svg/git-link.svg";
import ChevronDown from "@/assets/svg/chevron-down.svg";
import Code from "@/assets/svg/code.svg";
import Readme from "@/assets/svg/readme.svg";
import JsfileIcon from "@/assets/svg/file_type_js.svg";
import JsonfileIcon from "@/assets/svg/file_type_json.svg";
import SolidityfileIcon from "@/assets/svg/file_type_solidity.svg";
import TsfileIcon from "@/assets/svg/file_type_typescript.svg";
import { MdDeleteOutline } from "react-icons/md";
import { MdDriveFileRenameOutline } from "react-icons/md";

import { Urbanist } from "next/font/google";
import {
  initDB,
  saveFile,
  renameFolder,
  renameFile,
  deleteFile,
  listFiles,
} from "@/utils/IndexDB";

const urbanist = Urbanist({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const ToggleWorkspace = () => {
  const [selectedWorkspace, setSelectedWorkspace] =
    useState("Default Workspace");
  const [isExpanded, setIsExpanded] = useState(true);
  const [folders, setFolders] = useState([]);
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [showNewFileInput, setShowNewFileInput] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [expandedFolders, setExpandedFolders] = useState({});
  const [hoveredFolder, setHoveredFolder] = useState(null);
  const [hoveredFile, setHoveredFile] = useState(null);
  const folderInputRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    async function initialize() {
      await initDB();
      const storedFiles = await listFiles();
      setFolders(storedFiles); // Load full folder objects with files
    }
    initialize();
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        folderInputRef.current &&
        !folderInputRef.current.contains(event.target)
      ) {
        setShowNewFolderInput(false);
        setNewFolderName("");
      }
      if (
        fileInputRef.current &&
        !fileInputRef.current.contains(event.target)
      ) {
        setShowNewFileInput(false);
        setNewFileName("");
        setSelectedFolder(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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
      // setFolders([...folders, newFolder]);
      const updatedFolders = await listFiles();
      setFolders(updatedFolders);
      setNewFolderName("");
      setShowNewFolderInput(false);
    }
  };

  const toggleFolder = (folderName) => {
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

  const handleFolderClick = (index) => {
    setSelectedFolder(index);
    toggleFolder(folders[index].name);
  };

  const handleFileKeyPress = (e) => {
    if (e.key === "Enter") {
      createFile();
    } else if (e.key === "Escape") {
      setShowNewFileInput(false);
      setNewFileName("");
      setSelectedFolder(null);
    }
  };

  const handleFolderKeyPress = (e) => {
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

  return (
    <div className="relative flex">
      <div
        className={`${
          isExpanded ? "w-80 px-4" : "w-0 px-0"
        } bg-white flex flex-col border-r border-[#DEDEDE] py-4 transition-all duration-300 overflow-hidden ${
          urbanist.className
        }`}
      >
        <div className="mb-2 flex items-center justify-between">
          <span className={`${isExpanded ? "opacity-100" : "opacity-0"}`}>
            File Explorer
          </span>
          <div className="flex items-center gap-2">
            <GreenTick
              className={`w-5 h-5 text-green-500 transition-opacity ${
                isExpanded ? "opacity-100" : "opacity-0"
              }`}
            />
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="transition-all"
            >
              <RightArrow
                className={`w-5 h-5 text-gray-500 transition-transform ${
                  isExpanded ? "rotate-180" : "rotate-0"
                }`}
              />
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="flex flex-col gap-3 mt-5">
            <div className="flex items-center gap-2">
              <Menu className="w-6 h-6 translate-y-2" />
              <span className="text-gray-600 leading-none">Workspaces</span>
            </div>

            <div className="relative">
              <button className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg flex items-center justify-between">
                <span>{selectedWorkspace}</span>
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="flex gap-4 justify-center items-center w-full mt-4">
              <File
                onClick={() => {
                  if (selectedFolder !== null) {
                    setShowNewFileInput(true);
                    setExpandedFolders((prev) => ({
                      ...prev,
                      [folders[selectedFolder].name]: true, // Expands the folder
                    }));
                  }
                }}
                className={`w-6 h-6 ${
                  selectedFolder !== null
                    ? "text-gray-600 cursor-pointer hover:text-gray-900"
                    : "text-gray-300"
                }`}
              />
              <Folder
                onClick={() => setShowNewFolderInput(true)}
                className="w-6 h-6 text-gray-600 cursor-pointer hover:text-gray-900"
              />
              <Upload className="w-6 h-6 text-gray-600 cursor-pointer hover:text-gray-900" />
              <FolderImport className="w-6 h-6 text-gray-600 cursor-pointer hover:text-gray-900" />
              <Box className="w-6 h-6 text-gray-600 cursor-pointer hover:text-gray-900" />
              <Link className="w-6 h-6 text-gray-600 cursor-pointer hover:text-gray-900" />
              <GitLink className="w-6 h-6 text-gray-600 cursor-pointer hover:text-gray-900" />
            </div>

            <hr className="border-t border-[#DEDEDE] w-full my-3" />

            <div className="mt-3" >
              {folders?.map((folder, index) => (
                <div key={index}>
                  <div
                    className={`flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg cursor-pointer justify-between ${
                      selectedFolder === index ? "bg-gray-100" : ""
                    }`}
                    onClick={() => handleFolderClick(index)}
                    onMouseEnter={() => setHoveredFolder(index)}
                    onMouseLeave={() => setHoveredFolder(null)}
                  >
                    <div className="flex gap-[5px]">
                      <ChevronDown
                        className={`w-4 h-4 text-gray-500 transition-transform ${
                          expandedFolders[folder.name] ? "rotate-180" : ""
                        }`}
                      />

                      {getIconForType(folder.type)}
                      <span className="text-sm">{folder.name}</span>
                    </div>
                    {hoveredFolder === index && (
                      <div className="flex gap-[4px]">
                        <MdDriveFileRenameOutline />
                        <MdDeleteOutline
                          onClick={() => handleDeleteFolder(folder.name)}
                        />
                      </div>
                    )}
                  </div>
                  {expandedFolders[folder.name] && (
                    <div className="pl-8 cursor-pointer">
                      {folder?.files?.map((file, fileIndex) => (
                        <div
                          key={fileIndex}
                          className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg justify-between"
                          onMouseEnter={() => setHoveredFile(file.name)}
                          onMouseLeave={() => setHoveredFile(null)}
                        >
                          <div className="flex gap-[5px]">
                            {getIconForType(file.name)}
                            <span className="text-xs">{file.name}</span>
                          </div>
                          {hoveredFile === file.name && (
                            <div className="flex gap-[4px]">
                              <MdDriveFileRenameOutline />
                              <MdDeleteOutline
                                onClick={() =>
                                  handleDeleteFile(index, file.name)
                                }
                              />
                            </div>
                          )}
                        </div>
                      ))}
                      {showNewFileInput && selectedFolder === index && (
                        <div
                          className="flex items-center gap-2 p-2"
                          ref={fileInputRef}
                        >
                          <Readme className="w-5 h-5 text-gray-500" />
                          <input
                            type="text"
                            value={newFileName}
                            onChange={(e) => setNewFileName(e.target.value)}
                            onKeyDown={handleFileKeyPress}
                            className="text-xs p-1 border border-gray-300 rounded-md focus:outline-none focus:border-gray-500"
                            autoFocus
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {showNewFolderInput && (
                <div
                  className="flex items-center gap-2 p-2"
                  ref={folderInputRef}
                >
                  <Folder className="w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={handleFolderKeyPress}
                    className="text-sm p-1 border border-gray-300 rounded-md focus:outline-none focus:border-gray-500"
                    autoFocus
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="absolute left-0 top-5 transition-all"
        >
          <RightArrow className="w-5 h-5 text-gray-500" />
        </button>
      )}
    </div>
  );
};

export default ToggleWorkspace;
