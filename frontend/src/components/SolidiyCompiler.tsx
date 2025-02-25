// "use client";
// import React, { useState } from "react";

// import { GreenTick, RightArrow, DownArrow } from "@/assets/index";

// import { Urbanist } from "next/font/google";

// const urbanist = Urbanist({
//   subsets: ["latin"],
//   weight: ["400", "600", "700"],
// });

// const SolidiyCompiler = () => {
//   const [selectedVersion, setSelectedVersion] = useState(
//     "0.8.26+commit.8a97fa7a"
//   );
//   const [isExpanded, setIsExpanded] = useState(true);

//   const [showAdvanced, setShowAdvanced] = useState(false);

//   const toggleSettingsVisibility = () => {
//     setShowAdvanced((prev) => !prev);
//   };

//   const versions = [
//     { version: "0.8.28+commit.7893614a" },
//     { version: "0.8.27+commit.40a35a09" },
//     { version: "0.8.26+commit.8a97fa7a" },
//     { version: "0.8.25+commit.b61c2a91" },
//     { version: "0.8.24+commit.e11b9ed9" },
//     { version: "0.8.23+commit.f704f362" },
//     { version: "0.8.22+commit.4fc1097e" },
//     { version: "0.8.21+commit.d9974bed" },
//     { version: "0.8.20+commit.a1b79de6" },
//     { version: "0.8.19+commit.7dd6d404" },
//     { version: "0.8.18+commit.87f61d96" },
//     { version: "0.8.17+commit.8df45f5f" },
//     { version: "0.8.16+commit.07a7930e" },
//     { version: "0.8.15+commit.e14f2714" },
//   ];

//   const checkboxOptions = [
//     { label: "Include nightly builds" },
//     { label: "Auto compile" },
//     { label: "Hide warnings" },
//   ];
//   const evmVersions = [
//     { label: "frontier" },
//     { label: "homestead" },
//     { label: "tangerineWhistle" },
//     { label: "spuriousDragon" },
//     { label: "byzantium" },
//     { label: "constantinople" },
//     { label: "petersburg" },
//     { label: "istanbul" },
//     { label: "berlin" },
//     { label: "london" },
//     { label: "paris" },
//     { label: "shanghai" },
//     { label: "cancun" },
//   ];
//   return (
//     <div className="relative flex">
//       {/* Sidebar */}
//       <div
//         className={`${
//           isExpanded ? "w-80 px-4" : "w-0 px-0"
//         } bg-white flex flex-col border-r border-[#DEDEDE] py-4 transition-all duration-300 overflow-hidden ${
//           urbanist.className
//         }`}
//       >
//         {/* File Explorer Header */}
//         <div className="mb-2 flex items-center justify-between">
//           <span className={`${isExpanded ? "opacity-100" : "opacity-0"}`}>
//             SOLIDITY COMPILER
//           </span>
//           <div className="flex items-center gap-2">
//             <GreenTick
//               className={`w-5 h-5 text-green-500 transition-opacity ${
//                 isExpanded ? "opacity-100" : "opacity-0"
//               }`}
//             />
//             {/* Toggle Button */}
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

//         {/* Sidebar Navigation */}
//         {isExpanded && (
//           <div className="flex flex-col gap-[0.1rem] mt-[1px]">
//             {/* Compiler Header */}
//             <div className="flex items-center gap-2">
//               <span className="text-gray-600 text-sm">Compiler</span>
//             </div>

//             {/* Version Selector */}
//             <select
//               value={selectedVersion}
//               onChange={(e) => setSelectedVersion(e.target.value)}
//               className="border p-2 rounded "
//             >
//               {versions.map((data, index) => (
//                 <option key={index} value={data.version}>
//                   {data.version}
//                 </option>
//               ))}
//             </select>

//             {/* Checkbox Options */}
//             <div className="flex flex-col gap-2 mt-3 ">
//               {checkboxOptions.map((checkbox, index) => (
//                 <label key={index} className="flex items-center text-[13px]">
//                   <input type="checkbox" className="accent-black" />
//                   <span className="pl-2">{checkbox.label}</span>
//                 </label>
//               ))}
//             </div>

