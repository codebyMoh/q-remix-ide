import { ethers } from "ethers";
import { DeployedContract } from "@/types/deployment";

export enum FunctionType {
  CALL = "call",          // Blue - view or pure functions
  TRANSACTION = "transaction", // Orange - non-payable functions
  PAYABLE = "payable",    // Orange - payable functions
  FALLBACK = "fallback",  // Red - fallback function
  RECEIVE = "receive"     // Red - receive function
}

export interface ContractFunction {
  name: string;
  type: FunctionType;
  stateMutability: string;
  inputs: any[];
  outputs?: any[];
}

export interface FunctionCallResult {
  success: boolean;
  result?: any;
  error?: string;
  transactionHash?: string;
  processing?: boolean;
}

export class ContractInteractionService {
  private provider!: ethers.BrowserProvider;
  private signer!: ethers.Signer;

  private async initializeProvider() {
    if (!window.ethereum) throw new Error("MetaMask is not installed");
    this.provider = new ethers.BrowserProvider(window.ethereum);
    this.signer = await this.provider.getSigner();
    try {
      await this.provider.ready;
    } catch (error: any) {
      throw new Error(`Failed to initialize provider: ${error.message}`);
    }
  }

  /**
   * Categorize contract functions by type
   */
  categorizeFunctions(contract: DeployedContract): ContractFunction[] {
    return contract.abi
      .filter(item => item.type === "function" || item.type === "fallback" || item.type === "receive")
      .map(item => {
        let type: FunctionType;
        
        if (item.type === "fallback") {
          return {
            name: "(fallback)",
            type: FunctionType.FALLBACK,
            stateMutability: item.stateMutability || "nonpayable",
            inputs: [],
            outputs: []
          };
        }
        
        if (item.type === "receive") {
          return {
            name: "(receive)",
            type: FunctionType.RECEIVE,
            stateMutability: "payable",
            inputs: [],
            outputs: []
          };
        }
        
        // Regular functions
        if (item.stateMutability === "view" || item.stateMutability === "pure") {
          type = FunctionType.CALL;
        } else if (item.stateMutability === "payable") {
          type = FunctionType.PAYABLE;
        } else {
          type = FunctionType.TRANSACTION;
        }
        
        return {
          name: item.name,
          type,
          stateMutability: item.stateMutability,
          inputs: item.inputs || [],
          outputs: item.outputs || []
        };
      });
  }

  /**
   * Call a view/pure function (blue button)
   */
  async callFunction(
    contract: DeployedContract,
    functionName: string,
    args: any[] = []
  ): Promise<FunctionCallResult> {
    try {
      await this.initializeProvider();
      const ethersContract = new ethers.Contract(
        contract.address,
        contract.abi,
        this.provider
      );
      
      const result = await ethersContract[functionName](...args);
      return {
        success: true,
        result
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Execute a transaction function (orange button - non-payable)
   */
  async executeTransaction(
    contract: DeployedContract,
    functionName: string,
    args: any[] = [],
    options: { gasLimit?: string } = {}
  ): Promise<FunctionCallResult> {
    try {
      await this.initializeProvider();
      const ethersContract = new ethers.Contract(
        contract.address,
        contract.abi,
        this.signer
      );
      
      const tx = await ethersContract[functionName](...args, {
        gasLimit: options.gasLimit ? BigInt(options.gasLimit) : undefined
      });
      
      const receipt = await tx.wait();
      
      return {
        success: true,
        transactionHash: receipt.hash
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Execute a payable function (orange button - payable)
   */
  async executePayableTransaction(
    contract: DeployedContract,
    functionName: string,
    args: any[] = [],
    options: { value: string; gasLimit?: string } = { value: "0" }
  ): Promise<FunctionCallResult> {
    try {
      await this.initializeProvider();
      const ethersContract = new ethers.Contract(
        contract.address,
        contract.abi,
        this.signer
      );
      
      const tx = await ethersContract[functionName](...args, {
         value: ethers.parseEther(options.value),
         gasLimit: options.gasLimit ? BigInt(options.gasLimit) : undefined
      });
      
      const receipt = await tx.wait();
      
      return {
        success: true,
        transactionHash: receipt.hash
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Execute fallback or receive function (red button)
   */
  async sendToFallbackOrReceive(
    contract: DeployedContract,
    options: { value: string; gasLimit?: string } = { value: "0" }
  ): Promise<FunctionCallResult> {
    try {
      await this.initializeProvider();
      
      // Create a transaction to send ETH to the contract (will trigger receive/fallback)
      const tx = await this.signer.sendTransaction({
        to: contract.address,
        value: ethers.parseEther(options.value),
        gasLimit: options.gasLimit ? BigInt(options.gasLimit) : undefined
      });
      
      const receipt = await tx.wait();
      if (!receipt) {
        throw new Error("Transaction receipt is null");
      }
      
      return {
        success: true,
        transactionHash: receipt.hash
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export const contractInteractionService = new ContractInteractionService(); 