// Modify your FileImporter.jsx to accept props from FileExplorer
import { useState, useRef } from "react";
import { FolderImport } from "@/assets/index";

export default function FileImporter() {
  const { useEditor } = require("../context/EditorContext");
  const { 
    selectedWorkspace, 
    selectedNode, 
    filteredNodes, 
    setAllNodes, 
    setAllFiles,
    setExpandedFolders 
  } = useEditor();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const {
    getAllNodes,
    importLocalFile,
  } = require("../utils/IndexDB");

  const handleFileImport = async (event) => {
    if (!selectedWorkspace) {
      setError("Please select a workspace first");
      event.target.value = "";
      return;
    }
    
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    try {
      setIsLoading(true);
      
      // Determine the target parent folder ID
      const targetParentId = (selectedNode && 
        filteredNodes.find(n => n.id === selectedNode)?.type === "folder") 
        ? selectedNode 
        : null;
      
      for (const file of Array.from(files)) {
        // Check if file already exists in this location
        const existingFile = filteredNodes.find(
          node => node.parentId === targetParentId && 
                  node.type === "file" && 
                  node.name.toLowerCase() === file.name.toLowerCase()
        );
        
        if (existingFile) {
          setError(`File "${file.name}" already exists`);
          continue; // Skip this file but try others
        }
        
        // Import the file
        await importLocalFile(file, selectedWorkspace.id, targetParentId);
      }
      
      // Refresh nodes
      const updatedNodes = await getAllNodes();
      const workspaceNodes = updatedNodes.map((node) => ({
        ...node,
        workspaceId: node.workspaceId || selectedWorkspace.id,
      }));
      
      const sortNodes = (nodes) => {
        return [...nodes].sort((a, b) => {
          if (a.type !== b.type) {
            return a.type === "folder" ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        });
      };
      
      const sortedNodes = sortNodes(workspaceNodes);
      setAllNodes(sortedNodes);
      setAllFiles(sortedNodes);
      
      // Expand the folder where files were imported
      if (targetParentId) {
        setExpandedFolders((prev) => new Set(prev).add(targetParentId));
      } else {
        setExpandedFolders((prev) => new Set(prev).add(`libs-${selectedWorkspace.id}`));
      }
      
    } catch (error) {
      console.error("Failed to import file:", error);
      setError("Failed to import file from device");
    } finally {
      setIsLoading(false);
      event.target.value = "";
    }
  };

  // Clear error after 3 seconds
  if (error) {
    setTimeout(() => {
      setError("");
    }, 3000);
  }

  return (
    <>
      <FolderImport 
        className="w-6 h-6 text-gray-600 cursor-pointer hover:text-gray-900" 
        onClick={() => fileInputRef.current?.click()} 
      />
      <input 
        type="file" 
        ref={fileInputRef}
        multiple 
        onChange={handleFileImport} 
        className="hidden" 
      />
      {error && (
        <div className="absolute top-0 left-0 right-0 bg-red-500 text-white text-center py-2 z-50">
          {error}
        </div>
      )}
    </>
  );
}