"use client";
import React, { useState, useEffect } from "react";
import { DeployedContract } from "@/types/deployment";
import { 
  contractInteractionService, 
  ContractFunction, 
  FunctionType,
  FunctionCallResult
} from "@/services/contract-interaction-service";

interface ContractInteractionProps {
  contract: DeployedContract;
  gasLimit: string;
  onTransactionExecuted?: () => void;
}

const ContractInteraction: React.FC<ContractInteractionProps> = ({ 
  contract, 
  gasLimit,
  onTransactionExecuted 
}) => {
  const [functions, setFunctions] = useState<ContractFunction[]>([]);
  const [functionInputs, setFunctionInputs] = useState<Record<string, string[]>>({});
  const [functionResults, setFunctionResults] = useState<Record<string, FunctionCallResult>>({});
  const [payableValue, setPayableValue] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (contract) {
      const categorizedFunctions = contractInteractionService.categorizeFunctions(contract);
      setFunctions(categorizedFunctions);
      
      // Initialize inputs for each function
      const initialInputs: Record<string, string[]> = {};
      const initialPayableValues: Record<string, string> = {};
      
      categorizedFunctions.forEach(func => {
        initialInputs[func.name] = Array(func.inputs.length).fill("");
        if (func.type === FunctionType.PAYABLE || 
            func.type === FunctionType.FALLBACK || 
            func.type === FunctionType.RECEIVE) {
          initialPayableValues[func.name] = "0";
        }
      });
      
      setFunctionInputs(initialInputs);
      setPayableValue(initialPayableValues);
    }
  }, [contract]);

  const handleInputChange = (funcName: string, index: number, value: string) => {
    const newInputs = { ...functionInputs };
    if (!newInputs[funcName]) {
      newInputs[funcName] = [];
    }
    newInputs[funcName][index] = value;
    setFunctionInputs(newInputs);
  };

  const handlePayableValueChange = (funcName: string, value: string) => {
    setPayableValue({ ...payableValue, [funcName]: value });
  };

  const executeFunction = async (func: ContractFunction) => {
    setLoading({ ...loading, [func.name]: true });
    setFunctionResults({ 
      ...functionResults, 
      [func.name]: { success: false, result: "Executing...", processing: true } 
    });
    
    try {
      let result: FunctionCallResult;
      const inputs = functionInputs[func.name] || [];
      
      // Parse inputs based on ABI types
      const parsedInputs = func.inputs.map((input, index) => {
        const value = inputs[index] || "";
        
        // Handle arrays
        if (input.type.includes("[]")) {
          try {
            return JSON.parse(value);
          } catch {
            return [];
          }
        }
        
        // Handle booleans
        if (input.type === "bool") {
          return value.toLowerCase() === "true";
        }
        
        return value;
      });
      
      switch (func.type) {
        case FunctionType.CALL:
          result = await contractInteractionService.callFunction(
            contract,
            func.name,
            parsedInputs
          );
          break;
          
        case FunctionType.TRANSACTION:
          result = await contractInteractionService.executeTransaction(
            contract,
            func.name,
            parsedInputs,
            { gasLimit }
          );
          break;
          
        case FunctionType.PAYABLE:
          result = await contractInteractionService.executePayableTransaction(
            contract,
            func.name,
            parsedInputs,
            { 
              value: payableValue[func.name] || "0",
              gasLimit 
            }
          );
          break;
          
        case FunctionType.FALLBACK:
        case FunctionType.RECEIVE:
          result = await contractInteractionService.sendToFallbackOrReceive(
            contract,
            { 
              value: payableValue[func.name] || "0",
              gasLimit 
            }
          );
          break;
          
        default:
          result = { success: false, error: "Unknown function type" };
      }
      
      setFunctionResults({ ...functionResults, [func.name]: result });
      
      // Broadcast transaction to terminal if it's a transaction
      if (result.transactionHash) {
        const transactionEvent = new CustomEvent("transactionOutput", { 
          detail: {
            contractName: contract.contractName,
            functionName: func.name,
            transactionHash: result.transactionHash,
            success: result.success,
            contract: contract
          }
        });
        window.dispatchEvent(transactionEvent);
        
        // Call the callback to notify that a transaction was executed
        if (onTransactionExecuted) {
          onTransactionExecuted();
        }
      }
      
    } catch (error: any) {
      setFunctionResults({ 
        ...functionResults, 
        [func.name]: { success: false, error: error.message } 
      });
    } finally {
      setLoading({ ...loading, [func.name]: false });
    }
  };

  const getButtonColor = (func: ContractFunction) => {
    switch (func.type) {
      case FunctionType.CALL:
        return "bg-blue-100 text-blue-600 hover:bg-blue-200"; // Blue for view/pure functions
      case FunctionType.TRANSACTION:
      case FunctionType.PAYABLE:
        return "bg-orange-100 text-orange-600 hover:bg-orange-200"; // Orange for transaction functions
      case FunctionType.FALLBACK:
      case FunctionType.RECEIVE:
        return "bg-red-100 text-red-600 hover:bg-red-200"; // Red for fallback/receive
      default:
        return "bg-gray-100 text-gray-600 hover:bg-gray-200";
    }
  };

  const formatResult = (result: any): string => {
    if (result === null || result === undefined) return "null";
    
    if (typeof result === "object") {
      // Handle BigInt
      if (typeof result.toString === "function" && result.toString().includes("n")) {
        return result.toString().replace("n", "");
      }
      
      // Handle arrays and objects
      try {
        return JSON.stringify(result);
      } catch {
        return String(result);
      }
    }
    
    return String(result);
  };

  return (
    <div className="mt-2">
      {functions.map((func) => (
        <div key={func.name} className="mb-3 border rounded p-2">
          <div className="flex items-center gap-2 mb-2">
            <button
              className={`px-2 py-1 rounded text-xs font-medium ${getButtonColor(func)}`}
              onClick={() => executeFunction(func)}
              disabled={loading[func.name]}
            >
              {func.name}
            </button>
            <span className="text-xs text-gray-500">
              {func.type === FunctionType.CALL ? "(view)" : 
               func.type === FunctionType.PAYABLE ? "(payable)" : 
               func.type === FunctionType.FALLBACK ? "(fallback)" : 
               func.type === FunctionType.RECEIVE ? "(receive)" : "(nonpayable)"}
            </span>
          </div>
          
          {/* Function inputs */}
          {func.inputs.length > 0 && (
            <div className="pl-2 mb-2">
              {func.inputs.map((input, idx) => (
                <div key={idx} className="flex items-center gap-1 mb-1">
                  <input
                    type="text"
                    placeholder={`${input.name || `param${idx}`} (${input.type})`}
                    className="border p-1 rounded text-xs w-full"
                    value={functionInputs[func.name]?.[idx] || ""}
                    onChange={(e) => handleInputChange(func.name, idx, e.target.value)}
                    disabled={loading[func.name]}
                  />
                </div>
              ))}
            </div>
          )}
          
          {/* Value input for payable functions */}
          {(func.type === FunctionType.PAYABLE || 
            func.type === FunctionType.FALLBACK || 
            func.type === FunctionType.RECEIVE) && (
            <div className="pl-2 mb-2">
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  placeholder="Value in ETH"
                  className="border p-1 rounded text-xs w-full"
                  value={payableValue[func.name] || "0"}
                  onChange={(e) => handlePayableValueChange(func.name, e.target.value)}
                  disabled={loading[func.name]}
                />
                <span className="text-xs">ETH</span>
              </div>
            </div>
          )}
          
          {/* Function result */}
          {functionResults[func.name] && (
            <div className={`mt-2 p-2 rounded text-xs ${
              functionResults[func.name].success ? "bg-green-50" : "bg-red-50"
            }`}>
              {functionResults[func.name].success ? (
                <>
                  {functionResults[func.name].result !== undefined && (
                    <div>
                      <span className="font-medium">Result:</span> {formatResult(functionResults[func.name].result)}
                    </div>
                  )}
                  {functionResults[func.name].transactionHash && (
                    <div>
                      <span className="font-medium">Transaction Hash:</span> {functionResults[func.name].transactionHash}
                      <div className="text-xs text-gray-500 mt-1">See terminal for detailed transaction information</div>
                    </div>
                  )}
                </>
              ) : (
                <div className={`${functionResults[func.name].error ? 'text-red-600' : 'text-black'} ${!functionResults[func.name].error && functionResults[func.name].processing ? 'bg-orange-200 p-2 rounded' : ''}`}>
                {functionResults[func.name].error || "Processing..."}
              </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ContractInteraction; 