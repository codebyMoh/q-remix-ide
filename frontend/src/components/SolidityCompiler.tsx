"use client";
import React, { useState, useEffect } from "react";
import { GreenTick, RightArrow, DownArrow } from "@/assets/index";
import { Urbanist } from "next/font/google";
import { useEditor } from "../context/EditorContext";
import { getAllNodes, createNode, updateNode } from "../utils/IndexDB";
import Tooltip from "@/components/Tooltip"
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
  const {
    activeFile,
    onFileSelect,
    files,
    setCompiledContracts,
    compileFile,
    allNodes,
    setAllNodes,
    selectedWorkspace, // Added
  } = useEditor();
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

  useEffect(() => {
    async function loadSolFiles() {
      try {
        if (selectedWorkspace) {
          const nodes = await getAllNodes(selectedWorkspace.id);
          const solFiles = nodes.filter(
            (node: any) => node.type === "file" && node.name.endsWith(".sol")
          );
          setAvailableFiles(solFiles);
        }
      } catch (error) {
        console.error("Error loading Solidity files:", error);
      }
    }
    loadSolFiles();
  }, [selectedWorkspace]);

  useEffect(() => {
    if (
      autoCompile &&
      activeFile?.type === "file" &&
      activeFile.name.endsWith(".sol")
    ) {
      handleCompile();
    }
  }, [activeFile, autoCompile]);

  useEffect(() => {
    if (results.length > 0 && selectedWorkspace) {
      const generateArtifacts = async () => {
        try {
          const currentNodes = await getAllNodes(selectedWorkspace.id);
          let artifactFolder = currentNodes.find(
            (f) => f.type === "folder" && f.name === "artifacts" && f.parentId === null
          );

          if (!artifactFolder) {
            artifactFolder = {
              id: crypto.randomUUID(),
              name: "artifacts",
              type: "folder",
              parentId: null,
              createdAt: Date.now(),
              updatedAt: Date.now(),
              workspaceId: selectedWorkspace.id, // Assign to current workspace
            };
            await createNode(artifactFolder);
            setAllNodes((prev) => [...prev, artifactFolder]);
          }

          for (const contract of results) {
            const artifactFileName = `${contract.contractName}.json`;
            const artifactContent = JSON.stringify(
              { abi: contract.abi, byteCode: contract.byteCode },
              null,
              2
            );

            let artifactFile = currentNodes.find(
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
              setAllNodes((prev) =>
                prev.map((n) => (n.id === artifactFile!.id ? artifactFile : n))
              );
            } else {
              const newArtifactFile = {
                id: crypto.randomUUID(),
                name: artifactFileName,
                type: "file",
                content: artifactContent,
                parentId: artifactFolder.id,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                workspaceId: selectedWorkspace.id, // Assign to current workspace
              };
              await createNode(newArtifactFile);
              setAllNodes((prev) => [...prev, newArtifactFile]);
            }
          }
        } catch (artifactError) {
          console.error("Error updating artifacts:", artifactError);
        }
      };

      generateArtifacts();
    }
  }, [results, selectedWorkspace, setAllNodes]);

  const handleFileSelection = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const fileId = e.target.value;
    const file = availableFiles.find((f) => f.id === fileId);
    onFileSelect(file || null);
  };

  const isSolFile =
    activeFile?.type === "file" && activeFile.name.endsWith(".sol");

  const handleCompile = async () => {
    if (!isSolFile || !activeFile) {
      setError("Please select a Solidity file (.sol) to compile.");
      return;
    }

    setIsCompiling(true);
    setError("");
    setWarnings([]);
    setResults([]);

    try {
      const compiledContracts = await compileFile(activeFile, selectedVersion);
      setResults(compiledContracts);
      setCompiledContracts(compiledContracts);
    } catch (err) {
      setError((err as Error).message || "Compilation failed");
      console.error("SolidityCompiler - Compilation error:", err);
    } finally {
      setIsCompiling(false);
    }
  };

  const restOfTheComponent = (
    <div className="relative flex border-r border-[#DEDEDE] h-full">
      <div
        className={`${
          isExpanded ? "w-80 px-4" : "w-0 px-0"
        } bg-white flex flex-col transition-all duration-300 overflow-hidden overflow-y-auto h-full ${
          urbanist.className
        }custom-scroll`}
      >
        <div className="mb-2 flex items-center justify-between sticky top-0 bg-white z-10 h-[3rem] bg-white flex-shrink-0">
          <span className={`${isExpanded ? "opacity-100" : "opacity-0"}`}>
            Solidity Compiler
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
                className={`w-5 h-5 text-gray-500 mb-[2px] transition-transform ${
                  isExpanded ? "rotate-180" : "rotate-0"
                }`}
              />
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="flex flex-col gap-[0.1rem] mt-[1px]">
            <div className="flex items-center gap-2">
              <span className="text-gray-600 text-sm">Compiler</span>
            </div>

            <select
              value={selectedVersion}
              onChange={(e) => setSelectedVersion(e.target.value)}
              className="border p-2 rounded text-gray-500 text-[15px]"
            >
              {versions.map((data, index) => (
                <option
                  key={index}
                  value={data.version}
                  className="text-gray-500"
                >
                  {data.version}
                </option>
              ))}
            </select>

            <div className="mt-4">
              <label className="block text-sm text-gray-600 mb-1">
                Choose a file to compile:
              </label>
              <select
                onChange={handleFileSelection}
                value={activeFile ? activeFile.id : ""}
                className="border p-2 rounded w-full text-gray-500 text-[14px]"
              >
                <option value="" className="text-gray-500 text-[14px]">
                  Select a Solidity file
                </option>
                {availableFiles.map((file) => (
                  <option
                    key={file.id}
                    value={file.id}
                    className="text-gray-500 text-[15px]"
                  >
                    {file.name}
                  </option>
                ))}
              </select>
            </div>

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
                      <Tooltip content="Language specification available from Compiler >= v0.5.7">
                      <select className="border p-2 rounded text-[14px] text-gray-500 w-full">
                        <option >Solidity</option>
                        <option >Yul</option>
                      </select>
                      </Tooltip>
                    </div>
                    <div className="flex flex-col mt-2">
                      <label className="text-[13px] text-gray-500">
                        EVM VERSION
                      </label>
                      <select className="border p-2 rounded text-gray-500">
                        <option className="text-[13px]">berlin</option>
                        {evmVersions.map((data, index) => (
                          <option key={index} className="text-[15px]">
                            {data.label}
                          </option>
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
                        <Tooltip content="Enable opcode-based optimizer for the qenerated bytecode and the Yul optimizer for the Yul code">
                        <label htmlFor="optimization" className="text-sm">
                          Optimization
                        </label>
                        </Tooltip>
                      </div>
                      <div>
                        <Tooltip content="Estimated number of times each opcode of the deployed code will be executed across the life-time of the contract.">
                        <input
                          type="number"
                          defaultValue={200}
                          className="w-[80px] p-1 border rounded text-[14px] text-gray-500"
                        />
                        </Tooltip>
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

            <div className="flex flex-col gap-4 mt-6">
              <button
                onClick={handleCompile}
                className={`border p-2 rounded ${
                  isCompiling || !isSolFile
                    ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                    : "bg-[#E84050] text-white hover:bg-[#D73642] shadow-md"
                }`}
                disabled={isCompiling || !isSolFile}
              >
                {isCompiling
                  ? "Compiling..."
                  : isSolFile
                  ? `Compile ${activeFile.name}`
                  : "Compile no file selected"}
              </button>
              <button className="border p-2 rounded bg-[#222222] text-white hover:bg-[#3A3A3A] transition-all duration-300 shadow-md">
                Compile and Run Script
              </button>
            </div>

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
                        <div
                          key={idx}
                          className="text-xs text-yellow-800 border-b border-yellow-100 py-1 last:border-0"
                        >
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
                          <span>
                            {expandedAbi === contract.contractName ? "▾" : "▸"}
                          </span>
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
                          <span>
                            {expandedBytecode === contract.contractName
                              ? "▾"
                              : "▸"}
                          </span>
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

            {error && (
              <div className="mt-4 p-2 bg-red-100 text-red-800 rounded-md">
                <div className="font-bold mb-1">✗ Compilation Failed</div>
                <pre className="whitespace-pre-wrap text-xs">{error}</pre>
              </div>
            )}
          </div>
        )}
      </div>

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

  return restOfTheComponent;
};

export default SolidityCompiler;