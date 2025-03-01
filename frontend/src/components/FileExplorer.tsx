import React, { useState, useEffect, useRef } from "react";
import { ChevronRight, Plus, Trash, Edit2 } from "lucide-react";
import { FaRegFolder } from "react-icons/fa";
import {
  createNode,
  getAllNodes,
  deleteNode,
  updateNode,
} from "../utils/IndexDB";
import type { FileSystemNode } from "../types";
import {
  GreenTick,
  RightArrow,
  Menu,
  File,
  Folder,
  Upload,
  FolderImport,
  Box,
  Link,
  GitLink,
  ChevronDown,
  JsfileIcon,
  JsonfileIcon,
  SolidityfileIcon,
  TsfileIcon,
  Readme,
  Code,
} from "@/assets/index";
import { MdDeleteOutline } from "react-icons/md";
import { MdDriveFileRenameOutline } from "react-icons/md";
import { FaRegFile } from "react-icons/fa";
import { useEditor } from "../context/EditorContext";


interface FileExplorerProps {
  onFileSelect: (file: FileSystemNode | null) => void;
}

// Define new interface for delete confirmation state
interface DeleteConfirmation {
  isOpen: boolean;
  nodeToDelete: FileSystemNode | null;
}

const FileExplorer: React.FC<FileExplorerProps> = () => {
  const { onFileSelect } = useEditor();
  const [allNodes, setAllNodes] = useState<FileSystemNode[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set()
  );
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [newNodeName, setNewNodeName] = useState("");
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingNewNode, setPendingNewNode] = useState<FileSystemNode | null>(
    null
  );
  const [code, setCode] = useState(`// Welcome to Q Remix IDE! 
// Visit all Quranium websites at: https://quranium.org
// Write your Solidity contract here...
// pragma solidity ^0.8.7;
// contract MyContract {
// Your contract code goes here
// }`);

  const [selectedWorkspace, setSelectedWorkspace] =
    useState("Default Workspace");
  const [isExpanded, setIsExpanded] = useState(true);

  // Add state for delete confirmation - removed position since we're centering it
  const [deleteConfirmation, setDeleteConfirmation] =
    useState<DeleteConfirmation>({
      isOpen: false,
      nodeToDelete: null,
    });

  // Load all nodes at once
  useEffect(() => {
    const loadAllNodes = async () => {
      try {
        setIsLoading(true);
        const nodes = await getAllNodes();
        setAllNodes(sortNodes(nodes));
      } catch (error) {
        console.error("Failed to load nodes:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAllNodes();
  }, []);
  const sortNodes = (nodes: FileSystemNode[]) => {
    return [...nodes].sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "folder" ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  };

  const handleCreateNode = async (
    type: "file" | "folder",
    parentId: string | null
  ) => {
    const effectiveParentId =
      parentId ??
      (selectedNode &&
      allNodes.find((n) => n.id === selectedNode)?.type === "folder"
        ? selectedNode
        : null);

    const newNode: FileSystemNode = {
      id: crypto.randomUUID(),
      name: `New ${type}`,
      type,
      parentId: effectiveParentId,
      content: type === "file" ? code : undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    try {
      // Create the node but keep it in a pending state
      setPendingNewNode(newNode);
      setEditingNode(newNode.id);
      setNewNodeName("");

      if (effectiveParentId) {
        setExpandedFolders((prev) => new Set(prev).add(effectiveParentId));
      }

      // Add it temporarily to UI
      setAllNodes((prev) => sortNodes([...prev, newNode]));
    } catch (error) {
      console.error("Failed to create node:", error);
    }
  };

  // Updated showDeleteConfirmation to open the confirmation dialog
  const showDeleteConfirmation = (
    nodeToDelete: FileSystemNode,
    event: React.MouseEvent
  ) => {
    // Prevent event bubbling
    event.stopPropagation();

    setDeleteConfirmation({
      isOpen: true,
      nodeToDelete,
    });
  };

  // Close the delete confirmation
  const closeDeleteConfirmation = () => {
    setDeleteConfirmation({
      isOpen: false,
      nodeToDelete: null,
    });
  };

  // Perform the actual deletion when confirmed
  const confirmDelete = async () => {
    if (!deleteConfirmation.nodeToDelete) return;

    const nodeToDelete = deleteConfirmation.nodeToDelete;
    const getAllChildIds = (parentId: string): string[] => {
      const children = allNodes.filter((n) => n.parentId === parentId);
      return children.reduce((acc, child) => {
        if (child.type === "folder") {
          return [...acc, child.id, ...getAllChildIds(child.id)];
        }
        return [...acc, child.id];
      }, [] as string[]);
    };

    const idsToDelete = [nodeToDelete.id];
    if (nodeToDelete.type === "folder") {
      idsToDelete.push(...getAllChildIds(nodeToDelete.id));
    }

    try {
      await Promise.all(idsToDelete.map((id) => deleteNode(id)));
      setAllNodes((prev) =>
        prev.filter((node) => !idsToDelete.includes(node.id))
      );

      if (selectedNode && idsToDelete.includes(selectedNode)) {
        setSelectedNode(null);
        onFileSelect(null);
      }

      setExpandedFolders((prev) => {
        const next = new Set(prev);
        idsToDelete.forEach((id) => next.delete(id));
        return next;
      });

      // Close the confirmation dialog
      closeDeleteConfirmation();
    } catch (error) {
      console.error("Failed to delete nodes:", error);
      closeDeleteConfirmation();
    }
  };

  const handleRename = async (node: FileSystemNode) => {
    setEditingNode(null);

    // If it's a new name and not empty, save it
    if (newNodeName.trim()) {
      const updatedNode = { ...node, name: newNodeName, updatedAt: Date.now() };

      try {
        // Only save to DB if it's not a default name
        await createNode(updatedNode);
        setAllNodes((prev) =>
          sortNodes(prev.map((n) => (n.id === node.id ? updatedNode : n)))
        );

        if (
          pendingNewNode &&
          node.id === pendingNewNode.id &&
          node.type === "file"
        ) {
          setSelectedNode(node.id);
          onFileSelect(updatedNode); 
        }
      } catch (error) {
        console.error("Failed to rename node:", error);
      }
    } else {
      // If empty name or cancelled, remove the pending node
      if (pendingNewNode && node.id === pendingNewNode.id) {
        setAllNodes((prev) => prev.filter((n) => n.id !== node.id));
        setPendingNewNode(null);
      }
    }

    setNewNodeName("");
  };

  const cancelRename = (node: FileSystemNode) => {
    // If this is a pending new node, remove it from the UI
    if (pendingNewNode && node.id === pendingNewNode.id) {
      setAllNodes((prev) => prev.filter((n) => n.id !== node.id));
      setPendingNewNode(null);
    }

    setEditingNode(null);
    setNewNodeName("");
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const handleNodeClick = (node: FileSystemNode) => {
    // Don't do anything if we're currently editing
    if (editingNode) return;

    setSelectedNode(node.id);
    if (node.type === "file") {
      onFileSelect(node);
    }
  };
  const getIconForType = (name, type) => {
    const extension = name?.split(".").pop() || "unknown";
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

  const startRenaming = (node: FileSystemNode) => {
    setEditingNode(node.id);
    setNewNodeName(node.name);
  };

  const renderNode = (node: FileSystemNode, level: number = 0) => {
    const isExpanded = expandedFolders.has(node.id);
    const childNodes = sortNodes(
      allNodes.filter((n) => n.parentId === node.id)
    );
    const indent = level * 16;
    const isSelected = selectedNode === node.id;
    return (
      <div key={node.id}>
        <div
          className={`flex items-center p-1 hover:bg-gray-100 group relative cursor-pointer ${
            isSelected ? "bg-blue-50" : ""
          }`}
          style={{
            paddingLeft:
              node.type === "file" && node.parentId === null
                ? `${indent + 15}px`
                : node.type === "file"
                ? `${indent + 10}px`
                : `${indent}px`,
          }}
       
          onClick={(e) => {
            e.stopPropagation();
            handleNodeClick(node);
            toggleFolder(node.id);
          }}
        >
          {node.type === "folder" && (
            <button className="p-1">
              {isExpanded ? (
                <ChevronDown size={16} />
              ) : (
                <ChevronRight size={16} />
              )}
            </button>
          )}
          {node.type === "folder" ? (
            <Folder className="text-blue-500 w-[22px]" />
          ) : (
            <> {getIconForType(node.name, node.type)}</>
          )}

          {editingNode === node.id ? (
            <input
              type="text"
              value={newNodeName}
              onChange={(e) => setNewNodeName(e.target.value)}
              onBlur={() => handleRename(node)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRename(node);
                if (e.key === "Escape") cancelRename(node);
              }}
              className="ml-1 px-1 border border-gray-500 rounded bg-white focus:outline-none w-full "
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div className="flex justify-between items-center w-full">
              <span className="ml-1 select-none text-[14px] font-[Urbanist] font-medium leading-[16.8px] tracking-[0%] text-[#94969C]">
                {node.name}
              </span>

              {/* Buttons wrapper with group-hover to show on hover */}
              <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                {node.type === "folder" && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCreateNode("folder", node.id);
                      }}
                      className="p-[1px]"
                    >
                      <FaRegFolder className="w-[0.9rem] h-[1.1rem]" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCreateNode("file", node.id);
                      }}
                      className="p-[1px]"
                    >
                      <FaRegFile className="h-[12px] w-[12px]" />
                    </button>
                  </>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    startRenaming(node);
                  }}
                  className="p-[0.5px]"
                >
                  <MdDriveFileRenameOutline size={14} />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    showDeleteConfirmation(node, e);
                  }}
                  className="p-[0.5px]"
                >
                  <MdDeleteOutline size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {node.type === "folder" &&
          isExpanded &&
          childNodes.map((child) => renderNode(child, level + 1))}
      </div>
    );
  };

  const rootNodes = sortNodes(
    allNodes.filter((node) => node.parentId === null)
  );

  return (
    <div className="bg-white border-r border-[#DEDEDE] h-screen overflow-y-auto relative">
      <div
        className={`${
          isExpanded ? "w-80 px-4" : "w-0 px-0"
        } bg-white flex flex-col py-4 transition-all duration-300 overflow-hidden`}
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
                className="cursor-pointer"
                onClick={() => handleCreateNode("file", null)}
              />
              <Folder
                className="w-6 h-6 text-gray-600 cursor-pointer hover:text-gray-900"
                onClick={() => handleCreateNode("folder", null)}
              />
              <Upload className="w-6 h-6 text-gray-600 cursor-pointer hover:text-gray-900" />
              <FolderImport className="w-6 h-6 text-gray-600 cursor-pointer hover:text-gray-900" />
              <Box className="w-6 h-6 text-gray-600 cursor-pointer hover:text-gray-900" />
              <Link className="w-6 h-6 text-gray-600 cursor-pointer hover:text-gray-900" />
              <GitLink className="w-6 h-6 text-gray-600 cursor-pointer hover:text-gray-900" />
            </div>
            <hr className="border-t border-[#DEDEDE] w-full my-3" />

            <div className="py-2">
              {rootNodes ? (
                rootNodes.map((node) => renderNode(node))
              ) : (
                <div className="w-64 bg-white border-r h-screen flex items-center justify-center">
                  <span>Loading...</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="absolute left-[80px] top-5 transition-all cursor-pointer z-10 "
        >
          <RightArrow className="w-5 h-5 text-gray-500" />
        </button>
      )}

      {/* Delete Confirmation Popup - Centered on screen */}
      {deleteConfirmation.isOpen && deleteConfirmation.nodeToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            <h3 className="font-medium text-lg mb-2">Confirm Delete</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete
              <span className="font-bold">
                {" "}
                {deleteConfirmation.nodeToDelete.name}
              </span>
              ?
              {deleteConfirmation.nodeToDelete.type === "folder" &&
                " All contents will also be deleted."}
            </p>
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={closeDeleteConfirmation}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-md hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileExplorer;
