// src/utils/types/deployment.ts

export interface Account {
    address: string;
    balance: string;
    index: number;
}

export interface Network {
    name: string;
    chainId: number;
    rpcUrl: string;
    symbol: string;
    explorer?: string;
}

export interface DeployedContract {
    address: string;
    network: Network;
    deployedBy: string;
    timestamp: number;
    contractName: string;
    abi: any[];
}

export interface DeploymentInput {
    contractName: string;
    bytecode: string;
    abi: any[];
    constructorArgs?: any[];
    accountAddress?: string;
}

export interface DeploymentStore {
    accounts: Account[];
    selectedAccount: Account | null;
    selectedNetwork: Network;
    networks: Network[];
    deployedContracts: DeployedContract[];
    setAccounts: (accounts: Account[]) => void;
    setSelectedAccount: (account: Account) => void;
    setSelectedNetwork: (network: Network) => void;
    addDeployedContract: (contract: DeployedContract) => void;
}