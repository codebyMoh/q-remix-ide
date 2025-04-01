// "use client";
// import React from "react";

// const DeployRun = () => {
//   return (
//     <div className="p-4 space-y-4">
//       {/* 1. Environment Box */}
//       <div className="p-4 border border-gray-300 rounded-lg">
//         <h2 className="text-lg font-semibold mb-2">Environment</h2>
//         <p className="text-sm text-gray-600">Injected Provider</p>
//       </div>

//       {/* 2. Account Info Box */}
//       <div className="p-4 border border-gray-300 rounded-lg">
//         <h2 className="text-lg font-semibold mb-2">Account</h2>
//         <p className="text-sm text-gray-600">
//           Address: 0x0000000000000000000000000000000000000000
//         </p>
//         <p className="text-sm text-gray-600">Balance: 0.00 ETH</p>
//       </div>

//       {/* 3. Compiled Contracts Box */}
//       <div className="p-4 border border-gray-300 rounded-lg">
//         <h2 className="text-lg font-semibold mb-2">Compiled Contracts</h2>
//         <p className="text-sm text-gray-600">No contracts compiled yet.</p>
//       </div>

//       {/* 4. Deployed Contracts Box */}
//       <div className="p-4 border border-gray-300 rounded-lg">
//         <h2 className="text-lg font-semibold mb-2">Deployed Contracts</h2>
//         <p className="text-sm text-gray-600">No deployed contracts.</p>
//       </div>
//     </div>
//   );
// };

// export default DeployRun;
"use client";
import React, { useState, useRef } from "react";
import { Urbanist } from "next/font/google";

