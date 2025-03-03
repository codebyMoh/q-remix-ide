// import React, { useState, useEffect } from 'react';
// import { DebuggerService } from '../../../backend/src/services/debugger/debuggerService';

// interface DebuggerUIProps {
//   debuggerService: DebuggerService;
//   txHash?: string;
//   onClose: () => void;
// }

// interface DebuggerState {
//   sourceLocation: any;
//   callStack: any[];
//   localVariables: any[];
//   stateVariables: any[];
//   memory: any;
//   stack: any[];
//   storage: any;
//   currentStep: number;
//   totalSteps: number;
//   isLoading: boolean;
//   error: string | null;
// }

// const initialState: DebuggerState = {
//   sourceLocation: null,
//   callStack: [],
//   localVariables: [],
//   stateVariables: [],
//   memory: null,
//   stack: [],
//   storage: null,
//   currentStep: 0,
//   totalSteps: 0,
//   isLoading: true,
//   error: null
// };

// export const DebuggerUI: React.FC<DebuggerUIProps> = ({ 
//   debuggerService, 
//   txHash,
//   onClose 
// }) => {
//   const [state, setState] = useState<DebuggerState>(initialState);
//   const [isInitialized, setIsInitialized] = useState<boolean>(false);
//   const [transactionHash, setTransactionHash] = useState<string>(txHash || '');

//   // Initialize debugger with transaction hash
//   const initializeDebugger = async (hash: string) => {
//     setState(prev => ({ ...prev, isLoading: true, error: null }));
//     try {
//       const success = await debuggerService.debug(hash);
//       if (success) {
//         setIsInitialized(true);
//         updateState();
//       } else {
//         setState(prev => ({ 
//           ...prev, 
//           isLoading: false, 
//           error: 'Failed to initialize debugger' 
//         }));
//       }
//     } catch (error) {
//       setState(prev => ({ 
//         ...prev, 
//         isLoading: false, 
//         error: error instanceof Error ? error.message : 'Unknown error' 
//       }));
//     }
//   };

//   // Update state from debugger service
//   const updateState = async () => {
//     const currentState = await debuggerService.getCurrentState();
//     if (currentState) {
//       setState({
//         sourceLocation: currentState.sourceLocation,
//         callStack: currentState.callStack || [],
//         localVariables: currentState.localVariables || [],
//         stateVariables: currentState.stateVariables || [],
//         memory: currentState.memory,
//         stack: currentState.stack || [],
//         storage: currentState.storage,
//         currentStep: currentState.currentStep,
//         totalSteps: currentState.totalSteps,
//         isLoading: false,
//         error: null
//       });
//     } else {
//       setState(prev => ({ 
//         ...prev, 
//         isLoading: false, 
//         error: 'Failed to get current state' 
//       }));
//     }
//   };

//   // Navigation controls
//   const handleStepInto = async () => {
//     await debuggerService.stepInto();
//     updateState();
//   };

//   const handleStepOver = async () => {
//     await debuggerService.stepOver();
//     updateState();
//   };

//   const handleStepBack = async () => {
//     await debuggerService.stepBack();
//     updateState();
//   };

//   const handleReset = async () => {
//     await debuggerService.reset();
//     updateState();
//   };

//   const handleContinueToEnd = async () => {
//     await debuggerService.continueToEnd();
//     updateState();
//   };

//   // Initialize with transaction hash if provided
//   useEffect(() => {
//     if (txHash) {
//       setTransactionHash(txHash);
//       initializeDebugger(txHash);
//     }
    
//     // Cleanup on unmount
//     return () => {
//       debuggerService.destroy();
//     };
//   }, [txHash]);

//   // Handle transaction hash input
//   const handleTxHashSubmit = (e: React.FormEvent) => {
//     e.preventDefault();
//     if (transactionHash) {
//       initializeDebugger(transactionHash);
//     }
//   };

//   return (
//     <div className="debugger-container">
//       <div className="debugger-header">
//         <h2>Transaction Debugger</h2>
//         <button onClick={onClose} className="close-btn">×</button>
//       </div>
      
//       {!isInitialized ? (
//         <form onSubmit={handleTxHashSubmit} className="transaction-form">
//           <input
//             type="text"
//             value={transactionHash}
//             onChange={(e) => setTransactionHash(e.target.value)}
//             placeholder="Enter transaction hash"
//             className="tx-hash-input"
//           />
//           <button type="submit" className="debug-btn">Debug</button>
//         </form>
//       ) : (
//         <>
//           {state.isLoading ? (
//             <div className="loading">Loading debugger...</div>
//           ) : state.error ? (
//             <div className="error">{state.error}</div>
//           ) : (
//             <div className="debugger-content">
//               {/* Navigation Controls */}
//               <div className="debugger-controls">
//                 <button onClick={handleReset}>Reset</button>
//                 <button onClick={handleStepBack}>Step Back</button>
//                 <button onClick={handleStepInto}>Step Into</button>
//                 <button onClick={handleStepOver}>Step Over</button>
//                 <button onClick={handleContinueToEnd}>Continue to End</button>
//                 <span className="step-counter">
//                   Step {state.currentStep + 1} of {state.totalSteps}
//                 </span>
//               </div>
              
