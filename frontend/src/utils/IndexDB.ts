import { openDB } from 'idb';
import type { FileSystemNode, Workspace } from "../types";

// Library configuration (could be fetched from a remote JSON or bundled)
const LIBRARY_CONFIG = {
  "open-zeppelin": {
    repo: "OpenZeppelin/openzeppelin-contracts",
    branch: "master",
    filter: (path: string) => path.startsWith("contracts/") && path.endsWith(".sol"),
  },
  "uniswapv4": {
    repo: "Uniswap/v4-core",
    branch: "main",
    filter: (path: string) => path.startsWith("src/") && path.endsWith(".sol"),
  },
  // Add more libraries as needed
};

const DB_NAME = 'FileExplorerDB';
const FILESYSTEM_STORE = 'filesystem';
const WORKSPACE_STORE = 'workspaces';

// Unchanged initDB and initFileSystem
export const initDB = async () => {
  const db = await openDB(DB_NAME, 3, {
    upgrade(db, oldVersion) {
      if (!db.objectStoreNames.contains(FILESYSTEM_STORE)) {
        const store = db.createObjectStore(FILESYSTEM_STORE, { keyPath: 'id' });
        store.createIndex('parentId', 'parentId');
        store.createIndex('workspaceId', 'workspaceId');
        store.createIndex('updatedAt', 'updatedAt');
      }
      if (!db.objectStoreNames.contains(WORKSPACE_STORE)) {
        const workspaceStore = db.createObjectStore(WORKSPACE_STORE, { keyPath: 'id' });
        workspaceStore.createIndex('name', 'name', { unique: true });
        const defaultWorkspace: Workspace = {
          id: 'default',
          name: 'Default Workspace',
          createdAt: Date.now()
        };
        workspaceStore.put(defaultWorkspace);
      }
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

export const initFileSystem = async () => {
  const db = await initDB();
  const tx = db.transaction(FILESYSTEM_STORE, 'readwrite');
  const store = tx.objectStore(FILESYSTEM_STORE);
  const libsFolder: FileSystemNode = {
    id: `libs-default`,
    name: "libs",
    type: "folder",
    parentId: null,
    workspaceId: "default",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const request = await store.get(`libs-default`);
  if (!request) await store.put(libsFolder);
  await tx.done;
};

// Updated importFromGitHubRepo with library-specific subfolders
export const importFromGitHubRepo = async (repoUrlOrKey: string, workspaceId: string, token?: string) => {
  const db = await initDB();

  let owner: string, repo: string, branch: string, filter: (path: string) => boolean, libraryName: string;

  // Check if repoUrlOrKey is a library key or full URL
  if (repoUrlOrKey in LIBRARY_CONFIG) {
    const config = LIBRARY_CONFIG[repoUrlOrKey as keyof typeof LIBRARY_CONFIG];
    [owner, repo] = config.repo.split("/");
    branch = config.branch;
    filter = config.filter;
    libraryName = repoUrlOrKey; // Use the key (e.g., "open-zeppelin", "uniswapv4")
    console.log(`Using library config: ${repoUrlOrKey}, Repo=${config.repo}, Branch=${branch}`);
  } else {
    const match = repoUrlOrKey.match(/github\.com\/([^/]+)\/([^/]+)(?:\/tree\/([^/]+))?/);
    if (!match) throw new Error("Invalid GitHub repository URL or library key");
    [, owner, repo, branch = "main"] = match;
    filter = (path: string) => path.endsWith(".sol");
    libraryName = repo.toLowerCase().replace(/[^a-z0-9]/g, ""); // Sanitize repo name (e.g., "openzeppelincontracts")
    console.log(`Parsed GitHub URL: Owner=${owner}, Repo=${repo}, Branch=${branch}, Full URL=${repoUrlOrKey}`);
  }

  const filesToImport: { path: string; content: string }[] = [];
  const headers = token ? { Authorization: `token ${token}` } : {};

  // Fetch the repository tree in one API call
  const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
  console.log(`Fetching repository tree from: ${treeUrl}`);
  try {
    const treeResponse = await fetch(treeUrl, { headers });
    if (!treeResponse.ok) {
      console.error(`Failed to fetch tree ${treeUrl}: ${treeResponse.statusText} (Status: ${treeResponse.status})`);
      throw new Error("Failed to fetch repository tree. Check URL or token.");
    }
    const treeData = await treeResponse.json();
    console.log(`Fetched tree with ${treeData.tree.length} items`);

    // Filter relevant files
    const targetFiles = treeData.tree
      .filter((item: any) => item.type === "blob" && filter(item.path))
      .map((item: any) => item.path);
    console.log(`Found ${targetFiles.length} relevant files:`, targetFiles);

    // Fetch file contents using raw URLs
    for (const path of targetFiles) {
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
      console.log(`Fetching file from: ${rawUrl}`);
      try {
        const response = await fetch(rawUrl, { headers });
        if (!response.ok) {
          console.error(`Failed to fetch ${rawUrl}: ${response.statusText}`);
          continue;
        }
        const content = await response.text();
        console.log(`Successfully fetched ${path}, Size: ${content.length} characters`);
        filesToImport.push({ path, content });
      } catch (error) {
        console.error(`Error fetching ${rawUrl}:`, error);
      }
    }
  } catch (error) {
    console.error(`Error processing tree fetch:`, error);
    throw error;
  }

  if (filesToImport.length === 0) {
    console.warn("No files matched the filter. Import aborted.");
    throw new Error("No matching files found in repository. Check URL or library configuration.");
  }

  console.log(`Total files to import: ${filesToImport.length}`, filesToImport.map(f => f.path));

  // Import files into IndexedDB with library-specific subfolder
  const tx = db.transaction(FILESYSTEM_STORE, "readwrite");
  const store = tx.objectStore(FILESYSTEM_STORE);

  const libraryRootId = `library-${workspaceId}`;
  const libraryRoot: FileSystemNode = {
    id: libraryRootId,
    name: "library",
    type: "folder",
    parentId: null,
    workspaceId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  if (!(await store.get(libraryRootId))) {
    await store.put(libraryRoot);
    console.log(`Created library root folder: ${libraryRootId}`);
  }

  // Create library-specific subfolder (e.g., library/open-zeppelin or library/uniswapv4)
  const libraryFolderId = `${libraryRootId}/${libraryName}`;
  const libraryFolder: FileSystemNode = {
    id: libraryFolderId,
    name: libraryName,
    type: "folder",
    parentId: libraryRootId,
    workspaceId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  if (!(await store.get(libraryFolderId))) {
    await store.put(libraryFolder);
    console.log(`Created library folder: ${libraryFolderId}`);
  }

  for (const { path, content } of filesToImport) {
    const parts = path.split("/");
    const fileName = parts.pop()!;
    let currentParentId = libraryFolderId; // Start under library/open-zeppelin or library/uniswapv4

    for (let i = 0; i < parts.length; i++) {
      const folderName = parts[i];
      const folderId = `${currentParentId}/${folderName}`;
      const folder: FileSystemNode = {
        id: folderId,
        name: folderName,
        type: "folder",
        parentId: currentParentId,
        workspaceId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      if (!(await store.get(folderId))) {
        await store.put(folder);
        console.log(`Created folder: ${folderId}`);
      }
      currentParentId = folderId;
    }

    const fileId = `${currentParentId}/${fileName}`;
    const fileNode: FileSystemNode = {
      id: fileId,
      name: fileName,
      type: "file",
      parentId: currentParentId,
      content,
      workspaceId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    if (!(await store.get(fileId))) {
      await store.put(fileNode);
      console.log(`Imported file: ${fileId}`);
    } else {
      console.log(`Skipped existing file: ${fileId}`);
    }
  }

  await tx.done;
  console.log("Transaction completed. All files and folders imported.");
};

// Remaining functions unchanged
export const importLocalFile = async (file, workspaceId, parentId = null) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target.result;
        const newNode = {
          id: crypto.randomUUID(),
          name: file.name,
          type: "file",
          parentId: parentId,
          content: content,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          workspaceId: workspaceId,
        };
        await createNode(newNode);
        resolve(newNode);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
};

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
  const fileStore = tx.objectStore(FILESYSTEM_STORE);
  const fileIndex = fileStore.index('workspaceId');
  const filesKeys = await fileIndex.getAllKeys(workspaceId);
  await Promise.all(filesKeys.map(key => fileStore.delete(key)));
  await tx.objectStore(WORKSPACE_STORE).delete(workspaceId);
  await tx.done;
};

export const createNode = async (node: FileSystemNode) => {
  const db = await initDB();
  await db.put(FILESYSTEM_STORE, node);
};

export const getAllNodes = async (): Promise<FileSystemNode[]> => {
  const db = await initDB();
  return db.getAll(FILESYSTEM_STORE);
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
  if (!existingNode) throw new Error('Node not found');
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