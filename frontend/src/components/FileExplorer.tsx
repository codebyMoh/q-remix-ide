import React, { useState, useEffect, useRef } from "react";
import { ChevronRight } from "lucide-react";
import FileImporter from "./FileImporter"
import { FaRegFolder } from "react-icons/fa";
import {
  createNode,
  getAllNodes,
  deleteNode,
  addWorkspace,
  getAllWorkspaces,
  importFromGitHubRepo,       
  initFileSystem,      
  importLocalFile,   
  updateNode,
} from "../utils/IndexDB";
import type { FileSystemNode } from "../types";
import Tooltip from "@/components/Tooltip";
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
import Popup from "@/pages/Popup";
import ImportRepoPopup from "./ImportRepoPopup";

interface FileExplorerProps {
  onFileSelect?: (file: FileSystemNode | null) => void;
}

interface DeleteConfirmation {
  isOpen: boolean;
  nodeToDelete: FileSystemNode | null;
}

interface WorkspaceFileSystemNode extends FileSystemNode {
  workspaceId: string;
}
// Define new interface for import modal state

interface DragItem {
  nodeId: string;
  type: "file" | "folder";
}

const FileExplorer: React.FC<FileExplorerProps> = () => {
  const {
    onFileSelect,
    allNodes,
    setAllFiles,
    setAllNodes,
    allWorkspace,
    setAllWorkspace,
    selectedWorkspace,
    setSelectedWorkspace,
  } = useEditor();
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set()
  );
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [newNodeName, setNewNodeName] = useState("");
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingNewNode, setPendingNewNode] =
    useState<WorkspaceFileSystemNode | null>(null);
  const [code] = useState(`// Welcome to Q Remix IDE! 
// Visit all Quranium websites at: https://quranium.org
// Write your Solidity contract here...
// pragma solidity ^0.8.7;
// contract MyContract {
// Your contract code goes here
// }`);

  const [isOpen, setIsOpen] = useState(false);
  const [workspacePopup, setWorkspacePopup] = useState(false);
  const [inputworkspace, setInputworkspace] = useState("");
  const [isExpanded, setIsExpanded] = useState(true);
  const [filteredNodes, setFilteredNodes] = useState<WorkspaceFileSystemNode[]>(
    []
  );
 
  // Add state for error message when duplicate is detected

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] =
    useState<DeleteConfirmation>({
      isOpen: false,
      nodeToDelete: null,
    });
  //new state for import modal
  const [showRepoPopup, setShowRepoPopup] = useState(false);
  // Load nodes and workspaces on initial mount
  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);

        const workspaces = await getAllWorkspaces();
        const sortedWorkspaces = workspaces.sort((a, b) => a.createdAt - b.createdAt);
        setAllWorkspace(sortedWorkspaces);
        const savedWorkspaceName = localStorage.getItem('selectedWorkspaceName');
        if (workspaces.length > 0) {
          if(savedWorkspaceName){
            const savedWorkspace=workspaces.find(w=>w.name===savedWorkspaceName);
            if(savedWorkspace){
              setSelectedWorkspace(savedWorkspace);
            }
            else{
              setSelectedWorkspace(workspaces[0]);
            }
          }
          else{
            setSelectedWorkspace(workspaces[0]);
          }
        }

        if (selectedWorkspace) {
          const nodes = await getAllNodes(selectedWorkspace.id);
          const workspaceNodes = nodes.map((node) => ({
            ...node,
            workspaceId: selectedWorkspace.id, 
          })) as WorkspaceFileSystemNode[];

          const sortedNodes = sortNodes(workspaceNodes);
          setAllNodes(sortedNodes);
          setAllFiles(sortedNodes);
        }
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [
    setAllWorkspace,
    setAllNodes,
    setAllFiles,
    setSelectedWorkspace,
  ]);

  useEffect(() => {
    if (selectedWorkspace && allNodes?.length > 0) {
      const filtered = (allNodes as WorkspaceFileSystemNode[]).filter(
        (node) => node.workspaceId === selectedWorkspace.id
      );
      setFilteredNodes(filtered);

      if (selectedNode && !filtered.some((node) => node.id === selectedNode)) {
        setSelectedNode(null);
        onFileSelect?.(null);
      }
    } else {
      setFilteredNodes([]);
    }
  }, [selectedWorkspace, allNodes, selectedNode, onFileSelect]);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => {
        setErrorMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  useEffect(() => {
    const fetchNodes = async () => {
      if (selectedWorkspace) {
        const nodes = await getAllNodes(selectedWorkspace.id);
        setAllNodes(sortNodes(nodes as WorkspaceFileSystemNode[]));
      }
    };
    fetchNodes();
  }, [selectedWorkspace]);

  const sortNodes = (nodes: WorkspaceFileSystemNode[]) => {
    return [...nodes].sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "folder" ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  };

  const isDuplicate = (
    type: "file" | "folder",
    name: string,
    parentId: string | null
  ): boolean => {
    return filteredNodes.some(
      (node) =>
        node.type === type &&
        node.parentId === parentId &&
        node.name.toLowerCase() === name.toLowerCase()
    );
  };

  const handleCreateNode = async (
    type: "file" | "folder",
    parentId: string | null
  ) => {
    if (!selectedWorkspace) {
      setErrorMessage("Please select a workspace first");
      return;
    }

    const effectiveParentId =
      parentId ??
      (selectedNode &&
      filteredNodes.find((n) => n.id === selectedNode)?.type === "folder"
        ? selectedNode
        : null);

    // Changed this part to use empty string instead of "New file" or "New folder"
    const defaultName = "";
    let uniqueName = defaultName;

    const newNode: WorkspaceFileSystemNode = {
      id: crypto.randomUUID(),
      name: uniqueName,
      type,
      parentId: effectiveParentId,
      content: type === "file" ? code : undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      workspaceId: selectedWorkspace.id,
    };

    try {
      setPendingNewNode(newNode);
      setEditingNode(newNode.id);
      setNewNodeName(uniqueName);

      if (effectiveParentId) {
        setExpandedFolders((prev) => new Set(prev).add(effectiveParentId));
      }

      await createNode(newNode); // Persist to IndexedDB
      const updatedAllNodes = [
        ...allNodes,
        newNode,
      ] as WorkspaceFileSystemNode[];
      setAllNodes(sortNodes(updatedAllNodes));
    } catch (error) {
      console.error("Failed to create node:", error);
    }
  };

  const showDeleteConfirmation = (
    nodeToDelete: WorkspaceFileSystemNode,
    event: React.MouseEvent
  ) => {
    event.stopPropagation();
    setDeleteConfirmation({
      isOpen: true,
      nodeToDelete,
    });
  };

  const closeDeleteConfirmation = () => {
    setDeleteConfirmation({
      isOpen: false,
      nodeToDelete: null,
    });
  };

  const confirmDelete = async () => {
    if (!deleteConfirmation.nodeToDelete) return;

    const nodeToDelete = deleteConfirmation.nodeToDelete;
    const getAllChildIds = (parentId: string): string[] => {
      const children = filteredNodes.filter((n) => n.parentId === parentId);
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
      setAllNodes((prev) => {
        const updatedNodes = prev.filter(
          (node) => !idsToDelete.includes(node.id)
        );
        setAllFiles(updatedNodes);
        return updatedNodes;
      });

      if (selectedNode && idsToDelete.includes(selectedNode)) {
        setSelectedNode(null);
        onFileSelect?.(null);
      }

      setExpandedFolders((prev) => {
        const next = new Set(prev);
        idsToDelete.forEach((id) => next.delete(id));
        return next;
      });

      closeDeleteConfirmation();
    } catch (error) {
      console.error("Failed to delete nodes:", error);
      closeDeleteConfirmation();
    }
  };

  const handleRename = async (node: WorkspaceFileSystemNode) => {
    setEditingNode(null);
  
    if (newNodeName.trim()) {
      if (
        newNodeName !== node.name &&
        isDuplicate(node.type, newNodeName, node.parentId)
      ) {
        setErrorMessage(`A ${node.type} with this name already exists`);
        if (pendingNewNode && node.id === pendingNewNode.id) {
          setAllNodes((prev) => prev.filter((n) => n.id !== node.id));
          setPendingNewNode(null);
        }
        return;
      }
  
      const updatedNode = { ...node, name: newNodeName, updatedAt: Date.now() };
  
      try {
        await createNode(updatedNode); // Persist to IndexedDB
        setAllNodes(
          (prev) =>
            sortNodes(
              prev.map((n) => (n.id === node.id ? updatedNode : n))
            ) as WorkspaceFileSystemNode[]
        );
  
        if (
          pendingNewNode &&
          node.id === pendingNewNode.id &&
          node.type === "file"
        ) {
          setSelectedNode(node.id);
          onFileSelect?.(updatedNode);
        }
      } catch (error) {
        console.error("Failed to rename node:", error);
      }
    } else {
      if (pendingNewNode && node.id === pendingNewNode.id) {
        setAllNodes((prev) => {
          const updatedNodes = prev.filter((n) => n.id !== node.id);
          setAllFiles(updatedNodes);
          return updatedNodes;
        });
        setPendingNewNode(null);
        
        // Delete from IndexedDB if it was already created there
        try {
          await deleteNode(node.id);
        } catch (error) {
          console.error("Failed to delete empty node:", error);
        }
      } else {
        // For existing nodes that are being renamed to empty, show error
        setErrorMessage(`${node.type} name cannot be empty`);
      }
    }
  
    setNewNodeName("");
  };

  const cancelRename = (node: WorkspaceFileSystemNode) => {
    if (pendingNewNode && node.id === pendingNewNode.id) {
      setAllNodes((prev) => {
        const updatedNodes = prev.filter((n) => n.id !== node.id);
        setAllFiles(updatedNodes);
        return updatedNodes;
      });
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

  const handleNodeClick = (node: WorkspaceFileSystemNode) => {
    if (editingNode) return;
    setSelectedNode(node.id);
    if (node.type === "file") {
      onFileSelect?.(node);
    }
  };

  const getIconForType = (name: string, type: string) => {
    const extension = name?.split(".").pop()?.toLowerCase() || "unknown";
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

  const startRenaming = (node: WorkspaceFileSystemNode) => {
    setEditingNode(node.id);
    setNewNodeName(node.name);
  };

  const addedWorkspace = async () => {
    if (inputworkspace.trim() !== "") {
      const newWorkspace = await addWorkspace(inputworkspace);
      setInputworkspace("");
      setWorkspacePopup(false);

      if (newWorkspace) {
        setAllWorkspace((prevWorkspaces) => [...prevWorkspaces, newWorkspace]);
        setSelectedWorkspace(newWorkspace);
      }
    }
  };
  
  const handleImportLocalFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedWorkspace) {
      setErrorMessage("Please select a workspace first");
      return;
    }
    const files = event.target.files;
    if (!files || files.length === 0) return;
    try {
      setIsLoading(true);
      for (const file of Array.from(files)) {
        await importLocalFile(file, selectedWorkspace.id);
      }
      const updatedNodes = await getAllNodes();
      const workspaceNodes = updatedNodes.map((node) => ({
        ...node,
        workspaceId: node.workspaceId || selectedWorkspace.id,
      })) as WorkspaceFileSystemNode[];
      const sortedNodes = sortNodes(workspaceNodes);
      setAllNodes(sortedNodes);
      setAllFiles(sortedNodes);
      setExpandedFolders((prev) => new Set(prev).add(`libs-${selectedWorkspace.id}`));
    } catch (error) {
      console.error("Failed to import local file:", error);
      setErrorMessage("Failed to import file from device");
    } finally {
      setIsLoading(false);
      event.target.value = "";
    }
  };
  
  const handleImportFromRepo = async (repoUrlOrKey: string, token?: string) => {
    if (!selectedWorkspace) {
      setErrorMessage("Please select a workspace first");
      return;
    }
    try {
      setIsLoading(true);
      await initFileSystem();
      await importFromGitHubRepo(repoUrlOrKey, selectedWorkspace.id, token);
      const updatedNodes = await getAllNodes();
      const workspaceNodes = updatedNodes.map((node) => ({
        ...node,
        workspaceId: node.workspaceId || selectedWorkspace.id,
      })) as WorkspaceFileSystemNode[];
      const sortedNodes = sortNodes(workspaceNodes);
      setAllNodes(sortedNodes);
      setAllFiles(sortedNodes);
      setExpandedFolders((prev) => new Set(prev).add(`library-${selectedWorkspace.id}`));
    } catch (error) {
      console.error("Failed to import repository:", error);
      setErrorMessage("Failed to import repository. Check the selection or token and try again.");
    } finally {
      setIsLoading(false);
    }
  };
  


  const handleDragStart = (e: React.DragEvent, node: WorkspaceFileSystemNode) => {
    if (editingNode) return;
    
    e.stopPropagation();
    setDraggedItem({
      nodeId: node.id,
      type: node.type,
    });
    
 
    e.dataTransfer.effectAllowed = "move";
    

    e.dataTransfer.setData("application/json", JSON.stringify({
      id: node.id,
      type: node.type,
      name: node.name
    }));
  };

  const handleDragOver = (e: React.DragEvent, node: WorkspaceFileSystemNode) => {
    e.preventDefault();
    e.stopPropagation();
    

    if (node.type === "folder") {
      e.dataTransfer.dropEffect = "move";
      setDropTarget(node.id);
    } else {
      e.dataTransfer.dropEffect = "none";
    }
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTarget(null);
  };

  const isChildOf = (nodeId: string, potentialParentId: string): boolean => {

    let current = filteredNodes.find(n => n.id === potentialParentId);
    while (current && current.parentId) {
      if (current.parentId === nodeId) {
        return true;
      }
      current = filteredNodes.find(n => n.id === current!.parentId);
    }
    return false;
  };

  const handleDrop = async (e: React.DragEvent, targetNode: WorkspaceFileSystemNode) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTarget(null);
    
    if (!draggedItem || !targetNode || targetNode.type !== "folder") return;
    
    const draggedNode = filteredNodes.find(n => n.id === draggedItem.nodeId);
    if (!draggedNode) return;
    
  
    if (draggedNode.id === targetNode.id || isChildOf(draggedNode.id, targetNode.id)) {
      setErrorMessage("Cannot move a folder into itself or its subfolder");
      return;
    }
    

    if (isDuplicate(draggedNode.type, draggedNode.name, targetNode.id)) {
      setErrorMessage(`A ${draggedNode.type} with name "${draggedNode.name}" already exists in this folder`);
      return;
    }
    
    // Move the node
    const updatedNode = { ...draggedNode, parentId: targetNode.id, updatedAt: Date.now() };
    
    try {
      // Persist to IndexedDB
      await updateNode(updatedNode);
      
      setAllNodes(prev => {
        const updatedNodes = prev.map(n => {
          if (n.id === draggedNode.id) {
            return updatedNode;
          }
          return n;
        });
        return sortNodes(updatedNodes as WorkspaceFileSystemNode[]);
      });
      
      // Expand the target folder
      setExpandedFolders(prev => new Set(prev).add(targetNode.id));
      
      // Reload files
      setAllFiles(prev => 
        prev.map(n => {
          if (n.id === draggedNode.id) {
            return updatedNode;
          }
          return n;
        })
      );
      
      setDraggedItem(null);
    } catch (error) {
      console.error("Failed to move node:", error);
      setErrorMessage("Failed to move item");
    }
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDropTarget(null);
  };
 
  const renderNode = (node: WorkspaceFileSystemNode, level: number = 0) => {
    const isExpanded = expandedFolders.has(node.id);
    const childNodes = sortNodes(
      filteredNodes.filter((n) => n.parentId === node.id)
    );
    const indent = level * 16;
    const isSelected = selectedNode === node.id;
    const isDropping = dropTarget === node.id;
    const isDragging = draggedItem?.nodeId === node.id;
    
    return (
      <div key={node.id}>
        <div
          className={`flex items-center p-1 hover:bg-gray-100 group relative cursor-pointer ${
            isSelected ? "bg-blue-50" : ""
          } ${isDropping ? "bg-blue-100 border border-blue-300" : ""} ${
            isDragging ? "opacity-50" : ""
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
            if (node.type === "folder") {
              toggleFolder(node.id);
            }
          }}
          draggable={!editingNode}
          onDragStart={(e) => handleDragStart(e, node)}
          onDragOver={(e) => handleDragOver(e, node)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, node)}
          onDragEnd={handleDragEnd}
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
            getIconForType(node.name, node.type)
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
    filteredNodes.filter((node) => node.parentId === null)
  );
  const icons = [
    {
      component: File,
      onClick: () => handleCreateNode("file", null),
      label: "Create File",
    },
    {
      component: Folder,
      onClick: () => handleCreateNode("folder", null),
      label: "Create Folder",
    },
    { component: Upload, label: "Upload File" },
    { component: FolderImport, label: "Import Folder", onClick:() => document.getElementById("local-import")?.click()},
    { component: Box, label: "Import files from ipfs" },
    { component: Link, label: "Import files with https" ,onClick:() => setShowRepoPopup(true)},
    { component: GitLink, label: "Git Integration" },
  ];
  const handleEmptyAreaClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setSelectedNode(null);
      onFileSelect?.(null);
    }
  };
  return (
    <div
      className="bg-white  relative"
      onClick={(e) => e.stopPropagation()}
    >
      {errorMessage && (
        <div className="absolute top-0 left-0 right-0 bg-red-500 text-white text-center py-2 z-50">
          {errorMessage}
        </div>
      )}
      <div
        className={`${
          isExpanded ? "w-80 px-4" : "w-0 px-0"
        } bg-white flex flex-col transition-all duration-300`}
      >
        <div className="mb-2 flex items-center justify-between h-[3rem]">
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
              {isExpanded && (
                <RightArrow
                  className={`w-5 h-5 text-gray-500 mb-[2px] transition-transform ${
                    isExpanded ? "rotate-180" : "rotate-0"
                  }`}
                />
              )}
            </button>
          </div>
        </div>
        {isExpanded && (
          <div className="flex flex-col gap-3 h-[calc(100vh-150px)]">
            <div className="flex items-center">
              <Menu className="w-6 h-6 translate-y-2" />
              <span className="text-gray-600 text-sm">Workspaces</span>
            </div>
            <div className="relative w-full">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-2 py-2 text-sm bg-white border border-gray-200 rounded-lg text-[#94969C] flex justify-between items-center"
              >
                {selectedWorkspace
                  ? selectedWorkspace.name
                  : "Select Workspace"}
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>
              {isOpen && (
                <div className="absolute w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  <ul className="max-h-40 overflow-auto">
                    {allWorkspace.map((workspace) => (
                      <li
                        key={workspace.id}
                        className="px-4 py-2 text-sm text-[#94969C] hover:bg-gray-100 cursor-pointer"
                        onClick={async () => {
                          setIsOpen(false);
                          setSelectedWorkspace(workspace);
                          localStorage.setItem('selectedWorkspaceName', workspace.name);
                          const nodes = await getAllNodes(workspace.id);
                          setAllNodes(
                            sortNodes(nodes as WorkspaceFileSystemNode[])
                          );
                        }}
                      >
                        {workspace.name}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      setWorkspacePopup(true);
                    }}
                    className="w-full px-4 py-2 text-sm text-[#CE192D] font-medium hover:bg-gray-100"
                  >
                    + Add Workspace
                  </button>
                </div>
              )}
            </div>
            {workspacePopup && (
              <Popup
                setworkspace={setWorkspacePopup}
                Worktype="AddWorkspace"
                addedWorkspace={addedWorkspace}
                Inputworkspace={setInputworkspace}
              />
            )}
            <div className="flex gap-4 justify-center items-center w-full mt-4">            
              {icons.map(({ component: Icon, onClick, label }) => (
                <Tooltip key={label} content={label}>
                  <Icon
                    className="w-6 h-6 text-gray-600 cursor-pointer hover:text-gray-900"
                    onClick={onClick}
                    aria-label={label}
                  />
                </Tooltip>
              ))}
                <input type="file" id="local-import" multiple onChange={handleImportLocalFile} className="hidden" />
            </div>
            <hr className="border-t border-[#DEDEDE] w-full my-3" />
            <div className="py-2 overflow-y-auto h-full" onClick={handleEmptyAreaClick}>
              {isLoading ? (
                <div className="text-center py-4 text-gray-500">Loading...</div>
              ) : selectedWorkspace && allNodes?.length > 0 ? (
                rootNodes.length > 0 ? (
                  rootNodes.map((node) => renderNode(node))
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    No files or folders
                  </div>
                )
              ) : (
                <div className="text-center py-4 text-gray-500">
                 No files or folders
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="absolute left-0 top-5 transition-all cursor-pointer z-10"
        >
          <RightArrow className="w-5 h-5 text-gray-500" />
        </button>
      )}
      {deleteConfirmation.isOpen && deleteConfirmation.nodeToDelete && (
        <Popup
          DeleteName={deleteConfirmation.nodeToDelete.name}
          type={deleteConfirmation.nodeToDelete.type}
          closeDeleteConfirmation={closeDeleteConfirmation}
          confirmDelete={confirmDelete}
        />
      )}
      {showRepoPopup && (
        <ImportRepoPopup
          onClose={() => setShowRepoPopup(false)}
          onImport={handleImportFromRepo}
        />
      )}
    </div>
  );
};

export default FileExplorer;