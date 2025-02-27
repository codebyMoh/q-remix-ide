import React, { useState, useEffect } from "react";
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

  const [selectedWorkspace, setSelectedWorkspace] =
    useState("Default Workspace");
  const [isExpanded, setIsExpanded] = useState(true);

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
      content: type === "file" ? "" : undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    try {
      await createNode(newNode);
      setAllNodes((prev) => sortNodes([...prev, newNode]));
      setEditingNode(newNode.id);

      if (effectiveParentId) {
        setExpandedFolders((prev) => new Set(prev).add(effectiveParentId));
      }
    } catch (error) {
      console.error("Failed to create node:", error);
    }
  };

  const handleDelete = async (nodeToDelete: FileSystemNode) => {
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
    } catch (error) {
      console.error("Failed to delete nodes:", error);
    }
  };

  const handleRename = async (node: FileSystemNode) => {
    if (!newNodeName.trim()) return;

    try {
      const updatedNode = { ...node, name: newNodeName, updatedAt: Date.now() };
      await updateNode(updatedNode);
      setAllNodes((prev) =>
        sortNodes(prev.map((n) => (n.id === node.id ? updatedNode : n)))
      );
      setEditingNode(null);
      setNewNodeName("");
    } catch (error) {
      console.error("Failed to rename node:", error);
    }
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
          className={`flex items-center p-1 hover:bg-gray-100 group relative ${
            isSelected ? "bg-blue-50" : ""
          }`}
          style={{ paddingLeft: `${indent}px` }}
          onClick={() => handleNodeClick(node)}
        >
          {node.type === "folder" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(node.id);
              }}
              className="p-1 hover:bg-gray-200 rounded"
            >
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
                if (e.key === "Escape") {
                  setEditingNode(null);
                  setNewNodeName("");
                }
              }}
              className="ml-1 px-1 border rounded bg-white"
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
                    setEditingNode(node.id);
                    setNewNodeName(node.name);
                  }}
                  className="p-[0.5px]"
                >
                  <MdDriveFileRenameOutline size={14} />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(node);
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
    <div className=" bg-white border-r border-[#DEDEDE] h-screen overflow-y-auto" >
      <div
        className={`${
          isExpanded ? "w-80 px-4" : "w-0 px-0"
        } bg-white flex flex-col   py-4 transition-all duration-300 overflow-hidden 
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
    </div>
  );
};

export default FileExplorer;
