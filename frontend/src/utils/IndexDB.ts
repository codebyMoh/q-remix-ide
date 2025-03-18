import { openDB } from 'idb';
import type { FileSystemNode, Workspace } from "../types";

const DB_NAME = 'FileExplorerDB';
const FILESYSTEM_STORE = 'filesystem';
const WORKSPACE_STORE = 'workspaces';

export const initDB = async () => {
  const db = await openDB(DB_NAME, 3, {
    upgrade(db, oldVersion) {
      // Create or update filesystem store
      if (!db.objectStoreNames.contains(FILESYSTEM_STORE)) {
        const store = db.createObjectStore(FILESYSTEM_STORE, { keyPath: 'id' });
        store.createIndex('parentId', 'parentId');
        store.createIndex('workspaceId', 'workspaceId');
        store.createIndex('updatedAt', 'updatedAt');
      }

      // Create workspaces store if upgrading from version 1 or creating new
      if (!db.objectStoreNames.contains(WORKSPACE_STORE)) {
        const workspaceStore = db.createObjectStore(WORKSPACE_STORE, { keyPath: 'id' });
        workspaceStore.createIndex('name', 'name', { unique: true });
        
        // Add default workspace
        const defaultWorkspace: Workspace = {
          id: 'default',
          name: 'Default Workspace',
          createdAt: Date.now()
        };
        workspaceStore.put(defaultWorkspace);
      }

      // Add workspaceId to existing files if upgrading from version 2
      if (oldVersion === 2) {
        const tx = db.transaction(FILESYSTEM_STORE, 'readwrite');
        const store = tx.objectStore(FILESYSTEM_STORE);
        store.openCursor().then(function addWorkspaceId(cursor) {
          if (!cursor) return;
          const value = cursor.value;
          value.workspaceId = 'default';
          cursor.update(value);
          return cursor.continue().then(addWorkspaceId);
        });
      }
    },
  });
  return db;
};

// Workspace related functions
export const addWorkspace = async (name: string): Promise<Workspace> => {
  const db = await initDB();
  const workspace: Workspace = {
    id: crypto.randomUUID(),
    name,
    createdAt: Date.now()
  };
  await db.add(WORKSPACE_STORE, workspace);
  return workspace;
};

export const getAllWorkspaces = async (): Promise<Workspace[]> => {
  const db = await initDB();
  return db.getAll(WORKSPACE_STORE);
};

export const deleteWorkspace = async (workspaceId: string) => {
  const db = await initDB();
  const tx = db.transaction([WORKSPACE_STORE, FILESYSTEM_STORE], 'readwrite');
  
  // Delete all files in the workspace
  const fileStore = tx.objectStore(FILESYSTEM_STORE);
  const fileIndex = fileStore.index('workspaceId');
  const filesKeys = await fileIndex.getAllKeys(workspaceId);
  await Promise.all(filesKeys.map(key => fileStore.delete(key)));
  
  // Delete the workspace
  await tx.objectStore(WORKSPACE_STORE).delete(workspaceId);
  
  await tx.done;
};

// Filesystem related functions
export const createNode = async (node: FileSystemNode) => {
  const db = await initDB();
  await db.put(FILESYSTEM_STORE, node);
};

export const getAllNodes = async (workspaceId: string): Promise<FileSystemNode[]> => {
  const db = await initDB();
  const tx = db.transaction(FILESYSTEM_STORE, 'readonly');
  const index = tx.store.index('workspaceId');
  return index.getAll(workspaceId);
};

export const getNodesByParentId = async (parentId: string | null, workspaceId: string) => {
  const db = await initDB();
  const tx = db.transaction(FILESYSTEM_STORE, 'readonly');
  const store = tx.objectStore(FILESYSTEM_STORE);
  const allNodes = await store.getAll();
  return allNodes.filter(node => 
    node.parentId === parentId && node.workspaceId === workspaceId
  );
};

export const getNodeById = async (id: string): Promise<FileSystemNode | undefined> => {
  const db = await initDB();
  return db.get(FILESYSTEM_STORE, id);
};

export const deleteNode = async (id: string) => {
  const db = await initDB();
  await db.delete(FILESYSTEM_STORE, id);
};

export const updateNode = async (node: FileSystemNode) => {
  const db = await initDB();
  const existingNode = await db.get(FILESYSTEM_STORE, node.id);
  
  if (!existingNode) {
    throw new Error('Node not found');
  }

  const updatedNode = {
    ...existingNode,
    ...node,
    type: existingNode.type,
    workspaceId: existingNode.workspaceId,
    updatedAt: Date.now(),
  };

  await db.put(FILESYSTEM_STORE, updatedNode);
  return updatedNode;
};