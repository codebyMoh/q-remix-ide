import { ethers } from 'ethers';
import { getAlchemyRpcUrl } from '@/config/alchemy';

export interface DeploymentResult {
  success: boolean;
  contractAddress?: string;
  transactionHash?: string;
  error?: string;
  blockHash?: string;
  blockNumber?: number;
  gasUsed?: string;
  transactionCost?: string;
  executionCost?: string;
  input?: string;
  from?: string;
  to?: string;
  timestamp?: number;
  status?: number;
  confirmations?: number;
}

// Add TypeScript declaration for window.ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}

/**
 * Deploy a compiled contract to a test network using Alchemy API and MetaMask
 * @param abi The ABI of the compiled contract
 * @param bytecode The bytecode of the compiled contract
 * @param constructorArgs Array of constructor arguments (if any)
 * @param alchemyApiKey Your Alchemy API key
 * @param network The network to deploy to (default: sepolia)
 * @returns Promise with deployment result
 */
export const deployContract = async (
  abi: any[],
  bytecode: string,
  constructorArgs: any[] = [],
  alchemyApiKey?: string,
  network: string = 'sepolia'
): Promise<DeploymentResult> => {
  try {
    console.log("Starting contract deployment...");
    console.log("ABI entries:", abi.length);
    console.log("Bytecode length:", bytecode.length);
    console.log("Constructor args:", JSON.stringify(constructorArgs));
    console.log("Using Alchemy API key:", alchemyApiKey ? "Yes" : "No");
    console.log("Target network:", network);
    
    // Check if MetaMask is available
    if (!window.ethereum) {
      console.error("MetaMask not detected");
      return {
        success: false,
        error: 'MetaMask is not installed. Please install MetaMask to deploy contracts.'
      };
    }

    // Request account access if needed
    console.log("Requesting MetaMask accounts...");
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (!accounts || accounts.length === 0) {
        console.error("No accounts found in MetaMask");
        return {
          success: false,
          error: 'No accounts found. Please connect to MetaMask.'
        };
      }
      console.log("Connected account:", accounts[0]);
    } catch (error) {
      console.error("Error requesting accounts:", error);
      return {
        success: false,
        error: `Failed to connect to MetaMask: ${error instanceof Error ? error.message : String(error)}`
      };
    }

    // Get current network from MetaMask
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    console.log("Connected to chain ID:", chainId);

    // Create a provider
    let provider;
    let signer;
    
    try {
      // Create browser provider with MetaMask
      console.log("Creating browser provider with MetaMask...");
      provider = new ethers.BrowserProvider(window.ethereum);
      
      // Get signer from provider
      console.log("Getting signer from provider...");
      signer = await provider.getSigner();
      const signerAddress = await signer.getAddress();
      console.log("Signer address:", signerAddress);
      
      // If Alchemy API key is provided, we'll use it for the RPC URL
      if (alchemyApiKey) {
        console.log("Alchemy API key provided, creating Alchemy provider");
        const alchemyUrl = getAlchemyRpcUrl(network);
        console.log("Using Alchemy RPC URL:", alchemyUrl);
        
        // We'll still use MetaMask for signing, but Alchemy for the provider
        // This is handled by MetaMask automatically when we send the transaction
      }
    } catch (error) {
      console.error("Error creating provider or signer:", error);
      return {
        success: false,
        error: `Failed to connect to wallet: ${error instanceof Error ? error.message : String(error)}`
      };
    }

    // Ensure bytecode is prefixed with 0x
    if (!bytecode.startsWith('0x')) {
      bytecode = '0x' + bytecode;
      console.log("Added 0x prefix to bytecode");
    }
    
    // Create contract factory
    console.log("Creating contract factory...");
    try {
      const factory = new ethers.ContractFactory(abi, bytecode, signer);
      console.log("Contract factory created successfully");
      
      // Deploy the contract with constructor arguments (if any)
      console.log("Deploying contract with args:", JSON.stringify(constructorArgs));
      const contract = await factory.deploy(...constructorArgs);
      const txHash = contract.deploymentTransaction()?.hash;
      console.log("Contract deployment transaction sent:", txHash);
      
      // Wait for deployment to complete
      console.log("Waiting for deployment confirmation...");
      const receipt = await contract.deploymentTransaction()?.wait();
      console.log("Deployment confirmed in block:", receipt?.blockNumber);
      
      // Get the contract address
      const contractAddress = await contract.getAddress();
      console.log(`Contract deployed successfully at address: ${contractAddress}`);
      console.log(`Transaction hash: ${txHash}`);
      
      // Get detailed transaction information
      const tx = contract.deploymentTransaction();
      const txDetails = await provider.getTransaction(txHash || '');
      
      // Calculate costs
      const gasPrice = txDetails?.gasPrice || BigInt(0);
      const gasUsed = receipt?.gasUsed || BigInt(0);
      const transactionCost = (gasPrice * gasUsed).toString();
      
      // Get block information
      const block = await provider.getBlock(receipt?.blockNumber || 0);
      
      return {
        success: true,
        contractAddress,
        transactionHash: txHash,
        blockHash: receipt?.blockHash,
        blockNumber: receipt?.blockNumber,
        gasUsed: gasUsed.toString(),
        transactionCost: ethers.formatEther(transactionCost) + " ETH",
        executionCost: ethers.formatEther(gasPrice * gasUsed) + " ETH",
        input: tx?.data,
        from: tx?.from,
        to: receipt?.to,
        timestamp: block?.timestamp,
        status: receipt?.status,
        confirmations: receipt?.confirmations
      };
    } catch (error) {
      console.error("Error in contract deployment:", error);
      return {
        success: false,
        error: `Deployment failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  } catch (error) {
    console.error('Error deploying contract:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};
