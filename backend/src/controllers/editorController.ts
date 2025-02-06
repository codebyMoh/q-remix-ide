import { Request, Response } from 'express';
import { compileContract } from '../services/compiler/compilerService';

export const compileCode = async (req: Request, res: Response) => {
    try {
        const { sourceCode } = req.body;

        
        if (!sourceCode) {
            return res.status(400).json({ error: 'Source code is required' });
        }

        
        const compiledOutput = compileContract(sourceCode);

        
        res.json(compiledOutput);
    } catch (error) {
        console.error('Error compiling Solidity code:', error);

        
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        res.status(500).json({ error: errorMessage });
    }
};