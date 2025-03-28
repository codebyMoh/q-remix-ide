import { ethers } from "ethers";
import { FeeMarketEIP1559Transaction } from "@ethereumjs/tx";
import VM from "@ethereumjs/vm";
import Common, { Hardfork } from "@ethereumjs/common";
import { Address as NewAddress } from "@ethereumjs/util";
import * as oldUtil from "ethereumjs-util";
import { DeployedContract, Environment } from "@/types/deployment";

// Unified debug info interface to normalize outputs from both VM and RPC debugging
export interface DebugInfo {
  gasUsed: string;
  returnValue: string | null;
  steps?: Array<{
    pc: number;
    opcode: {
      name: string;
      fee: number;
    };
    stack: string[];
    memory: string[];
    storage?: Record<string, string>;
    depth?: number;
    source?: any;
    locals?: Array<{ name: string; type: string; value: string }>;
  }>;
  exceptionError?: string | null;
}

export class UnifiedDebugger {
  private vm: VM | null = null;
  private common: Common | null = null;
  private provider: ethers.Provider | null = null;
  private hardhatProvider: ethers.JsonRpcProvider | null = null;
  private contracts: Map<string, { code: Buffer | string, abi: any[] }> = new Map();
  public isUsingHardhat: boolean = false;
  public isUsingVM: boolean = false;

  constructor() {}

  /**
   * Initialize the appropriate debugging environment based on the context
   */
  async initialize(env?: string): Promise<void> {
    const environment = env || Environment.RemixVM;
    
    if (environment === Environment.RemixVM) {
      // Try to initialize Hardhat provider first
      try {
        this.hardhatProvider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
        this.provider = this.hardhatProvider;
        this.isUsingHardhat = true;
        console.log("Initialized Hardhat provider for debugging");
      } catch (error) {
        console.warn("Hardhat provider unavailable, falling back to VM", error);
        // Fall back to VM-based debugging
        this.isUsingVM = true;
        this.common = new Common({ chain: 'mainnet', hardfork: Hardfork.London });
        this.vm = await VM.create({ common: this.common });
        console.log("Initialized VM for debugging");
      }
    } else if (environment === Environment.Injected) {
      // Use MetaMask
      if (!window.ethereum) throw new Error("MetaMask is not installed");
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      this.provider = browserProvider;
      try {
        await browserProvider.ready;
      } catch (error: any) {
        throw new Error(`Failed to initialize provider: ${error.message}`);
      }
    } else {
      throw new Error(`Unsupported environment: ${environment}`);
    }
  }

  /**
   * Register a contract for debugging
   */
  async registerContract(address: string, bytecode: string, abi: any[]): Promise<void> {
    if (this.isUsingVM && this.vm) {
      // For VM-based debugging
      const addressBuffer = Buffer.from(address.replace('0x', ''), 'hex');
      const addressObj = new oldUtil.Address(addressBuffer);
      const code = Buffer.from(bytecode.replace('0x', ''), 'hex');
      
      await this.vm.stateManager.putContractCode(addressObj, code);
      this.contracts.set(address, { code, abi });
    } else {
      // For network-based debugging, just store the ABI
      this.contracts.set(address, { code: bytecode, abi });
    }
  }

  /**
   * Debug a transaction - works with both VM and Hardhat approaches
   */
  async debugTransaction(tx: {
    from: string,
    to: string,
    data: string,
    value?: string,
    gasLimit?: string
  }, contractSource?: string): Promise<DebugInfo> {
    if (this.isUsingVM && this.vm) {
      return await this.debugTransactionWithVM(tx, contractSource);
    } else if (this.isUsingHardhat && this.hardhatProvider) {
      return await this.debugTransactionWithHardhat(tx);
    } else if (this.provider) {
      // For other providers like MetaMask, we can only get basic transaction info
      return await this.executeTransactionAndGetBasicInfo(tx);
    } else {
      throw new Error("No debugging environment initialized");
    }
  }

