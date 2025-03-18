import { openDB, DBSchema } from "idb";
import { ethers } from "ethers";
import { Environment, Account, Network, DeployedContract, DeploymentInput } from "./../types/deployment";

interface RemixDB extends DBSchema {
  settings: { key: string; value: Environment | string };
  contracts: { key: string; value: DeployedContract };
}

export class RemixDeploymentService {
  private provider!: ethers.Provider;
  private signer!: ethers.Signer;
  private hardhatProvider: ethers.JsonRpcProvider | null = null;

  private async getDB() {
    return openDB<RemixDB>("RemixCloneDB", 1, {
      upgrade(db) {
        db.createObjectStore("settings");
        db.createObjectStore("contracts");
      },
    });
  }

  private async initializeProvider(env: string = "") {
    const currentEnv = env || (await this.getEnvironment()).env;
    
    if (currentEnv === Environment.RemixVM) {
      // Initialize Hardhat provider
      try {
        this.hardhatProvider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
        this.provider = this.hardhatProvider;

        console.log("Initialized Hardhat provider");
      } catch (error: any) {
        console.error("Failed to initialize Hardhat provider:", error);
        throw new Error(`Failed to initialize Hardhat provider: ${error.message}`);
      }
    } else if (currentEnv === Environment.Injected) {
      // Initialize MetaMask provider
      if (!window.ethereum) throw new Error("MetaMask is not installed");
      this.provider = new ethers.BrowserProvider(window.ethereum);
      this.signer = await (this.provider as ethers.BrowserProvider).getSigner();
      try {
        await (this.provider as ethers.BrowserProvider).ready;
      } catch (error: any) {
        throw new Error(`Failed to initialize provider: ${error.message}`);
      }
    } else {
      throw new Error(`Unsupported environment: ${currentEnv}`);
    }
  }

  async setEnvironment(env: string, rpcUrl?: string): Promise<void> {
    const db = await this.getDB();
    await db.put("settings", env, "environment");
    if (rpcUrl && env === Environment.ExternalChain) {
      await db.put("settings", rpcUrl, "rpcUrl");
    }
    await this.initializeProvider(env);
    console.log(`Environment set to ${env}`);
  }

  async getEnvironment(): Promise<{ env: string; rpcUrl?: string }> {
    const db = await this.getDB();
    const env = (await db.get("settings", "environment")) as string || Environment.Injected;
    const rpcUrl = (await db.get("settings", "rpcUrl")) as string | undefined;
    return { env, rpcUrl };
  }

  async getAccounts(): Promise<Account[]> {
    const { env } = await this.getEnvironment();
    
    if (!this.provider) {
      await this.initializeProvider(env);
    }
    
    if (env === Environment.RemixVM) {
      try {
        if (!this.hardhatProvider) {
          this.hardhatProvider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
          this.provider = this.hardhatProvider;
        }
        
        // Get accounts from Hardhat
        const accounts = await this.hardhatProvider.listAccounts();
        console.log("Raw Hardhat accounts:", accounts);
      
        const accountsWithBalance = await Promise.all(
          accounts.map(async (account, index) => {
            // will optimize this later
            let addressStr = '';
            if (typeof account === 'string') {
              addressStr = account;
            } else if (account && typeof account.address === 'string') {
              addressStr = account.address;
            } else if (account && typeof account.toString === 'function') {
              addressStr = account.toString();
            } else {
              console.warn(`Could not get address for account at index ${index}`);
              return null;
            }
            
            try {
              const balance = await this.hardhatProvider!.getBalance(addressStr);
              return {
                address: addressStr,
                balance: ethers.formatEther(balance),
                index,
              };
            } catch (error) {
              console.error(`Error getting balance for ${addressStr}:`, error);
              return {
                address: addressStr,
                balance: "0",
                index,
              };
            }
          })
        );
        
        // Filter out null values
        const validAccounts = accountsWithBalance.filter(account => account !== null) as Account[];
        console.log("Processed Hardhat accounts with balances:", validAccounts);
        return validAccounts;
      } catch (error: any) {
        console.error("Failed to get Hardhat accounts:", error);
        throw new Error(`Failed to get Hardhat accounts: ${error.message}`);
      }
    } else if (env === Environment.Injected) {
      // Get accounts from MetaMask
      if (!this.provider) await this.initializeProvider(Environment.Injected);
      const browserProvider = this.provider as ethers.BrowserProvider;
      this.signer = await browserProvider.getSigner();
      const address = await this.signer.getAddress();
      const balance = await browserProvider.getBalance(address);
      return [{
        address,
        balance: ethers.formatEther(balance),
        index: 0,
      }];
    }
    
    return [];
  }

