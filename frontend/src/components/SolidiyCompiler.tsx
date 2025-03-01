"use client";
import React, { useState, useEffect } from "react";
import { GreenTick, RightArrow, DownArrow } from "@/assets/index";
import { Urbanist } from "next/font/google";
import { useEditor } from "../context/EditorContext";
import { getAllNodes, createNode, updateNode } from "../utils/IndexDB";

const urbanist = Urbanist({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export interface ContractData {
  contractName: string;
  abi: any;
  byteCode: string;
}

const SolidityCompiler = () => {
  // Get active file, onFileSelect and files array from your EditorContext.
  const { activeFile, onFileSelect, files } = useEditor();
  const [availableFiles, setAvailableFiles] = useState<any[]>([]);
  const [selectedVersion, setSelectedVersion] = useState("0.8.26+commit.8a97fa7a");
  const [isExpanded, setIsExpanded] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [results, setResults] = useState<ContractData[]>([]);
  const [error, setError] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [showWarnings, setShowWarnings] = useState(false);
  const [hideWarningsOption, setHideWarningsOption] = useState(false);
  const [autoCompile, setAutoCompile] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [expandedAbi, setExpandedAbi] = useState<string | null>(null);
  const [expandedBytecode, setExpandedBytecode] = useState<string | null>(null);
  const [workerInstance, setWorkerInstance] = useState<Worker | null>(null);

  const toggleSettingsVisibility = () => {
    setShowAdvanced((prev) => !prev);
  };

  const versions = [
    { version: "0.8.28+commit.7893614a" },
    { version: "0.8.27+commit.40a35a09" },
    { version: "0.8.26+commit.8a97fa7a" },
    { version: "0.8.25+commit.b61c2a91" },
    { version: "0.8.24+commit.e11b9ed9" },
    { version: "0.8.23+commit.f704f362" },
    { version: "0.8.22+commit.4fc1097e" },
    { version: "0.8.21+commit.d9974bed" },
    { version: "0.8.20+commit.a1b79de6" },
    { version: "0.8.19+commit.7dd6d404" },
    { version: "0.8.18+commit.87f61d96" },
    { version: "0.8.17+commit.8df45f5f" },
    { version: "0.8.16+commit.07a7930e" },
    { version: "0.8.15+commit.e14f2714" },
  ];

  const checkboxOptions = [
    { label: "Include nightly builds" },
    {
      label: "Auto compile",
      checked: autoCompile,
      onChange: () => setAutoCompile((prev) => !prev),
    },
    {
      label: "Hide warnings",
      checked: hideWarningsOption,
      onChange: () => setHideWarningsOption((prev) => !prev),
    },
  ];

  const evmVersions = [
    { label: "frontier" },
    { label: "homestead" },
    { label: "tangerineWhistle" },
    { label: "spuriousDragon" },
    { label: "byzantium" },
    { label: "constantinople" },
    { label: "petersburg" },
    { label: "istanbul" },
    { label: "berlin" },
    { label: "london" },
    { label: "paris" },
    { label: "shanghai" },
    { label: "cancun" },
  ];

  // Load available Solidity files from IndexedDB (or your backend)
  useEffect(() => {
    async function loadSolFiles() {
      try {
        const nodes = await getAllNodes();
        const solFiles = nodes.filter(
          (node: any) => node.type === "file" && node.name.endsWith(".sol")
        );
        setAvailableFiles(solFiles);
      } catch (error) {
        console.error("Error loading Solidity files:", error);
      }
    }
    loadSolFiles();
  }, []);

  // Auto-compile if enabled when activeFile changes
  useEffect(() => {
    if (autoCompile && activeFile?.type === "file" && activeFile.name.endsWith(".sol")) {
      handleCompile();
    }
  }, [activeFile, autoCompile]);

  // Clean up worker on unmount
  useEffect(() => {
    return () => {
      if (workerInstance) {
        workerInstance.terminate();
      }
    };
  }, [workerInstance]);

  // When a file is chosen from the dropdown, update the active file
  const handleFileSelection = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const fileId = e.target.value;
    const file = availableFiles.find((f) => f.id === fileId);
    onFileSelect(file || null);
  };

  // Check if the active file is a valid Solidity file
  const isSolFile =
    activeFile?.type === "file" && activeFile.name.endsWith(".sol");

  // Handle compilation by posting to the web worker
  const handleCompile = async () => {
    if (!isSolFile || !activeFile) {
      setError("Please select a Solidity file (.sol) to compile.");
      return;
    }
    
    console.log("Compiling file:", activeFile.name);
    
    setIsCompiling(true);
    setError("");
    setWarnings([]);
    setResults([]);

    // Terminate any existing worker before starting a new one
    if (workerInstance) {
      workerInstance.terminate();
    }

    // Create a new worker instance (as a module)
    const worker = new Worker(new URL("../workers/solc.worker.ts", import.meta.url), { type: "module" });
    setWorkerInstance(worker);

    // Use a timestamp to force fresh compiler load
    const timestamp = Date.now();
    worker.postMessage({
      contractCode: activeFile.content,
      filename: activeFile.name,
      compilerVersion: selectedVersion,
      timestamp,
    });

    worker.onmessage = (event) => {
      setIsCompiling(false);
      
      if (event.data.error) {
        setError(event.data.error);
      } else {
        if (event.data.warnings && Array.isArray(event.data.warnings)) {
          setWarnings(event.data.warnings);
        }
        const contracts = Array.isArray(event.data.contracts)
          ? event.data.contracts
          : [];
        setResults(contracts);
        console.log("Compilation result:", contracts);
        
        // Dispatch a custom event with the contract data
        const compilationEvent = new CustomEvent('contract-compiled', {
          detail: { contracts }
        });
        window.dispatchEvent(compilationEvent);
        
        // --- Generate Artifacts Folder and JSON Files ---
        (async () => {
          try {
            // Check if an "artifacts" folder exists in the root (parentId null)
            let artifactFolder = files.find(
              (f) => f.type === "folder" && f.name === "artifacts"
            );
            if (!artifactFolder) {
              artifactFolder = {
                id: crypto.randomUUID(),
                name: "artifacts",
                type: "folder" as "folder",
                parentId: null,
                createdAt: Date.now(),
                updatedAt: Date.now(),
              };
              await createNode(artifactFolder);
            }
            // For each contract, create or update a JSON artifact file
            for (const contract of contracts) {
              const artifactFileName = `${contract.contractName}.json`;
              const artifactContent = JSON.stringify(
                { abi: contract.abi, byteCode: contract.byteCode },
                null,
                2
              );
              let artifactFile = files.find(
                (f) =>
                  f.type === "file" &&
                  f.name === artifactFileName &&
                  f.parentId === artifactFolder.id
              );
              if (artifactFile) {
                artifactFile = {
                  ...artifactFile,
                  content: artifactContent,
                  updatedAt: Date.now(),
                };
                await updateNode(artifactFile);
              } else {
                const newArtifactFile = {
                  id: crypto.randomUUID(),
                  name: artifactFileName,
                  type: "file" as "file",
                  content: artifactContent,
                  parentId: artifactFolder.id,
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                };
                await createNode(newArtifactFile);
              }
            }
          } catch (artifactError) {
            console.error("Error updating artifacts:", artifactError);
          }
        })();
        // --- End Artifacts Generation ---
      }
      
      worker.terminate();
      setWorkerInstance(null);
    };

    worker.onerror = (err) => {
      setIsCompiling(false);
      setError(err.message || "An error occurred during compilation");
      worker.terminate();
      setWorkerInstance(null);
    };
  };

  return (
    <div className="relative flex">
      {/* Sidebar */}
      <div
        className={`${
          isExpanded ? "w-80 px-4" : "w-0 px-0"
        } bg-white flex flex-col border-r border-[#DEDEDE] py-4 transition-all duration-300 overflow-hidden ${urbanist.className}`}
      >
        {/* Header */}
        <div className="mb-2 flex items-center justify-between">
          <span className={`${isExpanded ? "opacity-100" : "opacity-0"}`}>
            SOLIDITY COMPILER
          </span>
          <div className="flex items-center gap-2">
            <GreenTick
              className={`w-5 h-5 text-green-500 transition-opacity ${
                isExpanded ? "opacity-100" : "opacity-0"
              }`}
            />
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="transition-all"
            >
              <RightArrow
                className={`w-5 h-5 text-gray-500 transition-transform ${
                  isExpanded ? "rotate-180" : "rotate-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Sidebar Navigation */}
        {isExpanded && (
          <div className="flex flex-col gap-[0.1rem] mt-[1px]">
            {/* Compiler Header */}
            <div className="flex items-center gap-2">
              <span className="text-gray-600 text-sm">Compiler</span>
            </div>

            {/* Version Selector */}
            <select
              value={selectedVersion}
              onChange={(e) => setSelectedVersion(e.target.value)}
              className="border p-2 rounded"
            >
              {versions.map((data, index) => (
                <option key={index} value={data.version}>
                  {data.version}
                </option>
              ))}
            </select>

            {/* Dropdown for choosing a file */}
            <div className="mt-4">
              <label className="block text-sm text-gray-600 mb-1">
                Choose a file to compile:
              </label>
              <select
                onChange={handleFileSelection}
                value={activeFile ? activeFile.id : ""}
                className="border p-2 rounded w-full"
              >
                <option value="">-- Select a Solidity file --</option>
                {availableFiles.map((file) => (
                  <option key={file.id} value={file.id}>
                    {file.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Checkbox Options */}
            <div className="flex flex-col gap-2 mt-3">
              {checkboxOptions.map((checkbox, index) => (
                <label key={index} className="flex items-center text-[13px]">
                  <input
                    type="checkbox"
                    className="accent-black"
                    checked={checkbox.checked || false}
                    onChange={checkbox.onChange || (() => {})}
                  />
                  <span className="pl-2">{checkbox.label}</span>
                </label>
              ))}
            </div>

            {/* Advanced Configurations */}
            <div className="mt-6">
              <div className="flex justify-between items-center">
                <div>Advanced Configurations</div>
                {showAdvanced ? (
                  <DownArrow
                    className="cursor-pointer"
                    onClick={toggleSettingsVisibility}
                  />
                ) : (
                  <RightArrow
                    className="cursor-pointer"
                    onClick={toggleSettingsVisibility}
                  />
                )}
              </div>
              {showAdvanced && (
                <div className="flex flex-col gap-3 mt-4">
                  <div>
                    <input
                      type="radio"
                      id="config1"
                      name="config"
                      className="accent-black"
                    />
                    <label htmlFor="config1" className="ml-2 text-[14px]">
                      Compiler configuration
                    </label>
                    <div className="flex flex-col mt-2">
                      <label className="text-[13px]">LANGUAGE</label>
                      <select className="border p-2 rounded">
                        <option>Solidity</option>
                        <option>Yul</option>
                      </select>
                    </div>
                    <div className="flex flex-col mt-2">
                      <label className="text-[13px]">EVM VERSION</label>
                      <select className="border p-2 rounded">
                        <option className="text-[13px]">berlin</option>
                        {evmVersions.map((data, index) => (
                          <option key={index}>{data.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex justify-between items-center mt-[15px]">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="optimization"
                          className="accent-black"
                        />
                        <label htmlFor="optimization" className="text-sm">
                          Optimization
                        </label>
                      </div>
                      <div>
                        <input
                          type="number"
                          defaultValue={200}
                          className="w-[80px] p-1 border rounded"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <input
                      type="radio"
                      id="config2"
                      name="config"
                      className="accent-black"
                    />
                    <label htmlFor="config2" className="ml-2 text-[14px]">
                      Use configuration file
                    </label>
                    <div className="flex justify-between items-center mt-2">
                      <div className="text-[13px] pl-[20px]">
                        compiler_config.json
                      </div>
                      <button className="border p-[5px] text-[12px] rounded bg-gray-200">
                        Change
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Compile Buttons */}
            <div className="flex flex-col gap-4 mt-6">
              <button
                onClick={handleCompile}
                className={`border p-2 rounded ${
                  isCompiling || !isSolFile
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-black text-white hover:bg-gray-800"
                }`}
                disabled={isCompiling || !isSolFile}
              >
                {isCompiling
                  ? "Compiling..."
                  : isSolFile
                  ? `Compile ${activeFile.name}`
                  : "Compile no file selected"}
              </button>
              <button className="border p-2 rounded bg-gray-500 text-white">
                Compile and Run script
              </button>
            </div>

            {/* Results Section */}
            {Array.isArray(results) && results.length > 0 && (
              <div className="mt-4">
                <div className="p-2 bg-green-100 text-green-800 rounded-md mb-2 flex justify-between items-center">
                  <span>✓ Compilation Successful</span>
                  {warnings.length > 0 && (
                    <span 
                      className="text-yellow-600 text-xs cursor-pointer hover:underline"
                      onClick={() => setShowWarnings(!showWarnings)}
                    >
                      {warnings.length} warnings
                    </span>
                  )}
                </div>

                {warnings.length > 0 && showWarnings && !hideWarningsOption && (
                  <div className="mt-2 mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-bold text-yellow-700">
                        Compilation Warnings
                      </h4>
                      <button 
                        onClick={() => setShowWarnings(false)}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        Hide
                      </button>
                    </div>
                    <div className="max-h-40 overflow-y-auto">
                      {warnings.map((warning, idx) => (
                        <div key={idx} className="text-xs text-yellow-800 border-b border-yellow-100 py-1 last:border-0">
                          <pre className="whitespace-pre-wrap">{warning}</pre>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {results.map((contract) => (
                  <div
                    key={contract.contractName}
                    className="mt-2 p-2 bg-white rounded shadow"
                  >
                    <h3 className="text-sm font-bold mb-2">
                      {contract.contractName}
                    </h3>
                    <div className="space-y-2">
                      <div>
                        <button
                          onClick={() =>
                            setExpandedAbi(
                              expandedAbi === contract.contractName
                                ? null
                                : contract.contractName
                            )
                          }
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                        >
                          <span>{expandedAbi === contract.contractName ? "▾" : "▸"}</span>
                          <span>View ABI</span>
                        </button>
                        {expandedAbi === contract.contractName && (
                          <pre className="mt-1 p-2 bg-gray-50 rounded overflow-auto text-xs">
                            {JSON.stringify(contract.abi, null, 2)}
                          </pre>
                        )}
                      </div>
                      <div>
                        <button
                          onClick={() =>
                            setExpandedBytecode(
                              expandedBytecode === contract.contractName
                                ? null
                                : contract.contractName
                            )
                          }
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                        >
                          <span>{expandedBytecode === contract.contractName ? "▾" : "▸"}</span>
                          <span>View Bytecode</span>
                        </button>
                        {expandedBytecode === contract.contractName && (
                          <code className="mt-1 p-2 bg-gray-50 rounded block overflow-auto text-xs">
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
              <div className="mt-4 p-2 bg-red-100 text-red-800 rounded-md">
                <div className="font-bold mb-1">✗ Compilation Failed</div>
                <pre className="whitespace-pre-wrap text-xs">{error}</pre>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Show Arrow When Collapsed */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="absolute left-0 top-5 transition-all"
        >
          <RightArrow className="w-5 h-5 text-gray-500" />
        </button>
      )}
    </div>
  );
};

export default SolidityCompiler;