//               {/* Source Code Display */}
//               <div className="source-code-panel">
//                 <h3>Source Location</h3>
//                 {state.sourceLocation ? (
//                   <div>
//                     <p>File: {state.sourceLocation.file}</p>
//                     <p>Line: {state.sourceLocation.lineNumber}</p>
//                     <p>Column: {state.sourceLocation.column}</p>
//                     {/* Here you would display the actual source code with highlighting */}
//                   </div>
//                 ) : (
//                   <p>No source location available</p>
//                 )}
//               </div>
              
//               {/* Debug Information Panels */}
//               <div className="debug-panels">
//                 {/* Call Stack */}
//                 <div className="panel">
//                   <h3>Call Stack</h3>
//                   <ul>
//                     {state.callStack.map((call, index) => (
//                       <li key={index}>{call.functionName || `<anonymous function>`}</li>
//                     ))}
//                   </ul>
//                 </div>
                
//                 {/* Local Variables */}
//                 <div className="panel">
//                   <h3>Local Variables</h3>
//                   {state.localVariables.length > 0 ? (
//                     <ul>
//                       {state.localVariables.map((variable, index) => (
//                         <li key={index}>
//                           {variable.name}: {variable.value} ({variable.type})
//                         </li>
//                       ))}
//                     </ul>
//                   ) : (
//                     <p>No local variables</p>
//                   )}
//                 </div>
                
//                 {/* State Variables */}
//                 <div className="panel">
//                   <h3>State Variables</h3>
//                   {state.stateVariables.length > 0 ? (
//                     <ul>
//                       {state.stateVariables.map((variable, index) => (
//                         <li key={index}>
//                           {variable.name}: {variable.value} ({variable.type})
//                         </li>
//                       ))}
//                     </ul>
//                   ) : (
//                     <p>No state variables</p>
//                   )}
//                 </div>
                
//                 {/* Stack */}
//                 <div className="panel">
//                   <h3>Stack</h3>
//                   {state.stack.length > 0 ? (
//                     <ul>
//                       {state.stack.map((item, index) => (
//                         <li key={index}>{item}</li>
//                       ))}
//                     </ul>
//                   ) : (
//                     <p>Stack is empty</p>
//                   )}
//                 </div>
                
//                 {/* Memory */}
//                 <div className="panel">
//                   <h3>Memory</h3>
//                   {state.memory ? (
//                     <pre>{JSON.stringify(state.memory, null, 2)}</pre>
//                   ) : (
//                     <p>No memory data</p>
//                   )}
//                 </div>
                
//                 {/* Storage */}
//                 <div className="panel">
//                   <h3>Storage</h3>
//                   {state.storage ? (
//                     <pre>{JSON.stringify(state.storage, null, 2)}</pre>
//                   ) : (
//                     <p>No storage data</p>
//                   )}
//                 </div>
//               </div>
//             </div>
//           )}
//         </>
//       )}
//     </div>
//   );
// };
"use client";
import React, { useRef, useEffect } from "react";
import { Urbanist } from "next/font/google";
import { useDebugger } from "../context/DebuggerContext";
import { GreenTick, RightArrow, DownArrow, Bug, StepForward, StepBack, StepInto, StepOut, Breakpoint } from "../assets/index";