  /**
   * Debug transaction using VM (original LocalVMDebugger approach)
   */
  private async debugTransactionWithVM(tx: {
    from: string,
    to: string,
    data: string,
    value?: string,
    gasLimit?: string
  }, contractSource?: string): Promise<DebugInfo> {
    if (!this.vm || !this.vm.evm || !this.vm.evm.events) {
      throw new Error("VM is not initialized properly");
    }

    const debugSteps: any[] = [];
    
    // Create address compatible with the VM version
    const toBuffer = Buffer.from(tx.to.replace('0x', ''), 'hex');
    
    // Create transaction compatible with VM
    const txData: any = {
      nonce: 0,
      maxFeePerGas: 30000000000n,
      maxPriorityFeePerGas: 1000000000n,
      gasLimit: tx.gasLimit ? BigInt(tx.gasLimit) : 2000000n,
      to: toBuffer,
      value: tx.value ? BigInt(tx.value) : 0n,
      data: Buffer.from(tx.data.replace('0x', ''), 'hex'),
      chainId: this.common ? BigInt(this.common.chainId()) : 1n
    };
    
    const transaction = FeeMarketEIP1559Transaction.fromTxData(txData, { common: this.common as any });
    
    // Set up hook for debugging
    const debugHook = (data: any, next?: (result?: any) => void) => {
      try {
        // Extract relevant information from each step
        const step = {
          pc: data.pc,
          opcode: {
            name: data.opcode.name,
            fee: data.opcode.fee
          },
          stack: data.stack ? data.stack.map((item: any) => item.toString('hex')) : [],
          memory: data.memory ? data.memory.map((item: any) => item.toString('hex')) : [],
          storage: {},
          depth: data.depth,
          returnValue: data.returnValue ? data.returnValue.toString('hex') : null,
          gasLeft: data.gasLeft.toString(),
          source: contractSource ? this.mapToSource(data.pc, contractSource) : undefined,
          locals: contractSource ? this.extractLocals(data, contractSource) : []
        };
        
        debugSteps.push(step);
      } catch (err) {
        console.error("Error in debug hook:", err);
      }
      
      if (next) {
        next();
      }
    };
    
    // Run the transaction with debug hook
    this.vm.evm.events.on('step', debugHook);
    
    try {
      const result = await this.vm.runTx({ tx: transaction as any });
      return {
        steps: debugSteps,
        gasUsed: result.gasUsed?.toString() || '0',
        returnValue: result.execResult.returnValue ? result.execResult.returnValue.toString('hex') : null,
        exceptionError: result.execResult.exceptionError?.toString() || null
      };
    } catch (err) {
      const error = err as Error;
      throw new Error(`Transaction execution failed: ${error.message}`);
    } finally {
      this.vm.evm.events.removeListener('step', debugHook);
    }
  }

  /**
   * Debug transaction using Hardhat tracing APIs
   */
  private async debugTransactionWithHardhat(tx: {
    from: string,
    to: string,
    data: string,
    value?: string,
    gasLimit?: string
  }): Promise<DebugInfo> {
    if (!this.hardhatProvider) {
      throw new Error("Hardhat provider not initialized");
    }

    try {
      // First send the transaction
      const signer = await this.hardhatProvider.getSigner(tx.from);
      const txRequest = {
        to: tx.to,
        data: tx.data,
        value: tx.value ? ethers.parseEther(tx.value) : undefined,
        gasLimit: tx.gasLimit ? BigInt(tx.gasLimit) : undefined
      };
      
      const txResponse = await signer.sendTransaction(txRequest);
      const receipt = await txResponse.wait();
      
      if (!receipt) {
        throw new Error("Transaction receipt is null");
      }
      
      // Now trace the transaction
      const traceResult = await this.hardhatProvider.send("debug_traceTransaction", [receipt.hash, {}]);
      
      // Transform the trace result into our standard format
      const steps = traceResult.structLogs.map((log: any) => ({
        pc: log.pc,
        opcode: {
          name: log.op,
          fee: log.gasCost
        },
        stack: log.stack || [],
        memory: log.memory || [],
        storage: log.storage || {},
        depth: log.depth
      }));
      
      return {
        gasUsed: receipt.gasUsed.toString(),
        returnValue: traceResult.returnValue || null,
        steps: steps,
        exceptionError: receipt.status === 0 ? "Transaction reverted" : null
      };
    } catch (error: any) {
      console.error("Error debugging with Hardhat:", error);
      throw new Error(`Debug failed: ${error.message}`);
    }
  }

