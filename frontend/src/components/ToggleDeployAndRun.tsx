"use client";
import React, { useEffect, useState } from "react";
import { useAccount, useBalance, useDisconnect } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
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
  // Get wallet state from Wagmi
  const { address, isConnected, chain } = useAccount();
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();

  // Use the connected chain's ID if available, otherwise fall back to Sepolia
  const effectiveChainId = chain?.id || sepolia.id;

  // Fetch the balance using the effective chain ID and only if an address is available
  const {
    data: balance,
    isLoading: balanceLoading,
    isError: balanceError,
  } = useBalance({
    address,
    chainId: effectiveChainId,
    enabled: Boolean(address),
    watch: true,
  });

  const [compiledContracts, setCompiledContracts] = useState<CompiledContract[]>([]);
  const [deployedContracts, setDeployedContracts] = useState<DeployedContract[]>([]);
  const [selectedProvider, setSelectedProvider] = useState("");

  // Check if the user is connected to Sepolia
  const isCorrectNetwork = effectiveChainId === sepolia.id;

  // Handler for provider selection
  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedProvider(value);
    if (value === "injected-provider-metamask" && openConnectModal) {
      openConnectModal();
    }
  };

  // Disconnect the wallet
  const handleDisconnect = async () => {
    try {
      await disconnect();
      setSelectedProvider("");
      setDeployedContracts([]);
    } catch (err) {
      console.error("Disconnect failed:", err);
    }
  };

  // Placeholder deploy function
  const handleDeploy = async (contract: CompiledContract) => {
    try {
      setDeployedContracts((prev) => [
        ...prev,
        {
          address: "0x1234567890123456789012345678901234567890",
          name: contract.name,
          chainId: sepolia.id,
        },
      ]);
    } catch (err) {
      console.error("Deployment failed:", err);
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Environment Box */}
      <div className="p-4 border border-gray-300 rounded-lg">
        <h2 className="text-lg font-bold mb-2">Environment</h2>
        <div className="flex items-center justify-between">
          <select
            value={selectedProvider}
            onChange={handleProviderChange}
            className="p-2 border border-gray-300 rounded-md text-sm text-gray-600 mr-4"
          >
            <option value="">Select Provider</option>
            <option value="injected-provider-metamask">
              Injected Provider - MetaMask
            </option>
          </select>
        </div>
        {isConnected && !isCorrectNetwork && (
          <p className="text-red-500 text-sm mt-2">
            Wrong network. Please switch to Sepolia
          </p>
        )}
      </div>

      {/* Account Info Box */}
      <div className="p-4 border border-gray-300 rounded-lg">
        <h2 className="text-lg font-bold mb-2">Account</h2>
        {isConnected ? (
          <>
            <p className="text-sm text-gray-600 break-all">
              Address: {address}
            </p>
            {balanceLoading ? (
              <p className="text-sm text-gray-600">Balance: Loading...</p>
            ) : !balanceError && balance ? (
              <p className="text-sm text-gray-600">
                Balance: {balance.formatted} {balance.symbol}
              </p>
            ) : (
              <p className="text-sm text-gray-600">Balance: N/A</p>
            )}
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

      {/* Compiled Contracts Box */}
      <div className="p-4 border border-gray-300 rounded-lg">
        <h2 className="text-lg font-bold mb-2">Compiled Contracts</h2>
        {compiledContracts.length > 0 ? (
          compiledContracts.map((contract, index) => (
            <div key={index} className="p-2 border-b last:border-b-0">
              <div className="flex justify-between items-center">
                <span>{contract.name}</span>
                <button
                  onClick={() => handleDeploy(contract)}
                  disabled={!isConnected || !isCorrectNetwork}
                  className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 disabled:bg-gray-400"
                >
                  Deploy
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-600">
            No contracts compiled yet.
          </p>
        )}
      </div>

      {/* Deployed Contracts Box */}
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
          <p className="text-sm text-gray-600">
            No deployed contracts.
          </p>
        )}
      </div>
    </div>
  );
};

export default ToggleDeployAndRun;




