"use client";
import React, { useState, useEffect, useRef } from "react";
import { TransactionDetails, terminalOutputService } from "@/services/terminal-output-service";
import { DeployedContract } from "@/types/deployment";

interface TransactionTerminalProps {
  className?: string;
}

interface TransactionOutputEvent {
  contractName: string;
  functionName: string;
  transactionHash: string;
  success: boolean;
  contract: DeployedContract;
  isHardhat?: boolean;
}

const TransactionTerminal: React.FC<TransactionTerminalProps> = ({ className }) => {
  const [transactions, setTransactions] = useState<TransactionDetails[]>([]);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, Record<string, boolean>>>({});
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Listen for transaction events
    const handleTransactionOutput = async (event: Event) => {
      const customEvent = event as CustomEvent<TransactionOutputEvent>;
      const { transactionHash, contract, functionName, isHardhat } = customEvent.detail;
      
      if (!transactionHash || !contract) return;
      
      // Set loading state for this transaction
      setLoading(prev => ({ ...prev, [transactionHash]: true }));
      
      try {
        // Get detailed transaction information
        const details = await terminalOutputService.getTransactionDetails(
          transactionHash,
          contract,
          functionName
        );
        
        // Add to transactions list
        setTransactions(prev => [details, ...prev]);
        
        // Initialize expanded sections for this transaction
        setExpandedSections(prev => ({
          ...prev,
          [transactionHash]: {
            details: true,
            input: false,
            output: false,
            logs: false,
            hardhatDebug: isHardhat ? true : false,
            rawLogs: false
          }
        }));
      } catch (error: any) {
        console.error("Error processing transaction:", error);
        // Add error transaction
        setTransactions(prev => [{
          status: "Error",
          transactionHash,
          blockHash: "",
          blockNumber: 0,
          from: "",
          to: "",
          gas: "",
          gasPrice: "",
          transactionCost: "",
          executionCost: "",
          input: "",
          output: "",
          decodedInput: "",
          decodedOutput: "",
          logs: [],
          rawLogs: "",
          timestamp: Date.now(),
          contractName: contract.contractName,
          functionName,
          error: error.message
        } as any, ...prev]);
      } finally {
        // Clear loading state
        setLoading(prev => {
          const newState = { ...prev };
          delete newState[transactionHash];
          return newState;
        });
      }
    };

    // Add event listener
    window.addEventListener("transactionOutput", handleTransactionOutput);
    
    // Clean up
    return () => {
      window.removeEventListener("transactionOutput", handleTransactionOutput);
    };
  }, []);

  // Scroll to bottom when new transactions are added
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [transactions]);

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const renderJsonValue = (value: any) => {
    if (value === null || value === undefined) return "null";
    
    if (typeof value === "object") {
      try {
        return JSON.stringify(value, null, 2);
      } catch {
        return String(value);
      }
    }
    
    return String(value);
  };

  const toggleSection = (txHash: string, section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [txHash]: {
        ...prev[txHash],
        [section]: !prev[txHash]?.[section]
      }
    }));
  };

  const isSectionExpanded = (txHash: string, section: string) => {
    return expandedSections[txHash]?.[section] || false;
  };

  return (
    <div className={`bg-gray-900 text-gray-200 p-4 overflow-auto ${className}`} ref={terminalRef}>
      <div className="font-mono text-sm">
        <div className="mb-4 text-green-400 font-bold text-lg border-b border-green-800 pb-2">
          Transaction Terminal
        </div>
        
        {Object.keys(loading).length > 0 && (
          <div className="mb-4 text-yellow-400">
            <div className="animate-pulse flex items-center">
              <div className="w-4 h-4 bg-yellow-400 rounded-full mr-2 animate-ping"></div>
              Processing transactions...
            </div>
          </div>
        )}
        
        {transactions.length === 0 && !Object.keys(loading).length && (
          <div className="text-gray-500 italic">No transactions yet. Interact with a contract to see transaction details here.</div>
        )}
        
        {transactions.map((tx, index) => (
          <div key={tx.transactionHash || index} className="mb-6 border border-gray-700 rounded-lg overflow-hidden">
            {/* Transaction Header */}
            <div className="bg-gray-800 p-3 flex justify-between items-center">
              <div className="text-lg font-semibold text-blue-400">
                {tx.contractName}.{tx.functionName}()
              </div>
              <div className={`px-2 py-1 rounded text-xs font-bold ${
                tx.status === "Success" ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"
              }`}>
                {tx.status}
              </div>
            </div>
            
            <div className="p-3">
              <div className="text-xs text-gray-400 mb-3">
                {formatTimestamp(tx.timestamp)}
              </div>
              
              {/* Transaction Details Section */}
              <div className="mb-3">
                <div 
                  className="flex items-center cursor-pointer bg-gray-800 p-2 rounded-t"
                  onClick={() => toggleSection(tx.transactionHash, 'details')}
                >
                  <div className="mr-2">
                    {isSectionExpanded(tx.transactionHash, 'details') ? '▼' : '►'}
                  </div>
                  <div className="font-medium">Transaction Details</div>
                </div>
                
                {isSectionExpanded(tx.transactionHash, 'details') && (
                  <div className="bg-gray-800 bg-opacity-50 p-3 rounded-b">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs text-gray-500">Transaction Hash</div>
                        <div className="text-sm break-all">{tx.transactionHash}</div>
                      </div>
                      
                      <div>
                        <div className="text-xs text-gray-500">Block</div>
                        <div className="text-sm">{tx.blockNumber}</div>
                      </div>
                      
                      <div>
                        <div className="text-xs text-gray-500">Block Hash</div>
                        <div className="text-sm break-all">{tx.blockHash}</div>
                      </div>
                      
                      <div>
                        <div className="text-xs text-gray-500">From</div>
                        <div className="text-sm break-all">{tx.from}</div>
                      </div>
                      
                      <div>
                        <div className="text-xs text-gray-500">To</div>
                        <div className="text-sm break-all">{tx.to}</div>
                      </div>
                      
                      <div>
                        <div className="text-xs text-gray-500">Gas Used</div>
                        <div className="text-sm">{tx.gas}</div>
                      </div>
                      
                      <div>
                        <div className="text-xs text-gray-500">Gas Price</div>
                        <div className="text-sm">{tx.gasPrice}</div>
                      </div>
                      
                      <div>
                        <div className="text-xs text-gray-500">Transaction Cost</div>
                        <div className="text-sm">{tx.transactionCost}</div>
                      </div>
                      
                      <div>
                        <div className="text-xs text-gray-500">Execution Cost</div>
                        <div className="text-sm">{tx.executionCost}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Input Data Section */}
              <div className="mb-3">
                <div 
                  className="flex items-center cursor-pointer bg-gray-800 p-2 rounded-t"
                  onClick={() => toggleSection(tx.transactionHash, 'input')}
                >
                  <div className="mr-2">
                    {isSectionExpanded(tx.transactionHash, 'input') ? '▼' : '►'}
                  </div>
                  <div className="font-medium">Input Data</div>
                </div>
                
                {isSectionExpanded(tx.transactionHash, 'input') && (
                  <div className="bg-gray-800 bg-opacity-50 p-3 rounded-b">
                    <div className="mb-2">
                      <div className="text-xs text-gray-500">Raw Input</div>
                      <div className="text-sm font-mono break-all">{tx.input}</div>
                    </div>
                    
                    {tx.decodedInput && tx.decodedInput !== "Unable to decode input" && (
                      <div>
                        <div className="text-xs text-gray-500">Decoded Input</div>
                        <pre className="text-sm font-mono bg-gray-900 p-2 rounded overflow-auto">
                          {renderJsonValue(tx.decodedInput)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Output Data Section */}
              <div className="mb-3">
                <div 
                  className="flex items-center cursor-pointer bg-gray-800 p-2 rounded-t"
                  onClick={() => toggleSection(tx.transactionHash, 'output')}
                >
                  <div className="mr-2">
                    {isSectionExpanded(tx.transactionHash, 'output') ? '▼' : '►'}
                  </div>
                  <div className="font-medium">Output Data</div>
                </div>
                
                {isSectionExpanded(tx.transactionHash, 'output') && (
                  <div className="bg-gray-800 bg-opacity-50 p-3 rounded-b">
                    {tx.output && (
                      <div className="mb-2">
                        <div className="text-xs text-gray-500">Raw Output</div>
                        <div className="text-sm font-mono break-all">{tx.output}</div>
                      </div>
                    )}
                    
                    {tx.decodedOutput && tx.decodedOutput !== "No output data" && (
                      <div>
                        <div className="text-xs text-gray-500">Decoded Output</div>
                        <pre className="text-sm font-mono bg-gray-900 p-2 rounded overflow-auto">
                          {renderJsonValue(tx.decodedOutput)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Logs Section */}
              {tx.logs && tx.logs.length > 0 && (
                <div className="mb-3">
                  <div 
                    className="flex items-center cursor-pointer bg-gray-800 p-2 rounded-t"
                    onClick={() => toggleSection(tx.transactionHash, 'logs')}
                  >
                    <div className="mr-2">
                      {isSectionExpanded(tx.transactionHash, 'logs') ? '▼' : '►'}
                    </div>
                    <div className="font-medium">Logs ({tx.logs.length})</div>
                  </div>
                  
                  {isSectionExpanded(tx.transactionHash, 'logs') && (
                    <div className="bg-gray-800 bg-opacity-50 p-3 rounded-b">
                      {tx.logs.map((log, logIndex) => (
                        <div key={logIndex} className="mb-3 last:mb-0 border-b border-gray-700 pb-3 last:border-0 last:pb-0">
                          <div className="text-xs text-gray-500">Event #{logIndex + 1}</div>
                          <pre className="text-sm font-mono bg-gray-900 p-2 rounded overflow-auto">
                            {renderJsonValue(log)}
                          </pre>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {/* Hardhat Debug Info Section */}
              {tx.hardhatDebugInfo && (
                <div className="mb-3">
                  <div 
                    className="flex items-center cursor-pointer bg-gray-800 p-2 rounded-t"
                    onClick={() => toggleSection(tx.transactionHash, 'hardhatDebug')}
                  >
                    <div className="mr-2">
                      {isSectionExpanded(tx.transactionHash, 'hardhatDebug') ? '▼' : '►'}
                    </div>
                    <div className="font-medium">Hardhat Debug Info</div>
                  </div>
                  
                  {isSectionExpanded(tx.transactionHash, 'hardhatDebug') && (
                    <div className="bg-gray-800 bg-opacity-50 p-3 rounded-b">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <div>
                          <div className="text-xs text-gray-500">Gas Used</div>
                          <div className="text-sm">{tx.hardhatDebugInfo.gasUsed}</div>
                        </div>
                        
                        <div>
                          <div className="text-xs text-gray-500">Return Value</div>
                          <div className="text-sm font-mono break-all">{tx.hardhatDebugInfo.returnValue}</div>
                        </div>
                      </div>
                      
                      {/* Memory Section */}
                      {tx.hardhatDebugInfo.memory && tx.hardhatDebugInfo.memory.length > 0 && (
                        <div className="mb-3">
                          <div className="text-xs text-gray-500 mb-1">Memory ({tx.hardhatDebugInfo.memory.length} slots)</div>
                          <div className="bg-gray-900 p-2 rounded overflow-auto max-h-40">
                            {tx.hardhatDebugInfo.memory.slice(0, 10).map((slot, idx) => (
                              <div key={idx} className="text-sm font-mono">
                                <span className="text-gray-500">[{idx}]:</span> {slot}
                              </div>
                            ))}
                            {tx.hardhatDebugInfo.memory.length > 10 && (
                              <div className="text-sm text-gray-500 italic">
                                ... {tx.hardhatDebugInfo.memory.length - 10} more slots
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Stack Section */}
                      {tx.hardhatDebugInfo.stack && tx.hardhatDebugInfo.stack.length > 0 && (
                        <div className="mb-3">
                          <div className="text-xs text-gray-500 mb-1">Stack ({tx.hardhatDebugInfo.stack.length} items)</div>
                          <div className="bg-gray-900 p-2 rounded overflow-auto max-h-40">
                            {tx.hardhatDebugInfo.stack.slice(0, 10).map((item, idx) => (
                              <div key={idx} className="text-sm font-mono">
                                <span className="text-gray-500">[{idx}]:</span> {item}
                              </div>
                            ))}
                            {tx.hardhatDebugInfo.stack.length > 10 && (
                              <div className="text-sm text-gray-500 italic">
                                ... {tx.hardhatDebugInfo.stack.length - 10} more items
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Storage Section */}
                      {tx.hardhatDebugInfo.storage && Object.keys(tx.hardhatDebugInfo.storage).length > 0 && (
                        <div className="mb-3">
                          <div className="text-xs text-gray-500 mb-1">Storage ({Object.keys(tx.hardhatDebugInfo.storage).length} slots)</div>
                          <div className="bg-gray-900 p-2 rounded overflow-auto max-h-40">
                            {Object.entries(tx.hardhatDebugInfo.storage).slice(0, 10).map(([slot, value], idx) => (
                              <div key={idx} className="text-sm font-mono">
                                <span className="text-gray-500">{slot}:</span> {value}
                              </div>
                            ))}
                            {Object.keys(tx.hardhatDebugInfo.storage).length > 10 && (
                              <div className="text-sm text-gray-500 italic">
                                ... {Object.keys(tx.hardhatDebugInfo.storage).length - 10} more slots
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Execution Trace */}
                      {tx.hardhatDebugInfo.structLogs && tx.hardhatDebugInfo.structLogs.length > 0 && (
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Execution Trace ({tx.hardhatDebugInfo.structLogs.length} steps)</div>
                          <div className="text-sm text-gray-400">
                            Execution trace is available but not displayed due to size. Use the terminal for detailed debugging.
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              {/* Raw Logs Section */}
              <div>
                <div 
                  className="flex items-center cursor-pointer bg-gray-800 p-2 rounded-t"
                  onClick={() => toggleSection(tx.transactionHash, 'rawLogs')}
                >
                  <div className="mr-2">
                    {isSectionExpanded(tx.transactionHash, 'rawLogs') ? '▼' : '►'}
                  </div>
                  <div className="font-medium">Raw Logs</div>
                </div>
                
                {isSectionExpanded(tx.transactionHash, 'rawLogs') && (
                  <div className="bg-gray-800 bg-opacity-50 p-3 rounded-b">
                    <pre className="text-sm font-mono bg-gray-900 p-2 rounded overflow-auto max-h-60">
                      {tx.rawLogs}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TransactionTerminal; 