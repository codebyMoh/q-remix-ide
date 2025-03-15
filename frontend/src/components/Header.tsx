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
import Tooltip from "@/components/Tooltip"
import { useEditor } from "../context/EditorContext";
// Icons array for iteration

const icons = [
  { component: Play, label: "Play", content: "Select .sol or .yul file to compile OR a .ts or .js file to run" },
  { component: Robot, label: "Robot", content: "To explain a contract,choose a .sol, .vy or .circum file" },
  { component: ToggleOff, label: "Toggle Off", content: "To use QremixAI Copilot, choose a .sol file" },
  { component: ZoomOut, label: "Zoom Out", content: "Zoom Out" },
  { component: ZoomIn, label: "Zoom In", content: "Zoom In" },
];


interface HeaderProps {
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleRun?: () => void;
  setActiveTab: (tab: string) => void;
  files: any[];
  activeFileId: string | null;
  onFileSelect: (file: any) => void;
  onCloseFile: (fileId: string) => void;
  setActiveFileId: (fileId: string) => void;
  showHome: boolean;
  setShowHome: (show: boolean) => void;
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
  const { allNodes } = useEditor();

  // Scroll to the latest opened file
  useEffect(() => {
    if (tabContainerRef.current) {
      tabContainerRef.current.scrollLeft = tabContainerRef.current.scrollWidth;
    }
  }, [files]);

  useEffect(() => {
    if (allNodes && files.length > 0) {
      const nodeIds = allNodes.map((node) => node.id);
      const filesToClose = files.filter((file) => {
        if (file.id === "Home") return false;
        return !nodeIds.includes(file.id);
      });
      filesToClose.forEach((file) => {
        onCloseFile(file.id);
      });
    }
  }, [allNodes, files, onCloseFile]);

  return (
    <div className="h-[38px] flex items-center px-2 bg-white border-b shadow-sm">
      {/* Icons Section */}
      <div className="flex items-center space-x-3">
        
        {icons.map((Icon, index) => {
          let onClickHandler;
          if (Icon.component === Play) {
            onClickHandler = handleRun;
          } else if (Icon.component === ZoomOut) {
            onClickHandler = handleZoomOut;
          } else if (Icon.component === ZoomIn) {
            onClickHandler = handleZoomIn;
          }
          return (
                <Tooltip  content={Icon.content}  key={index}>
            <Icon.component     
              className="cursor-pointer "
              onClick={onClickHandler}
            />
             </Tooltip>
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
            className={`flex h-[38px] items-center cursor-pointer 
            ${
              activeFileId === "Home"
                ? "bg-gray-100 text-gray-900"
                : "text-gray-600 hover:bg-gray-200"
            }`}
            onClick={() => setActiveFileId("Home")}
          >
            <HomeIcon className="" />
            <span className="truncate max-w-[100px] text-[15px]">Home</span>

            <Cross
              onClick={(e) => {
                e.stopPropagation();
                setShowHome(false);
                setActiveTab("editor");
                setActiveFileId("editor");
              }}
              className="ml-1"
            />
          </div>
        )}

        {/* File Tabs */}
        {files.map((file) => (
          <div
            key={file.id}
            className={`flex items-center h-[38px] pl-3  cursor-pointer group ${
              activeFileId === file.id
                ? "bg-gray-100 text-gray-900 "
                : "text-gray-600 hover:bg-gray-200 "
            }`}
            onClick={() => onFileSelect(file)}
          >
            <div className="mr-1">{getIconForType(file.name)}</div>
            <span className="truncate max-w-[100px] text-[15px]">
              {file.name}
            </span>
            <Cross
              className=" opacity-0 group-hover:opacity-100  rounded-sm"
              onClick={(e) => {
                e.stopPropagation();
                onCloseFile(file.id);
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default Header;
