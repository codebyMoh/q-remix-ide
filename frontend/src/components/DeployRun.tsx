"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { Urbanist } from "next/font/google";
import { deployContract } from "@/utils/deployContract";
import { getAlchemyApiKey } from "@/config/alchemy";
import { getAllNodes } from "@/utils/IndexDB";
import { DeploymentResult } from "@/utils/deployContract";
import { useTerminal } from './Terminal';

const urbanist = Urbanist({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

// Define types for our component
interface ContractFunction {
  name: string;
  payable: boolean;
  inputs: Array<{name: string, type: string}>;
  outputs?: Array<{name: string, type: string}>;
}

interface DeployedContract {
  name: string;
  address: string;
  functions: ContractFunction[];
}

interface CompiledContract {
  name: string;
  abi: any[];
  byteCode: string;
  constructorInputs: Array<{name: string, type: string}>;
}

interface ConstructorInputs {
  [key: string]: string;
}

interface TransactionDetails extends DeploymentResult {
  timestamp?: number;
}

const DeployRun = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [environment, setEnvironment] = useState("sepolia");
  const [account, setAccount] = useState("");
  const [gasLimit, setGasLimit] = useState("3000000");
  const [value, setValue] = useState("0");
  const [valueUnit, setValueUnit] = useState("wei");
  const [selectedContract, setSelectedContract] = useState("");
  const [deployedContracts, setDeployedContracts] = useState<DeployedContract[]>([]);
  const [atAddressValue, setAtAddressValue] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [transactionsRecorded, setTransactionsRecorded] = useState(0);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentError, setDeploymentError] = useState("");
  const [deploymentSuccess, setDeploymentSuccess] = useState("");
  const [compiledContracts, setCompiledContracts] = useState<CompiledContract[]>([]);
  const [constructorInputs, setConstructorInputs] = useState<ConstructorInputs>({});
  const [alchemyApiKey, setAlchemyApiKey] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [transactionDetails, setTransactionDetails] = useState<TransactionDetails | null>(null);
  const [lastCompilationTimestamp, setLastCompilationTimestamp] = useState<number>(0);
  const { addOutput } = useTerminal();

  // Mock accounts for the Remix VM
  const accounts = [
    "0xCA35b7d915458EF540aDe6068dFe2F44E8fa733c",
    "0x14723A09ACff6D2A60DcdF7aA4AFf308FDDC160C",
    "0x4B0897b0513fdC7C541B6d9D7E929C4e5364D2dB",
    "0x583031D1113aD414F02576BD6afaBfb302140225",
    "0xdD870fA1b7C4700F2BD7f44238821C26f7392148"
  ];

  // Environments available in Remix
  const environments = [
    { id: "remixVM", name: "Remix VM (Cancun)" },
    { id: "injected", name: "Injected Provider - MetaMask" },
    { id: "sepolia", name: "Testnet - Sepolia" },
    { id: "goerli", name: "Testnet - Goerli" },
    { id: "mumbai", name: "Testnet - Mumbai" },
    { id: "mainnet", name: "Mainnet" },
    { id: "optimism", name: "L2 - Optimism" },
    { id: "arbitrum", name: "L2 - Arbitrum One" },
  ];

  // Value units for the value input
  const valueUnits = ["wei", "gwei", "finney", "ether"];

  // Create a reusable function to load compiled contracts
  const loadCompiledContracts = useCallback(async () => {
    try {
      console.log("Loading compiled contracts...");
      const files = await getAllNodes();
      
      // Find artifacts folder
      const artifactsFolder = files.find(
        (f) => f.type === "folder" && f.name === "artifacts"
      );
      
      if (!artifactsFolder) {
        console.log("No artifacts folder found");
        return;
      }
      
      // Get all JSON files in artifacts folder
      const artifactFiles = files.filter(
        (f) => f.type === "file" && 
               f.parentId === artifactsFolder.id && 
               f.name.endsWith('.json')
      );
      
      // Sort artifact files by updatedAt timestamp (most recent first)
      artifactFiles.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      
      console.log(`Found ${artifactFiles.length} artifact files`);
      
      // Parse JSON files to get contract data
      const contracts = artifactFiles.map(file => {
        try {
          const contractData = JSON.parse(file.content || '{}');
          const contractName = file.name.replace('.json', '');
          console.log(`Parsing contract: ${contractName}`);
          
          return {
            name: contractName,
            abi: contractData.abi || [],
            byteCode: contractData.byteCode || '',
            constructorInputs: contractData.abi?.filter((item: any) => 
              item.type === 'constructor')[0]?.inputs || []
          };
        } catch (e) {
          console.error(`Error parsing ${file.name}:`, e);
          return null;
        }
      }).filter(Boolean) as CompiledContract[];
      
      console.log(`Successfully loaded ${contracts.length} contracts`);
      
      // Update state with the loaded contracts
      setCompiledContracts(contracts);
      
      // If no contract is selected and we have contracts, select the first one
      if (contracts.length > 0) {
        // Check if the currently selected contract exists in the loaded contracts
        const currentContractExists = selectedContract && 
          contracts.some(c => c.name === selectedContract);
        
        if (!currentContractExists) {
          // If the current selection doesn't exist, select the most recently compiled contract
          // (which is likely the one that was just compiled)
          console.log(`Setting selected contract to: ${contracts[0].name}`);
          setSelectedContract(contracts[0].name);
          
          // Initialize constructor inputs for the selected contract
          initializeConstructorInputs(contracts[0]);
        }
      }
    } catch (error) {
      console.error("Error loading compiled contracts:", error);
    }
  }, [selectedContract]);
  
  // Helper function to initialize constructor inputs
  const initializeConstructorInputs = (contract: CompiledContract) => {
    if (contract?.constructorInputs && contract.constructorInputs.length > 0) {
      const initialInputs: ConstructorInputs = {};
      contract.constructorInputs.forEach(input => {
        initialInputs[input.name] = '';
      });
      setConstructorInputs(initialInputs);
    } else {
      // Reset constructor inputs if there are none
      setConstructorInputs({});
    }
  };
  
  // Load compiled contracts on component mount and when compilation happens
  useEffect(() => {
    loadCompiledContracts();
    
    // Set up an interval to check for new contracts
    const intervalId = setInterval(() => {
      loadCompiledContracts();
    }, 5000); // Check every 5 seconds
    
    return () => clearInterval(intervalId);
  }, [loadCompiledContracts]);
  
  // Listen for compilation events
  useEffect(() => {
    const handleCompilationEvent = (event: CustomEvent) => {
      console.log("Compilation event received");
      setLastCompilationTimestamp(Date.now());
      
      // Force reload of compiled contracts immediately after compilation
      loadCompiledContracts();
      
      // If the event contains contract data, we can use it directly
      if (event.detail && event.detail.contracts) {
        const newContracts = event.detail.contracts;
        if (newContracts.length > 0) {
          // Select the newly compiled contract
          const newContract = newContracts[0];
          setSelectedContract(newContract.contractName);
          
          // Initialize constructor inputs for the new contract
          const constructorInputs = newContract.abi?.filter((item: any) => 
            item.type === 'constructor')[0]?.inputs || [];
          
          if (constructorInputs.length > 0) {
            const initialInputs: ConstructorInputs = {};
            constructorInputs.forEach((input: any) => {
              initialInputs[input.name] = '';
            });
            setConstructorInputs(initialInputs);
          } else {
            setConstructorInputs({});
          }
        }
      }
    };
    
    // Add event listener for compilation events
    window.addEventListener('contract-compiled' as any, handleCompilationEvent);
    
    return () => {
      window.removeEventListener('contract-compiled' as any, handleCompilationEvent);
    };
  }, [loadCompiledContracts]);
  
  // Reload when lastCompilationTimestamp changes
  useEffect(() => {
    if (lastCompilationTimestamp > 0) {
      loadCompiledContracts();
    }
  }, [lastCompilationTimestamp, loadCompiledContracts]);
  
  // Handle contract selection change
  const handleContractChange = (contractName: string) => {
    setSelectedContract(contractName);
    
    // Find the selected contract
    const contract = compiledContracts.find(c => c.name === contractName);
    if (contract) {
      // Initialize constructor inputs for the selected contract
      initializeConstructorInputs(contract);
    }
  };

  // Connect to MetaMask
  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' }) as string[];
        setAccount(accounts[0] || '');
        setIsConnected(accounts.length > 0);
        
        // Get network ID
        const chainId = await window.ethereum.request({ method: 'eth_chainId' }) as string;
        console.log("Connected to chain ID:", chainId);
        
        // Set environment based on chain ID
        switch (chainId) {
          case '0x1':
            setEnvironment('mainnet');
            break;
          case '0xaa36a7':
            setEnvironment('sepolia');
            break;
          case '0x5':
            setEnvironment('goerli');
            break;
          case '0x13881':
            setEnvironment('mumbai');
            break;
          case '0xa':
            setEnvironment('optimism');
            break;
          case '0xa4b1':
            setEnvironment('arbitrum');
            break;
          default:
            // Keep current environment
        }
        
        // Listen for account changes
        window.ethereum.on('accountsChanged', (accounts: string[]) => {
          setAccount(accounts[0] || '');
          setIsConnected(accounts.length > 0);
        });
        
        // Listen for chain changes
        window.ethereum.on('chainChanged', (_chainId: string) => {
          window.location.reload();
        });
        
      } catch (error) {
        console.error("Error connecting to MetaMask:", error);
      }
    } else {
      alert("MetaMask is not installed. Please install MetaMask to connect your wallet.");
    }
  };

  // Handle constructor input changes
  const handleConstructorInputChange = (name: string, value: string) => {
    setConstructorInputs({
      ...constructorInputs,
      [name]: value
    });
  };

  // Parse constructor inputs based on type
  const parseConstructorInput = (input: {name: string, type: string}, value: string) => {
    try {
      if (input.type.includes('[]')) {
        // Handle array types
        return JSON.parse(value);
      } else if (input.type.includes('int')) {
        // Handle integer types
        return Number(value);
      } else if (input.type === 'bool') {
        // Handle boolean
        return value.toLowerCase() === 'true';
      } else {
        // Handle string, address, bytes, etc.
        return value;
      }
    } catch (error) {
      console.error(`Error parsing input ${input.name}:`, error);
      throw new Error(`Invalid format for ${input.name} (${input.type})`);
    }
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  // Deploy contract using our utility
  const handleDeployContract = async () => {
    setIsDeploying(true);
    setDeploymentError("");
    setDeploymentSuccess("");
    setTransactionDetails(null);
    
    try {
      // Find the selected contract
      const contract = compiledContracts.find(c => c.name === selectedContract);
      
      if (!contract) {
        throw new Error("Contract not found. Please compile a contract first.");
      }

      console.log("Selected contract:", contract.name);
      console.log("Contract bytecode length:", contract.byteCode.length);
      console.log("Contract ABI entries:", contract.abi.length);
      
      if (!contract.byteCode || contract.byteCode.length < 10) {
        throw new Error("Invalid bytecode. Please recompile the contract.");
      }
      
      if (!contract.abi || contract.abi.length === 0) {
        throw new Error("Invalid ABI. Please recompile the contract.");
      }
      
      // Parse constructor arguments
      const constructorArgs = [];
      if (contract.constructorInputs && contract.constructorInputs.length > 0) {
        console.log("Processing constructor inputs:", contract.constructorInputs);
        for (const input of contract.constructorInputs) {
          if (!constructorInputs[input.name] && input.type !== 'bool') {
            throw new Error(`Missing constructor argument: ${input.name}`);
          }
          const parsedValue = parseConstructorInput(input, constructorInputs[input.name] || '');
          console.log(`Parsed ${input.name} (${input.type}):`, parsedValue);
          constructorArgs.push(parsedValue);
        }
      }
      
      // Get Alchemy API key for the selected environment
      let apiKey = '';
      if (environment !== 'remixVM' && environment !== 'injected') {
        apiKey = getAlchemyApiKey(environment);
        console.log("Using Alchemy API key for network:", environment);
        if (!apiKey) {
          console.warn(`No Alchemy API key found for ${environment}. Check your .env.local file.`);
        }
      }
      
      // Ensure we're connected to MetaMask
      if (!isConnected && environment !== 'remixVM') {
        console.log("Connecting to MetaMask...");
        await connectWallet();
        
        // Check if connection was successful
        if (!account) {
          throw new Error("Failed to connect to MetaMask. Please connect manually and try again.");
        }
      }
      
      console.log("Deploying contract with the following parameters:");
      console.log("- ABI entries:", contract.abi.length);
      console.log("- Bytecode length:", contract.byteCode.length);
      console.log("- Constructor args:", constructorArgs);
      console.log("- Using Alchemy API:", !!apiKey);
      console.log("- Connected account:", account);
      console.log("- Selected environment:", environment);
      
      // Deploy the contract
      const result = await deployContract(
        contract.abi,
        contract.byteCode,
        constructorArgs,
        apiKey,
        environment
      );
      
      console.log("Deployment result:", result);
      
      if (result.success && result.contractAddress) {
        setDeploymentSuccess(`Contract deployed successfully at ${result.contractAddress}`);
        
        // Store transaction details
        setTransactionDetails(result);
        
        // Add to terminal output
        addOutput(result, 'transaction');
        
        // Add to deployed contracts
        const newContract: DeployedContract = {
          name: contract.name,
          address: result.contractAddress,
          functions: contract.abi
            .filter(item => item.type === 'function')
            .map(func => ({
              name: func.name,
              payable: func.stateMutability === 'payable',
              inputs: func.inputs || [],
              outputs: func.outputs || []
            }))
        };
        
        setDeployedContracts([...deployedContracts, newContract]);
        
        if (isRecording) {
          setTransactionsRecorded(transactionsRecorded + 1);
        }
      } else {
        setDeploymentError(result.error || "Unknown error during deployment");
        addOutput(`Deployment failed: ${result.error || "Unknown error"}`, 'error');
      }
    } catch (error: any) {
      console.error("Deployment error:", error);
      setDeploymentError(error.message || "Error deploying contract");
      addOutput(`Error: ${error.message || "Unknown deployment error"}`, 'error');
    } finally {
      setIsDeploying(false);
    }
  };

  // Function to add output to terminal
  const addToTerminal = (output: any) => {
    // This will be implemented to send data to the Terminal component
    // For now, we'll just log to console
    console.log("Terminal output:", output);
    
    // If you have a global terminal state or context, you would update it here
    // For example: terminalContext.addOutput(output);
  };

  const accessAtAddress = () => {
    if (!atAddressValue) return;
    
    try {
      // Find the selected contract
      const contract = compiledContracts.find(c => c.name === selectedContract);
      
      if (!contract) {
        throw new Error("Contract not found. Please compile a contract first.");
      }
      
      // Add to deployed contracts
      const newContract: DeployedContract = {
        name: contract.name,
        address: atAddressValue,
        functions: contract.abi
          .filter(item => item.type === 'function')
          .map(func => ({
            name: func.name,
            payable: func.stateMutability === 'payable',
            inputs: func.inputs || [],
            outputs: func.outputs || []
          }))
      };
      
      setDeployedContracts([...deployedContracts, newContract]);
      setAtAddressValue("");
    } catch (error: any) {
      console.error("Error accessing contract at address:", error);
      alert(error.message);
    }
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
  };

  const saveScenario = () => {
    // Mock save recorded transactions to scenario.json
    alert(`Saved ${transactionsRecorded} transactions to scenario.json`);
  };

  const clearDeployedContracts = () => {
    setDeployedContracts([]);
  };

  // Get constructor inputs for the selected contract
  const getConstructorInputs = () => {
    const contract = compiledContracts.find(c => c.name === selectedContract);
    return contract?.constructorInputs || [];
  };

  return (
    <div className="relative flex">
      {/* Sidebar */}
      <div
        className={`${
          isExpanded ? "w-80 px-4" : "w-0 px-0"
        } bg-white flex flex-col border-r border-[#DEDEDE] py-4 transition-all duration-300 overflow-hidden ${
          urbanist.className
        }`}
      >
        {/* Deploy & Run Header */}
        <div className="mb-2 flex items-center justify-between">
          <span className={`${isExpanded ? "opacity-100" : "opacity-0"} font-medium`}>
            DEPLOY & RUN
          </span>
          <div className="flex items-center gap-2">
            {/* Toggle Button */}
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

        {/* Deploy & Run Content */}
        {isExpanded && (
          <div className="flex flex-col gap-2 mt-1">
            {/* Environment Selector */}
            <div className="flex flex-col gap-1">
              <div className="text-gray-600 text-xs">ENVIRONMENT</div>
              <select
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
                className="border p-2 rounded text-sm"
              >
                {environments.map((env) => (
                  <option key={env.id} value={env.id}>
                    {env.name}
                  </option>
                ))}
              </select>
              {environment !== 'remixVM' && environment !== 'injected' && (
                <input
                  type="text"
                  placeholder="Alchemy API Key (optional)"
                  value={alchemyApiKey}
                  onChange={(e) => setAlchemyApiKey(e.target.value)}
                  className="border p-2 rounded text-sm mt-1"
                />
              )}
            </div>

            {/* Account Selector */}
            <div className="flex flex-col gap-1 mt-3">
              <div className="text-gray-600 text-xs">ACCOUNT</div>
              {environment === 'remixVM' ? (
                <select
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  className="border p-2 rounded text-sm"
                >
                  {accounts.map((acc, index) => (
                    <option key={acc} value={acc}>
                      Account {index} ({acc.slice(0, 6)}...{acc.slice(-4)}) - 100 ETH
                    </option>
                  ))}
                </select>
              ) : (
                <div className="flex flex-col gap-2">
                  {isConnected ? (
                    <div className="border p-2 rounded text-sm bg-gray-50">
                      {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : 'No account connected'}
                    </div>
                  ) : (
                    <button
                      onClick={connectWallet}
                      className="bg-blue-600 text-white p-2 rounded text-sm hover:bg-blue-700"
                    >
                      Connect to MetaMask
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Gas Limit */}
            <div className="flex flex-col gap-1 mt-3">
              <div className="text-gray-600 text-xs">GAS LIMIT</div>
              <input
                type="text"
                value={gasLimit}
                onChange={(e) => setGasLimit(e.target.value)}
                className="border p-2 rounded text-sm"
              />
            </div>

            {/* Value */}
            <div className="flex flex-col gap-1 mt-3">
              <div className="text-gray-600 text-xs">VALUE</div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="border p-2 rounded text-sm flex-1"
                />
                <select
                  value={valueUnit}
                  onChange={(e) => setValueUnit(e.target.value)}
                  className="border p-2 rounded text-sm"
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
                onChange={(e) => handleContractChange(e.target.value)}
                className="border p-2 rounded text-sm"
              >
                <option value="">Select a contract</option>
                {compiledContracts.map((contract) => (
                  <option key={contract.name} value={contract.name}>
                    {contract.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Deploy Button and At Address */}
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleDeployContract}
                disabled={isDeploying || !selectedContract}
                className={`w-full py-2 px-4 mt-4 rounded-md font-semibold text-white ${
                  isDeploying || !selectedContract
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                } transition-colors duration-200 flex items-center justify-center`}
              >
                {isDeploying ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deploying...
                  </>
                ) : (
                  "Deploy"
                )}
              </button>
              <input
                type="text"
                value={atAddressValue}
                onChange={(e) => setAtAddressValue(e.target.value)}
                placeholder="Contract Address"
                className="flex-1 border p-2 rounded text-sm"
              />
              <button
                onClick={accessAtAddress}
                disabled={!atAddressValue || !selectedContract}
                className={`${
                  !atAddressValue || !selectedContract
                    ? "bg-gray-200 cursor-not-allowed"
                    : "bg-gray-200 hover:bg-gray-300"
                } p-2 rounded text-sm whitespace-nowrap`}
              >
                At Address
              </button>
            </div>

            {/* Error and Success Messages */}
            {deploymentError && (
              <div className="mt-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md">
                <p className="font-semibold">Error:</p>
                <p>{deploymentError}</p>
              </div>
            )}
            
            {deploymentSuccess && (
              <div className="mt-4 p-3 bg-green-100 border border-green-300 text-green-700 rounded-md">
                <p className="font-semibold">Success:</p>
                <p>{deploymentSuccess}</p>
              </div>
            )}

            {/* Constructor Parameters */}
            {selectedContract && getConstructorInputs().length > 0 && (
              <div className="mt-3">
                <div className="text-gray-600 text-xs">CONSTRUCTOR PARAMETERS</div>
                {getConstructorInputs().map((param, idx) => (
                  <div key={idx} className="flex flex-col mt-1">
                    <label className="text-xs text-gray-600">{param.name} ({param.type})</label>
                    <input
                      type="text"
                      value={constructorInputs[param.name] || ''}
                      onChange={(e) => handleConstructorInputChange(param.name, e.target.value)}
                      placeholder={
                        param.type.includes('[]') 
                          ? '["0x1234", "0x5678"]' 
                          : param.type === 'string' 
                            ? 'My Token' 
                            : param.type === 'bool'
                              ? 'true or false'
                              : ''
                      }
                      className="border p-2 rounded text-sm mt-1"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Recorder */}
            <div className="mt-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <div className="text-gray-600 text-xs">TRANSACTIONS RECORDER</div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleRecording}
                    className={`w-3 h-3 rounded-full ${
                      isRecording ? "bg-red-500" : "bg-gray-300"
                    }`}
                    title={isRecording ? "Stop recording" : "Start recording"}
                  ></button>
                  <button
                    onClick={saveScenario}
                    disabled={transactionsRecorded === 0}
                    className={`text-xs ${
                      transactionsRecorded === 0
                        ? "text-gray-400 cursor-not-allowed"
                        : "text-blue-600 hover:text-blue-700"
                    }`}
                  >
                    Save
                  </button>
                </div>
              </div>
              {isRecording && (
                <div className="mt-1 text-xs text-gray-500">
                  {transactionsRecorded} transaction(s) recorded
                </div>
              )}
            </div>

            {/* Deployed Contracts */}
            <div className="mt-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <div className="text-gray-600 text-xs">DEPLOYED CONTRACTS</div>
                {deployedContracts.length > 0 && (
                  <button
                    onClick={clearDeployedContracts}
                    className="text-xs text-red-600 hover:text-red-700"
                  >
                    Clear All
                  </button>
                )}
              </div>
              
              <div className="mt-2 max-h-60 overflow-auto">
                {deployedContracts.map((contract, idx) => (
                  <div key={idx} className="border rounded p-2 mb-2">
                    <div className="flex justify-between items-center">
                      <div className="font-medium text-sm">{contract.name}</div>
                      <div className="text-xs text-gray-500 truncate max-w-[120px]" title={contract.address}>
                        at {contract.address.slice(0, 6)}...{contract.address.slice(-4)}
                      </div>
                    </div>
                    <div className="mt-2">
                      {contract.functions.map((func, funcIdx) => (
                        <div key={funcIdx} className="mb-1">
                          <button
                            className={`text-xs p-1 rounded ${func.payable ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"}`}
                            title={func.payable ? "Payable function" : "Non-payable function"}
                          >
                            {func.name}
                          </button>
                          {func.inputs.length > 0 && (
                            <div className="pl-2 mt-1">
                              {func.inputs.map((input, inputIdx) => (
                                <div key={inputIdx} className="flex items-center gap-1 mb-1">
                                  <input
                                    type="text"
                                    placeholder={`${input.name} (${input.type})`}
                                    className="border p-1 rounded text-xs w-full"
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* MetaMask Connection Status */}
            {environment !== 'remixVM' && (
              <div className="mt-4 border border-gray-200 rounded-md p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">MetaMask Connection</p>
                    <p className="text-sm text-gray-600">
                      {isConnected ? 
                        `Connected: ${account.substring(0, 6)}...${account.substring(account.length - 4)}` : 
                        'Not connected'}
                    </p>
                  </div>
                  {!isConnected && (
                    <button
                      onClick={connectWallet}
                      className="bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded-md font-semibold transition-colors duration-200"
                    >
                      Connect MetaMask
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DeployRun;