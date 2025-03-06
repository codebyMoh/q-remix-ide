import { openDB, DBSchema } from "idb";
import { ethers } from "ethers";
import { Environment, Account, Network, DeployedContract, DeploymentInput } from "./../types/deployment";

interface RemixDB extends DBSchema {
  settings: { key: string; value: Environment | string };
  contracts: { key: string; value: DeployedContract };
}

export class RemixDeploymentService {
  private provider!: ethers.BrowserProvider;
  private signer!: ethers.Signer;

  private async getDB() {
    return openDB<RemixDB>("RemixCloneDB", 1, {
      upgrade(db) {
        db.createObjectStore("settings");
        db.createObjectStore("contracts");
      },
    });
  }

  private async initializeProvider() {
    if (!window.ethereum) throw new Error("MetaMask is not installed");
    this.provider = new ethers.BrowserProvider(window.ethereum);
    this.signer = await this.provider.getSigner();
    try {
      await this.provider.ready;
    } catch (error) {
      throw new Error(`Failed to initialize provider: ${error.message}`);
    }
  }

  async setEnvironment(env: Environment, rpcUrl?: string): Promise<void> {
    const db = await this.getDB();
    await db.put("settings", env, "environment");
    if (rpcUrl && env === Environment.ExternalChain) {
      await db.put("settings", rpcUrl, "rpcUrl");
    }
    await this.initializeProvider();
    console.log("Environment set to MetaMask");
  }

  async getEnvironment(): Promise<{ env: Environment; rpcUrl?: string }> {
    const db = await this.getDB();
    const env = (await db.get("settings", "environment")) as Environment || Environment.ExternalChain;
    const rpcUrl = (await db.get("settings", "rpcUrl")) as string | undefined;
    return { env, rpcUrl };
  }

  async getAccounts(): Promise<Account[]> {
    await this.initializeProvider();
    const address = await this.signer.getAddress();
    const balance = await this.provider.getBalance(address);
    return [{
      address,
      balance: ethers.formatEther(balance),
      index: 0,
    }];
  }

  async deployContract(input: DeploymentInput, options?: { gasLimit?: string; value?: string }): Promise<DeployedContract> {
    await this.initializeProvider();
    const db = await this.getDB();
    const factory = new ethers.ContractFactory(input.abi, input.bytecode, this.signer);

    try {
      const deployTx = await factory.getDeployTransaction(...(input.constructorArgs || []));
      const estimatedGas = await this.provider.estimateGas(deployTx);
      
      // Use provided gasLimit or fallback to estimated gas
      const gasLimit = options?.gasLimit ? BigInt(options.gasLimit) : (estimatedGas * BigInt(110)) / BigInt(100);
      
      // Convert value from user input (e.g., "0" in "wei") to bigint
      const value = options?.value ? ethers.parseUnits(options.value, "wei") : BigInt(0);

      const contract = await factory.deploy(...(input.constructorArgs || []), {
        gasLimit,
        value,
      });

      const txReceipt = await contract.deploymentTransaction()?.wait();
      if (!txReceipt) throw new Error("Deployment failed");

      const deployedAddress = await contract.getAddress();
      const { env, rpcUrl } = await this.getEnvironment();
      const network = await this.provider.getNetwork();
      const deployedContract: DeployedContract = {
        address: deployedAddress,
        network: {
          name: env,
          rpcUrl: rpcUrl || "MetaMask Provided",
          chainId: network.chainId.toString(),
        },
        deployedBy: await this.signer.getAddress(),
        timestamp: Date.now(),
        contractName: input.contractName,
        abi: input.abi,
        txHash: txReceipt.hash,
        blockNumber: txReceipt.blockNumber,
      };

      await db.put("contracts", deployedContract, deployedAddress);
      console.log("Deployed contract:", deployedContract);
      return deployedContract;
    } catch (error) {
      throw new Error(`Deployment failed: ${error.message}`);
    }
  }
}

export const deploymentService = new RemixDeploymentService();