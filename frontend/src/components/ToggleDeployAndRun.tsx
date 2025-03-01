"use client";
import React, { useState, useEffect } from "react";
import { Urbanist } from "next/font/google";
import { deploymentService } from "@/services/deployment-service";
import { Account, DeployedContract, DeploymentInput } from "@/types/deployment";
import { ethers } from "ethers";
import { useEditor } from "@/context/EditorContext";

const urbanist = Urbanist({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const DeployAndRun = () => {
  const { allFiles, compiledContracts, compileFile } = useEditor();
  const [isExpanded, setIsExpanded] = useState(true);
  const [environment, setEnvironment] = useState("remixVM");
  const [account, setAccount] = useState("");
  const [gasLimit, setGasLimit] = useState("3000000");
  const [value, setValue] = useState("0");
  const [valueUnit, setValueUnit] = useState("wei");
  const [selectedContract, setSelectedContract] = useState("");
  const [deployedContracts, setDeployedContracts] = useState<DeployedContract[]>([]);
  const [atAddressValue, setAtAddressValue] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [transactionsRecorded, setTransactionsRecorded] = useState(0);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [constructorArgs, setConstructorArgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const environments = [
    { id: "remixVM", name: "Remix VM (Cancun)" },
    { id: "injected", name: "Injected Provider - MetaMask" },
    { id: "mainnetFork", name: "Remix VM - Mainnet fork" },
    { id: "sepoliaFork", name: "Remix VM - Sepolia fork" },
    { id: "customFork", name: "Remix VM - Custom fork" },
    { id: "sepolia", name: "Testnet - Sepolia" },
    { id: "walletConnect", name: "WalletConnect" },
    { id: "optimism", name: "L2 - Optimism Provider" },
    { id: "arbitrum", name: "L2 - Arbitrum One Provider" },
    { id: "ephemery", name: "Ephemery Testnet" },
    { id: "external", name: "Custom - External HTTP Provider" },
    { id: "hardhat", name: "Dev - Hardhat Provider" },
    { id: "ganache", name: "Dev - Ganache Provider" },
    { id: "foundry", name: "Dev - Foundry Provider" },
  ];

  const valueUnits = ["wei", "gwei", "finney", "ether"];

  const solidityFiles = allFiles.filter((file) => file.type === "file" && file.name.endsWith(".sol"));

  useEffect(() => {
    console.log("ToggleDeployAndRun - Solidity files:", solidityFiles);
    console.log("ToggleDeployAndRun - Compiled contracts:", compiledContracts);
    if (solidityFiles.length > 0 && !selectedContract) {
      setSelectedContract(solidityFiles[0].name);
    }
  }, [allFiles, compiledContracts]);

  const handleEnvironmentChange = async (newEnv: string) => {
    setEnvironment(newEnv);
    if (newEnv === "injected") {
      setLoading(true);
      try {
        if (!window.ethereum) throw new Error("MetaMask is not installed");
        await window.ethereum.request({ method: "eth_requestAccounts" });
        await deploymentService.setEnvironment("injected" as any);
        const fetchedAccounts = await deploymentService.getAccounts();
        setAccounts(fetchedAccounts);
        setAccount(fetchedAccounts[0]?.address || "");

        window.ethereum.on("accountsChanged", async (newAccounts: string[]) => {
          if (newAccounts.length > 0) {
            const updatedAccounts = await deploymentService.getAccounts();
            setAccounts(updatedAccounts);
            setAccount(updatedAccounts[0]?.address || "");
          }
        });
      } catch (err) {
        setError(err.message || "Failed to connect to MetaMask");
        setEnvironment("remixVM");
      } finally {
        setLoading(false);
      }
    } else {
      setAccounts([]);
      setAccount("");
    }
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const deployContract = async () => {
    if (environment !== "injected") {
      setError("Please connect to MetaMask to deploy contracts");
      return;
    }
    setLoading(true);
    try {
      const selectedFile = allFiles.find((f) => f.name === selectedContract);
      console.log("Deploying - Selected contract file:", selectedContract, "Selected file:", selectedFile);
      if (!selectedFile) throw new Error("Selected contract file not found in file system");

      // If no compiled contracts, trigger compilation
      if (compiledContracts.length === 0) {
        console.log("Deploying - No compiled contracts found, compiling now...");
        await compileFile(selectedFile);
      }

      const fileNameWithoutExt = selectedContract.replace(".sol", "");
      const compiledContract = compiledContracts.find((c) => 
        c.contractName === fileNameWithoutExt || 
        selectedContract.includes(c.contractName) || 
        c.contractName.includes(fileNameWithoutExt)
      ) || compiledContracts[0];
      console.log("Deploying - Matching compiled contract:", compiledContract);
      if (!compiledContract) {
        console.log("Deploying - Available compiled contracts:", compiledContracts);
        throw new Error("No compiled data found for any contract. Please ensure compilation succeeded.");
      }

      const deploymentInput: DeploymentInput = {
        contractName: compiledContract.contractName,
        bytecode: compiledContract.byteCode,
        abi: compiledContract.abi,
        constructorArgs: constructorArgs.length > 0 ? constructorArgs : undefined,
      };
      const deployedContract = await deploymentService.deployContract(deploymentInput, {
        gasLimit,
        value: ethers.parseUnits(value, valueUnit).toString(),
      });
      console.log("Deployed contract:", deployedContract);
      setDeployedContracts([...deployedContracts, deployedContract]);
      if (isRecording) {
        setTransactionsRecorded(transactionsRecorded + 1);
      }
    } catch (err) {
      setError(err.message);
      console.error("Deployment failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const accessAtAddress = async () => { // Changed to async
    if (!atAddressValue) return;
    setLoading(true);
    try {
      const selectedFile = allFiles.find((f) => f.name === selectedContract);
      if (!selectedFile) throw new Error("Selected contract file not found in file system");

      if (compiledContracts.length === 0) {
        console.log("AccessAtAddress - No compiled contracts found, compiling now...");
        await compileFile(selectedFile); // Now valid in async function
      }

      const fileNameWithoutExt = selectedContract.replace(".sol", "");
      const compiledContract = compiledContracts.find((c) => 
        c.contractName === fileNameWithoutExt || 
        selectedContract.includes(c.contractName) || 
        c.contractName.includes(fileNameWithoutExt)
      ) || compiledContracts[0];
      if (!compiledContract) throw new Error("No compiled data found for any contract. Please ensure compilation succeeded.");

      const newContract: DeployedContract = {
        address: atAddressValue,
        network: { name: environment, rpcUrl: "MetaMask Provided", chainId: "unknown" },
        deployedBy: account,
        timestamp: Date.now(),
        contractName: compiledContract.contractName,
        abi: compiledContract.abi,
        txHash: "",
        blockNumber: 0,
      };
      setDeployedContracts([...deployedContracts, newContract]);
      setAtAddressValue("");
    } catch (err) {
      setError(err.message);
      console.error("Failed to load contract at address:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
  };

  const saveScenario = () => {
    alert(`Saved ${transactionsRecorded} transactions to scenario.json`);
  };

  const clearDeployedContracts = () => {
    setDeployedContracts([]);
  };

  return (
    <div className="relative flex">
      <div
        className={`${
          isExpanded ? "w-80 px-4" : "w-0 px-0"
        } bg-white flex flex-col border-r border-[#DEDEDE] py-4 transition-all duration-300 overflow-hidden ${
          urbanist.className
        }`}
      >
        <div className="mb-2 flex items-center justify-between">
          <span className={`${isExpanded ? "opacity-100" : "opacity-0"} font-medium`}>
            DEPLOY & RUN
          </span>
          <div className="flex items-center gap-2">
            <button onClick={toggleExpanded} className="transition-all">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`w-5 h-5 text-gray-500 transition-transform ${
                  isExpanded ? "rotate-180" : "rotate-0"
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="flex flex-col gap-2 mt-1">
            <div className="flex flex-col gap-1">
              <div className="text-gray-600 text-xs">ENVIRONMENT</div>
              <select
                value={environment}
                onChange={(e) => handleEnvironmentChange(e.target.value)}
                className="border p-2 rounded text-sm"
                disabled={loading}
              >
                {environments.map((env) => (
                  <option key={env.id} value={env.id}>
                    {env.name}
                  </option>
                ))}
              </select>
              {environment === "external" && (
                <input
                  type="text"
                  placeholder="http://127.0.0.1:8545"
                  className="border p-2 rounded text-sm mt-1"
                  disabled={loading}
                />
              )}
            </div>

            <div className="flex flex-col gap-1 mt-3">
              <div className="text-gray-600 text-xs">ACCOUNT</div>
              <select
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                className="border p-2 rounded text-sm"
                disabled={loading || accounts.length === 0}
              >
                {accounts.length > 0 ? (
                  accounts.map((acc, index) => (
                    <option key={acc.address} value={acc.address}>
                      Account {index} ({acc.address.slice(0, 6)}...{acc.address.slice(-4)}) - {acc.balance} ETH
                    </option>
                  ))
                ) : (
                  <option value="">No accounts connected</option>
                )}
              </select>
            </div>

            <div className="flex flex-col gap-1 mt-3">
              <div className="text-gray-600 text-xs">GAS LIMIT</div>
              <input
                type="text"
                value={gasLimit}
                onChange={(e) => setGasLimit(e.target.value)}
                className="border p-2 rounded text-sm"
                disabled={loading}
              />
            </div>
            
            <div className="flex flex-col gap-1 mt-3">
              <div className="text-gray-600 text-xs">VALUE</div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="border p-2 rounded text-sm flex-1"
                  disabled={loading}
                />
                <select
                  value={valueUnit}
                  onChange={(e) => setValueUnit(e.target.value)}
                  className="border p-2 rounded text-sm"
                  disabled={loading}
                >
                  {valueUnits.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Contract Selector */}
            <div className="flex flex-col gap-1 mt-3">
              <div className="text-gray-600 text-xs">CONTRACT</div>
              <select
                value={selectedContract}
                onChange={(e) => setSelectedContract(e.target.value)}
                className="border p-2 rounded text-sm"
                disabled={loading || solidityFiles.length === 0}
              >
                {solidityFiles.length > 0 ? (
                  solidityFiles.map((file) => (
                    <option key={file.id} value={file.name}>
                      {file.name}
                    </option>
                  ))
                ) : (
                  <option value="">No Solidity files available</option>
                )}
              </select>
            </div>
            
            <button
              onClick={deployContract}
              className="flex-1 bg-blue-600 text-white p-2 rounded text-sm hover:bg-blue-700"
              disabled={loading || !selectedContract || environment !== "injected"}
            >
              {loading ? "Deploying..." : "Deploy"}
            </button>
            <div className="flex gap-2 mt-4">
              <button
                onClick={accessAtAddress}
                className="bg-gray-200 p-2 rounded text-sm hover:bg-gray-300 whitespace-nowrap"
                disabled={loading || !atAddressValue}
              >
                At Address
              </button>
              <input
                type="text"
                value={atAddressValue}
                onChange={(e) => setAtAddressValue(e.target.value)}
                placeholder="Contract Address"
                className="flex-1 border p-2 rounded text-sm"
                disabled={loading}
              />
            </div>

            {/* Constructor Parameters */}
            {selectedContract && compiledContracts.length > 0 && (
              <div className="mt-3">
                <div className="text-gray-600 text-xs">CONSTRUCTOR PARAMETERS</div>
                {(() => {
                  try {
                    const fileNameWithoutExt = selectedContract.replace(".sol", "");
                    const compiledContract = compiledContracts.find((c) => 
                      c.contractName === fileNameWithoutExt || 
                      selectedContract.includes(c.contractName) || 
                      c.contractName.includes(fileNameWithoutExt)
                    ) || compiledContracts[0];
                    if (!compiledContract) return <div>No compiled data available</div>;

                    const constructor = compiledContract.abi.find(item => item.type === "constructor");
                    return constructor?.inputs.map((param, idx) => (
                      <div key={idx} className="flex flex-col mt-1">
                        <label className="text-xs text-gray-600">{param.name} ({param.type})</label>
                        <input
                          type="text"
                          placeholder={param.type === "bytes32[]" ? '["0x1234", "0x5678"]' : param.type === "string" ? "My Token" : ""}
                          className="border p-2 rounded text-sm mt-1"
                          onChange={(e) => {
                            const newArgs = [...constructorArgs];
                            newArgs[idx] = e.target.value; // Add parsing logic if needed
                            setConstructorArgs(newArgs);
                          }}
                          disabled={loading}
                        />
                      </div>
                    )) || <div>No constructor parameters</div>;
                  } catch (err) {
                    console.error("Error rendering constructor parameters:", err);
                    return <div>Error loading constructor parameters</div>;
                  }
                })()}
              </div>
            )}

            <div className="mt-6 p-3 bg-gray-50 rounded">
              <div className="flex justify-between items-center">
                <div className="text-sm font-medium">Transactions Recorded: {transactionsRecorded}</div>
                <div className="flex gap-2">
                  <button
                    onClick={toggleRecording}
                    className={`p-1 rounded ${isRecording ? "bg-red-100 text-red-600" : "bg-gray-200"}`}
                    title={isRecording ? "Stop recording" : "Start recording"}
                    disabled={loading}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill={isRecording ? "currentColor" : "none"}
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <circle cx="12" cy="12" r="6" />
                    </svg>
                  </button>
                  <button
                    onClick={saveScenario}
                    className={`p-1 rounded bg-gray-200 ${transactionsRecorded === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                    disabled={transactionsRecorded === 0 || loading}
                    title="Save to scenario.json"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                      />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="mt-2">
                <label className="flex items-center text-[13px]">
                  <input
                    type="checkbox"
                    className="accent-black"
                    disabled={loading}
                  />
                  <span className="pl-2">Run with last compilation result</span>
                </label>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex justify-between items-center">
                <div className="text-sm font-medium">DEPLOYED CONTRACTS</div>
                {deployedContracts.length > 0 && (
                  <button
                    onClick={clearDeployedContracts}
                    className="text-red-500 text-xs"
                    disabled={loading}
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="mt-2 max-h-60 overflow-auto">
                {deployedContracts.map((contract, idx) => (
                  <div key={idx} className="border rounded p-2 mb-2">
                    <div className="flex justify-between items-center">
                      <div className="font-medium text-sm">{contract.contractName}</div>
                      <div className="text-xs text-gray-500 truncate max-w-[120px]" title={contract.address}>
                        at {contract.address.slice(0, 6)}...{contract.address.slice(-4)}
                      </div>
                    </div>
                  </div>
                ))}
                {deployedContracts.length === 0 && (
                  <div className="text-sm text-gray-500">No contracts deployed yet</div>
                )}
              </div>
            </div>
            {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
          </div>
        )}
      </div>

      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="absolute left-0 top-5 transition-all"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-5 h-5 text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      )}
    </div>
  );
};

export default DeployAndRun;