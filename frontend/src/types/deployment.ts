export enum Environment {
    LocalVM = "local-vm",
    ExternalChain = "external-chain",
  }
  
  export interface Account {
    address: string;
    balance: string;
    index: number;
  }
  
  export interface Network {
    name: string;
    rpcUrl: string;
    chainId: string;
  }
  
  export interface DeployedContract {
    address: string;
    network: Network;
    deployedBy: string;
    timestamp: number;
    contractName: string;
    abi: any[];
    txHash: string;
    blockNumber: number;
  }
  
  export interface DeploymentInput {
    contractName: string;
    bytecode: string;
    abi: any[];
    constructorArgs?: any[];
  }