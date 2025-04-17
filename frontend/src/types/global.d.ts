interface Window {
  ethereum?: {
    isMetaMask?: boolean;
    request: (args: { method: string; params?: any[] }) => Promise<any>;
    on: (event: string, callback: (...args: any[]) => void) => void;
    removeListener: (event: string, callback: (...args: any[]) => void) => void;
    selectedAddress?: string;
    chainId?: string;
    networkVersion?: string;
  };
}

declare module 'xterm/css/xterm.css';

interface CustomEventMap {
  "deploymentOutput": CustomEvent<DeployedContract>;
  "transactionOutput": CustomEvent<{
    transactionHash: string;
    contract: DeployedContract;
    functionName: string;
  }>;
  "compilationOutput": CustomEvent<any>;
}

declare global {
  interface Window {
    addEventListener<K extends keyof CustomEventMap>(
      type: K,
      listener: (this: Window, ev: CustomEventMap[K]) => void
    ): void;
    dispatchEvent<K extends keyof CustomEventMap>(ev: CustomEventMap[K]): boolean;
  }
} 