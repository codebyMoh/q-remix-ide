import React, { useState } from "react";
import {
  Play,
  Robot,
  ToggleOff,
  ZoomOut,
  ZoomIn,
  HomeIcon,
  Cross,
} from "@/assets/index";
import { X } from "lucide-react";

// Icons array for iteration
const icons = [Play, Robot, ToggleOff, ZoomOut, ZoomIn];

interface HeaderProps {
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleRun?: () => void;
  setActiveTab: (tab: string) => void;
}

const Header: React.FC<HeaderProps> = ({
  handleZoomIn,
  handleRun,
  handleZoomOut,
  setActiveTab,
  files,
  activeFileId,
  onFileSelect,
  onCloseFile
}) => {

  const [showHome, setShowHome] = useState(true);
  return (
    <div className="h-[38px] flex items-center px-4">
      <div className="flex items-center space-x-3">
        {/* Render Main Icons */}
        {icons.map((Icon, index) => {
          let onClickHandler;
          
          // Attach handlers based on the icon
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
        
        {/* Conditionally Show Home Text & Icons */}
        {showHome && (
          <div className="flex items-center border-r  space-x-1 cursor-pointer">
            <HomeIcon />
            <span>Home</span>
            <button
              onClick={() => {
                setShowHome(false);
                setActiveTab("editor"); 
              }}
            >
              <Cross />
            </button>
          </div>
        )}
        
        {/* Display open files as tabs */}
        {files && files.length > 0 && files.map((file) => (
          <div
            key={file.id}
            className={`
            flex items-center px-3 py-1 border-r cursor-pointer group
            ${
              activeFileId === file.id
                ? " bg-gray-100 text-gray-900"
                : " text-gray-600 hover:bg-gray-200"
            }
          `}
            onClick={() => onFileSelect(file)}
          >
            <span className="truncate max-w-[150px]">{file.name}</span>
            <button
              className="ml-2 p-1 rounded-sm opacity-0 group-hover:opacity-100 hover:bg-gray-300"
              onClick={(e) => {
                e.stopPropagation();
                onCloseFile(file.id);
              }}
              title="Close"
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