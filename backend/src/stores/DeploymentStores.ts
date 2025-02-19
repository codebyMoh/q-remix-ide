
import { create } from 'zustand';
import { Account, Network, DeployedContract } from '../utils/types/deployment';

interface DeploymentStore {
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

export const useDeploymentStore = create<DeploymentStore>((set) => ({
    accounts: [],
    selectedAccount: null,
    selectedNetwork: {
        name: 'Local',
        chainId: 1337,
        rpcUrl: 'http://localhost:8545',
        symbol: 'ETH',
    },
    networks: [
        {
            name: 'Local',
            chainId: 1337,
            rpcUrl: 'http://localhost:8545',
            symbol: 'ETH',
        },
        {
            name: 'Sepolia',
            chainId: 11155111,
            rpcUrl: 'https://rpc.sepolia.org',
            symbol: 'ETH',
        },
        {
            name: 'Goerli',
            chainId: 5,
            rpcUrl: 'https://rpc.goerli.org',
            symbol: 'ETH',
        },
    ],
    deployedContracts: [],
    setAccounts: (accounts) => set({ accounts }),
    setSelectedAccount: (selectedAccount) => set({ selectedAccount }),
    setSelectedNetwork: (selectedNetwork) => set({ selectedNetwork }),
    addDeployedContract: (contract) =>
        set((state) => ({
            deployedContracts: [...state.deployedContracts, contract],
        })),
}));