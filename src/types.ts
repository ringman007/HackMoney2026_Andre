// Chain configuration
export interface Chain {
  id: number;
  key: string;
  name: string;
}

// Token balance on a specific chain
export interface TokenBalance {
  chain: Chain;
  token: string;
  symbol: string;
  balance: bigint;
  decimals: number;
  balanceFormatted: string;
  valueUsd?: number;
}

// Portfolio state across all chains
export interface Portfolio {
  address: string;
  ensName?: string;
  balances: TokenBalance[];
  totalValueUsd: number;
}

// Target allocation for rebalancing
export interface TargetAllocation {
  [tokenSymbol: string]: number; // percentage (0-100)
}

// Single rebalancing action
export interface RebalanceAction {
  type: 'swap' | 'bridge';
  fromChain: number;
  toChain: number;
  fromToken: string;
  toToken: string;
  amount: string; // in wei/smallest unit
  amountFormatted: string;
}

// AI agent's rebalancing strategy
export interface RebalanceStrategy {
  actions: RebalanceAction[];
  reasoning: string;
}

// LI.FI quote response (simplified)
export interface LiFiQuote {
  id: string;
  type: string;
  tool: string;
  action: {
    fromChainId: number;
    toChainId: number;
    fromToken: { symbol: string; address: string };
    toToken: { symbol: string; address: string };
    fromAmount: string;
    toAmount: string;
  };
  estimate: {
    fromAmount: string;
    toAmount: string;
    toAmountMin: string;
    approvalAddress: string;
    executionDuration: number;
    feeCosts: Array<{ amount: string; token: { symbol: string } }>;
    gasCosts: Array<{ amount: string; token: { symbol: string } }>;
  };
  transactionRequest?: {
    to: string;
    data: string;
    value: string;
    gasLimit: string;
    chainId: number;
  };
}

// Execution result
export interface ExecutionResult {
  action: RebalanceAction;
  quote: LiFiQuote;
  txHash?: string;
  status: 'quoted' | 'pending' | 'success' | 'failed';
}
