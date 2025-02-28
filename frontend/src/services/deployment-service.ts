import { openDB, DBSchema } from "idb";
import { ethers } from "ethers";
import { Environment, Account, Network, DeployedContract, DeploymentInput } from "./../types/deployment";

interface RemixDB extends DBSchema {
  settings: {
    key: string;
    value: Environment | string;
  };
  accounts: {
    key: string; 
    value: { address: string; privateKey: string }; 
  };
  contracts: {
    key: string; // address
    value: DeployedContract;
  };
}

export class RemixDeploymentService {
  private provider!: ethers.JsonRpcProvider | ethers.BrowserProvider;
  private localAccounts: Map<string, ethers.HDNodeWallet> = new Map();
  private mnemonic: string | null = null;

  private async getDB() {
    return openDB<RemixDB>("RemixCloneDB", 1, {
      upgrade(db) {
        db.createObjectStore("settings");
        db.createObjectStore("accounts");
        db.createObjectStore("contracts");
      },
    });
  }

  private async initializeProvider(network: Network) {
    if (network.rpcUrl === "injected") {
      if (!window.ethereum) throw new Error("No injected provider (e.g., MetaMask) found");
      this.provider = new ethers.BrowserProvider(window.ethereum);
    } else {
      this.provider = new ethers.JsonRpcProvider(network.rpcUrl);
    }
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
    const network = { name: env, rpcUrl: rpcUrl || "http://localhost:8545", chainId: "1337" };
    await this.initializeProvider(network);
    console.log("Environment set:", env, rpcUrl ? `with RPC: ${rpcUrl}` : "");
  }

  async getEnvironment(): Promise<{ env: Environment; rpcUrl?: string }> {
    const db = await this.getDB();
    const env = (await db.get("settings", "environment")) as Environment || Environment.LocalVM;
    const rpcUrl = (await db.get("settings", "rpcUrl")) as string | undefined;
    return { env, rpcUrl };
  }

  private async loadMnemonic(): Promise<string> {
    const db = await this.getDB();
    let mnemonic = await db.get("settings", "mnemonic");
    if (!mnemonic) {
      mnemonic = ethers.Wallet.createRandom().mnemonic?.phrase;
      if (!mnemonic) throw new Error("Failed to generate mnemonic");
      await db.put("settings", mnemonic, "mnemonic");
    }
    this.mnemonic = mnemonic;
    return mnemonic;
  }

  async generateAccounts(): Promise<Account[]> {
    const mnemonic = await this.loadMnemonic();
    const masterNode = ethers.HDNodeWallet.fromPhrase(mnemonic);

    const accounts: Account[] = [];
    const db = await this.getDB();

    for (let i = 0; i < 10; i++) {
      const wallet = masterNode.derivePath(`m/44'/60'/0'/0/${i}`);
      await db.put("accounts", { address: wallet.address, privateKey: wallet.privateKey }, wallet.address);
      this.localAccounts.set(wallet.address, wallet);

      const balance = await this.provider.getBalance(wallet.address);
      accounts.push({
        address: wallet.address,
        balance: ethers.formatEther(balance),
        index: i,
      });

      await this.fundLocalAccount(wallet.address);
    }

    return accounts;
  }

  private async fundLocalAccount(address: string): Promise<void> {
    const network = await this.getEnvironment();
    if (network.env !== Environment.LocalVM) return;

    try {
      const accounts = await this.provider.send("eth_accounts", []);
      if (!accounts[0]) throw new Error("No funding account available");
      const tx = await this.provider.send("eth_sendTransaction", [
        {
          from: accounts[0],
          to: address,
          value: ethers.parseEther("100.0").toString(),
          gas: "0x5208",
        },
      ]);
      await this.provider.waitForTransaction(tx);
    } catch (error) {
      console.warn(`Failed to fund account ${address}: ${error.message}`);
    }
  }

  async deployContract(input: DeploymentInput): Promise<DeployedContract> {
    const db = await this.getDB();
    const accounts = await this.getAccounts();
    const selectedAccount = this.localAccounts.get(accounts[0].address); // First account for simplicity
    if (!selectedAccount) throw new Error("No account selected");

    const signer = selectedAccount.connect(this.provider);
    const factory = new ethers.ContractFactory(input.abi, input.bytecode, signer);

    try {
      const deployTx = await factory.getDeployTransaction(...(input.constructorArgs || []));
      const estimatedGas = await this.provider.estimateGas(deployTx);
      const contract = await factory.deploy(...(input.constructorArgs || []), {
        gasLimit: (estimatedGas * BigInt(110)) / BigInt(100),
      });

      const txReceipt = await contract.deploymentTransaction()?.wait();
      if (!txReceipt) throw new Error("Deployment failed");

      const deployedAddress = await contract.getAddress();
      const { env, rpcUrl } = await this.getEnvironment();
      const deployedContract: DeployedContract = {
        address: deployedAddress,
        network: {
          name: env,
          rpcUrl: rpcUrl || "http://localhost:8545",
          chainId: (await this.provider.getNetwork()).chainId.toString(),
        },
        deployedBy: selectedAccount.address,
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

  async getAccounts(): Promise<Account[]> {
    const db = await this.getDB();
    const storedAccounts = await db.getAll("accounts");
    const accounts: Account[] = [];
    for (const acc of storedAccounts) {
      const balance = await this.provider.getBalance(acc.address);
      accounts.push({
        address: acc.address,
        balance: ethers.formatEther(balance),
        index: 0, 
      });
    }
    return accounts;
  }
}

export const deploymentService = new RemixDeploymentService();