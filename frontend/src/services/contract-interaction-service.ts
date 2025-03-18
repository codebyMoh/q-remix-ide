import { ethers } from "ethers";
import { DeployedContract, Environment } from "@/types/deployment";
import { deploymentService, } from "./deployment-service";

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
  private provider!: ethers.Provider;
  private signer!: ethers.Signer;
  private isUsingHardhat: boolean = false;

  private async initializeProvider() {
    // Checking if we are usig Hardhat or MetaMask
    const { env } = await deploymentService.getEnvironment();
    
    if (env === Environment.RemixVM) {
      // Use Hardhat
      this.isUsingHardhat = true;
      try {
        // Initialize Hardhat provider
        const hardhatProvider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
        this.provider = hardhatProvider;
        
        const accounts = await deploymentService.getAccounts();
        if (accounts.length > 0) {
          this.signer = await deploymentService.getSignerForInteraction();
          console.log("Initialized Hardhat provider with signer:", await this.signer.getAddress());
        } else {
          throw new Error("No accounts available in Hardhat node");
        }
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
      this.signer = await browserProvider.getSigner();
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
      
      // Create contract instance with the appropriate provider
      const ethersContract = new ethers.Contract(
        contract.address,
        contract.abi,
        this.provider
      );
      
      // Call the function
      const result = await ethersContract[functionName](...args);
      return {
        success: true,
        result
      };
    } catch (error: any) {
      console.error(`Error calling function ${functionName}:`, error);
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
      
      // Create contract instance with the signer
      const ethersContract = new ethers.Contract(
        contract.address,
        contract.abi,
        this.signer
      );
      
      // Execute the transaction
      const tx = await ethersContract[functionName](...args, {
        gasLimit: options.gasLimit ? BigInt(options.gasLimit) : undefined
      });
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      
      // Dispatch transaction event with detailed information
      this.dispatchTransactionEvent(receipt.hash, contract, functionName);
      
      return {
        success: true,
        transactionHash: receipt.hash
      };
    } catch (error: any) {
      console.error(`Error executing transaction ${functionName}:`, error);
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
      
      // Create contract instance with the signer
      const ethersContract = new ethers.Contract(
        contract.address,
        contract.abi,
        this.signer
      );
      
      // Execute the payable transaction
      const tx = await ethersContract[functionName](...args, {
        gasLimit: options.gasLimit ? BigInt(options.gasLimit) : undefined,
        value: ethers.parseEther(options.value)
      });
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      
      // Dispatch transaction event with detailed information
      this.dispatchTransactionEvent(receipt.hash, contract, functionName);
      
      return {
        success: true,
        transactionHash: receipt.hash
      };
    } catch (error: any) {
      console.error(`Error executing payable transaction ${functionName}:`, error);
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
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      if (!receipt) {
        throw new Error("Transaction receipt is null");
      }
      
      // Determine if it's fallback or receive based on data
      const functionName = tx.data && tx.data !== "0x" ? "(fallback)" : "(receive)";
      
      // Dispatch transaction event with detailed information
      this.dispatchTransactionEvent(receipt.hash, contract, functionName);
      
      return {
        success: true,
        transactionHash: receipt.hash
      };
    } catch (error: any) {
      console.error("Error sending to fallback/receive:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Helper method to dispatch transaction events
   */
  private dispatchTransactionEvent(
    transactionHash: string,
    contract: DeployedContract,
    functionName: string
  ): void {
    // Create and dispatch the transaction event
    const transactionEvent = new CustomEvent("transactionOutput", { 
      detail: {
        contractName: contract.contractName,
        functionName: functionName,
        transactionHash: transactionHash,
        success: true,
        contract: contract,
        isHardhat: this.isUsingHardhat
      }
    });
    
    console.log(`Dispatching transaction event for ${contract.contractName}.${functionName}:`, transactionHash);
    window.dispatchEvent(transactionEvent);
  }
}

export const contractInteractionService = new ContractInteractionService(); 