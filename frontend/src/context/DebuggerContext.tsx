"use client";
import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import * as monaco from "monaco-editor";
import { ethers } from "ethers";
import dynamic from "next/dynamic";
import {UnifiedDebugger} from "@/utils/LocalVMDebugger";
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false, 
});

// Define types for our context
type DebuggerState = {
  callStack: Array<{
    functionName: string;
    sourceLocation?: {
      file: string;
      start: number;
      end?: number;
    };
  }>;
  localVariables: Array<{
    name: string;
    type: string;
    value: string;
  }>;
  stateVariables: Array<{
    name: string;
    type: string;
    value: string;
  }>;
  memory?: Array<{
    offset: string;
    value: string;
  }>;
  storage?: Record<string, string>;
  opcodes?: {
    current: string;
    pc: number;
  };
};

type Breakpoint = {
  line: number;
  file: string;
};

// Define network types
type NetworkName = 'mainnet' | 'goerli' | 'sepolia';
type NetworkMap = Record<NetworkName, string>;

interface DebuggerContextType {
  isDebugging: boolean;
  currentStep: number;
  totalSteps: number;
  currentState: DebuggerState | null;
  breakpoints: Breakpoint[];
  error: string | null;
  debugTransaction: (txHash: string, useGeneratedSources?: boolean) => Promise<void>;
  stepBack: () => Promise<void>;
  stepForward: () => Promise<void>;
  stepInto: () => Promise<void>;
  stepOut: () => Promise<void>;
  jumpToBreakpoint: (forward: boolean) => Promise<void>;
  setStep: (step: number) => Promise<void>;
  stopDebugging: () => void;
  addBreakpoint: (breakpoint: Breakpoint) => void;
  removeBreakpoint: (index: number) => void;
  highlightCode: (file: string, line: number, end?: number) => void;
  setEditorReference: (editor: monaco.editor.IStandaloneCodeEditor, fileName: string) => void;
  nodeStatus: { supportsDebug: boolean, message: string } | null;
  checkNodeDebugSupport: () => Promise<void>;
  isVMDebugging:boolean;
  initializeVMDebugger: (accounts: Array<{ address: string, balance: string }>, contracts: Array<{ address: string, bytecode: string, abi: any[] }>) => Promise<void>;
  debugVMTransaction: (tx: { from: string, to: string, data: string, value?: string, gasLimit?: string }, contractSource: string) => Promise<void>;
  debugger: UnifiedDebugger | null;
  isReady: boolean;
  environment: 'vm' | 'hardhat' | 'injected' | null;
  
  // You might want to add these functions
  decodeCalldata: (to: string, data: string) => { name: string, params: any[] } | null;
  registerContract: (address: string, bytecode: string, abi: any[]) => Promise<void>;

  // Add deployedContracts to the context type
  deployedContracts: Array<{
    address: string;
    bytecode: string;
    abi: any[];
  }>;

  // Add the addContract function
  addContract: (address: string, bytecode: string, abi: any[]) => void;
}

const DebuggerContext = createContext<DebuggerContextType | undefined>(undefined);

export const DebuggerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDebugging, setIsDebugging] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [currentState, setCurrentState] = useState<DebuggerState | null>(null);
  const [breakpoints, setBreakpoints] = useState<Breakpoint[]>([]);
  const [txTrace, setTxTrace] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [activeDecorations, setActiveDecorations] = useState<string[]>([]);
  const [provider, setProvider] = useState<ethers.JsonRpcProvider | ethers.BrowserProvider | null>(null);
  
  // Editor reference to be set by the editor component
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const currentFileName = useRef<string>("");

  const [nodeStatus, setNodeStatus] = useState<{ supportsDebug: boolean, message: string } | null>(null);

  const [debuggerInstance, setDebuggerInstance] = useState<UnifiedDebugger | null>(null);
  const [isVMDebugging, setIsVMDebugging] = useState<boolean>(false);

  // Add this to your state variables
const [deployedContracts, setDeployedContracts] = useState<Array<{
  address: string,
  bytecode: string,
  abi: any[]
}>>([]);

// Add a contracts Map like in UnifiedDebugger
const contracts = useRef(new Map<string, { code: string | Buffer, abi: any[] }>());