const urbanist = Urbanist({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const DeployRun = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [environment, setEnvironment] = useState("remixVM");
  const [account, setAccount] = useState("0xCA35b7d915458EF540aDe6068dFe2F44E8fa733c");
  const [gasLimit, setGasLimit] = useState("3000000");
  const [value, setValue] = useState("0");
  const [valueUnit, setValueUnit] = useState("wei");
  const [selectedContract, setSelectedContract] = useState("Ballot");
  const [deployedContracts, setDeployedContracts] = useState([
    {
      name: "Ballot",
      address: "0x692a70d2e424a56d2c6c27aa97d1a86395877b3a",
      functions: [
        { name: "vote", payable: false, inputs: [{ name: "proposal", type: "uint256" }] },
        { name: "delegate", payable: false, inputs: [{ name: "to", type: "address" }] },
        { name: "winningProposal", payable: false, inputs: [], outputs: [{ name: "", type: "uint256" }] },
        { name: "sendEther", payable: true, inputs: [] }
      ]
    }
  ]);
  const [atAddressValue, setAtAddressValue] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [transactionsRecorded, setTransactionsRecorded] = useState(0);

  // Mock accounts for the Remix VM
  const accounts = [
    "0xCA35b7d915458EF540aDe6068dFe2F44E8fa733c",
    "0x14723A09ACff6D2A60DcdF7aA4AFf308FDDC160C",
    "0x4B0897b0513fdC7C541B6d9D7E929C4e5364D2dB",
    "0x583031D1113aD414F02576BD6afaBfb302140225",
    "0xdD870fA1b7C4700F2BD7f44238821C26f7392148"
  ];

  // Mock environments available in Remix
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
    { id: "foundry", name: "Dev - Foundry Provider" }
  ];

  // Mock contracts available to deploy
  const availableContracts = [
    { name: "Ballot", constructorParams: [{ name: "proposals", type: "bytes32[]" }] },
    { name: "ERC20", constructorParams: [{ name: "name", type: "string" }, { name: "symbol", type: "string" }] },
    { name: "Storage", constructorParams: [] }
  ];

  // Value units for the value input
  const valueUnits = ["wei", "gwei", "finney", "ether"];

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const deployContract = () => {
    // Mock deployment
    const newContract = {
      name: selectedContract,
      address: "0x" + Math.floor(Math.random() * 16777215).toString(16).padStart(40, '0'),
      functions: availableContracts.find(c => c.name === selectedContract)?.name === "Ballot" 
        ? [
            { name: "vote", payable: false, inputs: [{ name: "proposal", type: "uint256" }] },
            { name: "delegate", payable: false, inputs: [{ name: "to", type: "address" }] },
            { name: "winningProposal", payable: false, inputs: [], outputs: [{ name: "", type: "uint256" }] },
            { name: "sendEther", payable: true, inputs: [] }
          ]
        : [
            { name: "set", payable: false, inputs: [{ name: "x", type: "uint256" }] },
            { name: "get", payable: false, inputs: [], outputs: [{ name: "", type: "uint256" }] }
          ]
    };
    
    setDeployedContracts([...deployedContracts, newContract]);
    if (isRecording) {
      setTransactionsRecorded(transactionsRecorded + 1);
    }
  };

  const accessAtAddress = () => {
    if (!atAddressValue) return;
    
    // Mock accessing contract at address
    const newContract = {
      name: selectedContract,
      address: atAddressValue,
      functions: availableContracts.find(c => c.name === selectedContract)?.name === "Ballot" 
        ? [
            { name: "vote", payable: false, inputs: [{ name: "proposal", type: "uint256" }] },
            { name: "delegate", payable: false, inputs: [{ name: "to", type: "address" }] },
            { name: "winningProposal", payable: false, inputs: [], outputs: [{ name: "", type: "uint256" }] },
            { name: "sendEther", payable: true, inputs: [] }
          ]
        : [
            { name: "set", payable: false, inputs: [{ name: "x", type: "uint256" }] },
            { name: "get", payable: false, inputs: [], outputs: [{ name: "", type: "uint256" }] }
          ]
    };
    
    setDeployedContracts([...deployedContracts, newContract]);
    setAtAddressValue("");
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

  return (
    <div className="relative flex">
      {/* Sidebar */}
      <div
        className={`${
          isExpanded ? "w-80 px-4" : "w-0 px-0"
        } bg-white flex flex-col py-4 transition-all duration-300 overflow-hidden ${
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
              {environment === "external" && (
                <input
                  type="text"
                  placeholder="http://127.0.0.1:8545"
                  className="border p-2 rounded text-sm mt-1"
                />
              )}
            </div>

            {/* Account Selector */}
            <div className="flex flex-col gap-1 mt-3">
              <div className="text-gray-600 text-xs">ACCOUNT</div>
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
                onChange={(e) => setSelectedContract(e.target.value)}
                className="border p-2 rounded text-sm"
              >
                {availableContracts.map((contract) => (
                  <option key={contract.name} value={contract.name}>
                    {contract.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Deploy & At Address Buttons */}
            <div className="flex gap-2 mt-4">
              <button
                onClick={deployContract}
                className="flex-1 bg-blue-600 text-white p-2 rounded text-sm hover:bg-blue-700"
              >
                Deploy
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
                className="bg-gray-200 p-2 rounded text-sm hover:bg-gray-300 whitespace-nowrap"
              >
                At Address
              </button>
            </div>

            {/* Constructor Parameters */}
            {selectedContract && availableContracts.find(c => c.name === selectedContract)?.constructorParams.length > 0 && (
              <div className="mt-3">
                <div className="text-gray-600 text-xs">CONSTRUCTOR PARAMETERS</div>
                {availableContracts.find(c => c.name === selectedContract)?.constructorParams.map((param, idx) => (
                  <div key={idx} className="flex flex-col mt-1">
                    <label className="text-xs text-gray-600">{param.name} ({param.type})</label>
                    <input
                      type="text"
                      placeholder={param.type === "bytes32[]" ? '["0x1234", "0x5678"]' : param.type === "string" ? "My Token" : ""}
                      className="border p-2 rounded text-sm mt-1"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Recorder */}
            <div className="mt-6 p-3 bg-gray-50 rounded">
              <div className="flex justify-between items-center">
                <div className="text-sm font-medium">Transactions Recorded: {transactionsRecorded}</div>
                <div className="flex gap-2">
                  <button
                    onClick={toggleRecording}
                    className={`p-1 rounded ${isRecording ? "bg-red-100 text-red-600" : "bg-gray-200"}`}
                    title={isRecording ? "Stop recording" : "Start recording"}
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
                    disabled={transactionsRecorded === 0}
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
                  />
                  <span className="pl-2">Run with last compilation result</span>
                </label>
              </div>
            </div>

            {/* Deployed Contracts */}
            <div className="mt-4">
              <div className="flex justify-between items-center">
                <div className="text-sm font-medium">DEPLOYED CONTRACTS</div>
                {deployedContracts.length > 0 && (
                  <button
                    onClick={clearDeployedContracts}
                    className="text-red-500 text-xs"
                  >
                    Clear
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
                {deployedContracts.length === 0 && (
                  <div className="text-sm text-gray-500">No contracts deployed yet</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Show Arrow When Collapsed */}
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

export default DeployRun;