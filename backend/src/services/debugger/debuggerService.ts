import { Ethdebugger } from "@remix-project/remix-debug/src/Ethdebugger";
import { TransactionReceipt } from "web3";

export class DebuggerService {
  private debuggerInstance: Ethdebugger | null = null;
  private web3: any; // Replace with proper Web3 type
  private currentStep: number = 0;
  private traceLength: number = 0;

  constructor(web3Provider: any) {
    this.web3 = web3Provider;
  }

  /**
   * Initialize the debugger with a transaction hash
   */
  async debug(txHash: string): Promise<boolean> {
    try {
      // Get transaction details
      const tx = await this.web3.eth.getTransaction(txHash);
      const receipt = await this.web3.eth.getTransactionReceipt(txHash);
      
      if (!tx) {
        throw new Error('Transaction not found');
      }

      // Create a new Ethdebugger instance
      this.debuggerInstance = new Ethdebugger({
        web3: this.web3,
        compilationResult: {} // This should be populated with actual compilation result if available
      });

      // Initialize the debugger
      await this.debuggerInstance.debug(tx);
      
      // Load the transaction trace
      const trace = await this.loadTrace(txHash);
      if (!trace) {
        throw new Error('Could not load transaction trace');
      }

      // Set the trace in the debugger
      await this.debuggerInstance.traceManager.resolveTrace(trace);
      
      // Get trace length for step navigation
      this.traceLength = await this.debuggerInstance.traceManager.getLength();
      this.currentStep = 0;
      
      return true;
    } catch (error) {
      console.error('Error initializing debugger:', error);
      return false;
    }
  }

  /**
   * Load the trace for a transaction
   */
  private async loadTrace(txHash: string): Promise<any> {
    try {
      // This will depend on your specific environment
      // In Remix, this usually involves calling the node's debug_traceTransaction method
      const trace = await this.web3.eth.getTransactionTrace(txHash);
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
    if (!this.debuggerInstance) return;
    
    if (this.currentStep < this.traceLength - 1) {
      this.currentStep++;
      await this.debuggerInstance.traceManager.jumpTo(this.currentStep);
    }
  }

  /**
   * Step over the current function
   */
  async stepOver(): Promise<void> {
    if (!this.debuggerInstance) return;
    
    const callDepth = await this.debuggerInstance.callTree.getCalldepth(this.currentStep);
    let nextStep = this.currentStep + 1;
    
    while (nextStep < this.traceLength) {
      const nextCallDepth = await this.debuggerInstance.callTree.getCalldepth(nextStep);
      if (nextCallDepth <= callDepth) {
        break;
      }
      nextStep++;
    }
    
    this.currentStep = nextStep;
    await this.debuggerInstance.traceManager.jumpTo(this.currentStep);
  }

  /**
   * Step backwards
   */
  async stepBack(): Promise<void> {
    if (!this.debuggerInstance) return;
    
    if (this.currentStep > 0) {
      this.currentStep--;
      await this.debuggerInstance.traceManager.jumpTo(this.currentStep);
    }
  }

  /**
   * Continue to the end
   */
  async continueToEnd(): Promise<void> {
    if (!this.debuggerInstance) return;
    
    this.currentStep = this.traceLength - 1;
    await this.debuggerInstance.traceManager.jumpTo(this.currentStep);
  }

  /**
   * Reset to the beginning
   */
  async reset(): Promise<void> {
    if (!this.debuggerInstance) return;
    
    this.currentStep = 0;
    await this.debuggerInstance.traceManager.jumpTo(this.currentStep);
  }

  /**
   * Jump to a specific breakpoint
   */
  async jumpToBreakpoint(lineNumber: number, fileName: string): Promise<void> {
    if (!this.debuggerInstance) return;

    // Find a step that corresponds to the given line number and file
    for (let i = this.currentStep; i < this.traceLength; i++) {
        const sourceLocation = await this.debuggerInstance.callTree.getSourceLocationFromVMTraceIndex(i); // Updated
        if (
            sourceLocation &&
            sourceLocation.start.line === lineNumber && // Adjusted to use `start.line`
            sourceLocation.fileName === fileName // Adjusted property name
        ) {
            this.currentStep = i;
            await this.debuggerInstance.traceManager.jumpTo(i);
            break;
        }
    }
}

async getCurrentState(): Promise<any> {
    if (!this.debuggerInstance) return null;

    try {
      const step = this.currentStep;

      const sourceLocation = await this.debuggerInstance.callTree.getSourceLocationFromVMTraceIndex(step);
      const stepDetail = await this.debuggerInstance.traceManager.getStepDetail(step);
      const callStack = await this.debuggerInstance.callTree.getCallStackAt(step);
      const localVariables = await this.debuggerInstance.solidityProxy.extractLocalVariables(step);
      const stateVariables = await this.debuggerInstance.solidityProxy.extractStateVariables(step);
      const memory = await this.debuggerInstance.traceManager.getMemoryAt(step);
      const stack = await this.debuggerInstance.traceManager.getStackAt(step);
      const storage = await this.debuggerInstance.traceManager.getStorageAt(step);

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
    } catch (error) {
      console.error('Error getting current state:', error);
      return null;
    }
}

/**
 * Clean up resources
 */
destroy(): void {
    if (this.debuggerInstance) {
        this.debuggerInstance.unLoad(); 
        this.debuggerInstance = null;
    }
}
}