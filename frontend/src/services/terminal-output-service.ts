import { ethers } from "ethers";
import { DeployedContract, Environment } from "@/types/deployment";
import { deploymentService } from "./deployment-service";

export interface TransactionDetails {
  status: string;
  transactionHash: string;
  blockHash: string;
  blockNumber: number;
  from: string;
  to: string;
  gas: string;
  gasPrice: string;
  transactionCost: string;
  executionCost: string;
  input: string;
  output?: string;
  decodedInput?: any;
  decodedOutput?: any;
  logs: any[];
  rawLogs: string;
  timestamp: number;
  contractName: string;
  functionName: string;
  hardhatDebugInfo?: {
    gasUsed: string;
    returnValue: string;
    structLogs?: any[];
    memory?: string[];
    stack?: string[];
    storage?: Record<string, string>;
  };
}

export class TerminalOutputService {
  private provider!: ethers.Provider;
  private hardhatProvider: ethers.JsonRpcProvider | null = null;
  private isUsingHardhat: boolean = false;

  private async initializeProvider() {
    // getting the env
    const { env } = await deploymentService.getEnvironment();
    
    if (env === Environment.RemixVM) {
      this.isUsingHardhat = true;
      try {
        this.hardhatProvider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
        this.provider = this.hardhatProvider;
        console.log("Initialized Hardhat provider for terminal output");
      } catch (error: any) {
        console.error("Failed to initialize Hardhat provider:", error);
        throw new Error(`Failed to connect to Hardhat node: ${error.message}`);
      }
    } else if (env === Environment.Injected) {
      // Use MetaMask
      this.isUsingHardhat = false;
      if (!window.ethereum) throw new Error("MetaMask is not installed");
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      this.provider = browserProvider;
      try {
        await browserProvider.ready;
      } catch (error: any) {
        throw new Error(`Failed to initialize provider: ${error.message}`);
      }
    } else {
      throw new Error(`Unsupported environment: ${env}`);
    }
  }

  /**
   * Get Hardhat-specific transaction debug information
   */
  private async getHardhatDebugInfo(txHash: string): Promise<any> {
    if (!this.hardhatProvider || !this.isUsingHardhat) {
      return null;
    }

    try {
      // using Hardhat's debug_traceTransaction method to get detailed execution info


      const traceResult = await this.hardhatProvider.send("debug_traceTransaction", [txHash, {}]);
      
      
      // get transaction receipt for gas used
      
      const receipt = await this.hardhatProvider.getTransactionReceipt(txHash);
      
      return {
        gasUsed: receipt?.gasUsed?.toString() || "0",
        returnValue: traceResult.returnValue || "0x",
        structLogs: traceResult.structLogs || [],
        memory: traceResult.memory || [],
        stack: traceResult.stack || [],
        storage: traceResult.storage || {}
      };
    } catch (error) {
      console.error("Error getting Hardhat debug info:", error);
      return null;
    }
  }

