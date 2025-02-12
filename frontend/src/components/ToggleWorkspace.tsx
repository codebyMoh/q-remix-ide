// "use client";
// import React, { useState, useEffect } from "react";
// import GreenTick from "@/assets/svg/greentick.svg";
// import RightArrow from "@/assets/svg/right-arrow.svg";
// import Menu from "@/assets/svg/hamburger.svg";
// import File from "@/assets/svg/file.svg";
// import Folder from "@/assets/svg/folder.svg";
// import Upload from "@/assets/svg/upload.svg";
// import FolderImport from "@/assets/svg/folder-import.svg";
// import Box from "@/assets/svg/box.svg";
// import Link from "@/assets/svg/link.svg";
// import GitLink from "@/assets/svg/git-link.svg";
// import ChevronDown from "@/assets/svg/chevron-down.svg";
// import Code from "@/assets/svg/code.svg";
// import Readme from "@/assets/svg/readme.svg";
// import JsfileIcon from "@/assets/svg/file_type_js.svg";
// import JsonfileIcon from "@/assets/svg/file_type_json.svg";
// import SolidityfileIcon from "@/assets/svg/file_type_solidity.svg";
// import TsfileIcon from "@/assets/svg/file_type_typescript.svg";
// import { useEditor } from "@/context/EditorContext";

// import { Urbanist } from "next/font/google";
// import {
//   initDB,
//   saveFile,
//   loadFile,
//   deleteFile,
//   listFiles,
// } from "@/utils/IndexDB";

// const urbanist = Urbanist({
//   subsets: ["latin"],
//   weight: ["400", "600", "700"],
// });

// const ToggleWorkspace = () => {
//   const [selectedWorkspace, setSelectedWorkspace] = useState("Default Workspace");
//   const [isExpanded, setIsExpanded] = useState(true);
//   const [folders, setFolders] = useState<any[]>([]);
//   const [showNewFolderInput, setShowNewFolderInput] = useState(false);
//   const [newFolderName, setNewFolderName] = useState("");
//   const [selectedFolder, setSelectedFolder] = useState<number | null>(null);
//   const [showNewFileInput, setShowNewFileInput] = useState(false);
//   const [newFileName, setNewFileName] = useState("");
//   const [expandedFolders, setExpandedFolders] = useState<{ [key: string]: boolean }>({});
//   const { setCurrentFile, files: contextFiles, setFiles } = useEditor();

//   useEffect(() => {
//     async function initialize() {
//       await initDB();
//       const storedFiles = await listFiles();
//       setFolders(storedFiles);
//     }
//     initialize();
//   }, []);

//   const createFolder = async () => {
//     if (newFolderName.trim()) {
//       const newFolder = { name: newFolderName, type: "folder", files: [] };
//       await saveFile(newFolderName, newFolder);
//       setFolders([...folders, newFolder]);
//       setNewFolderName("");
//       setShowNewFolderInput(false);
//     }
//   };

//   const toggleFolder = (folderName: string) => {
//     setExpandedFolders((prev) => ({
//       ...prev,
//       [folderName]: !prev[folderName],
//     }));
//   };

//   const createFile = async () => {
//     if (newFileName.trim() && selectedFolder !== null) {
//       const extension = newFileName.split('.').pop()?.toLowerCase() || '';
//       const newFile = { 
//         name: newFileName,
//         content: extension === 'sol' ? 
//           '// SPDX-License-Identifier: MIT\npragma solidity ^0.8.0;\n\ncontract MyContract {\n    // Your code here\n}' : '',
//         language: extension === 'sol' ? 'solidity' : 'text'
//       };
//       const newFolders = [...folders];
//       newFolders[selectedFolder].files.push(newFile);
//       await saveFile(newFolders[selectedFolder].name, newFolders[selectedFolder]);
      
//       setFolders(newFolders);
//       setFiles([...contextFiles, newFile]);
//       setCurrentFile(newFile);
//       setNewFileName("");
//       setShowNewFileInput(false);
//       setSelectedFolder(null);
//     }
//   };

