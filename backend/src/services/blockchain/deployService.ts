// src/services/deploymentService.ts
import { ethers } from 'ethers';
import { useDeploymentStore } from './../../stores/DeploymentStores';
import {
    Account,
    Network,
    DeployedContract,
    DeploymentInput,
} from './../../utils/types/deployment';

declare global {
    interface Window {
        ethereum?: any;
    }
}

export class RemixDeploymentService {
    private provider!: ethers.JsonRpcProvider;
    private localAccounts: Map<string, ethers.HDNodeWallet> = new Map();
    private store = useDeploymentStore;

    constructor() {
        this.initializeProvider();
    }

    private async initializeProvider() {
        const network = this.store.getState().selectedNetwork;
        this.provider = new ethers.JsonRpcProvider(network.rpcUrl);
        await this.provider.ready;
    }

    async generateAccounts(): Promise<Account[]> {
        const mnemonic = ethers.Wallet.createRandom().mnemonic;
        if (!mnemonic) throw new Error('Failed to generate mnemonic');

        const masterNode = ethers.HDNodeWallet.fromPhrase(mnemonic.phrase);

        const accounts: Account[] = [];

        for (let i = 0; i < 10; i++) {
            const wallet = masterNode.derivePath(`m/44'/60'/0'/0/${i}`) as ethers.HDNodeWallet;
            this.localAccounts.set(wallet.address, wallet);

            if (this.provider._network.chainId === BigInt(1337)) {
                await this.fundLocalAccount(wallet.address);
            }

            const balance = await this.provider.getBalance(wallet.address);
            accounts.push({
                address: wallet.address,
                balance: ethers.formatEther(balance),
                index: i,
            });
        }

        this.store.getState().setAccounts(accounts);
        if (accounts.length > 0) {
            this.store.getState().setSelectedAccount(accounts[0]);
        }

        return accounts;
    }

    private async fundLocalAccount(address: string): Promise<void> {
        if (this.provider._network.chainId !== BigInt(1337)) return;

        const accounts = await this.provider.send('eth_accounts', []);
        await this.provider.send('eth_sendTransaction', [
            {
                from: accounts[0],
                to: address,
                value: ethers.parseEther('100.0').toString(),
                gas: '0x5208',
            },
        ]);
    }

    async deployContract(input: DeploymentInput): Promise<DeployedContract> {
        const selectedAccount = this.store.getState().selectedAccount;
        if (!selectedAccount) throw new Error('No account selected');

        const wallet = this.localAccounts.get(selectedAccount.address);
        if (!wallet) throw new Error('Account not found');

        const signer = wallet.connect(this.provider);
        const factory = new ethers.ContractFactory(
            input.abi,
            input.bytecode,
            signer,
        );

        // Estimate gas with constructor args
        const deployTx = await factory.getDeployTransaction(
            ...(input.constructorArgs || []),
        );
        const estimatedGas = await this.provider.estimateGas(deployTx);

        // Deploy with 10% gas buffer
        const contract = await factory.deploy(...(input.constructorArgs || []), {
            gasLimit: (estimatedGas * BigInt(110)) / BigInt(100),
        });

        await contract.waitForDeployment();
        const deployedAddress = await contract.getAddress();

        // Add to deployed contracts list
        const deployedContract: DeployedContract = {
            address: deployedAddress,
            network: this.store.getState().selectedNetwork,
            deployedBy: selectedAccount.address,
            timestamp: Date.now(),
            contractName: input.contractName,
            abi: input.abi,
        };

        this.store.getState().addDeployedContract(deployedContract);
        return deployedContract;
    }

    async switchNetwork(network: Network): Promise<void> {
        this.store.getState().setSelectedNetwork(network);
        await this.initializeProvider();

        // Refresh account balances
        const accounts = this.store.getState().accounts;
        const updatedAccounts = await Promise.all(
            accounts.map(async (account) => ({
                ...account,
                balance: ethers.formatEther(
                    await this.provider.getBalance(account.address),
                ),
            })),
        );

        this.store.getState().setAccounts(updatedAccounts);
    }

    async connectExternalWallet(): Promise<Account> {
        if (typeof window.ethereum !== 'undefined') {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const address = await signer.getAddress();

            const account: Account = {
                address,
                balance: ethers.formatEther(await provider.getBalance(address)),
                index: -1, // External wallet
            };

            this.store.getState().setSelectedAccount(account);
            return account;
        }
        throw new Error('No external wallet detected');
    }
}