  /**
   * Get detailed transaction information for terminal output
   */
  async getTransactionDetails(
    txHash: string,
    contract: DeployedContract,
    functionName: string
  ): Promise<TransactionDetails> {
    try {
      await this.initializeProvider();
      
      // Get transaction and receipt
      const tx = await this.provider.getTransaction(txHash);
      if (!tx) throw new Error("Transaction not found");
      
      const receipt = await this.provider.getTransactionReceipt(txHash);
      if (!receipt) throw new Error("Transaction receipt not found");
      
      // Get block information
      const block = await this.provider.getBlock(receipt.blockNumber);
      if (!block) throw new Error("Block not found");
      
      // Find function in ABI
      const functionAbi = contract.abi.find(item => 
        item.type === "function" && item.name === functionName
      );
      
      // Decode input data
      let decodedInput: any = "Unable to decode input";
      let decodedOutput: any = "No output data";
      
      try {
        if (functionAbi && tx.data && tx.data !== "0x") {
          const iface = new ethers.Interface([functionAbi]);
          const decoded = iface.parseTransaction({ data: tx.data });
          if (decoded) {
            decodedInput = {
              name: decoded.name,
              args: decoded.args.map(arg => this.formatArg(arg))
            };
          }
        }
      } catch (error: any) {
        console.error("Error decoding input:", error);
      }
      
      // Try to decode output if it's a call (not a transaction)
      if (functionAbi && functionAbi.outputs && functionAbi.outputs.length > 0 && receipt.status === 1) {
        try {
          // For view functions, we'd need the actual result
          // This is a placeholder as we can't get the actual return value from a past transaction
          decodedOutput = "View function output not available in transaction receipt";
        } catch (error: any) {
          console.error("Error decoding output:", error);
        }
      }
      
      // Format logs
      const formattedLogs = receipt.logs.map(log => {
        try {
          // Try to decode log using contract ABI
          const eventAbi = contract.abi.find(item => 
            item.type === "event" && item.name && log.topics[0] === ethers.id(
              `${item.name}(${item.inputs?.map((input: any) => input.type).join(",")})`
            )
          );
          
          if (eventAbi) {
            const iface = new ethers.Interface([eventAbi]);
            const decodedLog = iface.parseLog({
              topics: log.topics as string[],
              data: log.data
            });
            
            if (decodedLog) {
              return {
                name: decodedLog.name,
                address: log.address,
                args: Object.keys(decodedLog.args)
                  .filter(key => isNaN(Number(key)))
                  .reduce((obj, key) => {
                    obj[key] = this.formatArg(decodedLog.args[key]);
                    return obj;
                  }, {} as Record<string, any>)
              };
            }
          }
          
          // Fallback if we can't decode
          return {
            address: log.address,
            topics: log.topics,
            data: log.data
          };
        } catch (error) {
          return {
            address: log.address,
            topics: log.topics,
            data: log.data,
            error: "Failed to decode log"
          };
        }
      });
      
      // Calculate costs
      const gasPrice = tx.gasPrice || ethers.parseUnits("0", "gwei");
      const gasUsed = receipt.gasUsed || BigInt(0);
      const transactionCost = gasPrice * gasUsed;
      
      // Execution cost is typically less than the total transaction cost
      // This is an estimate as we don't have the exact execution cost
      const executionCost = transactionCost * BigInt(80) / BigInt(100);
      
      // Get Hardhat-specific debug info if using Hardhat
      const hardhatDebugInfo = this.isUsingHardhat ? 
        await this.getHardhatDebugInfo(txHash) : undefined;
      
      return {
        status: receipt.status === 1 ? "Success" : "Failed",
        transactionHash: txHash,
        blockHash: receipt.blockHash,
        blockNumber: Number(receipt.blockNumber),
        from: receipt.from,
        to: receipt.to || "Contract Creation",
        gas: gasUsed.toString(),
        gasPrice: ethers.formatUnits(gasPrice, "gwei") + " gwei",
        transactionCost: ethers.formatEther(transactionCost) + " ETH",
        executionCost: ethers.formatEther(executionCost) + " ETH",
        input: tx.data,
        output: receipt.status === 1 ? "0x1" : "0x0", // Simplified output
        decodedInput,
        decodedOutput,
        logs: formattedLogs,
        rawLogs: JSON.stringify(receipt.logs, null, 2),
        timestamp: block.timestamp ? Number(block.timestamp) * 1000 : Date.now(),
        contractName: contract.contractName,
        functionName,
        hardhatDebugInfo
      };
    } catch (error: any) {
      console.error("Error getting transaction details:", error);
      throw new Error(`Failed to get transaction details: ${error.message}`);
    }
  }

  private formatArg(arg: any): any {
    if (arg === null || arg === undefined) return null;
    
    // Handle BigInt
    if (typeof arg === 'bigint') {
      return arg.toString();
    }
    
    // Handle arrays
    if (Array.isArray(arg)) {
      return arg.map(item => this.formatArg(item));
    }
    
    // Handle objects (including ethers objects with toString method)
    if (typeof arg === 'object') {
      if (typeof arg.toString === 'function' && arg.toString !== Object.prototype.toString) {
        return arg.toString();
      }
      
      const result: Record<string, any> = {};
      for (const key in arg) {
        if (Object.prototype.hasOwnProperty.call(arg, key)) {
          result[key] = this.formatArg(arg[key]);
        }
      }
      return result;
    }
    
    return arg;
  }
}

export const terminalOutputService = new TerminalOutputService(); 