//             {/* Advanced Configurations */}
//             <div className="mt-6">
//               <div className="flex justify-between items-center">
//                 <div>Advanced Configurations</div>
//                 {showAdvanced ? (
//                   <DownArrow
//                     className=" cursor-pointer"
//                     onClick={toggleSettingsVisibility}
//                   />
//                 ) : (
//                   <RightArrow
//                     className="cursor-pointer"
//                     onClick={toggleSettingsVisibility}
//                   />
//                 )}
//               </div>

//               {showAdvanced && (
//                 <div className="flex flex-col gap-3 mt-4">
//                   <div>
//                     <input
//                       type="radio"
//                       id="config1"
//                       name="config"
//                       className="accent-black"
//                     />
//                     <label htmlFor="config1" className="ml-2 text-[14px]">
//                       Compiler configuration
//                     </label>
//                     <div className="flex flex-col  mt-2">
//                       <label className="text-[13px]">LANGUAGE</label>
//                       <select className="border p-2 rounded">
//                         <option>Solidity</option>
//                         <option>Yul</option>
//                       </select>
//                     </div>
//                     <div className="flex flex-col mt-2">
//                       <label className="text-[13px]">EVM VERSION</label>
//                       <select className="border p-2 rounded">
//                         <option className="text-[13px]">berlin</option>
//                         {evmVersions.map((data, index) => (
//                           <option key={index}>{data.label}</option>
//                         ))}
//                       </select>
//                     </div>
//                     <div className="flex justify-between items-center mt-[15px]">
//                       <div className="flex items-center gap-2">
//                         <input
//                           type="checkbox"
//                           id="optimization"
//                           className="accent-black"
//                         />
//                         <label htmlFor="optimization" className="text-sm ">
//                           Optimization
//                         </label>
//                       </div>
//                       <div>
//                         <input
//                           type="number"
//                           defaultValue={200}
//                           className="w-[80px] p-1 border rounded "
//                         />
//                       </div>
//                     </div>
//                   </div>
//                   <div>
//                     <input
//                       type="radio"
//                       id="config2"
//                       name="config"
//                       className="accent-black"
//                     />
//                     <label htmlFor="config2" className="ml-2 text-[14px]">
//                       Use configuration file
//                     </label>
//                     <div className="flex justify-between items-center mt-2">
//                       <div className="text-[13px] pl-[20px]">
//                         compiler_config.json
//                       </div>
//                       <button className="border p-[5px] text-[12px] rounded bg-gray-200">
//                         Change
//                       </button>
//                     </div>
//                   </div>
//                 </div>
//               )}
//             </div>

//             {/* Compile Buttons */}
//             <div className="flex flex-col gap-4 mt-6">
//               <button className="border p-2 rounded bg-black text-white">
//                 Compile no file selected
//               </button>
//               <button className="border p-2 rounded bg-gray-500 text-white">
//                 Compile and Run script
//               </button>
//             </div>
//           </div>
//         )}
//       </div>

//       {/* Show Arrow When Collapsed */}
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

// export default SolidiyCompiler;

// "use client";
// import React, { useState, useEffect } from "react";
// import { GreenTick, RightArrow, DownArrow } from "@/assets/index";
// import { Urbanist } from "next/font/google";

// // Import compiler modules
// import CompilerAbstract from "@/app/compiler/compiler-abstract";
// import { compile } from "@/app/compiler/compiler-helpers";
// import { canUseWorker, urlFromVersion } from "@/app/compiler/compiler-utils";

// const urbanist = Urbanist({
//   subsets: ["latin"],
//   weight: ["400", "600", "700"],
// });

// const SolidityCompiler = () => {
//   const [selectedVersion, setSelectedVersion] = useState(
//     "0.8.26+commit.8a97fa7a"
//   );
//   const [isExpanded, setIsExpanded] = useState(true);
//   const [showAdvanced, setShowAdvanced] = useState(false);
//   const [compileStatus, setCompileStatus] = useState("idle"); // idle, compiling, success, error
//   const [compilationResult, setCompilationResult] = useState(null);
//   const [selectedEVMVersion, setSelectedEVMVersion] = useState("berlin");
//   const [selectedLanguage, setSelectedLanguage] = useState("Solidity");
//   const [optimizationEnabled, setOptimizationEnabled] = useState(false);
//   const [optimizationRuns, setOptimizationRuns] = useState(200);
//   const [includeNightly, setIncludeNightly] = useState(false);
//   const [autoCompile, setAutoCompile] = useState(false);
//   const [hideWarnings, setHideWarnings] = useState(false);
//   const [currentFile, setCurrentFile] = useState(null);
//   const [compilerLoaded, setCompilerLoaded] = useState(false);

