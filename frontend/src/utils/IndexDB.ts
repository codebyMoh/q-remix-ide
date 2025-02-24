import { openDB } from 'idb';
import type {FileSystemNode} from "../types"

const DB_NAME = 'FileExplorerDB';
const STORE_NAME = 'filesystem';

export const initDB = async () => {
  const db = await openDB(DB_NAME, 1, {
    upgrade(db) {
      const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      store.createIndex('parentId', 'parentId');
      store.createIndex('updatedAt', 'updatedAt');
    },
  });
  return db;
};

export const createNode = async (node: FileSystemNode) => {
  const db = await initDB();
  await db.put(STORE_NAME, node);
};
export const getAllNodes = async (): Promise<FileSystemNode[]> => {
  const db = await initDB();
  return db.getAll(STORE_NAME);
};

export const getNodesByParentId = async (parentId: string | null) => {
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const index = tx.store.index('parentId');
  return index.getAll(parentId);
};

export const getNodeById = async (id: string): Promise<FileSystemNode | undefined> => {
  const db = await initDB();
  return db.get(STORE_NAME, id);
};

export const deleteNode = async (id: string) => {
  const db = await initDB();
  await db.delete(STORE_NAME, id);
};

export const updateNode = async (node: FileSystemNode) => {
  const db = await initDB();
  const existingNode = await db.get(STORE_NAME, node.id);
  
  if (!existingNode) {
    throw new Error('Node not found');
  }

  // Ensure we preserve the node type and other critical properties
  const updatedNode = {
    ...existingNode,
    ...node,
    type: existingNode.type, // Preserve the original type
    updatedAt: Date.now(),
  };

  await db.put(STORE_NAME, updatedNode);
  return updatedNode;
};