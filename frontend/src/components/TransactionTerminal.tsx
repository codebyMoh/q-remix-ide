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
      const { transactionHash, contract, functionName } = customEvent.detail;
      
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
                    <div className="mb-3">
                      <div className="text-xs text-gray-500 mb-1">Raw Input</div>
                      <div className="bg-gray-800 p-2 rounded text-xs overflow-x-auto font-mono">
                        {tx.input}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Decoded Input</div>
                      <div className="bg-gray-800 p-2 rounded text-xs overflow-x-auto whitespace-pre font-mono">
                        {renderJsonValue(tx.decodedInput)}
                      </div>
                    </div>
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
                      <div className="mb-3">
                        <div className="text-xs text-gray-500 mb-1">Raw Output</div>
                        <div className="bg-gray-800 p-2 rounded text-xs overflow-x-auto font-mono">
                          {tx.output}
                        </div>
                      </div>
                    )}
                    
                    {tx.decodedOutput && (
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Decoded Output</div>
                        <div className="bg-gray-800 p-2 rounded text-xs overflow-x-auto whitespace-pre font-mono">
                          {renderJsonValue(tx.decodedOutput)}
                        </div>
                      </div>
                    )}
                    
                    {!tx.output && !tx.decodedOutput && (
                      <div className="text-gray-500 italic">No output data available</div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Logs Section */}
              <div className="mb-3">
                <div 
                  className="flex items-center cursor-pointer bg-gray-800 p-2 rounded-t"
                  onClick={() => toggleSection(tx.transactionHash, 'logs')}
                >
                  <div className="mr-2">
                    {isSectionExpanded(tx.transactionHash, 'logs') ? '▼' : '►'}
                  </div>
                  <div className="font-medium">Event Logs {tx.logs && tx.logs.length > 0 ? `(${tx.logs.length})` : ''}</div>
                </div>
                
                {isSectionExpanded(tx.transactionHash, 'logs') && (
                  <div className="bg-gray-800 bg-opacity-50 p-3 rounded-b">
                    {tx.logs && tx.logs.length > 0 ? (
                      <div className="bg-gray-800 p-2 rounded text-xs overflow-x-auto whitespace-pre font-mono">
                        {renderJsonValue(tx.logs)}
                      </div>
                    ) : (
                      <div className="text-gray-500 italic">No event logs emitted</div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Raw Logs Section */}
              <div className="mb-3">
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
                    <div className="bg-gray-800 p-2 rounded text-xs overflow-x-auto whitespace-pre font-mono">
                      {tx.rawLogs}
                    </div>
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