//   const toggleSettingsVisibility = () => {
//     setShowAdvanced((prev) => !prev);
//   };

//   const versions = [
//     { version: "0.8.28+commit.7893614a" },
//     { version: "0.8.27+commit.40a35a09" },
//     { version: "0.8.26+commit.8a97fa7a" },
//     { version: "0.8.25+commit.b61c2a91" },
//     { version: "0.8.24+commit.e11b9ed9" },
//     { version: "0.8.23+commit.f704f362" },
//     { version: "0.8.22+commit.4fc1097e" },
//     { version: "0.8.21+commit.d9974bed" },
//     { version: "0.8.20+commit.a1b79de6" },
//     { version: "0.8.19+commit.7dd6d404" },
//     { version: "0.8.18+commit.87f61d96" },
//     { version: "0.8.17+commit.8df45f5f" },
//     { version: "0.8.16+commit.07a7930e" },
//     { version: "0.8.15+commit.e14f2714" },
//   ];

//   const checkboxOptions = [
//     { label: "Include nightly builds", state: includeNightly, setState: setIncludeNightly },
//     { label: "Auto compile", state: autoCompile, setState: setAutoCompile },
//     { label: "Hide warnings", state: hideWarnings, setState: setHideWarnings },
//   ];

//   const evmVersions = [
//     { label: "frontier" },
//     { label: "homestead" },
//     { label: "tangerineWhistle" },
//     { label: "spuriousDragon" },
//     { label: "byzantium" },
//     { label: "constantinople" },
//     { label: "petersburg" },
//     { label: "istanbul" },
//     { label: "berlin" },
//     { label: "london" },
//     { label: "paris" },
//     { label: "shanghai" },
//     { label: "cancun" },
//   ];

//   // Mock file content for demo purposes
//   const mockFileContent = `
//   // SPDX-License-Identifier: MIT
//   pragma solidity ^0.8.0;
  
//   contract SimpleStorage {
//       uint256 private storedData;
      
//       function set(uint256 x) public {
//           storedData = x;
//       }
      
//       function get() public view returns (uint256) {
//           return storedData;
//       }
//   }
//   `;

//   const handleVersionChange = (e) => {
//     setSelectedVersion(e.target.value);
//     setCompilerLoaded(false);
//   };

//   const handleEVMVersionChange = (e) => {
//     setSelectedEVMVersion(e.target.value);
//   };

//   const handleLanguageChange = (e) => {
//     setSelectedLanguage(e.target.value);
//   };

//   const handleOptimizationToggle = () => {
//     setOptimizationEnabled(!optimizationEnabled);
//   };

//   const handleOptimizationRunsChange = (e) => {
//     setOptimizationRuns(parseInt(e.target.value, 10));
//   };

//   const compileCode = async () => {
//     if (!currentFile) {
//       console.error("No file selected");
//       return;
//     }

//     setCompileStatus("compiling");

//     try {
//       // Mock content resolver for the purpose of this demo
//       const contentResolver = (url, cb) => {
//         setTimeout(() => {
//           cb(null, mockFileContent);
//         }, 100);
//       };

//       const compilationTargets = {
//         [currentFile]: { content: mockFileContent }
//       };

//       const settings = {
//         version: selectedVersion,
//         language: selectedLanguage,
//         evmVersion: selectedEVMVersion,
//         optimize: optimizationEnabled,
//         runs: optimizationRuns
//       };

//       // This would normally be an async operation
//       const result = await compileSimulation(compilationTargets, settings);
//       setCompilationResult(result);
//       setCompileStatus("success");
//     } catch (error) {
//       console.error("Compilation error:", error);
//       setCompileStatus("error");
//     }
//   };

