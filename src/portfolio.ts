import { createPublicClient, http, formatUnits } from 'viem';
import { mainnet, arbitrum, base, optimism } from 'viem/chains';
import type { Chain, TokenBalance, Portfolio } from './types.js';

// Supported chains
export const SUPPORTED_CHAINS: Chain[] = [
  { id: 1, key: 'eth', name: 'Ethereum' },
  { id: 42161, key: 'arb', name: 'Arbitrum' },
  { id: 8453, key: 'bas', name: 'Base' },
  { id: 10, key: 'opt', name: 'Optimism' },
];

// Common token addresses per chain
const TOKENS: Record<number, Record<string, { address: string; decimals: number }>> = {
  1: {
    USDC: { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
    USDT: { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
    WETH: { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18 },
  },
  42161: {
    USDC: { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6 },
    USDT: { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6 },
    WETH: { address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', decimals: 18 },
  },
  8453: {
    USDC: { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
    WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
  },
  10: {
    USDC: { address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', decimals: 6 },
    WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
  },
};

// ERC20 ABI for balanceOf
const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

// Chain configs for viem
const CHAIN_CONFIGS = {
  1: mainnet,
  42161: arbitrum,
  8453: base,
  10: optimism,
};

/**
 * Get native ETH balance on a chain
 */
async function getNativeBalance(
  chainId: number,
  address: string
): Promise<TokenBalance | null> {
  const chain = SUPPORTED_CHAINS.find((c) => c.id === chainId);
  if (!chain) return null;

  const client = createPublicClient({
    chain: CHAIN_CONFIGS[chainId as keyof typeof CHAIN_CONFIGS],
    transport: http(),
  });

  try {
    const balance = await client.getBalance({ address: address as `0x${string}` });
    return {
      chain,
      token: '0x0000000000000000000000000000000000000000',
      symbol: 'ETH',
      balance,
      decimals: 18,
      balanceFormatted: formatUnits(balance, 18),
    };
  } catch (error) {
    console.error(`Error fetching ETH balance on ${chain.name}:`, error);
    return null;
  }
}

/**
 * Get ERC20 token balance on a chain
 */
async function getTokenBalance(
  chainId: number,
  address: string,
  tokenSymbol: string
): Promise<TokenBalance | null> {
  const chain = SUPPORTED_CHAINS.find((c) => c.id === chainId);
  const tokenInfo = TOKENS[chainId]?.[tokenSymbol];
  if (!chain || !tokenInfo) return null;

  const client = createPublicClient({
    chain: CHAIN_CONFIGS[chainId as keyof typeof CHAIN_CONFIGS],
    transport: http(),
  });

  try {
    const balance = await client.readContract({
      address: tokenInfo.address as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [address as `0x${string}`],
    });

    return {
      chain,
      token: tokenInfo.address,
      symbol: tokenSymbol,
      balance,
      decimals: tokenInfo.decimals,
      balanceFormatted: formatUnits(balance, tokenInfo.decimals),
    };
  } catch (error) {
    console.error(`Error fetching ${tokenSymbol} on ${chain.name}:`, error);
    return null;
  }
}

/**
 * Fetch full portfolio across all supported chains
 */
export async function fetchPortfolio(
  address: string,
  ensName?: string
): Promise<Portfolio> {
  console.log('\n📊 Fetching portfolio across chains...');
  console.log(`   Address: ${address}`);
  if (ensName) console.log(`   ENS: ${ensName}`);

  const balances: TokenBalance[] = [];

  // Fetch balances in parallel
  const promises: Promise<TokenBalance | null>[] = [];

  for (const chain of SUPPORTED_CHAINS) {
    // Native ETH
    promises.push(getNativeBalance(chain.id, address));
    
    // ERC20 tokens
    const tokens = TOKENS[chain.id];
    if (tokens) {
      for (const symbol of Object.keys(tokens)) {
        promises.push(getTokenBalance(chain.id, address, symbol));
      }
    }
  }

  const results = await Promise.all(promises);
  
  for (const result of results) {
    if (result && result.balance > 0n) {
      balances.push(result);
    }
  }

  // Log results
  console.log('\n💰 Portfolio Summary:');
  console.log('─'.repeat(50));
  
  if (balances.length === 0) {
    console.log('   No balances found');
  } else {
    for (const b of balances) {
      console.log(`   ${b.chain.name.padEnd(12)} │ ${b.symbol.padEnd(6)} │ ${b.balanceFormatted}`);
    }
  }
  console.log('─'.repeat(50));

  return {
    address,
    ensName,
    balances,
    totalValueUsd: 0, // Would need price oracle for accurate value
  };
}
