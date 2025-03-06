export interface FileSystemNode {
    id: string;
    name: string;
    type: 'file' | 'folder';
    content?: string;
    parentId: string | null;
    createdAt: number;
    updatedAt: number;
  }
  export interface Workspace {
    id: string;
    name: string;
    createdAt: number;
  }