const urbanist = Urbanist({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const Debugger = () => {
  const {
    isDebugging,
    currentStep,
    totalSteps,
    currentState,
    debugTransaction,
    stepBack,
    stepForward,
    stepInto,
    stepOut,
    jumpToBreakpoint,
    stopDebugging,
    setStep,
    error
  } = useDebugger();

  const [isExpanded, setIsExpanded] = React.useState(true);
  const [txHash, setTxHash] = React.useState("");
  const [showSources, setShowSources] = React.useState(false);
  const [activePanel, setActivePanel] = React.useState("stack");
  const slideRef = useRef<HTMLInputElement>(null);

  // Update slider when currentStep changes
  useEffect(() => {
    if (slideRef.current) {
      slideRef.current.value = currentStep.toString();
    }
  }, [currentStep]);

  // Derive UI data from currentState
  const stackData = currentState?.callStack?.map((call: any) => ({
    function: call.functionName,
    source: `${call.sourceLocation?.file}:${call.sourceLocation?.start}`
  })) || [];

  const localsData = currentState?.localVariables?.map((variable: any) => ({
    name: variable.name,
    type: variable.type,
    value: variable.value
  })) || [];

  const stateData = currentState?.stateVariables?.map((variable: any) => ({
    name: variable.name,
    type: variable.type,
    value: variable.value
  })) || [];

  // Mock breakpoints data - in a real app, you'd track these
  const breakpointsData = [
    { line: 12, file: "Contract.sol" },
    { line: 45, file: "Contract.sol" }
  ];

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const startDebugging = async () => {
    if (txHash.trim() !== "") {
      await debugTransaction(txHash, showSources);
    }
  };

  const handleStep = async (action: string) => {
    switch (action) {
      case "stepBack":
        await stepBack();
        break;
      case "stepForward":
        await stepForward();
        break;
      case "stepInto":
        await stepInto();
        break;
      case "stepOut":
        await stepOut();
        break;
      case "prevBreakpoint":
        // For simplicity, using a fixed step jump
        await setStep(Math.max(0, currentStep - 10));
        break;
      case "nextBreakpoint":
        // For simplicity, using a fixed step jump
        await setStep(Math.min(totalSteps, currentStep + 10));
        break;
      default:
        break;
    }
  };

  const handleSliderChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const step = parseInt(e.target.value);
    await setStep(step);
  };

  return (
    <div className="relative flex">
      {/* Sidebar */}
      <div
        className={`${
          isExpanded ? "w-80 px-4" : "w-0 px-0"
        } bg-white flex flex-col border-[#DEDEDE] py-4 transition-all duration-300 overflow-hidden ${
          urbanist.className
        }`}
      >
        {/* Debugger Header */}
        <div className="mb-2 flex items-center justify-between">
          <span className={`${isExpanded ? "opacity-100" : "opacity-0"} font-medium`}>
            DEBUGGER
          </span>
          <div className="flex items-center gap-2">
            {isDebugging && (
              <Bug
                className={`w-5 h-5 text-green-500 transition-opacity ${
                  isExpanded ? "opacity-100" : "opacity-0"
                }`}
              />
            )}
            {/* Toggle Button */}
            <button onClick={toggleExpanded} className="transition-all">
              <RightArrow
                className={`w-5 h-5 text-gray-500 transition-transform ${
                  isExpanded ? "rotate-180" : "rotate-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Debugger Content */}
        {isExpanded && (
          <div className="flex flex-col gap-2 mt-1">
            {/* Error message display */}
            {error && (
              <div className="bg-red-100 text-red-700 p-2 text-sm rounded mb-2">
                {error}
              </div>
            )}

            {/* Transaction Hash Input */}
            {!isDebugging ? (
              <div className="flex flex-col gap-3">
                <div className="text-gray-600 text-sm">Transaction Hash</div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={txHash}
                    onChange={(e) => setTxHash(e.target.value)}
                    placeholder="Enter transaction hash..."
                    className="flex-1 border p-2 rounded text-sm"
                  />
                  <button
                    onClick={startDebugging}
                    className="border p-2 rounded bg-black text-white text-sm"
                  >
                    Debug
                  </button>
                </div>
                <div className="mt-3">
                  <label className="flex items-center text-[13px] mb-3">
                    <input
                      type="checkbox"
                      className="accent-black"
                      checked={showSources}
                      onChange={() => setShowSources(!showSources)}
                    />
                    <span className="pl-2">Use generated sources</span>
                  </label>

                  <div className="text-gray-600 text-sm mt-2">
                    Debug a transaction from the deployed contracts or start debugging
                    with the currently loaded transaction.
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {/* Navigation Controls */}
                <div className="flex flex-col gap-1">
                  <div className="text-gray-600 text-sm">Current transaction</div>
                  <div className="text-sm font-medium overflow-hidden text-ellipsis">
                    {txHash}
                  </div>

                  {/* Slider & Step counter */}
                  <div className="mt-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span>
                        Step {currentStep} of {totalSteps}
                      </span>
                      <button onClick={stopDebugging} className="text-red-500">
                        Stop Debugging
                      </button>
                    </div>
                    <input
                      ref={slideRef}
                      type="range"
                      min="0"
                      max={totalSteps}
                      value={currentStep}
                      onChange={handleSliderChange}
                      className="w-full"
                    />
                  </div>

                  {/* Navigation Buttons */}
                  <div className="flex justify-between mt-2">
                    <button
                      onClick={() => handleStep("stepBack")}
                      className="border p-1 rounded bg-gray-100 hover:bg-gray-200"
                      title="Step back"
                    >
                      <StepBack className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleStep("prevBreakpoint")}
                      className="border p-1 rounded bg-gray-100 hover:bg-gray-200"
                      title="Jump to previous breakpoint"
                    >
                      <Breakpoint className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleStep("stepInto")}
                      className="border p-1 rounded bg-gray-100 hover:bg-gray-200"
                      title="Step into"
                    >
                      <StepInto className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleStep("stepOut")}
                      className="border p-1 rounded bg-gray-100 hover:bg-gray-200"
                      title="Step out"
                    >
                      <StepOut className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleStep("nextBreakpoint")}
                      className="border p-1 rounded bg-gray-100 hover:bg-gray-200"
                      title="Jump to next breakpoint"
                    >
                      <Breakpoint className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleStep("stepForward")}
                      className="border p-1 rounded bg-gray-100 hover:bg-gray-200"
                      title="Step forward"
                    >
                      <StepForward className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {/* Panel Tabs */}
                <div className="mt-4">
                  <div className="flex border-b">
                    <button
                      className={`py-2 px-3 text-xs font-medium ${
                        activePanel === "stack" ? "border-b-2 border-black" : ""
                      }`}
                      onClick={() => setActivePanel("stack")}
                    >
                      Function Stack
                    </button>
                    <button
                      className={`py-2 px-3 text-xs font-medium ${
                        activePanel === "locals" ? "border-b-2 border-black" : ""
                      }`}
                      onClick={() => setActivePanel("locals")}
                    >
                      Solidity Locals
                    </button>
                    <button
                      className={`py-2 px-3 text-xs font-medium ${
                        activePanel === "state" ? "border-b-2 border-black" : ""
                      }`}
                      onClick={() => setActivePanel("state")}
                    >
                      Solidity State
                    </button>
                  </div>

                  {/* Panel Content */}
                  <div className="mt-3 max-h-60 overflow-auto">
                    {activePanel === "stack" && (
                      <div className="flex flex-col gap-1">
                        {stackData.length > 0 ? (
                          stackData.map((item: any, index: number) => (
                            <div key={index} className="text-xs border-b py-2">
                              <div className="font-medium">{item.function || "Unknown function"}</div>
                              <div className="text-gray-500">@{item.source || "Unknown location"}</div>
                            </div>
                          ))
                        ) : (
                          <div className="text-xs text-gray-500 py-2">No function calls in current step</div>
                        )}
                      </div>
                    )}

                    {activePanel === "locals" && (
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="py-1 px-2 text-left">Name</th>
                            <th className="py-1 px-2 text-left">Type</th>
                            <th className="py-1 px-2 text-left">Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {localsData.length > 0 ? (
                            localsData.map((item: any, index: number) => (
                              <tr key={index}>
                                <td className="py-1 px-2">{item.name}</td>
                                <td className="py-1 px-2">{item.type}</td>
                                <td className="py-1 px-2">{item.value}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={3} className="py-1 px-2 text-gray-500">
                                No local variables in current step
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    )}

                    {activePanel === "state" && (
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="py-1 px-2 text-left">Name</th>
                            <th className="py-1 px-2 text-left">Type</th>
                            <th className="py-1 px-2 text-left">Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stateData.length > 0 ? (
                            stateData.map((item: any, index: number) => (
                              <tr key={index} className="border-b">
                                <td className="py-1 px-2">{item.name}</td>
                                <td className="py-1 px-2 text-gray-500">{item.type}</td>
                                <td className="py-1 px-2 font-mono">{item.value}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={3} className="py-1 px-2 text-gray-500">
                                No state variables in current step
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                {/* Additional Panels Toggle */}
                <div className="mt-4">
                  <div className="flex justify-between items-center">
                    <div className="text-sm font-medium">Other Panels</div>
                    <DownArrow className="cursor-pointer w-4 h-4" />
                  </div>
                  <div className="mt-2 text-xs text-gray-600">
                    Opcodes, Step Details, Memory, Storage, Call Data, etc.
                  </div>
                </div>
                
                {/* Breakpoints Section */}
                <div className="mt-4">
                  <div className="flex justify-between items-center">
                    <div className="text-sm font-medium">Breakpoints</div>
                    <DownArrow className="cursor-pointer w-4 h-4" />
                  </div>
                  <div className="mt-2">
                    {breakpointsData.map((bp, index) => (
                      <div key={index} className="flex justify-between text-xs py-1 border-b">
                        <span>{bp.file}:{bp.line}</span>
                        <button className="text-red-500">Remove</button>
                      </div>
                    ))}
                  </div>
                </div>
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

export default Debugger;