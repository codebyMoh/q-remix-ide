export interface FileSystemNode {
    id: string;
    name: string;
    type: 'file' | 'folder';
    content?: string;
    ipfsCid?: string;//STores the IPFS CID, for testing now
    parentId: string | null;
    createdAt: number;
    updatedAt: number;
    workspaceId?: string;
  }
  export interface Workspace {
    id: string;
    name: string;
    createdAt: number;
  }