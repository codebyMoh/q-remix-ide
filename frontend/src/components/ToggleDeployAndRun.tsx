"use client";
import React, { useEffect, useState, useRef } from "react";
import { useAccount, useBalance, useChainId, useWriteContract, useDisconnect } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { sepolia } from "viem/chains";

type CompiledContract = {
  name: string;
  abi: any[];
  bytecode: string;
};

type DeployedContract = {
  address: string;
  name: string;
  chainId: number;
};

const ToggleDeployAndRun = () => {
  const { address, isConnected, chain } = useAccount();
  const { data: balance, refetch: refetchBalance } = useBalance({ address });
  const chainId = useChainId();
  const { writeContract, isPending, error } = useWriteContract();
  const { disconnect } = useDisconnect();
  const [compiledContracts, setCompiledContracts] = useState<CompiledContract[]>([]);
  const [deployedContracts, setDeployedContracts] = useState<DeployedContract[]>([]);
  const [selectedProvider, setSelectedProvider] = useState("");
  const connectButtonRef = useRef<HTMLButtonElement>(null);

  // Effect to handle wallet connection status and page reload
  useEffect(() => {
    // Function to reset wallet state
    const resetWalletState = () => {
      setSelectedProvider("");
      setDeployedContracts([]);
    };

    // Handle page reload
    const handlePageReload = () => {
      if (!isConnected) {
        resetWalletState();
      }
    };

    // Add event listeners for page reload
    window.addEventListener('load', handlePageReload);

    // Watch for connection status changes
    if (!isConnected) {
      resetWalletState();
    }

    // Cleanup event listeners
    return () => {
      window.removeEventListener('load', handlePageReload);
    };
  }, [isConnected]);

  // Automatically refresh balance when address changes or connection status changes
  useEffect(() => {
    if (address) {
      refetchBalance();
    }
  }, [address, isConnected, refetchBalance]);

  // Handle network mismatch
  const isCorrectNetwork = chain?.id === sepolia.id;

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedProvider(value);
    
    if (value === "injected-provider-metamask") {
      // Trigger the connect button click programmatically
      setTimeout(() => {
        const button = document.querySelector('[data-testid="rk-connect-button"]') as HTMLButtonElement;
        if (button) button.click();
      }, 0);
    }
  };

  // Handle disconnect
  const handleDisconnect = async () => {
    try {
      await disconnect();
      setSelectedProvider("");
      setDeployedContracts([]);
    } catch (err) {
      console.error("Disconnect failed:", err);
    }
  };

  // Temporary function to simulate contract deployment
  const handleDeploy = async (contract: CompiledContract) => {
    try {
      const txHash = await writeContract({
        abi: contract.abi,
        bytecode: contract.bytecode as `0x${string}`,
        functionName: "constructor",
        chainId: sepolia.id,
      });

      // Add to deployed contracts (you'd normally wait for confirmation)
      setDeployedContracts(prev => [
        ...prev,
        {
          address: "0x...", // Replace with actual address from transaction receipt
          name: contract.name,
          chainId: sepolia.id
        }
      ]);
    } catch (err) {
      console.error("Deployment failed:", err);
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* 1. Environment Box */}
      <div className="p-4 border border-gray-300 rounded-lg">
        <h2 className="text-lg font-bold mb-2">Environment</h2>
        <div className="flex items-center justify-between">
          <select 
            value={selectedProvider}
            onChange={handleProviderChange}
            className="p-2 border border-gray-300 rounded-md text-sm text-gray-600 mr-4"
          >
            <option value="">Select Provider</option>
            <option value="injected-provider-metamask">Injected Provider - MetaMask</option>
          </select>
          <div className="hidden">
            <ConnectButton 
              chainStatus="icon"
              accountStatus="address"
              showBalance={false}
            />
          </div>
        </div>
        {isConnected && !isCorrectNetwork && (
          <p className="text-red-500 text-sm mt-2">
             Wrong network. Please switch to Sepolia
          </p>
        )}
      </div>

      {/* 2. Account Info Box */}
      <div className="p-4 border border-gray-300 rounded-lg">
        <h2 className="text-lg font-bold mb-2">Account</h2>
        {isConnected ? (
          <>
            <p className="text-sm text-gray-600 break-all">
              Address: {address}
            </p>
            <p className="text-sm text-gray-600">
              Balance: {balance?.formatted.slice(0, 6)} {balance?.symbol}
            </p>
            <button
              onClick={handleDisconnect}
              className="mt-2 text-sm text-red-500 hover:text-red-600"
            >
              Disconnect
            </button>
          </>
        ) : (
          <p className="text-sm text-gray-600">Not connected</p>
        )}
      </div>

      {/* 3. Compiled Contracts Box */}
      <div className="p-4 border border-gray-300 rounded-lg">
        <h2 className="text-lg font-bold mb-2">Compiled Contracts</h2>
        {compiledContracts.length > 0 ? (
          compiledContracts.map((contract, index) => (
            <div key={index} className="p-2 border-b last:border-b-0">
              <div className="flex justify-between items-center">
                <span>{contract.name}</span>
                <button
                  onClick={() => handleDeploy(contract)}
                  disabled={!isConnected || !isCorrectNetwork || isPending}
                  className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 disabled:bg-gray-400"
                >
                  {isPending ? "Deploying..." : "Deploy"}
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-600">No contracts compiled yet.</p>
        )}
      </div>

      {/* 4. Deployed Contracts Box */}
      <div className="p-4 border border-gray-300 rounded-lg">
        <h2 className="text-lg font-bold mb-2">Deployed Contracts</h2>
        {deployedContracts.length > 0 ? (
          deployedContracts.map((contract, index) => (
            <div key={index} className="p-2 border-b last:border-b-0">
              <p className="text-sm">
                {contract.name} - {contract.address}
              </p>
              <p className="text-xs text-gray-500">
                Chain ID: {contract.chainId}
              </p>
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-600">No deployed contracts.</p>
        )}
        {error && (
          <p className="text-red-500 text-sm mt-2">
            Error: {error.message}
          </p>
        )}
      </div>
    </div>
  );
};

export default ToggleDeployAndRun;



