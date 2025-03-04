import Web3 from 'web3';
import { Ethdebugger } from "@remix-project/remix-debug/src/Ethdebugger";
import { compilerService } from '../services/compiler-service';

export class DebuggerService {
  private debuggerInstance: Ethdebugger | null = null;
  private web3: Web3;
  private currentStep: number = 0;
  private traceLength: number = 0;

  constructor(web3Provider: Web3) {
    this.web3 = web3Provider;
  }

  /**
   * Initialize the debugger with a transaction hash
   */
  async debug(txHash: string): Promise<boolean> {
    try {
      // Get transaction details
      const tx = await this.web3.eth.getTransaction(txHash);
      if (!tx) throw new Error('Transaction not found');

      const compilationResult = async (address: string) => {
        // Create a target with a default empty file if address is a contract
        const targets = {
          'Contract.sol': { content: '// SPDX-License-Identifier: MIT\npragma solidity ^0.8.19;\n\ncontract Contract {\n  // Mock contract\n}' }
        };

        // Use compilerService to compile the contract
        const result = await compilerService.compile(targets, {
          language: 'Solidity',
          evmVersion: 'paris',
          optimize: false,
          runs: 200
        });

        return result.success ? result.data : null;
      };
      
      // Create a new Ethdebugger instance
      this.debuggerInstance = new Ethdebugger({
        web3: this.web3,
        compilationResult,
      });

      // Load the transaction trace
      const trace = await this.loadTrace(txHash);
      if (!trace) throw new Error('Could not load transaction trace');

      // Set the trace in the debugger
      await this.debuggerInstance.traceManager.resolveTrace(trace);
      
      // Get trace length for step navigation
      this.traceLength = await this.debuggerInstance.traceManager.getLength();
      this.currentStep = 0;
      
      return true;
    } catch (error: unknown) {
      console.error('Error initializing debugger:', error);
      if (error instanceof Error) {
        throw new Error(`Debugger initialization failed: ${error.message}`);
      }
      throw new Error(`Debugger initialization failed: Unknown error`);
    }
  }

  /**
   * Load the trace for a transaction
   */
  private async loadTrace(txHash: string): Promise<any> {
    try {
      // Make sure the web3 provider supports debug_traceTransaction
      if (!(this.web3.eth as any).getDebug) {
        throw new Error('Web3 provider does not support debug_traceTransaction');
      }
      
      // Use the debug namespace if available
      if ((this.web3 as any).debug) {
        const trace = await (this.web3 as any).debug.traceTransaction(txHash, {});
        return trace;
      }
      
      // Fallback to sending a raw RPC call
      const trace = await (this.web3.eth as any).getDebug().send({
        method: 'debug_traceTransaction',
        params: [txHash, {}]
      });
      
      return trace;
    } catch (error) {
      console.error('Error loading trace:', error);
      return null;
    }
  }

  /**
   * Step into the current function
   */
  async stepInto(): Promise<void> {
    this.ensureDebuggerInitialized();
    
    if (this.currentStep < this.traceLength - 1) {
      this.currentStep++;
      await this.debuggerInstance!.traceManager.jumpTo(this.currentStep);
    }
  }

  /**
   * Step over the current function
   */
  async stepOver(): Promise<void> {
    this.ensureDebuggerInitialized();
    
    const callDepth = await this.debuggerInstance!.callTree.getCallDepth(this.currentStep);
    let nextStep = this.currentStep + 1;
    
    while (nextStep < this.traceLength) {
      const nextCallDepth = await this.debuggerInstance!.callTree.getCallDepth(nextStep);
      if (nextCallDepth <= callDepth) {
        break;
      }
      nextStep++;
    }
    
    this.currentStep = nextStep;
    await this.debuggerInstance!.traceManager.jumpTo(this.currentStep);
  }

  /**
   * Step backwards
   */
  async stepBack(): Promise<void> {
    this.ensureDebuggerInitialized();
    
    if (this.currentStep > 0) {
      this.currentStep--;
      await this.debuggerInstance!.traceManager.jumpTo(this.currentStep);
    }
  }

  /**
   * Continue to the end
   */
  async continueToEnd(): Promise<void> {
    this.ensureDebuggerInitialized();
    
    this.currentStep = this.traceLength - 1;
    await this.debuggerInstance!.traceManager.jumpTo(this.currentStep);
  }

  /**
   * Reset to the beginning
   */
  async reset(): Promise<void> {
    this.ensureDebuggerInitialized();
    
    this.currentStep = 0;
    await this.debuggerInstance!.traceManager.jumpTo(this.currentStep);
  }

  /**
   * Jump to a specific step
   */
  async jumpTo(step: number): Promise<void> {
    this.ensureDebuggerInitialized();
    
    if (step >= 0 && step < this.traceLength) {
      this.currentStep = step;
      await this.debuggerInstance!.traceManager.jumpTo(step);
    }
  }

  /**
   * Jump to a specific breakpoint
   */
  async jumpToBreakpoint(lineNumber: number, fileIndex: number): Promise<void> {
    this.ensureDebuggerInitialized();

    // Find a step that corresponds to the given line number and file
    for (let i = this.currentStep; i < this.traceLength; i++) {
      const sourceLocation = await this.debuggerInstance!.callTree.getSourceLocationFromVMTraceIndex(i);
      if (sourceLocation && 
          sourceLocation.start && 
          sourceLocation.start.line === lineNumber && 
          sourceLocation.file === fileIndex) {
        this.currentStep = i;
        await this.debuggerInstance!.traceManager.jumpTo(i);
        break;
      }
    }
  }

  async getCurrentState(): Promise<any> {
    this.ensureDebuggerInitialized();

    try {
      const step = this.currentStep;

      const sourceLocation = await this.debuggerInstance!.callTree.getSourceLocationFromVMTraceIndex(step);
      const stepDetail = await this.debuggerInstance!.traceManager.getStepDetail(step);
      const callStack = await this.debuggerInstance!.callTree.getCallStackAt(step);
      
      // These methods might need error handling if they don't exist on all versions of Ethdebugger
      let localVariables = {};
      let stateVariables = {};
      try {
        localVariables = await this.debuggerInstance!.solidityProxy.extractLocalVariables(step);
        stateVariables = await this.debuggerInstance!.solidityProxy.extractStateVariables(step);
      } catch (e) {
        console.warn('Could not extract variables:', e);
      }
      
      const memory = await this.debuggerInstance!.traceManager.getMemoryAt(step);
      const stack = await this.debuggerInstance!.traceManager.getStackAt(step);
      const storage = await this.debuggerInstance!.traceManager.getStorageAt(step);

      return {
        sourceLocation,
        stepDetail,
        callStack,
        localVariables,
        stateVariables,
        memory,
        stack,
        storage,
        currentStep: step,
        totalSteps: this.traceLength,
      };
    } catch (error: unknown) {
      console.error('Error getting current state:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to get debugger state: ${error.message}`);
      }
      throw new Error(`Failed to get debugger state: Unknown error`);
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.debuggerInstance) {
      this.debuggerInstance.unLoad();
      this.debuggerInstance = null;
      this.currentStep = 0;
      this.traceLength = 0;
    }
  }

  /**
   * Ensure the debugger is initialized
   */
  private ensureDebuggerInitialized(): void {
    if (!this.debuggerInstance) {
      throw new Error('Debugger not initialized. Call debug() first.');
    }
  }
}