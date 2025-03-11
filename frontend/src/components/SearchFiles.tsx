import React, { useState } from "react";
import { GreenTick, RightArrow } from "@/assets/index";
import { useEditor } from "@/context/EditorContext";

const SearchFiles = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // ✅ Move useEditor() inside the component
  const { files, onFileSelect } = useEditor(); 

  // ✅ Filter files based on name or content
  const filteredFiles = files.filter(
    (file) =>
      file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative flex border-r border-[#DEDEDE] h-full">
      <div
        className={`${
          isExpanded ? "w-80 px-4" : "w-0 px-0"
        } bg-white flex flex-col transition-all duration-300 overflow-hidden`}
      >
        {/* Header */}
        <div className="mb-2 flex items-center justify-between h-[3rem]">
          <span className={`${isExpanded ? "opacity-100" : "opacity-0"}`}>
            Search in Files
          </span>
          <div className="flex items-center gap-2">
            <GreenTick
              className={`w-5 h-5 text-green-500 transition-opacity ${
                isExpanded ? "opacity-100" : "opacity-0"
              }`}
            />
            <button onClick={() => setIsExpanded(!isExpanded)}>
              <RightArrow
                className={`w-5 h-5 text-gray-500 transition-transform ${
                  isExpanded ? "rotate-180" : "rotate-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Search Input */}
        {isExpanded && (
          <div className="flex flex-col mt-1">
            <input
              type="text"
              placeholder="Search files or content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full p-2 border rounded text-sm focus:outline-none"
            />

            {/* Search Results */}
            <div className="mt-2 max-h-60 overflow-y-auto">
              {filteredFiles.length > 0 ? (
                filteredFiles.map((file) => (
                  <div
                    key={file.id}
                    className="p-2 text-gray-800 text-sm border-b cursor-pointer hover:bg-gray-100"
                    onClick={() => onFileSelect(file)} // ✅ Use onFileSelect(file)
                  >
                    <strong>{file.name}</strong>
                    <br />
                    <span className="text-gray-600 text-xs">
                      {file.content.substring(0, 100)}...
                    </span>
                  </div>
                ))
              ) : (
                <span className="text-gray-600 text-sm">No matches found</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Expand Button */}
      {!isExpanded && (
        <button onClick={() => setIsExpanded(true)} className="absolute left-0 top-5">
          <RightArrow className="w-5 h-5 text-gray-500" />
        </button>
      )}
    </div>
  );
};

export default SearchFiles;
