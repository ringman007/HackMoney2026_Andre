import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, formatUnits } from 'viem';
import { mainnet, arbitrum, base, optimism } from 'viem/chains';

interface Chain {
  id: number;
  key: string;
  name: string;
}

interface TokenBalance {
  chain: Chain;
  token: string;
  symbol: string;
  balance: string;
  decimals: number;
  balanceFormatted: string;
}

const SUPPORTED_CHAINS: Chain[] = [
  { id: 1, key: 'eth', name: 'Ethereum' },
  { id: 42161, key: 'arb', name: 'Arbitrum' },
  { id: 8453, key: 'bas', name: 'Base' },
  { id: 10, key: 'opt', name: 'Optimism' },
];

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

const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

const CHAIN_CONFIGS = {
  1: mainnet,
  42161: arbitrum,
  8453: base,
  10: optimism,
};

export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json();

    if (!address) {
      return NextResponse.json({ error: 'No address provided' }, { status: 400 });
    }

    const balances: TokenBalance[] = [];

    // Fetch all balances in parallel
    const promises: Promise<TokenBalance | null>[] = [];

    for (const chain of SUPPORTED_CHAINS) {
      const client = createPublicClient({
        chain: CHAIN_CONFIGS[chain.id as keyof typeof CHAIN_CONFIGS],
        transport: http(),
      });

      // Native ETH
      promises.push(
        client.getBalance({ address: address as `0x${string}` })
          .then((balance) => {
            if (balance > 0n) {
              return {
                chain,
                token: '0x0000000000000000000000000000000000000000',
                symbol: 'ETH',
                balance: balance.toString(),
                decimals: 18,
                balanceFormatted: formatUnits(balance, 18),
              };
            }
            return null;
          })
          .catch(() => null)
      );

      // ERC20 tokens
      const tokens = TOKENS[chain.id];
      if (tokens) {
        for (const [symbol, tokenInfo] of Object.entries(tokens)) {
          promises.push(
            client.readContract({
              address: tokenInfo.address as `0x${string}`,
              abi: ERC20_ABI,
              functionName: 'balanceOf',
              args: [address as `0x${string}`],
            })
              .then((balance) => {
                if (balance > 0n) {
                  return {
                    chain,
                    token: tokenInfo.address,
                    symbol,
                    balance: balance.toString(),
                    decimals: tokenInfo.decimals,
                    balanceFormatted: formatUnits(balance, tokenInfo.decimals),
                  };
                }
                return null;
              })
              .catch(() => null)
          );
        }
      }
    }

    const results = await Promise.all(promises);
    for (const result of results) {
      if (result) {
        balances.push(result);
      }
    }

    return NextResponse.json({ balances });
  } catch (error) {
    console.error('Portfolio error:', error);
    return NextResponse.json({ error: 'Failed to fetch portfolio' }, { status: 500 });
  }
}
