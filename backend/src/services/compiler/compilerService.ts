import { compileSolidity } from '../../config/compilerConfig';
import fs from 'fs';
import path from 'path';

// Define the structure of contract data expected by Ethdebugger
interface ContractData {
  abi: any[];
  bytecode: string;
  sourceMap?: string; 
  [key: string]: any; // Allow additional properties
}

// In-memory cache for compiled contracts (replace with DB or persistent storage if needed)
const compiledContracts: { [address: string]: ContractData } = {};

/**
 * Compile Solidity source code and return contract data
 * @param sourceCode - Solidity source code
 * @param contractName - Name of the contract in the source code (e.g., 'Test')
 * @returns ContractData object with abi, bytecode, and sourceMap
 */
export const compileContract = (sourceCode: string, contractName: string = 'Test'): ContractData => {
  const fileName = 'contract.sol'; // Hardcoded for simplicity, matches compileSolidity
  const output = compileSolidity(sourceCode, fileName);

  // Handle compilation errors
  if (output.errors) {
    const errors = output.errors
      .filter((error: any) => error.severity === 'error')
      .map((error: any) => error.formattedMessage);
    if (errors.length > 0) {
      throw new Error(errors.join('\n'));
    }
  }

  // Extract contract data
  const contractOutput = output.contracts[fileName][contractName];
  if (!contractOutput) {
    throw new Error(`Contract ${contractName} not found in compiled output`);
  }

  const contractData: ContractData = {
    abi: contractOutput.abi || [],
    bytecode: contractOutput.evm?.bytecode?.object || '',
    sourceMap: contractOutput.evm?.bytecode?.sourceMap || '',
  };

  // Simulate an address (replace with real address post-deployment)
  const dummyAddress = `0x${Buffer.from(contractName).toString('hex').slice(0, 40)}`;
  compiledContracts[dummyAddress] = contractData;

  // Save to artifacts folder
  const artifactPath = path.join(__dirname, '../../../artifacts', `${contractName}.json`);
  fs.writeFileSync(artifactPath, JSON.stringify(contractData, null, 2));

  return contractData;
};

/**
 * Retrieve contract data by address
 * @param address - Contract address
 * @returns ContractData or null if not found
 */
export const getContractData = async (address: string): Promise<ContractData | null> => {
  // Check in-memory cache
  if (compiledContracts[address]) {
    return compiledContracts[address];
  }

  // Fallback: Check artifacts folder (assuming address-based naming)
  const artifactPath = path.join(__dirname, '../../../artifacts', `${address}.json`);
  if (fs.existsSync(artifactPath)) {
    const data = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    compiledContracts[address] = data; // Cache it
    return data;
  }

  console.warn(`No compilation data found for address: ${address}`);
  return null;
};