import React from 'react';
import { X } from 'lucide-react';
import type { FileSystemNode } from '../types';

interface TabBarProps {
  files: FileSystemNode[];
  activeFileId: string | null;
  onSelectFile: (fileId: string) => void;
  onCloseFile: (fileId: string) => void;
}

const TabBar: React.FC<TabBarProps> = ({
  files,
  activeFileId,
  onSelectFile,
  onCloseFile,
}) => {
  if (files.length === 0) return null;

  return (
    <div className="bg-gray-100 border-b flex items-center h-9 overflow-x-auto">
      {files.map((file) => (
        <div
          key={file.id}
          className={`
            flex items-center px-3 py-1 border-r cursor-pointer group
            ${activeFileId === file.id
              ? 'bg-white text-gray-900'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }
          `}
          onClick={() => onSelectFile(file.id)}
        >
          <span className="truncate max-w-[150px]">{file.name}</span>
          <button
            className="ml-2 p-1 rounded-sm opacity-0 group-hover:opacity-100 hover:bg-gray-300"
            onClick={(e) => {
              e.stopPropagation();
              onCloseFile(file.id);
            }}
            title="Close"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

export default TabBar;