//   // Simulated compile function since we can't directly use the actual compiler in this demo
//   const compileSimulation = async (compilationTargets, settings) => {
//     return new Promise((resolve) => {
//       setTimeout(() => {
//         resolve({
//           success: true,
//           data: {
//             contracts: {
//               "SimpleStorage.sol": {
//                 SimpleStorage: {
//                   abi: [
//                     { 
//                       "inputs": [{ "internalType": "uint256", "name": "x", "type": "uint256" }],
//                       "name": "set",
//                       "outputs": [],
//                       "stateMutability": "nonpayable",
//                       "type": "function"
//                     },
//                     {
//                       "inputs": [],
//                       "name": "get",
//                       "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
//                       "stateMutability": "view",
//                       "type": "function"
//                     }
//                   ],
//                   evm: {
//                     bytecode: {
//                       object: "0x608060405234801561001057600080fd5b5060c78061001f6000396000f3fe6080604052348015600f57600080fd5b506004361060325760003560e01c806360fe47b11460375780636d4ce63c146049575b600080fd5b6047604236600460b2565b6063565b005b604f6068565b60405190815260200160405180910390f35b600055565b60008054905090565b600060a082840312156097576000805a905550505b5060208091028201905041905280600c60c36002905b50919056fea2646970667358221220c71b01b88fe7f56d3d9e3ad06a25e60d4efa5c0fb28ae39d0e2a83b6a4d09a9764736f6c63430008110033",
//                       sourceMap: "...",
//                     },
//                     deployedBytecode: {
//                       object: "0x6080604052348015600f57600080fd5b506004361060325760003560e01c806360fe47b11460375780636d4ce63c146049575b600080fd5b6047604236600460b2565b6063565b005b604f6068565b60405190815260200160405180910390f35b600055565b60008054905090565b600060a082840312156097576000805a905550505b5060208091028201905041905280600c60c36002905b50919056fea2646970667358221220c71b01b88fe7f56d3d9e3ad06a25e60d4efa5c0fb28ae39d0e2a83b6a4d09a9764736f6c63430008110033",
//                     },
//                     gasEstimates: {
//                       creation: {
//                         codeDepositCost: "60600",
//                         executionCost: "infinite",
//                         totalCost: "infinite"
//                       }
//                     }
//                   }
//                 }
//               }
//             },
//             sources: {
//               "SimpleStorage.sol": {
//                 id: 0
//               }
//             }
//           }
//         });
//       }, 1000);
//     });
//   };

//   useEffect(() => {
//     // Simulate setting a current file
//     setCurrentFile("SimpleStorage.sol");
    
//     // Simulate compiler loading
//     const timer = setTimeout(() => {
//       setCompilerLoaded(true);
//     }, 1000);
    
//     return () => clearTimeout(timer);
//   }, [selectedVersion]);

//   // Auto compile when enabled and file changes
//   useEffect(() => {
//     if (autoCompile && currentFile && compilerLoaded) {
//       compileCode();
//     }
//   }, [currentFile, autoCompile, compilerLoaded]);

//   return (
//     <div className="relative flex">
//       {/* Sidebar */}
//       <div
//         className={`${
//           isExpanded ? "w-80 px-4" : "w-0 px-0"
//         } bg-white flex flex-col border-r border-[#DEDEDE] py-4 transition-all duration-300 overflow-hidden ${
//           urbanist.className
//         }`}
//       >
//         {/* File Explorer Header */}
//         <div className="mb-2 flex items-center justify-between">
//           <span className={`${isExpanded ? "opacity-100" : "opacity-0"}`}>
//             SOLIDITY COMPILER
//           </span>
//           <div className="flex items-center gap-2">
//             <GreenTick
//               className={`w-5 h-5 text-green-500 transition-opacity ${
//                 isExpanded && compileStatus === "success" ? "opacity-100" : "opacity-0"
//               }`}
//             />
//             {/* Toggle Button */}
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

//         {/* Sidebar Navigation */}
//         {isExpanded && (
//           <div className="flex flex-col gap-[0.1rem] mt-[1px]">
//             {/* Compiler Header */}
//             <div className="flex items-center gap-2">
//               <span className="text-gray-600 text-sm">Compiler</span>
//             </div>

//             {/* Version Selector */}
//             <select
//               value={selectedVersion}
//               onChange={handleVersionChange}
//               className="border p-2 rounded"
//             >
//               {versions.map((data, index) => (
//                 <option key={index} value={data.version}>
//                   {data.version}
//                 </option>
//               ))}
//             </select>

