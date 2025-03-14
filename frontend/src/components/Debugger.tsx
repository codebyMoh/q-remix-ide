"use client";
import React, { useRef, useEffect, useCallback } from "react";
import { Urbanist } from "next/font/google";
import { useDebugger } from "../context/DebuggerContext";
import { useEditor } from "../context/EditorContext";
import SourceCodeViewer from "./SourceCodeViewer";

// Assuming you have these icons in your assets folder
import { GreenTick, RightArrow, DownArrow, Bug, StepForward, StepBack, StepInto, StepOut, Breakpoint } from "../assets/index";

const urbanist = Urbanist({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

// Using the correct Breakpoint type
type BreakpointType = {
  line: number;
  file: string;
  // Other potential properties can be added here
};

const Debugger = () => {
  const {
    isDebugging,
    currentStep,
    totalSteps,
    currentState,
    breakpoints,
    debugTransaction,
    stepBack,
    stepForward,
    stepInto,
    stepOut,
    jumpToBreakpoint,
    stopDebugging,
    setStep,
    addBreakpoint,
    removeBreakpoint,
    error
  } = useDebugger();

  const { highlightCode } = useEditor();

  const [isExpanded, setIsExpanded] = React.useState(true);
  const [txHash, setTxHash] = React.useState("");
  const [showSources, setShowSources] = React.useState(false);
  const [activePanel, setActivePanel] = React.useState("stack");
  const slideRef = useRef<HTMLInputElement>(null);

  const handleDebugStep = useCallback((data: { file: string, line: number }) => {
    highlightCode(data.file, data.line);
  }, [highlightCode]);

  const handleHighlightRequest = useCallback((file: string, line: number, end?: number) => {
    highlightCode(file, line, end);
  }, [highlightCode]);

  // Update slider when currentStep changes
  useEffect(() => {
    if (slideRef.current) {
      slideRef.current.value = currentStep.toString();
    }
  }, [currentStep]);

  // Derive UI data from currentState
  const stackData = currentState?.callStack || [];
  const localsData = currentState?.localVariables || [];
  const stateData = currentState?.stateVariables || [];
  const memoryData = currentState?.memory || [];
  const storageData = currentState?.storage || {};
  const opcodeData = currentState?.opcodes;

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
        await jumpToBreakpoint(false);
        break;
      case "nextBreakpoint":
        await jumpToBreakpoint(true);
        break;
      default:
        break;
    }
  };

  const handleSliderChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const step = parseInt(e.target.value);
    await setStep(step);
  };

  // Updated to use the correct breakpoint structure
  const handleAddBreakpoint = () => {
    if (currentState?.callStack && currentState.callStack.length > 0) {
      const topCall = currentState.callStack[currentState.callStack.length - 1];
      if (topCall.sourceLocation) {
        const newBreakpoint: BreakpointType = {
          line: topCall.sourceLocation.start,
          file: topCall.sourceLocation.file
        };
        addBreakpoint(newBreakpoint);
      }
    }
  };
  
  const handleRemoveBreakpoint = (index: number) => {
    removeBreakpoint(index);
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
                      disabled={currentStep === 0}
                    >
                      <StepBack className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleStep("prevBreakpoint")}
                      className="border p-1 rounded bg-gray-100 hover:bg-gray-200"
                      title="Jump to previous breakpoint"
                      disabled={breakpoints.length === 0}
                    >
                      <Breakpoint className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleStep("stepInto")}
                      className="border p-1 rounded bg-gray-100 hover:bg-gray-200"
                      title="Step into"
                      disabled={currentStep === totalSteps}
                    >
                      <StepInto className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleStep("stepOut")}
                      className="border p-1 rounded bg-gray-100 hover:bg-gray-200"
                      title="Step out"
                      disabled={currentStep === totalSteps}
                    >
                      <StepOut className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleStep("nextBreakpoint")}
                      className="border p-1 rounded bg-gray-100 hover:bg-gray-200"
                      title="Jump to next breakpoint"
                      disabled={breakpoints.length === 0}
                    >
                      <Breakpoint className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleStep("stepForward")}
                      className="border p-1 rounded bg-gray-100 hover:bg-gray-200"
                      title="Step forward"
                      disabled={currentStep === totalSteps}
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
                    <button
                      className={`py-2 px-3 text-xs font-medium ${
                        activePanel === "opcodes" ? "border-b-2 border-black" : ""
                      }`}
                      onClick={() => setActivePanel("opcodes")}
                    >
                      Opcodes
                    </button>
                  </div>

                  {/* Panel Content */}
                  <div className="mt-3 max-h-60 overflow-auto">
                    {activePanel === "stack" && (
                      <div className="flex flex-col gap-1">
                        {stackData.length > 0 ? (
                          stackData.map((item, index) => (
                            <div key={index} className="text-xs border-b py-2">
                              <div className="font-medium">{item.functionName || "Unknown function"}</div>
                              <div className="text-gray-500">
                                @{item.sourceLocation ? 
                                  `${item.sourceLocation.file}:${item.sourceLocation.start}` : 
                                  "Unknown location"}
                              </div>
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
                            localsData.map((item, index) => (
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
                            stateData.map((item, index) => (
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

                    {activePanel === "opcodes" && (
                      <div className="flex flex-col gap-2">
                        <div className="text-xs border p-2 rounded">
                          <div className="font-medium">Current Opcode:</div>
                          <div className="text-gray-800 font-mono mt-1">
                            {opcodeData?.current || "N/A"}
                          </div>
                        </div>
                        <div className="text-xs border p-2 rounded">
                          <div className="font-medium">Program Counter:</div>
                          <div className="text-gray-800 font-mono mt-1">
                            {opcodeData?.pc !== undefined ? opcodeData.pc : "N/A"}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Additional Panels Toggle */}
                <div className="mt-4">
                  <details className="group">
                    <summary className="flex justify-between items-center cursor-pointer">
                      <div className="text-sm font-medium">Memory</div>
                      <DownArrow className="w-4 h-4 group-open:rotate-180 transition-transform" />
                    </summary>
                    <div className="mt-2 pl-2">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="py-1 px-2 text-left">Offset</th>
                            <th className="py-1 px-2 text-left">Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {memoryData && memoryData.length > 0 ? (
                            memoryData.map((item, index) => (
                              <tr key={index} className="border-b">
                                <td className="py-1 px-2 font-mono">{item.offset}</td>
                                <td className="py-1 px-2 font-mono">{item.value}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={2} className="py-1 px-2 text-gray-500">
                                No memory data in current step
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </details>
                </div>

                <div className="mt-2">
                  <details className="group">
                    <summary className="flex justify-between items-center cursor-pointer">
                      <div className="text-sm font-medium">Storage</div>
                      <DownArrow className="w-4 h-4 group-open:rotate-180 transition-transform" />
                    </summary>
                    <div className="mt-2 pl-2">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="py-1 px-2 text-left">Slot</th>
                            <th className="py-1 px-2 text-left">Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.keys(storageData).length > 0 ? (
                            Object.entries(storageData).map(([slot, value], index) => (
                              <tr key={index} className="border-b">
                                <td className="py-1 px-2 font-mono">{slot}</td>
                                <td className="py-1 px-2 font-mono">{value as string}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={2} className="py-1 px-2 text-gray-500">
                                No storage data in current step
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </details>
                </div>

                {/* Breakpoints Panel - Updated to use the correct breakpoint structure */}
                <div className="mt-2">
                  <details className="group">
                    <summary className="flex justify-between items-center cursor-pointer">
                      <div className="text-sm font-medium">Breakpoints</div>
                      <DownArrow className="w-4 h-4 group-open:rotate-180 transition-transform" />
                    </summary>
                    <div className="mt-2 pl-2">
                      {breakpoints.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {breakpoints.map((bp, index) => (
                            <div key={index} className="flex justify-between items-center text-xs py-1">
                              <div>
                                Step {bp.step}
                              </div>
                              <button
                                onClick={() => handleRemoveBreakpoint(index)}
                                className="text-red-500 hover:text-red-700"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500 py-2">
                          No breakpoints set. Click 'Add Breakpoint' at the current step to set one.
                        </div>
                      )}
                      
                      <button
                        onClick={handleAddBreakpoint}
                        className="mt-2 w-full border border-black text-black py-1 text-xs hover:bg-gray-100"
                      >
                        Add Breakpoint at Current Step
                      </button>
                    </div>
                  </details>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Content Area - Updated to use SourceCodeViewer */}
<div className="flex-1 bg-gray-50 min-h-screen">
  {isDebugging ? (
    <SourceCodeViewer />
  ) : (
    <div className="h-full flex items-center justify-center">
      <div className="text-gray-400 text-center">
        <Bug className="w-12 h-12 mx-auto mb-4 opacity-30" />
        <p className="text-xl font-medium">Transaction Debugger</p>
        <p className="mt-2 text-sm max-w-md">
          Enter a transaction hash on the left panel to start debugging a deployed 
          contract transaction, or load a transaction first from the transactions panel.
        </p>
      </div>
    </div>
  )}
</div>
    </div>
  );
};

export default Debugger;