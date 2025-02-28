import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { compilerService, CompilationTarget, CompilerSettings, CompilationResult } from '@/services/compiler-service';

interface CompilerContextType {
  currentFile: string | null;
  setCurrentFile: (file: string | null) => void;
  compileStatus: 'idle' | 'compiling' | 'success' | 'error';
  compilationResult: CompilationResult | null;
  settings: CompilerSettings;
  updateSettings: (settings: Partial<CompilerSettings>) => void;
  compileCurrentFile: () => Promise<void>;
  availableVersions: string[];
  fileContent: string;
  setFileContent: (content: string) => void;
  autoCompile: boolean;
  setAutoCompile: (enabled: boolean) => void;
  compilerLoaded: boolean;
}

const defaultSettings: CompilerSettings = {
  version: '0.8.26+commit.8a97fa7a',
  language: 'Solidity',
  evmVersion: 'berlin',
  optimize: false,
  runs: 200
};

const CompilerContext = createContext<CompilerContextType | undefined>(undefined);

export const useCompiler = () => {
  const context = useContext(CompilerContext);
  if (context === undefined) {
    throw new Error('useCompiler must be used within a CompilerProvider');
  }
  return context;
};

interface CompilerProviderProps {
  children: ReactNode;
}

export const CompilerProvider: React.FC<CompilerProviderProps> = ({ children }) => {
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [compileStatus, setCompileStatus] = useState<'idle' | 'compiling' | 'success' | 'error'>('idle');
  const [compilationResult, setCompilationResult] = useState<CompilationResult | null>(null);
  const [settings, setSettings] = useState<CompilerSettings>(defaultSettings);
  const [availableVersions, setAvailableVersions] = useState<string[]>([]);
  const [fileContent, setFileContent] = useState<string>('');
  const [autoCompile, setAutoCompile] = useState<boolean>(false);
  const [compilerLoaded, setCompilerLoaded] = useState<boolean>(false);