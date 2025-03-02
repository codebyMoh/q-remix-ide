import React, { useState, useRef, useEffect } from "react";
import {
  Play,
  Robot,
  ToggleOff,
  ZoomOut,
  ZoomIn,
  HomeIcon,
  Cross,
  JsfileIcon,
  JsonfileIcon,
  SolidityfileIcon,
  TsfileIcon,
  Readme,
  Code,
} from "@/assets/index";
import { X } from "lucide-react";
// Icons array for iteration
const icons = [Play, Robot, ToggleOff, ZoomOut, ZoomIn];

interface HeaderProps {
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleRun?: () => void;
  setActiveTab: (tab: string) => void;
  files: any[];
  activeFileId: string | null;
  onFileSelect: (file: any) => void;
  onCloseFile: (fileId: string) => void;
}

const getIconForType = (name: string) => {
  const extension = name?.split(".").pop() || "unknown";
  switch (extension) {
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

const Header: React.FC<HeaderProps> = ({
  handleZoomIn,
  handleRun,
  handleZoomOut,
  setActiveTab,
  files,
  activeFileId,
  onFileSelect,
  onCloseFile,
  setActiveFileId,
  showHome,
  setShowHome,
}) => {

  const tabContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to the latest opened file
  useEffect(() => {
    if (tabContainerRef.current) {
      tabContainerRef.current.scrollLeft = tabContainerRef.current.scrollWidth;
    }
  }, [files]);

  return (
    <div className="h-[38px] flex items-center px-4 bg-white border-b shadow-sm">
      {/* Icons Section */}
      <div className="flex items-center space-x-3">
        {icons.map((Icon, index) => {
          let onClickHandler;
          if (Icon === Play) {
            onClickHandler = handleRun;
          } else if (Icon === ZoomOut) {
            onClickHandler = handleZoomOut;
          } else if (Icon === ZoomIn) {
            onClickHandler = handleZoomIn;
          }
          return (
            <Icon
              key={index}
              className="cursor-pointer"
              onClick={onClickHandler}
            />
          );
        })}
      </div>

      {/* Tab Section (Scrollable) */}
      <div
        ref={tabContainerRef}
        className="flex-1 flex items-center overflow-x-auto space-x-2 scrollbar-hide pl-4 hide-scrollbar"
      >
        {showHome && (
          <div
            className={`flex h-[38px] items-center border-r  cursor-pointer 
            
            ${
              activeFileId == "Home"
                ? "bg-gray-100 text-gray-900"
                : "text-gray-600 hover:bg-gray-200"
            }`}
            onClick={(e) => setActiveFileId("Home")
            }
          >
            <HomeIcon />
            <span className="truncate max-w-[100px]">Home</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowHome(false);
                setActiveTab("editor");
                setActiveFileId("editor");
              }}
              className="ml-1"
            >
              <Cross />
            </button>
          </div>
        )}

        {/* File Tabs */}
        {files.map((file) => (
          <div
            key={file.id}
            className={`flex items-center h-[38px] px-3 py-1 border-r cursor-pointer group ${
              activeFileId === file.id
                ? "bg-gray-100  text-gray-900"
                : "text-gray-600 hover:bg-gray-200"
            }`}
            onClick={() => onFileSelect(file)}
          >
            <div className="mr-2">{getIconForType(file.name)}</div>
            <span className="truncate max-w-[100px]">{file.name}</span>
            <button
              className="ml-1 opacity-0 group-hover:opacity-100 hover:bg-gray-300 rounded-sm"
              onClick={(e) => {
                e.stopPropagation();
                onCloseFile(file.id);
              }}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Header;