//   const handleFileClick = async (file: any) => {
//     const content = await loadFile(file.name);
//     const selectedFile = {
//       name: file.name,
//       content: content || file.content,
//       language: file.name.endsWith('.sol') ? 'solidity' : 'text'
//     };
    
//     setCurrentFile(selectedFile);
//     if (!contextFiles.find(f => f.name === file.name)) {
//       setFiles([...contextFiles, selectedFile]);
//     }
//   };

//   const handleFolderClick = (index: number) => {
//     setSelectedFolder(index);
//     toggleFolder(folders[index].name);
//   };

//   const handleFileKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
//     if (e.key === "Enter") {
//       createFile();
//     } else if (e.key === "Escape") {
//       setShowNewFileInput(false);
//       setNewFileName("");
//       setSelectedFolder(null);
//     }
//   };

//   const handleFolderKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
//     if (e.key === "Enter") {
//       createFolder();
//     } else if (e.key === "Escape") {
//       setShowNewFolderInput(false);
//       setNewFolderName("");
//     }
//   };

//   const getIconForType = (type: string) => {
//     const extension = type?.split(".").pop() || "unknown";

//     switch (extension) {
//       case "folder":
//         return <Folder className="w-5 h-5 text-gray-500" />;
//       case "code":
//         return <Code className="w-5 h-5 text-gray-500" />;
//       case "md":
//         return <Readme className="w-5 h-5 text-gray-500" />;
//       case "sol":
//         return <SolidityfileIcon className="w-5 h-5 text-gray-500" />;
//       case "js":
//         return <JsfileIcon className="w-5 h-5 text-gray-500" />;
//       case "json":
//         return <JsonfileIcon className="w-5 h-5 text-gray-500" />;
//       case "ts":
//         return <TsfileIcon className="w-5 h-5 text-gray-500" />;
//       default:
//         return <Readme className="w-5 h-5 text-gray-500" />;
//     }
//   };

//   return (
//     <div className="relative flex">
//       <div
//         className={`${
//           isExpanded ? "w-80 px-4" : "w-0 px-0"
//         } bg-white flex flex-col border-r border-[#DEDEDE] py-4 transition-all duration-300 overflow-hidden ${urbanist.className}`}
//       >
//         <div className="mb-2 flex items-center justify-between">
//           <span className={`${isExpanded ? "opacity-100" : "opacity-0"}`}>
//             File Explorer
//           </span>
//           <div className="flex items-center gap-2">
//             <GreenTick
//               className={`w-5 h-5 text-green-500 transition-opacity ${
//                 isExpanded ? "opacity-100" : "opacity-0"
//               }`}
//             />
//             <button
//               onClick={() => setIsExpanded(!isExpanded)}
//               className="transition-all"
//             >
//               <RightArrow
//                 className={`w-5 h-5 text-gray-500 transition-transform ${
//                   isExpanded ? "rotate-180" : "rotate-0"
//                 }`}
//               />
//             </button>
//           </div>
//         </div>

//         {isExpanded && (
//           <div className="flex flex-col gap-3 mt-5">
//             <div className="flex items-center gap-2">
//               <Menu className="w-6 h-6 translate-y-2" />
//               <span className="text-gray-600 leading-none">Workspaces</span>
//             </div>

//             <div className="relative">
//               <button className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg flex items-center justify-between">
//                 <span>{selectedWorkspace}</span>
//                 <ChevronDown className="w-4 h-4 text-gray-500" />
//               </button>
//             </div>

