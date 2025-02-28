import Web3 from 'web3';
import { Ethdebugger } from "@remix-project/remix-debug/src/Ethdebugger";
import { getContractData } from '../compiler/compilerService';

export class DebuggerService {
  private debuggerInstance: Ethdebugger | null = null;
  private web3: Web3; // Replace with proper Web3 type
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
        const contractData = await getContractData(address); // Hypothetical method
        return contractData || null; // { abi, bytecode, sourceMap, etc. }
      };
      // Create a new Ethdebugger instance and debugger initialization
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
      if (error instanceof Error) { // Added type guard
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
      // This will depend on your specific environment
      // In Remix, this usually involves calling the node's debug_traceTransaction method
      const trace = await (this.web3 as any).debug.traceTransaction(txHash, {});
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
      const nextCallDepth = await this.debuggerInstance!.callTree.getCallDepth(nextStep); // Fixed from getCalldepth
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
   * Jump to a specific breakpoint
   */
  async jumpToBreakpoint(lineNumber: number, fileIndex: number): Promise<void> {
    this.ensureDebuggerInitialized();

    // Find a step that corresponds to the given line number and file
    for (let i = this.currentStep; i < this.traceLength; i++) {
        const sourceLocation = await this.debuggerInstance!.callTree.getSourceLocationFromVMTraceIndex(i);
        if (sourceLocation && sourceLocation.start === lineNumber && sourceLocation.file === fileIndex) {
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
      const localVariables = await this.debuggerInstance!.solidityProxy.extractLocalVariables(step);
      const stateVariables = await this.debuggerInstance!.solidityProxy.extractStateVariables(step);
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