  async setHardhatSigner(accountIndex: number): Promise<void> {
    if (!this.hardhatProvider) {
      throw new Error("Hardhat provider not initialized");
    }
    
    try {
      const accounts = await this.hardhatProvider.listAccounts();
      console.log(`Setting Hardhat signer to account index ${accountIndex} out of ${accounts.length} accounts`);
      
      if (accountIndex >= accounts.length) {
        throw new Error(`Account index ${accountIndex} out of range`);
      }
      
      this.signer = await this.hardhatProvider.getSigner(accountIndex);
      const address = await this.signer.getAddress();
      console.log(`Successfully set signer to account ${address}`);
      
      // verify the signer is working by checking its address
      try {
        const verifyAddress = await this.signer.getAddress();
        console.log(`Verified signer address: ${verifyAddress}`);
      } catch (verifyError) {
        console.error("Error verifying signer:", verifyError);
        throw new Error("Failed to verify signer after setting");
      }
    } catch (error: any) {
      console.error("Error setting Hardhat signer:", error);
      throw new Error(`Failed to set Hardhat signer: ${error.message}`);
    }
  }
  async getSignerForInteraction() {
    return this.signer;
  }

  async deployContract(input: DeploymentInput, options?: { gasLimit?: string; value?: string }): Promise<DeployedContract> {
    const { env } = await this.getEnvironment();
    
    if (!this.provider) {
      await this.initializeProvider(env);
    }
    
    
    if (env === Environment.RemixVM && this.hardhatProvider) {
      // verify that we have a valid signer
      if (!this.signer) {
        console.warn("No signer set for Hardhat, using default account");
        const accounts = await this.hardhatProvider.listAccounts();
        if (accounts.length > 0) {
          this.signer = await this.hardhatProvider.getSigner(0);
        } else {
          throw new Error("No Hardhat accounts available");
        }
      }
      
      // verify the signer is working
      try {
        const signerAddress = await this.signer.getAddress();
        console.log("Using signer with address:", signerAddress);
      } catch (error) {
        console.error("Error with current signer, resetting to default:", error);
        const accounts = await this.hardhatProvider.listAccounts();
        if (accounts.length > 0) {
          this.signer = await this.hardhatProvider.getSigner(0);
        } else {
          throw new Error("No Hardhat accounts available");
        }
      }
    } else if (env === Environment.Injected) {
      if (!this.signer) {
        this.signer = await (this.provider as ethers.BrowserProvider).getSigner();
      }
    }
    
    const db = await this.getDB();
    const factory = new ethers.ContractFactory(input.abi, input.bytecode, this.signer);

    try {
      const deployTx = await factory.getDeployTransaction(...(input.constructorArgs || []));
      const estimatedGas = await this.provider.estimateGas(deployTx);
      
      // Use provided gasLimit or fallback to estimated gas
      const gasLimit = options?.gasLimit ? BigInt(options.gasLimit) : (estimatedGas * BigInt(110)) / BigInt(100);
      
      // Convert value from user input (e.g., "0" in "wei") to bigint
      const value = options?.value ? ethers.parseUnits(options.value, "wei") : BigInt(0);

      console.log("Deploying contract with parameters:", {
        constructorArgs: input.constructorArgs,
        gasLimit: gasLimit.toString(),
        value: value.toString(),
        signer: await this.signer.getAddress(),
      });

      const contract = await factory.deploy(...(input.constructorArgs || []), {
        gasLimit,
        value,
      });

      const txReceipt = await contract.deploymentTransaction()?.wait();
      if (!txReceipt) throw new Error("Deployment failed");

      const deployedAddress = await contract.getAddress();
      const { env, rpcUrl } = await this.getEnvironment();
      
      let networkInfo: Network;
      if (env === Environment.RemixVM) {
        networkInfo = {
          name: "Remix VM (Cancun)",
          rpcUrl: "http://127.0.0.1:8545",
          chainId: "31337", // default id
        };
      } else {
        const network = await (this.provider as ethers.BrowserProvider).getNetwork();
        networkInfo = {
          name: env,
          rpcUrl: rpcUrl || "MetaMask Provided",
          chainId: network.chainId.toString(),
        };
      }
      
      const deployedContract: DeployedContract = {
        address: deployedAddress,
        network: networkInfo,
        deployedBy: await this.signer.getAddress(),
        timestamp: Date.now(),
        contractName: input.contractName,
        abi: input.abi,
        txHash: txReceipt.hash,
        blockNumber: txReceipt.blockNumber,
      };

      await db.put("contracts", deployedContract, deployedAddress);
      return deployedContract;
    } catch (error: any) {
      console.error("Deployment error:", error);
      throw new Error(`Deployment failed: ${error.message}`);
    }
  }
}

export const deploymentService = new RemixDeploymentService();