// Add function to store a contract
const addContract = (address: string, bytecode: string, abi: any[]) => {
  // Normalize address
  const normalizedAddress = address.toLowerCase();
  
  // Store in state
  setDeployedContracts(prev => {
    // Check if it already exists
    const exists = prev.some(c => c.address.toLowerCase() === normalizedAddress);
    if (exists) {
      return prev.map(c => 
        c.address.toLowerCase() === normalizedAddress
          ? { address, bytecode, abi }
          : c
      );
    }
    return [...prev, { address, bytecode, abi }];
  });
  
  // Store in Map for quick lookup
  contracts.current.set(normalizedAddress, { code: bytecode, abi });
  
  // Optionally persist to localStorage
  try {
    const savedContracts = localStorage.getItem('savedContracts');
    const parsedContracts = savedContracts ? JSON.parse(savedContracts) : [];
    
    // Check if it exists
    const index = parsedContracts.findIndex(
      (c: any) => c.address.toLowerCase() === normalizedAddress
    );
    
    if (index >= 0) {
      parsedContracts[index] = { address, bytecode, abi };
    } else {
      parsedContracts.push({ address, bytecode, abi });
    }
    
    localStorage.setItem('savedContracts', JSON.stringify(parsedContracts));
  } catch (error) {
    console.error("Error saving contract to localStorage:", error);
  }
};

  useEffect(() => {
    if (typeof window === 'undefined') return;
  
    const initDebugger = async () => {
      try {
        const unifiedDebugger = new UnifiedDebugger();
        // Initialize with the appropriate environment
        await unifiedDebugger.initialize();
        setDebuggerInstance(unifiedDebugger);
      } catch (err) {
        console.error("Failed to initialize debugger:", err);
        setError("Failed to initialize debugger. Please check your network connection.");
      }
    };
  
    initDebugger();
  }, []);

  // Add a status state
const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');

// Update initialization
useEffect(() => {
  if (typeof window === 'undefined') return;

  const initDebugger = async () => {
    try {
      setStatus('loading');
      const unifiedDebugger = new UnifiedDebugger();
      await unifiedDebugger.initialize();
      setDebuggerInstance(unifiedDebugger);
      setStatus('ready');
    } catch (err) {
      console.error("Failed to initialize debugger:", err);
      setError("Failed to initialize debugger. Please check your network connection.");
      setStatus('error');
    }
  };

  initDebugger();
}, []);
  
const debugTransactionWithInstance = async (txHash: string, useGeneratedSources = false) => {
  try {
    if (!debuggerInstance) {
      throw new Error("Debugger not initialized");
    }
    
    setError(null);
    setIsDebugging(true);
    setTxHash(txHash);
    
    // Get transaction details
    const tx = await provider?.getTransaction(txHash);
    if (!tx) {
      throw new Error("Transaction not found");
    }
    
    // Get deployed contract info from your store/context
    const contract = getContractByAddress(tx.to, deployedContracts, contracts.current);
    
    // Debug the transaction
    const debugInfo = await debuggerInstance.getTransactionDebugInfo(txHash, contract);
    
    // Process and set the trace
    setTxTrace(debugInfo.steps || []);
    setTotalSteps((debugInfo.steps || []).length - 1);
    
    // Set initial step to 0
    await setStep(0);
    
  } catch (err: any) {
    setError(err.message || 'Failed to start debugging session');
    setIsDebugging(false);
  }
};

const initializeVMDebugger = async (accounts: Array<{ address: string, balance: string }>, contracts: Array<{ address: string, bytecode: string, abi: any[] }>) => {
  try {
    if (!debuggerInstance) {
      throw new Error("Debugger not initialized");
    }
    
    // Register each contract
    for (const contract of contracts) {
      await debuggerInstance.registerContract(contract.address, contract.bytecode, contract.abi);
    }
    
    // No need to set localVMDebugger separately as we're using UnifiedDebugger
  } catch (err: any) {
    setError(`Failed to initialize debugger: ${err.message}`);
  }
};

