"use client";
import React, { useState, useRef } from "react";
import { Urbanist } from "next/font/google";

import {
  GreenTick,
  RightArrow,
  DownArrow,
  Bug,
  StepForward,
  StepBack,
  StepOut,
  Breakpoint,
} from "../assets/index";
const urbanist = Urbanist({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const Debugger = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [txHash, setTxHash] = useState("");
  const [isDebugging, setIsDebugging] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [activePanel, setActivePanel] = useState("stack");
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(100);
  const slideRef = useRef<HTMLInputElement>(null);

  const mockStackData = [
    { function: "Contract.transfer(address,uint256)", source: "0:12" },
    { function: "ERC20._transfer(address,address,uint256", source: "0:45" },
  ];

  const mockLocalsData = [
    { name: "from", type: "address", value: "0x123...789" },
    { name: "to", type: "address", value: "0xabc...def" },
    { name: "amount", type: "uint256", value: "100000000000000" },
  ];

  const mockStateData = [
    { name: "totalSupply", type: "uint256", value: "1000000000000000" },
    { name: "balances", type: "mapping(address=>uint256)", value: "{...}" },
    {
      name: "allowances",
      type: "mapping(address=>mapping(address=>uint256))",
      value: "{...}",
    },
  ];

  const mockBreakpoints = [
    { line: 12, file: "Contract.sol" },
    { line: 45, file: "Contract.sol" },
  ];

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const startDebugging = () => {
    if (txHash.trim() != "") {
      setIsDebugging(true);
    }
  };

  const stopDebugging = () => {
    setIsDebugging(false);
  };

  const handleStep = (action: string) => {
    switch (action) {
      case "stepBack":
        setCurrentStep(Math.max(0, currentStep - 1));
        break;
      case "stepForward":
        setCurrentStep(Math.min(totalSteps, currentStep + 1));
        break;
      case "stepInto":
        setCurrentStep(currentStep + 1);
        break;
      case "stepOut":
        setCurrentStep(currentStep + 5);
        break;
      case "prevBreakpoint":
        setCurrentStep(Math.max(0, currentStep - 10));
        break;
      case "nextBreakpoint":
        setCurrentStep(Math.min(totalSteps, currentStep + 10));
        break;
      default:
        break;
    }

    if (slideRef.current) {
      slideRef.current.value = currentStep.toString();
    }
  };

  return (
    <div className="relative flex  h-full">
      {/*Sidebar*/}
      <div
        className={`${
          isExpanded ? "w-80 px-4" : "w-0 px-0"
        } bg-white flex flex-col border-[#DEDEDE]  transition-all duration-300 overflow-hidden ${
          urbanist.className
        }`}
      >
        {/*Debugger Header*/}
        <div className="mb-2 flex items-center justify-between h-[3rem] flex-shrink-0">
          <span
            className={`${
              isExpanded ? "opacity-100" : "opacity-0"
            } font-medium`}
          >
            Debugger
          </span>
          <div className="flex items-center gap-2">
            {isDebugging && (
              <Bug
                className={`w-5 h-5 text-green-500 transition-opacity ${
                  isExpanded ? "opacity-100" : "opacity-0"
                }`}
              />
            )}
            {/*Toggle Button*/}
            <GreenTick
              className={`w-5 h-5 text-green-500 transition-opacity ${
                isExpanded ? "opacity-100" : "opacity-0"
              }`}
            />
            <button onClick={toggleExpanded} className="transition-all">
              <RightArrow
                className={`w-5 h-5 text-gray-500 mb-[2px] transition-transform ${
                  isExpanded ? "rotate-180" : "rotate-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Debugger Content*/}
        {isExpanded && (
          <div className="flex flex-col gap-2 mt-1">
            {/*Transaction Hash Input*/}
            {!isDebugging ? (
              <div className="flex flex-col gap-1">
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
                    className="border p-2 rounded bg-[#CE192D] text-white text-sm"
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
                    Debug a transaction from the deployed contracts or start
                    isDebugging with the currently loaded transaction.
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {/*Navigation Controls*/}
                <div className="flex flex-col gap-1">
                  <div className="text-gray-600 text-sm">
                    Current transaction
                  </div>
                  <div className="text-sm font-medium overflow-hidden text-ellipsis">
                    {txHash}
                  </div>

                  {/*Slider & Step counter*/}
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
                      onChange={(e) => setCurrentStep(parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  {/*Navigation Buttons*/}
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
                      title="Jump out"
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
                {/*Panel Tabs*/}
                <div className="mt-4">
                  <div className="flex border-b">
                    <button
                      className={`py-2 px-3 text-xs font-medium ${
                        activePanel === "stack" ? "border b-2 border-black" : ""
                      }`}
                      onClick={() => setActivePanel("stack")}
                    >
                      Function Stack
                    </button>
                    <button
                      className={`py-2 px-3 text-xs font-medium ${
                        activePanel === "locals"
                          ? "border-b-2 border-black"
                          : ""
                      }`}
                      onClick={() => setActivePanel("locals")}
                    >
                      Solidity Locals
                    </button>
                    <button
                      className={`py-2 px-3 text-xs font-medium ${
                        activePanel === "state" ? "border-b-2 border-black" : ""
                      }`}
                    >
                      Solidity State
                    </button>
                  </div>

                  {/*Panel Content*/}
                  <div className="mt-3 max-h-60 overflow-auto">
                    {activePanel === "stack" && (
                      <div className="flex flex-col gap-1">
                        {mockStackData.map((item, index) => (
                          <div key={index} className="text-xs border-b py-2">
                            <div className="font-medium">{item.function}</div>
                            <div className="text-gray-500">@{item.source}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {activePanel === "locals" && (
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="py-1 px-2 text-left"></th>
                            <th className="py-1 px-2 text-left"></th>
                            <th className="py-1 px-2 text-left"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {mockLocalsData.map((item, index) => (
                            <tr key={index}>
                              <td className="py-1 px-2">{item.name}</td>
                              <td className="py-1 px-2">{item.type}</td>
                              <td className="py-1 px-2">{item.value}</td>
                            </tr>
                          ))}
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
                          {mockStateData.map((item, index) => (
                            <tr key={index} className="border-b">
                              <td className="py-1 px-2">{item.name}</td>
                              <td className="py-1 px-2 text-gray-500">
                                {item.type}
                              </td>
                              <td className="py-1 px-2 font-mono">
                                {item.value}
                              </td>
                            </tr>
                          ))}
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
                    {mockBreakpoints.map((bp, index) => (
                      <div
                        key={index}
                        className="flex justify-between text-xs py-1 border-b"
                      >
                        <span>
                          {bp.file}:{bp.line}
                        </span>
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