//             {/* Checkbox Options */}
//             <div className="flex flex-col gap-2 mt-3">
//               {checkboxOptions.map((checkbox, index) => (
//                 <label key={index} className="flex items-center text-[13px]">
//                   <input 
//                     type="checkbox" 
//                     className="accent-black" 
//                     checked={checkbox.state}
//                     onChange={() => checkbox.setState(!checkbox.state)}
//                   />
//                   <span className="pl-2">{checkbox.label}</span>
//                 </label>
//               ))}
//             </div>

//             {/* Advanced Configurations */}
//             <div className="mt-6">
//               <div className="flex justify-between items-center">
//                 <div>Advanced Configurations</div>
//                 {showAdvanced ? (
//                   <DownArrow
//                     className="cursor-pointer"
//                     onClick={toggleSettingsVisibility}
//                   />
//                 ) : (
//                   <RightArrow
//                     className="cursor-pointer"
//                     onClick={toggleSettingsVisibility}
//                   />
//                 )}
//               </div>

//               {showAdvanced && (
//                 <div className="flex flex-col gap-3 mt-4">
//                   <div>
//                     <input
//                       type="radio"
//                       id="config1"
//                       name="config"
//                       className="accent-black"
//                       defaultChecked
//                     />
//                     <label htmlFor="config1" className="ml-2 text-[14px]">
//                       Compiler configuration
//                     </label>
//                     <div className="flex flex-col mt-2">
//                       <label className="text-[13px]">LANGUAGE</label>
//                       <select 
//                         className="border p-2 rounded"
//                         value={selectedLanguage}
//                         onChange={handleLanguageChange}
//                       >
//                         <option>Solidity</option>
//                         <option>Yul</option>
//                       </select>
//                     </div>
//                     <div className="flex flex-col mt-2">
//                       <label className="text-[13px]">EVM VERSION</label>
//                       <select 
//                         className="border p-2 rounded"
//                         value={selectedEVMVersion}
//                         onChange={handleEVMVersionChange}
//                       >
//                         {evmVersions.map((data, index) => (
//                           <option key={index}>{data.label}</option>
//                         ))}
//                       </select>
//                     </div>
//                     <div className="flex justify-between items-center mt-[15px]">
//                       <div className="flex items-center gap-2">
//                         <input
//                           type="checkbox"
//                           id="optimization"
//                           className="accent-black"
//                           checked={optimizationEnabled}
//                           onChange={handleOptimizationToggle}
//                         />
//                         <label htmlFor="optimization" className="text-sm">
//                           Optimization
//                         </label>
//                       </div>
//                       <div>
//                         <input
//                           type="number"
//                           value={optimizationRuns}
//                           onChange={handleOptimizationRunsChange}
//                           className="w-[80px] p-1 border rounded"
//                           disabled={!optimizationEnabled}
//                         />
//                       </div>
//                     </div>
//                   </div>
//                   <div>
//                     <input
//                       type="radio"
//                       id="config2"
//                       name="config"
//                       className="accent-black"
//                     />
//                     <label htmlFor="config2" className="ml-2 text-[14px]">
//                       Use configuration file
//                     </label>
//                     <div className="flex justify-between items-center mt-2">
//                       <div className="text-[13px] pl-[20px]">
//                         compiler_config.json
//                       </div>
//                       <button className="border p-[5px] text-[12px] rounded bg-gray-200">
//                         Change
//                       </button>
//                     </div>
//                   </div>
//                 </div>
//               )}
//             </div>

//             {/* Compile Buttons */}
//             <div className="flex flex-col gap-4 mt-6">
//               <button 
//                 className={`border p-2 rounded ${
//                   currentFile 
//                     ? "bg-black text-white hover:bg-gray-800" 
//                     : "bg-gray-400 text-white cursor-not-allowed"
//                 }`}
//                 onClick={compileCode}
//                 disabled={!currentFile || compileStatus === "compiling" || !compilerLoaded}
//               >
//                 {compileStatus === "compiling" 
//                   ? "Compiling..." 
//                   : `Compile ${currentFile || "no file selected"}`}
//               </button>
//               <button 
//                 className="border p-2 rounded bg-gray-500 text-white hover:bg-gray-600"
//                 disabled={!currentFile || compileStatus === "compiling" || !compilerLoaded}
//               >
//                 Compile and Run script
//               </button>
//             </div>

