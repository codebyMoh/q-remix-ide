// Alchemy API configuration

// Network RPC URLs
export const ALCHEMY_RPC_URLS = {
  // Testnets
  sepolia: 'https://eth-sepolia.g.alchemy.com/v2/',
  goerli: 'https://eth-goerli.g.alchemy.com/v2/',
  mumbai: 'https://polygon-mumbai.g.alchemy.com/v2/',
  
  // Mainnets
  mainnet: 'https://eth-mainnet.g.alchemy.com/v2/',
  polygon: 'https://polygon-mainnet.g.alchemy.com/v2/',
  optimism: 'https://opt-mainnet.g.alchemy.com/v2/',
  arbitrum: 'https://arb-mainnet.g.alchemy.com/v2/',
};

export const ALCHEMY_API_KEYS = {
  // Testnets
  sepolia: process.env.NEXT_PUBLIC_ALCHEMY_SEPOLIA_API_KEY || '',
  goerli: process.env.NEXT_PUBLIC_ALCHEMY_GOERLI_API_KEY || '',
  mumbai: process.env.NEXT_PUBLIC_ALCHEMY_MUMBAI_API_KEY || '',
  
  // Mainnets
  mainnet: process.env.NEXT_PUBLIC_ALCHEMY_MAINNET_API_KEY || '',
  polygon: process.env.NEXT_PUBLIC_ALCHEMY_POLYGON_API_KEY || '',
  optimism: process.env.NEXT_PUBLIC_ALCHEMY_OPTIMISM_API_KEY || '',
  arbitrum: process.env.NEXT_PUBLIC_ALCHEMY_ARBITRUM_API_KEY || '',
};

// Default network to use
export const DEFAULT_NETWORK = 'sepolia';

// Get API key for a specific network
export const getAlchemyApiKey = (network: string = DEFAULT_NETWORK): string => {
  const networkKey = network as keyof typeof ALCHEMY_API_KEYS;
  const key = ALCHEMY_API_KEYS[networkKey] || ALCHEMY_API_KEYS[DEFAULT_NETWORK as keyof typeof ALCHEMY_API_KEYS];
  
  console.log(`Getting Alchemy API key for network: ${network}`);
  if (!key) {
    console.warn(`No API key found for network: ${network}`);
  }
  
  return key;
};

// Get full RPC URL for a specific network
export const getAlchemyRpcUrl = (network: string = DEFAULT_NETWORK): string => {
  const networkKey = network as keyof typeof ALCHEMY_RPC_URLS;
  const baseUrl = ALCHEMY_RPC_URLS[networkKey] || ALCHEMY_RPC_URLS[DEFAULT_NETWORK as keyof typeof ALCHEMY_RPC_URLS];
  const apiKey = getAlchemyApiKey(network);
  
  return `${baseUrl}${apiKey}`;
}; 