//             <div className="flex gap-4 justify-center items-center w-full mt-4">
//               <File
//                 onClick={() => {
//                   if (selectedFolder !== null) {
//                     setShowNewFileInput(true);
//                   }
//                 }}
//                 className={`w-6 h-6 ${
//                   selectedFolder !== null
//                     ? "text-gray-600 cursor-pointer hover:text-gray-900"
//                     : "text-gray-300"
//                 }`}
//               />
//               <Folder
//                 onClick={() => setShowNewFolderInput(true)}
//                 className="w-6 h-6 text-gray-600 cursor-pointer hover:text-gray-900"
//               />
//               <Upload className="w-6 h-6 text-gray-600 cursor-pointer hover:text-gray-900" />
//               <FolderImport className="w-6 h-6 text-gray-600 cursor-pointer hover:text-gray-900" />
//               <Box className="w-6 h-6 text-gray-600 cursor-pointer hover:text-gray-900" />
//               <Link className="w-6 h-6 text-gray-600 cursor-pointer hover:text-gray-900" />
//               <GitLink className="w-6 h-6 text-gray-600 cursor-pointer hover:text-gray-900" />
//             </div>

//             <hr className="border-t border-[#DEDEDE] w-full my-3" />

//             <div className="mt-3">
//               {folders?.map((folder, index) => (
//                 <div key={index}>
//                   <div
//                     className={`flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg cursor-pointer ${
//                       selectedFolder === index ? "bg-gray-100" : ""
//                     }`}
//                     onClick={() => handleFolderClick(index)}
//                   >
//                     <ChevronDown
//                       className={`w-4 h-4 text-gray-500 transition-transform ${
//                         expandedFolders[folder.name] ? "rotate-180" : ""
//                       }`}
//                     />
//                     {getIconForType(folder.type)}
//                     <span className="text-sm">{folder.name}</span>
//                   </div>
//                   {expandedFolders[folder.name] && (
//                     <div className="pl-8">
//                       {folder?.files?.map((file: any, fileIndex: number) => (
//                         <div
//                           key={fileIndex}
//                           className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
//                           onClick={() => handleFileClick(file)}
//                         >
//                           {getIconForType(file.name)}
//                           <span className="text-xs">{file.name}</span>
//                         </div>
//                       ))}
//                       {showNewFileInput && selectedFolder === index && (
//                         <div className="flex items-center gap-2 p-2">
//                           <Readme className="w-5 h-5 text-gray-500" />
//                           <input
//                             type="text"
//                             value={newFileName}
//                             onChange={(e) => setNewFileName(e.target.value)}
//                             onKeyDown={handleFileKeyPress}
//                             className="text-xs p-1 border border-gray-300 rounded-md focus:outline-none focus:border-gray-500"
//                             autoFocus
//                           />
//                         </div>
//                       )}
//                     </div>
//                   )}
//                 </div>
//               ))}

//               {showNewFolderInput && (
//                 <div className="flex items-center gap-2 p-2">
//                   <Folder className="w-5 h-5 text-gray-500" />
//                   <input
//                     type="text"
//                     value={newFolderName}
//                     onChange={(e) => setNewFolderName(e.target.value)}
//                     onKeyDown={handleFolderKeyPress}
//                     className="text-sm p-1 border border-gray-300 rounded-md focus:outline-none focus:border-gray-500"
//                     autoFocus
//                   />
//                 </div>
//               )}
//             </div>
//           </div>
//         )}
//       </div>

//       {!isExpanded && (
//         <button
//           onClick={() => setIsExpanded(true)}
//           className="absolute left-0 top-5 transition-all"
//         >
//           <RightArrow className="w-5 h-5 text-gray-500" />
//         </button>
//       )}
//     </div>
//   );
// };

// export default ToggleWorkspace;