  /**
   * Execute a transaction and get basic info (for providers without debug support)
   */
  private async executeTransactionAndGetBasicInfo(tx: {
    from: string,
    to: string,
    data: string,
    value?: string,
    gasLimit?: string
  }): Promise<DebugInfo> {
    if (!this.provider) {
      throw new Error("Provider not initialized");
    }

    try {
      // Get signer
      let signer: ethers.Signer;
      if (this.provider instanceof ethers.BrowserProvider) {
        signer = await this.provider.getSigner();
      } else {
        throw new Error("Cannot get signer from provider");
      }
      
      // Send transaction
      const txRequest = {
        to: tx.to,
        data: tx.data,
        value: tx.value ? ethers.parseEther(tx.value) : undefined,
        gasLimit: tx.gasLimit ? BigInt(tx.gasLimit) : undefined
      };
      
      const txResponse = await signer.sendTransaction(txRequest);
      const receipt = await txResponse.wait();
      
      if (!receipt) {
        throw new Error("Transaction receipt is null");
      }
      
      // Return basic info
      return {
        gasUsed: receipt.gasUsed.toString(),
        returnValue: receipt.logs.length > 0 ? receipt.logs[0].data : null,
        exceptionError: receipt.status === 0 ? "Transaction reverted" : null
      };
    } catch (error: any) {
      console.error("Error executing transaction:", error);
      throw new Error(`Execution failed: ${error.message}`);
    }
  }

  /**
   * Decode function call data using ABI (refactored from LocalVMDebugger)
   */
  decodeFunctionCall(to: string, calldata: string): { name: string, params: any[] } | null {
    const contractInfo = this.contracts.get(to);
    if (!contractInfo || !contractInfo.abi) return null;
    
    try {
      const abiInterface = new ethers.Interface(contractInfo.abi);
      const txDescription = abiInterface.parseTransaction({ data: calldata });
      
      return txDescription
        ? { name: txDescription.name, params: txDescription.args }
        : null;
    } catch (err) {
      console.error("Error decoding function call:", err);
      return null;
    }
  }

  /**
   * Get detailed debug info for a transaction that has already been mined
   */
  async getTransactionDebugInfo(txHash: string, contract: DeployedContract): Promise<DebugInfo> {
    if (this.isUsingHardhat && this.hardhatProvider) {
      try {
        // Get transaction receipt for gas used
        const receipt = await this.hardhatProvider.getTransactionReceipt(txHash);
        if (!receipt) {
          throw new Error("Transaction receipt not found");
        }
        
        // Use Hardhat's debug_traceTransaction method
        const traceResult = await this.hardhatProvider.send("debug_traceTransaction", [txHash, {}]);
        
        // Transform trace result into our standard format
        const steps = traceResult.structLogs?.map((log: any) => ({
          pc: log.pc,
          opcode: {
            name: log.op,
            fee: log.gasCost
          },
          stack: log.stack || [],
          memory: log.memory || [],
          storage: log.storage || {},
          depth: log.depth
        })) || [];
        
        return {
          gasUsed: receipt.gasUsed.toString(),
          returnValue: traceResult.returnValue || null,
          steps: steps,
          exceptionError: receipt.status === 0 ? "Transaction reverted" : null
        };
      } catch (error) {
        console.error("Error getting debug info:", error);
        throw new Error(`Failed to get debug info: ${error}`);
      }
    } else {
        // For non-Hardhat environments, we can only get basic transaction info
        const tx = await this.provider?.getTransaction(txHash);
        const receipt = await this.provider?.getTransactionReceipt(txHash);
        
        if (!tx || !receipt) {
          throw new Error("Transaction not found");
        }
        
        return {
          gasUsed: receipt.gasUsed.toString(),
          returnValue: receipt.logs.length > 0 ? receipt.logs[0].data : null,
          exceptionError: receipt.status === 0 ? "Transaction reverted" : null
        };
      }
    }
    
    // Helper method to map PC to source code location (from LocalVMDebugger)
    private mapToSource(pc: number, source: string): any {
      // Implementation would connect to source maps
      return {
        file: 'contract.sol',
        line: 1,
        start: 0,
        end: 0
      };
    }
    
    // Extract local variables (from LocalVMDebugger)
    private extractLocals(data: any, source: string): any[] {
      // Implementation would parse debug information
      return [];
    }
  }