const debugVMTransaction = async (tx: { from: string, to: string, data: string, value?: string, gasLimit?: string }, contractSource: string) => {
  try {
    if (!debuggerInstance) {
      throw new Error("Debugger not initialized");
    }
    
    setError(null);
    setIsDebugging(true);
    setIsVMDebugging(true);
    
    // Debug using the unified debugger
    const debugInfo = await debuggerInstance.debugTransaction(tx, contractSource);
    
    // Set the trace
    setTxTrace(debugInfo.steps || []);
    setTotalSteps((debugInfo.steps || []).length - 1);
    
    // Set initial step to 0
    await setStep(0);
    
  } catch (err: any) {
    setError(err.message || 'Failed to start VM debugging session');
    setIsDebugging(false);
    setIsVMDebugging(false);
  }
};

const checkNodeDebugSupport = async () => {
  try {
    if (!debuggerInstance) {
      setNodeStatus({ 
        supportsDebug: false, 
        message: "Debugger not initialized" 
      });
      return;
    }
    
    // The UnifiedDebugger has already checked for debug support during initialization
    // We can just check what type of environment it's using
    const isHardhat = debuggerInstance?.isUsingHardhat;
    const isVM = debuggerInstance?.isUsingVM;
    
    if (isHardhat) {
      setNodeStatus({ 
        supportsDebug: true, 
        message: "Connected to Hardhat node with debug support" 
      });
    } else if (isVM) {
      setNodeStatus({ 
        supportsDebug: true, 
        message: "Using VM-based debugging" 
      });
    } else {
      setNodeStatus({ 
        supportsDebug: false, 
        message: "Connected to provider without debug support" 
      });
    }
  } catch (err: any) {
    setNodeStatus({ 
      supportsDebug: false, 
      message: `Failed to check node: ${err.message}` 
    });
  }
};

  // Initialize provider on client-side only
  useEffect(() => {
    // Make sure we're in a browser environment
    if (typeof window === 'undefined') return;

    const initProvider = async () => {
      try {
        let web3Provider;
        
        // Try to detect the environment and use appropriate provider
        if (window.ethereum) {
          // Browser with injected provider (MetaMask, etc.)
          web3Provider = new ethers.BrowserProvider(window.ethereum);
        } else if (process.env.REACT_APP_RPC_URL || process.env.NEXT_PUBLIC_RPC_URL) {
          // Environment variable configuration (React/Next.js)
          const rpcUrl = process.env.REACT_APP_RPC_URL || process.env.NEXT_PUBLIC_RPC_URL;
          web3Provider = new ethers.JsonRpcProvider(rpcUrl);
        } else {
          // Fallback to a default provider or configurable option
          // You might want to make this configurable in your app
          const networks: NetworkMap = {
            mainnet: 'https://eth-mainnet.alchemyapi.io/v2/your-api-key',
            goerli: 'https://eth-goerli.alchemyapi.io/v2/your-api-key',
            sepolia: 'https://eth-sepolia.alchemyapi.io/v2/your-api-key',
          };
          
          // Get network from context or state
          const currentNetwork = getCurrentNetwork();
          
          // Type guard to ensure network is a valid key
          if (isValidNetwork(currentNetwork)) {
            web3Provider = new ethers.JsonRpcProvider(networks[currentNetwork]);
          } else {
            // Default to mainnet if invalid network name
            web3Provider = new ethers.JsonRpcProvider(networks.mainnet);
          }
        }
        
        setProvider(web3Provider);
      } catch (err) {
        console.error("Failed to initialize provider:", err);
        setError("Failed to initialize Web3 provider. Please make sure you have a compatible wallet installed.");
      }
    };

    initProvider();
  }, []);
  
  // Type guard function to check if a network name is valid
  const isValidNetwork = (network: string): network is NetworkName => {
    return ['mainnet', 'goerli', 'sepolia'].includes(network);
  };
  
  // Helper to get current network from context/state
  const getCurrentNetwork = (): string => {
    // Implement based on your app's state management
    // Could be reading from context, Redux, or local storage
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selectedNetwork') || 'mainnet';
    }
    return 'mainnet'; // Default fallback
  };
  
  // Clear decorations when component unmounts
  useEffect(() => {
    return () => {
      if (editorRef.current && activeDecorations.length > 0) {
        editorRef.current.deltaDecorations(activeDecorations, []);
      }
    };
  }, [activeDecorations]);

  // This function would be called by your editor component
  const highlightCode = useCallback((file: string, line: number, end?: number) => {
    // Find the Monaco editor instance
    if (!editorRef.current) {
      console.error("Editor reference not available");
      return;
    }
    
    // Check if this is the file we want to highlight
    if (file !== currentFileName.current) {
      console.warn(`Requested to highlight ${file}, but current editor shows ${currentFileName.current}`);
      return;
    }
    
    const endLineToUse = end || line;
    
    // Clear previous decorations
    if (activeDecorations.length > 0) {
      editorRef.current.deltaDecorations(activeDecorations, []);
    }
    
    // Create a decoration for the highlighted line(s)
    const decorations = editorRef.current.deltaDecorations([], [{
      range: new monaco.Range(line, 1, endLineToUse, 1),
      options: {
        isWholeLine: true,
        className: 'debugger-highlighted-line',
        glyphMarginClassName: 'debugger-breakpoint-glyph'
      }
    }]);
    
    // Scroll the editor to make the highlighted line visible
    editorRef.current.revealLineInCenter(line);
    
    // Store the decoration IDs so they can be removed later
    setActiveDecorations(decorations);
  }, [activeDecorations]);

  // Function to fetch transaction trace from backend/blockchain
  const fetchTransactionTrace = async (hash: string, useGeneratedSources = false) => {
    console.log("Fetching transaction trace for:", hash);
    try {
      if (!provider) {
        throw new Error("Web3 provider not initialized. Please check your wallet connection.");
      }
      
      // Try to connect to local node first - add fallback logic
      const localNode = new ethers.JsonRpcProvider("http://localhost:8545");
      
      try {
        // First try with local node which should have debug APIs enabled
        console.log("Attempting to debug with local node...");
        const trace = await localNode.send('debug_traceTransaction', [
          hash, 
          { 
            tracer: 'callTracer',
            disableStorage: false,
            disableMemory: false,
            enableReturnData: true,
            useGeneratedSources
          }
        ]);
        console.log("Local node debug successful");
        return trace;
      } catch (localError) {
        console.warn("Local node debugging failed, trying fallback method:", localError);
        
        // Fallback to your backend API if available
        if (typeof window !== 'undefined') {
          console.log("Attempting API fallback...");
          try {
            const response = await fetch(`/api/debug?hash=${hash}&useGeneratedSources=${useGeneratedSources}`);
            
            if (!response.ok) {
              throw new Error(`API returned status: ${response.status} - ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log("API fallback successful");
            return result;
          } catch (apiError) {
            console.error("API fallback failed:", apiError);
            throw new Error("Transaction tracing is unavailable. Please run a local Ethereum node with debug APIs enabled");
          }
        } else {
          // No fallback available
          throw new Error("Transaction tracing requires a local Ethereum node with debug APIs enabled");
        }
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch transaction trace';
      console.error("Trace fetch error:", errorMessage, err);
      setError(errorMessage);
      throw err;
    }
  };
  
  // Helper function to check provider capabilities
  const checkProviderSupport = async (provider: ethers.JsonRpcProvider | ethers.BrowserProvider): Promise<string[]> => {
    try {
      // This tests if the provider supports the debug namespace
      await provider.send('web3_clientVersion', []);
      
      // If no error, we'll assume debug might be supported
      // You could also explicitly check using provider.send('rpc_modules', [])
      return ['debug_traceTransaction'];
    } catch (error) {
      console.warn('Provider may not support debug namespace:', error);
      return [];
    }
  };
  // Process the trace data at a specific step
  const processTraceAtStep = (trace: any[], step: number): DebuggerState => {
    if (!trace || step >= trace.length) {
      throw new Error('Invalid step or trace data');
    }
    
    const traceStep = trace[step];
    
    // Map directly from UnifiedDebugger format
    return {
      callStack: traceStep.depth ? [{
        functionName: traceStep.opcode?.name || 'Unknown',
        sourceLocation: traceStep.source ? {
          file: traceStep.source.file || 'Unknown File',
          start: traceStep.source.line || 0,
          end: traceStep.source.end || traceStep.source.line || 0
        } : undefined
      }] : [],
      localVariables: traceStep.locals || [],
      stateVariables: [], // Extract from storage if needed
      memory: traceStep.memory?.map((value: string, index: number) => ({
        offset: `0x${index.toString(16)}`,
        value
      })) || [],
      storage: traceStep.storage || {},
      opcodes: {
        current: traceStep.opcode?.name || '',
        pc: traceStep.pc || 0
      }
    };
  };

  // Helper to extract call stack from trace step
  const extractCallStack = (traceStep: any): DebuggerState['callStack'] => {
    // This will depend on your trace format
    const callStack = [];
    
    // If traceStep has a calls array or similar structure
    if (traceStep.calls && Array.isArray(traceStep.calls)) {
      // Process each call in the stack
      for (const call of traceStep.calls) {
        callStack.push({
          functionName: call.functionName || 'Unknown Function',
          sourceLocation: call.sourceLocation ? {
            file: call.sourceLocation.filename || 'Unknown File',
            start: call.sourceLocation.start || 0,
            end: call.sourceLocation.end || call.sourceLocation.start || 0
          } : undefined
        });
      }
    }
    
    // If traceStep has stack trace
    if (traceStep.stackTrace && Array.isArray(traceStep.stackTrace)) {
      for (const frame of traceStep.stackTrace) {
        callStack.push({
          functionName: frame.function || 'Unknown Function',
          sourceLocation: frame.sourceReference ? {
            file: frame.sourceReference.file || 'Unknown File',
            start: frame.sourceReference.line || 0,
            end: frame.sourceReference.endLine || frame.sourceReference.line || 0
          } : undefined
        });
      }
    }
    
    return callStack;
  };

  // Helper to extract variables from trace step
  const extractVariables = (traceStep: any): { 
    localVariables: DebuggerState['localVariables'], 
    stateVariables: DebuggerState['stateVariables'] 
  } => {
    const localVariables = [];
    const stateVariables = [];
    
    // Process local variables
    if (traceStep.locals && typeof traceStep.locals === 'object') {
      for (const [name, value] of Object.entries(traceStep.locals)) {
        localVariables.push({
          name,
          type: determineVariableType(value),
          value: formatVariableValue(value)
        });
      }
    }
    
    // Process state variables
    if (traceStep.state && typeof traceStep.state === 'object') {
      for (const [name, value] of Object.entries(traceStep.state)) {
        stateVariables.push({
          name,
          type: determineVariableType(value),
          value: formatVariableValue(value)
        });
      }
    }
    
    return { localVariables, stateVariables };
  };

  // Helper to determine variable type
  const determineVariableType = (value: any): string => {
    if (value === null) return 'null';
    if (typeof value === 'boolean') return 'bool';
    if (typeof value === 'number') return Number.isInteger(value) ? 'uint' : 'decimal';
    if (typeof value === 'string') {
      // Check if it's a hex string (address or bytes)
      if (/^0x[0-9a-fA-F]+$/.test(value)) {
        return value.length === 42 ? 'address' : 'bytes';
      }
      return 'string';
    }
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'struct';
    return 'unknown';
  };

  // Helper to format variable values
  const formatVariableValue = (value: any): string => {
    if (value === null) return 'null';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  // Helper to extract memory from trace step
  const extractMemory = (traceStep: any): DebuggerState['memory'] => {
    const memory = [];
    
    if (traceStep.memory && Array.isArray(traceStep.memory)) {
      // Direct array format
      return traceStep.memory;
    } else if (traceStep.memory && typeof traceStep.memory === 'object') {
      // Object format with key-value pairs
      for (const [offset, value] of Object.entries(traceStep.memory)) {
        memory.push({ offset, value: String(value) });
      }
    }
    
    return memory;
  };

  // Helper to extract storage from trace step
  const extractStorage = (traceStep: any): DebuggerState['storage'] => {
    if (traceStep.storage && typeof traceStep.storage === 'object') {
      // Convert all values to strings
      const storage: Record<string, string> = {};
      for (const [slot, value] of Object.entries(traceStep.storage)) {
        storage[slot] = String(value);
      }
      return storage;
    }
    
    return {};
  };

  // Helper to extract opcodes from trace step
  const extractOpcodes = (traceStep: any): DebuggerState['opcodes'] => {
    if (traceStep.opcode) {
      return {
        current: String(traceStep.opcode),
        pc: traceStep.pc !== undefined ? Number(traceStep.pc) : 0
      };
    }
    
      return {
        current: '',
        pc: 0
      };
    };
  
    // Start debugging a transaction
    const debugTransaction = async (hash: string, useGeneratedSources = false) => {
      try {
        if (!provider) {
          throw new Error("Web3 provider not initialized. Please check your wallet connection.");
        }
        
        setError(null);
        setIsDebugging(true);
        setTxHash(hash);
        
        const trace = await fetchTransactionTrace(hash, useGeneratedSources);
        console.log("trace", trace);
        if (!trace || !Array.isArray(trace) || trace.length === 0) {
          throw new Error('Invalid trace data received');
        }
        
        setTxTrace(trace);
        setTotalSteps(trace.length - 1);
        
        // Set initial step to 0
        await setStep(0);
        
      } catch (err: any) {
        setError(err.message || 'Failed to start debugging session');
        setIsDebugging(false);
      }
    };
  
    // Set the current step and update state
    const setStep = async (step: number) => {
      try {
        if (!isDebugging || !txTrace || step < 0 || step > totalSteps) {
          return;
        }
        
        const state = processTraceAtStep(txTrace, step);
        setCurrentStep(step);
        setCurrentState(state);
        
        // Highlight the relevant code in the editor
        if (state.callStack && state.callStack.length > 0) {
          const topCall = state.callStack[state.callStack.length - 1];
          if (topCall.sourceLocation) {
            highlightCode(
              topCall.sourceLocation.file,
              topCall.sourceLocation.start,
              topCall.sourceLocation.end
            );
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to process step');
      }
    };
  
    // Step navigation functions
    const stepBack = async () => {
      await setStep(Math.max(0, currentStep - 1));
    };
  
    const stepForward = async () => {
      await setStep(Math.min(totalSteps, currentStep + 1));
    };
  
    const stepInto = async () => {
      // Implementation will depend on your trace format
      // For now, we'll just move forward one step
      await stepForward();
    };
  
    const stepOut = async () => {
      // Implementation will depend on your trace format
      // This should find the end of the current function call
      if (!txTrace || !currentState) return;
      
      const currentDepth = currentState.callStack.length;
      
      // Find the next step where the call stack is smaller than the current depth
      for (let i = currentStep + 1; i <= totalSteps; i++) {
        const state = processTraceAtStep(txTrace, i);
        if (state.callStack.length < currentDepth) {
          await setStep(i);
          return;
        }
      }
      
      // If no such step exists, go to the end
      await setStep(totalSteps);
    };
  
    const jumpToBreakpoint = async (forward: boolean) => {
      if (!txTrace || breakpoints.length === 0) return;
      
      // Find the next/previous breakpoint
      const direction = forward ? 1 : -1;
      const startStep = forward ? currentStep + 1 : currentStep - 1;
      const endStep = forward ? totalSteps : 0;
      
      for (
        let step = startStep;
        forward ? step <= endStep : step >= endStep;
        step += direction
      ) {
        const state = processTraceAtStep(txTrace, step);
        
        if (state.callStack && state.callStack.length > 0) {
          const topCall = state.callStack[state.callStack.length - 1];
          
          if (topCall.sourceLocation) {
            // Check if any breakpoint matches this location
            const matchingBreakpoint = breakpoints.find(
              bp =>
                bp.file === topCall.sourceLocation?.file &&
                topCall.sourceLocation?.start <= bp.line &&
                (topCall.sourceLocation?.end || topCall.sourceLocation?.start) >= bp.line
            );
            
            if (matchingBreakpoint) {
              await setStep(step);
              return;
            }
          }
        }
      }
      
      // If no breakpoint is found, don't move
    };
  
    const stopDebugging = () => {
      setIsDebugging(false);
      setCurrentStep(0);
      setTotalSteps(0);
      setCurrentState(null);
      setTxTrace([]);
      setTxHash(null);
      
      // Clear highlighting in the editor
      if (editorRef.current && activeDecorations.length > 0) {
        editorRef.current.deltaDecorations(activeDecorations, []);
        setActiveDecorations([]);
      }
    };
  
    const addBreakpoint = (breakpoint: Breakpoint) => {
      setBreakpoints(prev => [...prev, breakpoint]);
    };
  
    const removeBreakpoint = (index: number) => {
      setBreakpoints(prev => prev.filter((_, i) => i !== index));
    };
  
    // Method to set editor reference and current filename from editor component
    const setEditorReference = useCallback((editor: monaco.editor.IStandaloneCodeEditor, fileName: string) => {
      editorRef.current = editor;
      currentFileName.current = fileName;
      
      // Clear any previous decorations when setting a new editor reference
      if (activeDecorations.length > 0 && editor) {
        editor.deltaDecorations(activeDecorations, []);
        setActiveDecorations([]);
      }
    }, [activeDecorations]);
  
    return (
      <DebuggerContext.Provider
        value={{
          isDebugging,
          currentStep,
          totalSteps,
          currentState,
          breakpoints,
          error,
          debugTransaction,
          stepBack,
          stepForward,
          stepInto,
          stepOut,
          jumpToBreakpoint,
          setStep,
          stopDebugging,
          addBreakpoint,
          removeBreakpoint,
          highlightCode,
          setEditorReference,
          nodeStatus,
          checkNodeDebugSupport,
          isVMDebugging,
          initializeVMDebugger,
          debugVMTransaction,
          debugger: debuggerInstance,
          isReady: status === 'ready',
          environment: null, // Replace with actual environment if available
          decodeCalldata: (to, data) => null, // Replace with actual implementation if available
          registerContract: async (address, bytecode, abi) => {}, // Replace with actual implementation if available
          deployedContracts,
          addContract,
        }}
      >
        {children}
      </DebuggerContext.Provider>
    );
  };
  
  export const useDebugger = () => {
    const context = useContext(DebuggerContext);
    if (context === undefined) {
      throw new Error('useDebugger must be used within a DebuggerProvider');
    }
    return context;
  };

/**
 * Retrieves contract information by address
 * @param to The contract address to look up
 * @returns The contract information or null if not found
 */
const getContractByAddress = (
  to: string | null,
  deployedContracts: Array<{ address: string, bytecode: string, abi: any[] }>,
  contracts: Map<string, { code: string | Buffer, abi: any[] }>
): { address: string, bytecode: string, abi: any[] } | null => {
  if (!to) return null;
  
  // Normalize the address format (ensure it's lowercase and has 0x prefix)
  const normalizedAddress = to.toLowerCase();
  
  // Check if we have this contract in our local storage
  // This assumes you're storing deployed contracts somewhere in your app state
  // You might need to adjust this based on your actual state management
  
  // Option 1: If you're storing contracts in state
  const storedContract = deployedContracts.find(
    contract => contract.address.toLowerCase() === normalizedAddress
  );
  
  if (storedContract) {
    return {
      address: storedContract.address,
      bytecode: storedContract.bytecode,
      abi: storedContract.abi
    };
  }
  
  // Option 2: If you're using a map/object to store contracts (like in your UnifiedDebugger)
  if (contracts.has(normalizedAddress)) {
    const contractData = contracts.get(normalizedAddress);
    return {
      address: normalizedAddress,
      bytecode: typeof contractData?.code === 'string' 
        ? contractData.code 
        : '0x' + contractData?.code.toString('hex'),
      abi: contractData?.abi || []
    };
  }
  
  // Option 3: Check localStorage for persisted contracts
  try {
    const savedContracts = localStorage.getItem('savedContracts');
    if (savedContracts) {
      const parsedContracts = JSON.parse(savedContracts);
      const match = parsedContracts.find(
        (c: any) => c.address.toLowerCase() === normalizedAddress
      );
      
      if (match) {
        return {
          address: match.address,
          bytecode: match.bytecode,
          abi: match.abi
        };
      }
    }
  } catch (error) {
    console.error("Error reading contracts from localStorage:", error);
  }
  
  // If we have a contract registry service, we could query it here
  
  // If nothing found, return null
  return null;
};