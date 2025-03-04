import { useState, useEffect } from "react";
import { deploymentService } from "@/services/deployment-service";
import { Account, DeployedContract, DeploymentInput, Environment } from "@/types/deployment";

export const useDeployment = () => {
  const [environment] = useState<Environment>(Environment.ExternalChain); // Default to MetaMask
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [deployedContracts, setDeployedContracts] = useState<DeployedContract[]>([]);
  const [gasLimit, setGasLimit] = useState<string>("3000000");
  const [value, setValue] = useState<string>("0");
  const [valueUnit, setValueUnit] = useState<string>("wei");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        await deploymentService.setEnvironment(Environment.ExternalChain);
        const fetchedAccounts = await deploymentService.getAccounts();
        setAccounts(fetchedAccounts);
        setSelectedAccount(fetchedAccounts[0]?.address || "");
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    init();

    // Listen for account changes in MetaMask
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", async (newAccounts: string[]) => {
        if (newAccounts.length > 0) {
          const updatedAccounts = await deploymentService.getAccounts();
          setAccounts(updatedAccounts);
          setSelectedAccount(updatedAccounts[0]?.address || "");
        }
      });
    }
  }, []);

  const deployContract = async (input: DeploymentInput) => {
    setLoading(true);
    try {
      const deployedContract = await deploymentService.deployContract(input);
      setDeployedContracts((prev) => [...prev, deployedContract]);
      return deployedContract;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loadContractAtAddress = async (address: string, abi: any[]) => {
    setLoading(true);
    try {
      const contract: DeployedContract = {
        address,
        network: {
          name: environment,
          rpcUrl: "MetaMask Provided",
          chainId: "unknown", // Fetch dynamically if needed
        },
        deployedBy: selectedAccount,
        timestamp: Date.now(),
        contractName: "LoadedContract",
        abi,
        txHash: "",
        blockNumber: 0,
      };
      setDeployedContracts((prev) => [...prev, contract]);
      return contract;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    environment,
    accounts,
    selectedAccount,
    setSelectedAccount,
    deployedContracts,
    gasLimit,
    setGasLimit,
    value,
    setValue,
    valueUnit,
    setValueUnit,
    deployContract,
    loadContractAtAddress,
    loading,
    error,
  };
};