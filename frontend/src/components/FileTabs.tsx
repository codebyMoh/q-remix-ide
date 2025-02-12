// "use client";
// import React from "react";
// import { useEditor, FileType } from "@/context/EditorContext";

// const FileTabs = () => {
//   const { files, currentFile, setCurrentFile, setFiles } = useEditor();

//   const removeFile = (fileToRemove: FileType, e: React.MouseEvent) => {
//     // Prevent triggering the tab's onClick
//     e.stopPropagation();
//     const updatedFiles = files.filter(file => file.name !== fileToRemove.name);
//     setFiles(updatedFiles);
//     if (currentFile?.name === fileToRemove.name) {
//       setCurrentFile(updatedFiles[0] || null);
//     }
//   };

//   return (
//     <div className="flex border-b border-gray-300 bg-gray-200">
//       {files.map((file, idx) => (
//         <div
//           key={idx}
//           onClick={() => setCurrentFile(file)}
//           className={`flex items-center gap-1 p-2 cursor-pointer ${
//             currentFile?.name === file.name ? "bg-white border-b-2 border-blue-500" : "bg-gray-200"
//           }`}
//         >
//           <span>{file.name}</span>
//           <button
//             onClick={(e) => removeFile(file, e)}
//             className="ml-1 text-red-500 hover:text-red-700"
//           >
//             x
//           </button>
//         </div>
//       ))}
//     </div>
//   );
// };

// export default FileTabs;


"use client";
import React from "react";
import { X } from "lucide-react";
import { useEditor, FileType } from "@/context/EditorContext";

const FileTabs = () => {
  const { files, currentFile, setCurrentFile, setFiles } = useEditor();

  const removeFile = (fileToRemove: FileType, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedFiles = files.filter(file => file.name !== fileToRemove.name);
    setFiles(updatedFiles);
    if (currentFile?.name === fileToRemove.name) {
      setCurrentFile(updatedFiles[0] || null);
    }
  };

  return (
    <div className="flex items-center gap-1 p-2 bg-white border-b border-gray-100 shadow-sm">
      {files.map((file, idx) => (
        <div
          key={idx}
          onClick={() => setCurrentFile(file)}
          className={`
            group flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
            transition-all duration-200 ease-in-out cursor-pointer
            ${
              currentFile?.name === file.name
                ? "bg-gray-100 text-gray-900"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }
          `}
        >
          <span className="truncate max-w-[120px]">{file.name}</span>
          <button
            onClick={(e) => removeFile(file, e)}
            className={`
              flex items-center justify-center w-4 h-4 rounded-full
              transition-colors duration-200
              ${
                currentFile?.name === file.name
                  ? "text-gray-500 hover:text-gray-700"
                  : "text-gray-400 hover:text-gray-600"
              }
            `}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};

export default FileTabs;