"use client";
import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import * as monaco from "monaco-editor";
import {ethers} from "ethers";

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
  
  // Editor reference to be set by the editor component
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const currentFileName = useRef<string>("");
  
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
    try {
      let provider;
      
      // Try to detect the environment and use appropriate provider
      if (window.ethereum) {
        // Browser with injected provider (MetaMask, etc.)
        provider = new ethers.providers.Web3Provider(window.ethereum);
      } else if (process.env.REACT_APP_RPC_URL || process.env.NEXT_PUBLIC_RPC_URL) {
        // Environment variable configuration (React/Next.js)
        const rpcUrl = process.env.REACT_APP_RPC_URL || process.env.NEXT_PUBLIC_RPC_URL;
        provider = new ethers.providers.JsonRpcProvider(rpcUrl);
      } else {
        // Fallback to a default provider or configurable option
        // You might want to make this configurable in your app
        const networks = {
          mainnet: 'https://eth-mainnet.alchemyapi.io/v2/your-api-key',
          goerli: 'https://eth-goerli.alchemyapi.io/v2/your-api-key',
          sepolia: 'https://eth-sepolia.alchemyapi.io/v2/your-api-key',
          // Add more networks as needed
        };
        
        // Get network from context or state
        const currentNetwork = getCurrentNetwork(); // Implement this function
        provider = new ethers.providers.JsonRpcProvider(networks[currentNetwork]);
      }
  
      // Check if provider supports debug namespace
      const supportedMethods = await checkProviderSupport(provider);
      
      if (supportedMethods.includes('debug_traceTransaction')) {
        // Direct debug trace
        const trace = await provider.send('debug_traceTransaction', [
          hash, 
          { 
            tracer: 'callTracer',
            disableStorage: false,
            disableMemory: false,
            enableReturnData: true,
            useGeneratedSources
          }
        ]);
        
        return trace;
      } else {
        // Fallback to your backend API if direct tracing isn't supported
        const response = await fetch(`/api/debug?hash=${hash}&useGeneratedSources=${useGeneratedSources}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch transaction trace: ${response.statusText}`);
        }
        
        return await response.json();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch transaction trace');
      throw err;
    }
  };
  
  // Helper function to check provider capabilities
  const checkProviderSupport = async (provider) => {
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
  
  // Helper to get current network from context/state
  const getCurrentNetwork = () => {
    // Implement based on your app's state management
    // Could be reading from context, Redux, or local storage
    return localStorage.getItem('selectedNetwork') || 'mainnet';
  };

  // Process the trace data at a specific step
  // Process the trace data at a specific step
const processTraceAtStep = (trace: any[], step: number): DebuggerState => {
  if (!trace || step >= trace.length) {
    throw new Error('Invalid step or trace data');
  }
  
  const traceStep = trace[step];
  
  // Extract call stack information
  const callStack = extractCallStack(traceStep);
  
  // Extract variables from the trace step
  const { localVariables, stateVariables } = extractVariables(traceStep);
  
  // Extract memory and storage information
  const memory = extractMemory(traceStep);
  const storage = extractStorage(traceStep);
  
  // Extract opcode information
  const opcodes = extractOpcodes(traceStep);
  
  return {
    callStack,
    localVariables,
    stateVariables,
    memory,
    storage,
    opcodes
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
      setError(null);
      setIsDebugging(true);
      setTxHash(hash);
      
      const trace = await fetchTransactionTrace(hash, useGeneratedSources);
      
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
    const event = new CustomEvent('debugger:clear');
    window.dispatchEvent(event);
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