//             {/* Compilation Status */}
//             {compileStatus === "success" && (
//               <div className="mt-4 p-2 bg-green-100 text-green-800 rounded">
//                 Compilation successful!
//               </div>
//             )}
//             {compileStatus === "error" && (
//               <div className="mt-4 p-2 bg-red-100 text-red-800 rounded">
//                 Compilation failed.
//               </div>
//             )}
//           </div>
//         )}
//       </div>

//       {/* Show Arrow When Collapsed */}
//       {!isExpanded && (
//         <button
//           onClick={() => setIsExpanded(true)}
//           className="absolute left-0 top-5 transition-all"
//         >
//           <RightArrow className="w-5 h-5 text-gray-500" />
//         </button>
//       )}

//       {/* Compilation Result Display (optional) */}
//       {compilationResult && compileStatus === "success" && (
//         <div className="flex-1 p-4 overflow-auto">
//           <h2 className="text-xl font-bold mb-4">Compilation Result</h2>
//           <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
//             {JSON.stringify(compilationResult, null, 2)}
//           </pre>
//         </div>
//       )}
//     </div>
//   );
// };

// export default SolidityCompiler;


// THE BELOW CDE IS FOR TESTING PURPOSE ONLY !!
"use client";
import { useState } from 'react';
import { compile } from '../lib/compiler';

export default function SolidityCompiler() {
  const [code, setCode] = useState(`// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Example {
    uint256 value;
    
    function store(uint256 newValue) public {
        value = newValue;
    }
}`);
  const [results, setResults] = useState<ContractData[]>([]);
  const [error, setError] = useState('');
  const [isCompiling, setIsCompiling] = useState(false);
  const [expandedAbi, setExpandedAbi] = useState<string | null>(null);
  const [expandedBytecode, setExpandedBytecode] = useState<string | null>(null);

  const handleCompile = async () => {
    try {
      setError('');
      setResults([]);
      setIsCompiling(true);
      
      const compilationResult = await compile(code);
      setResults(compilationResult);
      
    } catch (err) {
      setError(err.message || 'Compilation failed - check contract syntax');
    } finally {
      setIsCompiling(false);
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        className="w-full h-64 p-4 bg-gray-100 rounded-md mb-4 font-mono text-sm"
        placeholder="Paste your Solidity code here..."
      />
      
      <button
        onClick={handleCompile}
        disabled={isCompiling}
        className={`px-6 py-2 rounded-md ${
          isCompiling 
            ? "bg-gray-400 cursor-not-allowed" 
            : "bg-blue-600 text-white hover:bg-blue-700"
        }`}
      >
        {isCompiling ? "Compiling..." : "Compile Contract"}
      </button>

      {/* Results Section */}
      {results.length > 0 && (
        <div className="mt-6">
          <div className="p-4 bg-green-100 text-green-800 rounded-md mb-4">
            ✓ Compilation Successful
          </div>

          {results.map((contract) => (
            <div key={contract.contractName} className="mt-4 p-4 bg-white rounded-md shadow">
              <h3 className="text-lg font-bold mb-4">{contract.contractName}</h3>
              
              <div className="space-y-4">
                <div>
                  <button
                    onClick={() => setExpandedAbi(expandedAbi === contract.contractName ? null : contract.contractName)}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                  >
                    <span>▸</span>
                    <span>View ABI</span>
                  </button>
                  {expandedAbi === contract.contractName && (
                    <pre className="mt-2 p-4 bg-gray-50 rounded-md overflow-auto text-sm">
                      {JSON.stringify(contract.abi, null, 2)}
                    </pre>
                  )}
                </div>

                <div>
                  <button
                    onClick={() => setExpandedBytecode(expandedBytecode === contract.contractName ? null : contract.contractName)}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                  >
                    <span>▸</span>
                    <span>View Bytecode</span>
                  </button>
                  {expandedBytecode === contract.contractName && (
                    <code className="mt-2 p-4 bg-gray-50 rounded-md block overflow-auto text-sm">
                      {contract.byteCode}
                    </code>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-4 bg-red-100 text-red-800 rounded-md">
          <div className="font-bold mb-2">✗ Compilation Failed</div>
          <pre className="whitespace-pre-wrap text-sm">{error}</pre>
        </div>
      )}
    </div>
  );
}