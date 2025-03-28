"use client";
import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { ethers } from "ethers";
import { UnifiedDebugger } from "@/utils/LocalVMDebugger";
import { DeployedContract, Network } from "@/types/deployment";

// Dynamically import Monaco Editor with SSR disabled
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
});

// Define Monaco Editor types
type MonacoEditorType = {
  editor: {
    IStandaloneCodeEditor: any;
  };
};

// Define types for our context
type DebuggerState = {
  callStack: Array<{
    functionName: string;
    sourceLocation?: {
      file: string;
      start: number;
      end: number;
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
  memory: Array<{
    offset: string;
    value: string;
  }>;
  storage: Record<string, string>;
  opcodes: {
    current: string;
    pc: number;
    gasCost: number;
    gasRemaining: number;
    severity: string;
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
  setEditorReference: (editor: any, fileName: string) => void;
  nodeStatus: { supportsDebug: boolean, message: string } | null;
  checkNodeDebugSupport: () => Promise<void>;
  isVMDebugging: boolean;
  initializeVMDebugger: (accounts: Array<{ address: string, balance: string }>, contracts: Array<{ address: string, bytecode: string, abi: any[] }>) => Promise<void>;
  debugVMTransaction: (tx: { from: string, to: string, data: string, value?: string, gasLimit?: string }, contractSource: string) => Promise<void>;
  debugger: UnifiedDebugger | null;
  isReady: boolean;
  environment: 'vm' | 'hardhat' | 'injected' | null;
  decodeCalldata: (to: string, data: string) => { name: string, params: any[] } | null;
  registerContract: (address: string, bytecode: string, abi: any[]) => Promise<void>;
  deployedContracts: Array<{
    address: string;
    bytecode: string;
    abi: any[];
  }>;
  addContract: (address: string, bytecode: string, abi: any[]) => void;
}

const DebuggerContext = createContext<DebuggerContextType | undefined>(undefined);

export const DebuggerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize empty debugger state
  const emptyState: DebuggerState = {
    callStack: [],
    localVariables: [],
    stateVariables: [],
    memory: [],
    storage: {},
    opcodes: {
      current: '',
      pc: 0,
      gasCost: 0,
      gasRemaining: 0,
      severity: 'info'
    }
  };

  // State management
  const [isDebugging, setIsDebugging] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [currentState, setCurrentState] = useState<DebuggerState>(emptyState);
  const [txHash, setTxHash] = useState<string>('');
  const [txTrace, setTxTrace] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [nodeStatus, setNodeStatus] = useState<{ supportsDebug: boolean; message: string } | null>(null);
  const [isVMDebugging, setIsVMDebugging] = useState(false);

  // References
  const editorRef = useRef<any>(null);
  const currentFileName = useRef<string>('');
  const provider = useRef<ethers.JsonRpcProvider | null>(null);

  const [breakpoints, setBreakpoints] = useState<Breakpoint[]>([]);
  const [activeDecorations, setActiveDecorations] = useState<string[]>([]);

  const [debuggerInstance, setDebuggerInstance] = useState<UnifiedDebugger | null>(null);

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
      const tx = await provider?.current?.getTransaction(txHash);
      if (!tx) {
        throw new Error("Transaction not found");
      }
      
      // Get deployed contract info from your store/context
      const contract = getContractByAddress(tx.to, deployedContracts, contracts.current);
      if (!contract) {
        throw new Error("Contract not found for transaction");
      }
      
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
        
        provider.current = web3Provider;
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
    if (!editorRef.current) return;

    // Clear previous decorations
    if (activeDecorations.length > 0) {
      editorRef.current.deltaDecorations(activeDecorations, []);
      setActiveDecorations([]);
    }

    // Add new decoration
    const decorations = [{
      range: {
        startLineNumber: line,
        startColumn: 1,
        endLineNumber: end || line,
        endColumn: 1
      },
      options: {
        isWholeLine: true,
        className: 'highlighted-line',
        linesDecorationsClassName: 'highlighted-line-decoration'
      }
    }];

    const newDecorations = editorRef.current.deltaDecorations([], decorations);
    setActiveDecorations(newDecorations);
  }, [activeDecorations]);

  // Function to fetch transaction trace from backend/blockchain
  const fetchTransactionTrace = async (hash: string, useGeneratedSources = false) => {
    console.log("Fetching transaction trace for:", hash);
    try {
      if (!provider.current) {
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

  // Helper to extract call stack from trace step
  const extractCallStack = (traceStep: any): DebuggerState['callStack'] => {
    // This will depend on your trace format
    const callStack = [];
    
    // If traceStep has a calls array or similar structure
    if (traceStep.calls && Array.isArray(traceStep.calls)) {
      // Process each call in the stack
      for (const call of traceStep.calls) {
        callStack.push({
          functionName: call.op || 'Unknown',
          sourceLocation: call.source ? {
            file: call.source.file || 'Unknown File',
            start: call.source.start || 0,
            end: call.source.end || 0
          } : undefined
        });
      }
    }
    
    return callStack;
  };

  // Helper to create empty state with current step info
  const createEmptyStateWithStep = (step: number): DebuggerState => {
    return {
      callStack: [],
      localVariables: [],
      stateVariables: [],
      memory: [],
      storage: {},
      opcodes: {
        current: '',
        pc: step,
        gasCost: 0,
        gasRemaining: 0,
        severity: 'info'
      }
    };
  };

  // Process the trace data at a specific step
  const processTraceAtStep = async (trace: any, step: number): Promise<DebuggerState> => {
    if (!trace || !trace.structLogs || step >= trace.structLogs.length) {
      throw new Error('Invalid step or trace data');
    }
    
    const traceStep = trace.structLogs[step];
    
    // Get gas information
    const gasCost = traceStep.gasCost || 0;
    const gasRemaining = traceStep.gas || 0;
    
    // Extract source location from trace step
    let sourceLocation;
    if (traceStep.sourceMap) {
      const [start, length, fileIndex] = traceStep.sourceMap.split(':').map(Number);
      sourceLocation = {
        file: currentFileName.current || 'Unknown File',
        start,
        end: start + (length || 0)
      };
    }
    
    // Create call stack with source mapping
    const callStack = [{
      functionName: traceStep.op || 'Unknown',
      sourceLocation: sourceLocation
    }];
    
    // Extract memory information
    const memory = traceStep.memory?.map((value: string, index: number) => ({
      offset: `0x${index.toString(16)}`,
      value
    })) || [];
    
    // Extract storage information
    const storage = traceStep.storage || {};
    
    // Create state with all required information
    return {
      callStack,
      localVariables: [], // We'll implement variable extraction later
      stateVariables: [], // We'll implement variable extraction later
      memory,
      storage,
      opcodes: {
        current: traceStep.op || '',
        pc: traceStep.pc || 0,
        gasCost,
        gasRemaining,
        severity: 'info'
      }
    };
  };

  // Helper to extract opcodes from trace step
  const extractOpcodes = (traceStep: any): DebuggerState['opcodes'] => {
    return {
      current: traceStep.op || '',
      pc: traceStep.pc || 0,
      gasCost: traceStep.gasCost || 0,
      gasRemaining: traceStep.gas || 0,
      severity: 'info'
    };
  };

  // Start debugging a transaction
  const debugTransaction = async (hash: string, useGeneratedSources = false) => {
    try {
      if (!provider.current) {
        throw new Error("Web3 provider not initialized. Please check your wallet connection.");
      }
      
      setError(null);
      setIsDebugging(true);
      setTxHash(hash);
      
      // Get the current file name from the editor
      if (!currentFileName.current) {
        console.warn("No file name set in editor. Source mapping may not work correctly.");
      }
      
      const trace = await fetchTransactionTrace(hash, useGeneratedSources);
      console.log("trace", trace);
      
      if (!trace || !trace.structLogs || !Array.isArray(trace.structLogs) || trace.structLogs.length === 0) {
        throw new Error('Invalid trace data received');
      }
      
      setTxTrace(trace);
      setTotalSteps(trace.structLogs.length - 1);
      
      // Set initial step to 0
      await setStep(0);
      
    } catch (err: any) {
      setError(err.message || 'Failed to start debugging session');
      setIsDebugging(false);
    }
  };

  // Set the current step and update state
  const setStep = async (step: number): Promise<void> => {
    if (!txTrace) {
      console.error('No trace data available');
      setCurrentState(emptyState);
      return;
    }

    try {
      setCurrentStep(step);
      const traceStep = txTrace.structLogs[step];
      
      if (!traceStep) {
        throw new Error('Invalid step');
      }

      // Get source mapping information
      let sourceLocation;
      if (traceStep.sourceMap) {
        const [start, length, fileIndex] = traceStep.sourceMap.split(':').map(Number);
        sourceLocation = {
          file: currentFileName.current || 'Unknown File',
          start,
          end: start + (length || 0)
        };
      }

      // Create the new state synchronously
      const newState: DebuggerState = {
        callStack: [{
          functionName: traceStep.op || 'Unknown',
          sourceLocation
        }],
        localVariables: [],
        stateVariables: [],
        memory: traceStep.memory?.map((value: string, index: number) => ({
          offset: `0x${index.toString(16)}`,
          value
        })) || [],
        storage: traceStep.storage || {},
        opcodes: {
          current: traceStep.op || '',
          pc: traceStep.pc || 0,
          gasCost: traceStep.gasCost || 0,
          gasRemaining: traceStep.gas || 0,
          severity: 'info'
        }
      };

      setCurrentState(newState);
    } catch (err) {
      console.error('Error processing trace at step:', err);
      setCurrentState({
        ...emptyState,
        opcodes: {
          current: '',
          pc: step,
          gasCost: 0,
          gasRemaining: 0,
          severity: 'info'
        }
      });
    }
  };

  // Step back in the trace
  const stepBack = async () => {
    if (currentStep > 0) {
      await setStep(currentStep - 1);
    }
  };

  // Step forward in the trace
  const stepForward = async () => {
    if (currentStep < totalSteps - 1) {
      await setStep(currentStep + 1);
    }
  };

  // Step into a function call
  const stepInto = async () => {
    const currentDepth = currentState.callStack.length;
    let nextStep = currentStep + 1;
    
    while (nextStep < totalSteps) {
      const state = await processTraceAtStep(txTrace, nextStep);
      if (state.callStack.length > currentDepth) {
        await setStep(nextStep);
        return;
      }
      nextStep++;
    }
  };

  // Step out of a function call
  const stepOut = async () => {
    const currentDepth = currentState.callStack.length;
    let nextStep = currentStep + 1;
    
    while (nextStep < totalSteps) {
      const state = await processTraceAtStep(txTrace, nextStep);
      if (state.callStack.length < currentDepth) {
        await setStep(nextStep);
        return;
      }
      nextStep++;
    }
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
      const state = await processTraceAtStep(txTrace, step);
      
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
    setCurrentState(emptyState);
    setTxTrace(null);
    setTxHash('');
    
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
  const setEditorReference = (editor: any, fileName: string) => {
    editorRef.current = editor;
    currentFileName.current = fileName;
    
    // If we're debugging, update the current state with the new file
    if (isDebugging && txTrace) {
      const state = processTraceAtStep(txTrace, currentStep);
      setCurrentState(state);
    }
  };

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
): DeployedContract | null => {
  if (!to) return null;
  
  const normalizedAddress = to.toLowerCase();
  const contract = deployedContracts.find(c => c.address.toLowerCase() === normalizedAddress);
  
  if (!contract) return null;
  
  // Create a DeployedContract object with required fields
  return {
    address: contract.address,
    network: {
      name: "local",
      rpcUrl: "http://localhost:8545",
      chainId: "31337"
    },
    deployedBy: "0x0000000000000000000000000000000000000000",
    timestamp: Date.now(),
    contractName: "Unknown",
    abi: contract.abi,
    txHash: "",
    blockNumber: 0
  };
};