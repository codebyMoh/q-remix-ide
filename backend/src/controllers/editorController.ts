import { Request, Response } from 'express';
import { compileContract } from '../services/compiler/compilerService';

export const compileCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sourceCode } = req.body;

    // Check if sourceCode is provided
    if (!sourceCode) {
      res.status(400).json({ error: 'Source code is required' });
      return;
    }

    // Compile the Solidity code
    const compiledOutput = compileContract(sourceCode);

    // Send the compiled output as the response
    res.json(compiledOutput);
  } catch (error) {
    console.error('Error compiling Solidity code:', error);

    // Properly extract the error message
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({ error: errorMessage });
  }
};