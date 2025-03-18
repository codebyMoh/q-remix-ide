"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { DebuggerService } from '../services/debugger-service';
import { useCompiler } from './useCompiler';
import Web3 from 'web3';

interface DebuggerContextType {
  debuggerService: DebuggerService | null;
  isDebugging: boolean;
  currentStep: number;
  totalSteps: number;
  currentState: any;
  debugTransaction: (txHash: string, useGeneratedSources?: boolean) => Promise<boolean>;
  stepBack: () => Promise<void>;
  stepForward: () => Promise<void>;
  stepInto: () => Promise<void>;
  stepOut: () => Promise<void>;
  jumpToBreakpoint: (lineNumber: number, fileIndex: number) => Promise<void>;
  stopDebugging: () => void;
  setStep: (step: number) => Promise<void>;
  error: string | null;
}

const DebuggerContext = createContext<DebuggerContextType | undefined>(undefined);

export const DebuggerProvider: React.FC<{ children: ReactNode; web3Provider?: Web3 }> = ({ 
  children, 
  web3Provider 
}) => {
  const [debuggerService, setDebuggerService] = useState<DebuggerService | null>(null);
  const [isDebugging, setIsDebugging] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [currentState, setCurrentState] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { compiledContracts } = useCompiler();

  // Initialize debugger service when web3 is available
  useEffect(() => {
    if (web3Provider) {
      const service = new DebuggerService(web3Provider);
      setDebuggerService(service);
    }
  }, [web3Provider]);

  // Clean up resources when component unmounts
  useEffect(() => {
    return () => {
      if (debuggerService) {
        debuggerService.destroy();
      }
    };
  }, [debuggerService]);

  const updateDebuggerState = async () => {
    if (debuggerService && isDebugging) {
      try {
        const state = await debuggerService.getCurrentState();
        setCurrentStep(state.currentStep);
        setTotalSteps(state.totalSteps);
        setCurrentState(state);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Unknown error occurred while updating debugger state');
        }
      }
    }
  };

  const debugTransaction = async (txHash: string, useGeneratedSources = false) => {
    if (!debuggerService) {
      setError('Debugger service not initialized');
      return false;
    }

    try {
      setError(null);
      const success = await debuggerService.debug(txHash);
      if (success) {
        setIsDebugging(true);
        await updateDebuggerState();
        return true;
      }
      return false;
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to start debugging');
      }
      return false;
    }
  };

  const stepBack = async () => {
    if (!debuggerService || !isDebugging) return;
    try {
      await debuggerService.stepBack();
      await updateDebuggerState();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      }
    }
  };

  const stepForward = async () => {
    if (!debuggerService || !isDebugging) return;
    try {
      await debuggerService.stepInto(); // Simplification - using stepInto as stepForward
      await updateDebuggerState();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      }
    }
  };

  const stepInto = async () => {
    if (!debuggerService || !isDebugging) return;
    try {
      await debuggerService.stepInto();
      await updateDebuggerState();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      }
    }
  };

  const stepOut = async () => {
    if (!debuggerService || !isDebugging) return;
    try {
      await debuggerService.stepOver(); // Using stepOver for stepping out
      await updateDebuggerState();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      }
    }
  };

  const jumpToBreakpoint = async (lineNumber: number, fileIndex: number) => {
    if (!debuggerService || !isDebugging) return;
    try {
      await debuggerService.jumpToBreakpoint(lineNumber, fileIndex);
      await updateDebuggerState();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      }
    }
  };

  const setStep = async (step: number) => {
    if (!debuggerService || !isDebugging) return;
    // Assuming debuggerService has a method to jump to a specific step
    try {
      // This is placeholder - you'll need to implement jumpTo in DebuggerService
      await debuggerService.jumpTo(step);
      await updateDebuggerState();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      }
    }
  };

  const stopDebugging = () => {
    if (debuggerService) {
      debuggerService.destroy();
      setIsDebugging(false);
      setCurrentStep(0);
      setTotalSteps(0);
      setCurrentState(null);
    }
  };

  const contextValue: DebuggerContextType = {
    debuggerService,
    isDebugging,
    currentStep,
    totalSteps,
    currentState,
    debugTransaction,
    stepBack,
    stepForward,
    stepInto,
    stepOut,
    jumpToBreakpoint,
    stopDebugging,
    setStep,
    error
  };

  return (
    <DebuggerContext.Provider value={contextValue}>
      {children}
    </DebuggerContext.Provider>
  );
};

export const useDebugger = () => {
  const context = useContext(DebuggerContext);
  if (context === undefined) {
    throw new Error('useDebugger must be used within a DebuggerProvider');
  }
  return context;
};