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
import Popup from "@/pages/Popup";
import ImportRepoPopup from "./ImportRepoPopup";

interface FileExplorerProps {
  onFileSelect: (file: FileSystemNode | null) => void;
}

// Define new interface for delete confirmation state
interface DeleteConfirmation {
  isOpen: boolean;
  nodeToDelete: FileSystemNode | null;
}

// Extend FileSystemNode type to include workspaceId
interface WorkspaceFileSystemNode extends FileSystemNode {
  workspaceId: string;
}
// Define new interface for import modal state
const FileExplorer: React.FC<FileExplorerProps> = () => {
  const {
    onFileSelect,
    allNodes,
    setAllFiles,
    setAllNodes,
    allWorkspace,
    setAllWorkspace,
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
  const [code, setCode] = useState(`// Welcome to Q Remix IDE! 
// Visit all Quranium websites at: https://quranium.org
// Write your Solidity contract here...
// pragma solidity ^0.8.7;
// contract MyContract {
// Your contract code goes here
// }`);

  const [selectedWorkspace, setSelectedWorkspace] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [workspacePopup, setWorkspacePopup] = useState(false);
  const [inputworkspace, setInputworkspace] = useState("");
  const [isExpanded, setIsExpanded] = useState(true);
  const [filteredNodes, setFilteredNodes] = useState<WorkspaceFileSystemNode[]>(
    []
  );
 
  // Add state for error message when duplicate is detected
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Add state for delete confirmation
  const [deleteConfirmation, setDeleteConfirmation] =
    useState<DeleteConfirmation>({
      isOpen: false,
      nodeToDelete: null,
    });
  //new state for import modal
  const [showRepoPopup, setShowRepoPopup] = useState(false);
  // Load nodes and workspaces on initial mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);

        // Load workspaces first
        const workspaces = await getAllWorkspaces();
        setAllWorkspace(workspaces);

        // Set default workspace if available
        if (workspaces.length > 0 && !selectedWorkspace) {
          setSelectedWorkspace(workspaces[0]);
        }

        // Load all nodes
        const nodes = await getAllNodes();

        // Convert to WorkspaceFileSystemNode if needed
        const workspaceNodes = nodes.map((node) => {
          if (!("workspaceId" in node)) {
            // If nodes don't have workspaceId yet, assign to default workspace
            return {
              ...node,
              workspaceId: workspaces.length > 0 ? workspaces[0].id : "default",
            };
          }
          return node;
        }) as WorkspaceFileSystemNode[];

        const sortedNodes = sortNodes(workspaceNodes);
        setAllNodes(sortedNodes);
        setAllFiles(sortedNodes);
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Filter nodes when workspace changes
  useEffect(() => {
    if (selectedWorkspace && allNodes.length > 0) {
      const filtered = (allNodes as WorkspaceFileSystemNode[]).filter(
        (node) => node.workspaceId === selectedWorkspace.id
      );
      setFilteredNodes(filtered);

      // Clear selected node if it's not in this workspace
      if (selectedNode && !filtered.some((node) => node.id === selectedNode)) {
        setSelectedNode(null);
        onFileSelect(null);
      }
    } else {
      setFilteredNodes([]);
    }
  }, [selectedWorkspace, allNodes, selectedNode, onFileSelect]);

  // Automatically clear error message after 3 seconds
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => {
        setErrorMessage(null);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

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
    // Make sure a workspace is selected
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

    const defaultName = `New ${type}`;

    // Check if a node with the same name already exists in the same location
    if (isDuplicate(type, defaultName, effectiveParentId)) {
      // Find a unique name by adding a number suffix
      let counter = 1;
      let uniqueName = `${defaultName} (${counter})`;

      while (isDuplicate(type, uniqueName, effectiveParentId)) {
        counter++;
        uniqueName = `${defaultName} (${counter})`;
      }

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
        // Create the node but keep it in a pending state
        setPendingNewNode(newNode);
        setEditingNode(newNode.id);
        setNewNodeName(uniqueName);

        if (effectiveParentId) {
          setExpandedFolders((prev) => new Set(prev).add(effectiveParentId));
        }

        // Add it temporarily to UI
        const updatedAllNodes = [
          ...allNodes,
          newNode,
        ] as WorkspaceFileSystemNode[];
        setAllNodes(sortNodes(updatedAllNodes));
      } catch (error) {
        console.error("Failed to create node:", error);
      }
    } else {
      const newNode: WorkspaceFileSystemNode = {
        id: crypto.randomUUID(),
        name: defaultName,
        type,
        parentId: effectiveParentId,
        content: type === "file" ? code : undefined,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        workspaceId: selectedWorkspace.id, // Associate with current workspace
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
        const updatedAllNodes = [
          ...allNodes,
          newNode,
        ] as WorkspaceFileSystemNode[];
        setAllNodes(sortNodes(updatedAllNodes));
      } catch (error) {
        console.error("Failed to create node:", error);
      }
    }
  };

  // Updated showDeleteConfirmation to open the confirmation dialog
  const showDeleteConfirmation = (
    nodeToDelete: WorkspaceFileSystemNode,
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
        setAllFiles(updatedNodes); // Update context
        return updatedNodes;
      });

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

  const handleRename = async (node: WorkspaceFileSystemNode) => {
    setEditingNode(null);

    // If it's a new name and not empty, save it
    if (newNodeName.trim()) {
      // Check if the new name would create a duplicate
      if (
        newNodeName !== node.name &&
        isDuplicate(node.type, newNodeName, node.parentId)
      ) {
        setErrorMessage(`A ${node.type} with this name already exists`);

        // If it's a pending new node, use the existing name or remove it
        if (pendingNewNode && node.id === pendingNewNode.id) {
          setAllNodes((prev) => prev.filter((n) => n.id !== node.id));
          setPendingNewNode(null);
        }
        return;
      }

      const updatedNode = { ...node, name: newNodeName, updatedAt: Date.now() };

      try {
        await createNode(updatedNode);
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
          onFileSelect(updatedNode);
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

  const startRenaming = (node: WorkspaceFileSystemNode) => {
    setEditingNode(node.id);
    setNewNodeName(node.name);
  };

  const addedWorkspace = async () => {
    if (inputworkspace.trim() !== "") {
      const newWorkspace = await addWorkspace(inputworkspace);
      setInputworkspace("");
      setWorkspacePopup(false);

      // Add the new workspace to the allWorkspace state
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
  
  const renderNode = (node: WorkspaceFileSystemNode, level: number = 0) => {
    const isExpanded = expandedFolders.has(node.id);
    const childNodes = sortNodes(
      filteredNodes.filter((n) => n.parentId === node.id)
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
            if (node.type === "folder") {
              toggleFolder(node.id);
            }
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

  return (
    <div
       className="bg-white border-r  border-[#DEDEDE] relative "
  
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      {errorMessage && (
        <div className="absolute top-0 left-0 right-0 bg-red-500 text-white text-center py-2 z-50">
          {errorMessage}
        </div>
      )}
      <div
        className={`${
          isExpanded ? "w-80 px-4" : "w-0 px-0"
        } bg-white flex flex-col transition-all duration-300   `}
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
              className="transition-all "
            >
              {isExpanded&&
               <RightArrow
               className={`w-5 h-5 text-gray-500 mb-[2px]  transition-transform ${
                 isExpanded ? "rotate-180" : "rotate-0"
               }`}
             />
              }
             
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
              {/* Dropdown Button */}
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-2 py-2 text-sm bg-white border border-gray-200 rounded-lg text-[#94969C] flex justify-between items-center"
              >
                {selectedWorkspace
                  ? selectedWorkspace.name
                  : "Select Workspace"}
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>

              {/* Dropdown Content */}
              {isOpen && (
                <div className="absolute w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  <ul className="max-h-40 overflow-auto">
                    {allWorkspace.map((workspace) => (
                      <li
                        key={workspace.id}
                        className="px-4 py-2 text-sm text-[#94969C] hover:bg-gray-100 cursor-pointer"
                        onClick={() => {
                          setIsOpen(false);
                          setSelectedWorkspace(workspace);
                        }}
                      >
                        {workspace.name}
                      </li>
                    ))}
                  </ul>

                  {/* Add Workspace Button Inside Dropdown */}
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
              <File
                className="cursor-pointer"
                onClick={() => handleCreateNode("file", null)}
              />
              <Folder
                className="w-6 h-6 text-gray-600 cursor-pointer hover:text-gray-900"
                onClick={() => handleCreateNode("folder", null)}
              />
              <Upload className="w-6 h-6 text-gray-600 cursor-pointer hover:text-gray-900" />
              <FolderImport 
                 className="w-6 h-6 text-gray-600 cursor-pointer hover:text-gray-900" 
                 onClick={() => document.getElementById("local-import")?.click()} 
              />
              <Box className="w-6 h-6 text-gray-600 cursor-pointer hover:text-gray-900" />
              <Link className="w-6 h-6 text-gray-600 cursor-pointer hover:text-gray-900" onClick={() => setShowRepoPopup(true)} />
              <GitLink className="w-6 h-6 text-gray-600 cursor-pointer hover:text-gray-900" />
              <input type="file" id="local-import" multiple onChange={handleImportLocalFile} className="hidden" />
            </div>
            <hr className="border-t border-[#DEDEDE] w-full my-3 "  />

            <div className="py-2  overflow-y-auto h-full">
              {selectedWorkspace ? (
                rootNodes.length > 0 ? (
                  rootNodes.map((node) => renderNode(node))
                ) : (
                  <div className="text-center py-4 text-gray-500">
                  </div>
                )
              ) : null}
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
      {/* Delete Confirmation Popup - Centered on screen */}
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