"use client";
import React, { useState, useEffect } from "react";
import GreenTick from "@/assets/svg/greentick.svg";
import RightArrow from "@/assets/svg/right-arrow.svg";
import Menu from "@/assets/svg/hamburger.svg";
import File from "@/assets/svg/file.svg";
import Folder from "@/assets/svg/folder.svg";
import Upload from "@/assets/svg/upload.svg";
import FolderImport from "@/assets/svg/folder-import.svg";
import Box from "@/assets/svg/box.svg";
import Link from "@/assets/svg/link.svg";
import GitLink from "@/assets/svg/git-link.svg";
import ChevronDown from "@/assets/svg/chevron-down.svg";
import Code from "@/assets/svg/code.svg";
import Readme from "@/assets/svg/readme.svg";
import JsfileIcon from "@/assets/svg/file_type_js.svg";
import JsonfileIcon from "@/assets/svg/file_type_json.svg";
import SolidityfileIcon from "@/assets/svg/file_type_solidity.svg";
import TsfileIcon from "@/assets/svg/file_type_typescript.svg";
import { useEditor } from "@/context/EditorContext";
import { Urbanist } from "next/font/google";
import { initDB, saveFile, loadFile, listFiles } from "@/utils/IndexDB";

const urbanist = Urbanist({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const ToggleWorkspace = () => {
  const [selectedWorkspace, setSelectedWorkspace] = useState("Default Workspace");
  const [isExpanded, setIsExpanded] = useState(true);
  const [folders, setFolders] = useState<any[]>([]);
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<number | null>(null);
  const [showNewFileInput, setShowNewFileInput] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<{ [key: string]: boolean }>({});
  const { setCurrentFile, files: contextFiles, setFiles } = useEditor();

  useEffect(() => {
    async function initialize() {
      await initDB();
      const storedFiles = await listFiles();
      setFolders(storedFiles);
    }
    initialize();
  }, []);

  const createFolder = async () => {
    if (newFolderName.trim()) {
      const newFolder = { name: newFolderName, type: "folder", files: [] };
      await saveFile(newFolderName, newFolder);
      setFolders([...folders, newFolder]);
      setNewFolderName("");
      setShowNewFolderInput(false);
    }
  };

  const toggleFolder = (folderName: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderName]: !prev[folderName],
    }));
  };

  const createFile = async () => {
    if (newFileName.trim() && selectedFolder !== null) {
      const extension = newFileName.split('.').pop()?.toLowerCase() || '';
      const newFile = { 
        name: newFileName,
        content: extension === 'sol' ? 
          '// SPDX-License-Identifier: MIT\npragma solidity ^0.8.0;\n\ncontract MyContract {\n    // Your code here\n}' : '',
        language: extension === 'sol' ? 'solidity' : 'text'
      };
      const newFolders = [...folders];
      newFolders[selectedFolder].files.push(newFile);
      await saveFile(newFolders[selectedFolder].name, newFolders[selectedFolder]);

      setFolders(newFolders);
      setFiles([...contextFiles, newFile]);
      setCurrentFile(newFile);
      setNewFileName("");
      setShowNewFileInput(false);
      setSelectedFolder(null);
    }
  };

  const handleFileClick = async (file: any) => {
    const content = await loadFile(file.name);
    const selectedFile = {
      name: file.name,
      content: content || file.content,
      language: file.name.endsWith('.sol') ? 'solidity' : 'text'
    };
    setCurrentFile(selectedFile);
    if (!contextFiles.find((f: any) => f.name === file.name)) {
      setFiles([...contextFiles, selectedFile]);
    }
  };

  const handleFolderClick = (index: number) => {
    setSelectedFolder(index);
    toggleFolder(folders[index].name);
  };

  const handleFileKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      createFile();
    } else if (e.key === "Escape") {
      setShowNewFileInput(false);
      setNewFileName("");
      setSelectedFolder(null);
    }
  };

  const handleFolderKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      createFolder();
    } else if (e.key === "Escape") {
      setShowNewFolderInput(false);
      setNewFolderName("");
    }
  };

  const getIconForType = (type: string) => {
    const extension = type?.split(".").pop() || "unknown";
    switch (extension) {
      case "folder":
        return <Folder className="w-5 h-5 text-gray-500" />;
      case "code":
        return <Code className="w-5 h-5 text-gray-500" />;
      case "md":
        return <Readme className="w-5 h-5 text-gray-500" />;
      case "sol":
        return <SolidityfileIcon className="w-5 h-5 text-gray-500" />;
      case "js":
        return <JsfileIcon className="w-5 h-5 text-gray-500" />;
      case "json":
        return <JsonfileIcon className="w-5 h-5 text-gray-500" />;
      case "ts":
        return <TsfileIcon className="w-5 h-5 text-gray-500" />;
      default:
        return <Readme className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="relative flex">
      <div
        className={`${
          isExpanded ? "w-80 px-4" : "w-0 px-0"
        } bg-white flex flex-col border-r border-[#DEDEDE] py-4 transition-all duration-300 overflow-hidden ${urbanist.className}`}
      >
        <div className="mb-2 flex items-center justify-between">
          <span className={`${isExpanded ? "opacity-100" : "opacity-0"}`}>
            File Explorer
          </span>
          <div className="flex items-center gap-2">
            <GreenTick className={`w-5 h-5 text-green-500 transition-opacity ${isExpanded ? "opacity-100" : "opacity-0"}`} />
            <button onClick={() => setIsExpanded(!isExpanded)} className="transition-all">
              <RightArrow className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? "rotate-180" : "rotate-0"}`} />
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
                onClick={() => { if (selectedFolder !== null) { setShowNewFileInput(true); } }}
                className={`w-6 h-6 ${selectedFolder !== null ? "text-gray-600 cursor-pointer hover:text-gray-900" : "text-gray-300"}`}
              />
              <Folder onClick={() => setShowNewFolderInput(true)} className="w-6 h-6 text-gray-600 cursor-pointer hover:text-gray-900" />
              <Upload className="w-6 h-6 text-gray-600 cursor-pointer hover:text-gray-900" />
              <FolderImport className="w-6 h-6 text-gray-600 cursor-pointer hover:text-gray-900" />
              <Box className="w-6 h-6 text-gray-600 cursor-pointer hover:text-gray-900" />
              <Link className="w-6 h-6 text-gray-600 cursor-pointer hover:text-gray-900" />
              <GitLink className="w-6 h-6 text-gray-600 cursor-pointer hover:text-gray-900" />
            </div>
            <hr className="border-t border-[#DEDEDE] w-full my-3" />
            <div className="mt-3">
              {folders?.map((folder, index) => (
                <div key={index}>
                  <div
                    className={`flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg cursor-pointer ${selectedFolder === index ? "bg-gray-100" : ""}`}
                    onClick={() => handleFolderClick(index)}
                  >
                    <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${expandedFolders[folder.name] ? "rotate-180" : ""}`} />
                    {getIconForType(folder.type)}
                    <span className="text-sm">{folder.name}</span>
                  </div>
                  {expandedFolders[folder.name] && (
                    <div className="pl-8">
                      {folder?.files?.map((file: any, fileIndex: number) => (
                        <div
                          key={fileIndex}
                          className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                          onClick={() => handleFileClick(file)}
                        >
                          {getIconForType(file.name)}
                          <span className="text-xs">{file.name}</span>
                        </div>
                      ))}
                      {showNewFileInput && selectedFolder === index && (
                        <div className="flex items-center gap-2 p-2">
                          <Readme className="w-5 h-5 text-gray-500" />
                          <input
                            type="text"
                            value={newFileName}
                            onChange={(e) => setNewFileName(e.target.value)}
                            onKeyDown={handleFileKeyPress}
                            className="text-xs p-1 border border-gray-300 rounded-md focus:outline-none focus:border-gray-500"
                            autoFocus
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {showNewFolderInput && (
                <div className="flex items-center gap-2 p-2">
                  <Folder className="w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={handleFolderKeyPress}
                    className="text-sm p-1 border border-gray-300 rounded-md focus:outline-none focus:border-gray-500"
                    autoFocus
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {!isExpanded && (
        <button onClick={() => setIsExpanded(true)} className="absolute left-0 top-5 transition-all">
          <RightArrow className="w-5 h-5 text-gray-500" />
        </button>
      )}
    </div>
  );
};

export default ToggleWorkspace;
