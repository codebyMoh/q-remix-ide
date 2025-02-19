import { JsonRpcProvider } from '@ethersproject/providers';
import "@nomicfoundation/hardhat-ethers";
import { ethers } from 'hardhat';
import { RemixDeploymentService } from './../../services/blockchain/deployService';
import { DeploymentInput } from './../types/deployment';

// Mock the deployment store for testing
jest.mock('../../stores/DeploymentStores', () => ({
  useDeploymentStore: {
    getState: jest.fn(() => ({
      selectedNetwork: { name: 'Local', chainId: 1337, rpcUrl: 'http://localhost:8545', symbol: 'ETH' },
      setAccounts: jest.fn(),
      setSelectedAccount: jest.fn(),
      addDeployedContract: jest.fn(),
    })),
  },
}));

describe('RemixDeploymentService', () => {
  let service: RemixDeploymentService;
  let provider: JsonRpcProvider;

  beforeAll(async () => {
    // Cast Hardhat's provider to JsonRpcProvider
    provider = ethers.provider as unknown as JsonRpcProvider;
    service = new RemixDeploymentService();
    // Ensure the provider is initialized for local tests
    await service.initializeProvider();
  });

  test('should generate 10 accounts', async () => {
    const accounts = await service.generateAccounts();
    expect(accounts).toHaveLength(10);
    expect(accounts[0]).toHaveProperty('address');
    expect(accounts[0]).toHaveProperty('balance');
    expect(accounts[0]).toHaveProperty('index');
  });

  test('should fund local accounts', async () => {
    // Assuming fundLocalAccount is called within generateAccounts for chainId 1337
    const accounts = await service.generateAccounts();
    const balance = await provider.getBalance(accounts[0].address);
    expect(balance.gt(ethers.parseEther("0"))).toBe(true); // Check if balance is greater than 0
  });

  test('should deploy a contract', async () => {
    const mockInput: DeploymentInput = {
      contractName: "TestContract",
      bytecode: "0x608060405234801561001057600080fd5b5061013d806100206000396000f3fe608060405234801561001057600080fd5b50600436106100365760003560e01c806360fe47b11461003b5780636d4ce63c14610057575b600080fd5b610043610075565b6040518082815260200191505060405180910390f35b610073600480360381019061006e919061009d565b61007e565b005b60008054905090565b8060008190555050565b6000819050919050565b61009781610084565b82525050565b60006020820190506100b2600083018461008e565b9291505056fea2646970667358221220515d7e86f9a79b8d92047770a2c54e1180a9b62892878962a2b4c5278676033b64736f6c63430008120033",
      abi: [{"inputs":[{"internalType":"uint256","name":"x","type":"uint256"}],"name":"set","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"get","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}],
    };

    const deployed = await service.deployContract(mockInput);
    expect(deployed).toHaveProperty('address');
    expect(deployed).toHaveProperty('network');
    expect(deployed).toHaveProperty('deployedBy');
    expect(deployed).toHaveProperty('timestamp');
    expect(deployed).toHaveProperty('contractName');
    expect(deployed).toHaveProperty('abi');

    // Check if a transaction was sent
    const txCount = await provider.getTransactionCount(deployed.deployedBy);
    expect(txCount).toBeGreaterThan(0);
  });
});