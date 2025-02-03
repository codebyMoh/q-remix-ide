"use client";
import React, { useState } from "react";
import Image from "next/image";
import Workspace from "@/assets/svg/workspace.svg";
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
import { Urbanist } from "next/font/google";

const urbanist = Urbanist({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const ToggleWorkspace = () => {
  const [selectedWorkspace, setSelectedWorkspace] = useState("Default Workspace");
  const [isExpanded, setIsExpanded] = useState(true);

  const folders = [
    { name: "Folder Name", type: "folder" },
    { name: "Folder Name", type: "folder" },
    { name: "Folder Name", type: "folder" },
    { name: "pages", type: "code" },
    { name: "Readme.txt", type: "file" },
  ];

  // Function to return the correct icon based on the folder type
  const getIconForType = (type) => {
    switch (type) {
      case "folder":
        return <Folder className="w-5 h-5 text-gray-500" />;
      case "code":
        return <Code className="w-5 h-5 text-gray-500" />;
      case "file":
        return <Readme className="w-5 h-5 text-gray-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="relative flex">
      {/* Sidebar */}
      <div
        className={`${
          isExpanded ? "w-80 px-4" : "w-0 px-0"
        } bg-white flex flex-col border-r border-[#DEDEDE] py-4 transition-all duration-300 overflow-hidden ${
          urbanist.className
        }`}
      >
        {/* File Explorer Header */}
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
            {/* Toggle Button */}
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

        {/* Sidebar Navigation */}
        {isExpanded && (
          <div className="flex flex-col gap-3 mt-5">
            {/* Menu + Workspaces Header */}
            <div className="flex items-center gap-2">
              <Menu className="w-6 h-6 translate-y-2" />
              <span className="text-gray-600 leading-none">Workspaces</span>
            </div>

            {/* Workspace Dropdown */}
            <div className="relative">
              <button className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg flex items-center justify-between">
                <span>{selectedWorkspace}</span>
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Action Buttons (SVGs) in a Row */}
            <div className="flex gap-4 justify-center items-center w-full mt-4">
              <File className="w-6 h-6 text-gray-600 cursor-pointer hover:text-gray-900" />
              <Folder className="w-6 h-6 text-gray-600 cursor-pointer hover:text-gray-900" />
              <Upload className="w-6 h-6 text-gray-600 cursor-pointer hover:text-gray-900" />
              <FolderImport className="w-6 h-6 text-gray-600 cursor-pointer hover:text-gray-900" />
              <Box className="w-6 h-6 text-gray-600 cursor-pointer hover:text-gray-900" />
              <Link className="w-6 h-6 text-gray-600 cursor-pointer hover:text-gray-900" />
              <GitLink className="w-6 h-6 text-gray-600 cursor-pointer hover:text-gray-900" />
            </div>

            <hr className="border-t border-[#DEDEDE] w-full my-3" />

            {/* Folder List */}
            <div className="mt-3">
              {folders.map((folder, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg"
                >
                  {/* Use the getIconForType function to render the correct icon */}
                  {getIconForType(folder.type)}

                  <span className="text-sm">{folder.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Show Arrow When Collapsed */}
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
