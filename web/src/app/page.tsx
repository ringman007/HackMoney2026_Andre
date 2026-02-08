'use client';

import { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';

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

interface RebalanceAction {
  type: 'swap' | 'bridge';
  fromChain: number;
  toChain: number;
  fromToken: string;
  toToken: string;
  amount: string;
  amountFormatted: string;
}

interface Strategy {
  actions: RebalanceAction[];
  reasoning: string;
}

interface Quote {
  tool: string;
  type: string;
  estimate: {
    toAmount: string;
    executionDuration: number;
  };
  transactionRequest?: {
    to: string;
    data: string;
    chainId: number;
  };
}

export default function Home() {
  const { address: connectedAddress, isConnected } = useAccount();
  const [wallet, setWallet] = useState('vitalik.eth');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [resolved, setResolved] = useState<{ address: string; ensName?: string } | null>(null);
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [quotes, setQuotes] = useState<{ action: RebalanceAction; quote: Quote | null }[]>([]);
  const [error, setError] = useState('');

  // Use connected wallet address if available
  useEffect(() => {
    if (isConnected && connectedAddress) {
      setWallet(connectedAddress);
    }
  }, [isConnected, connectedAddress]);

  const targetAllocation = { ETH: 40, USDC: 40, WETH: 20 };

  const runAgent = async () => {
    setLoading(true);
    setError('');
    setStep(0);
    setResolved(null);
    setBalances([]);
    setStrategy(null);
    setQuotes([]);

    try {
      // Step 1: Resolve ENS
      setStep(1);
      const resolveRes = await fetch('/api/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: wallet }),
      });
      const resolveData = await resolveRes.json();
      if (resolveData.error) throw new Error(resolveData.error);
      setResolved(resolveData);

      // Step 2: Fetch portfolio
      setStep(2);
      const portfolioRes = await fetch('/api/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: resolveData.address }),
      });
      const portfolioData = await portfolioRes.json();
      if (portfolioData.error) throw new Error(portfolioData.error);
      setBalances(portfolioData.balances);

      // Step 3: Generate strategy
      setStep(3);
      const strategyRes = await fetch('/api/strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ balances: portfolioData.balances, targetAllocation }),
      });
      const strategyData = await strategyRes.json();
      if (strategyData.error) throw new Error(strategyData.error);
      setStrategy(strategyData);

      // Step 4: Get quotes
      setStep(4);
      const quotePromises = strategyData.actions.map(async (action: RebalanceAction) => {
        try {
          const quoteRes = await fetch('/api/quote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, fromAddress: resolveData.address }),
          });
          const quoteData = await quoteRes.json();
          return { action, quote: quoteData.error ? null : quoteData };
        } catch {
          return { action, quote: null };
        }
      });
      const quotesData = await Promise.all(quotePromises);
      setQuotes(quotesData);

      setStep(5);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const chainName = (id: number) => {
    const chains: Record<number, string> = { 1: 'Ethereum', 42161: 'Arbitrum', 8453: 'Base', 10: 'Optimism' };
    return chains[id] || `Chain ${id}`;
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header with Wallet Connect */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              🚀 ChainHopper Agent
            </h1>
            <p className="text-gray-400">AI-Powered Cross-Chain Portfolio Rebalancer</p>
          </div>
          <ConnectButton />
        </div>

        {/* Connected Status */}
        {isConnected && (
          <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-3 mb-6 flex items-center gap-2">
            <span className="text-green-400">●</span>
            <span className="text-green-300 text-sm">Wallet connected - ready to execute transactions</span>
          </div>
        )}

        {/* Input Section */}
        <div className="bg-gray-800/50 backdrop-blur rounded-2xl p-6 mb-8 border border-gray-700">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Wallet Address or ENS Name
          </label>
          <div className="flex gap-4">
            <input
              type="text"
              value={wallet}
              onChange={(e) => setWallet(e.target.value)}
              placeholder="vitalik.eth or 0x..."
              className="flex-1 bg-gray-900 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              onClick={runAgent}
              disabled={loading}
              className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 transition-all"
            >
              {loading ? 'Running...' : 'Analyze & Rebalance'}
            </button>
          </div>
          <div className="mt-4 text-sm text-gray-400">
            Target Allocation: {Object.entries(targetAllocation).map(([k, v]) => `${k}: ${v}%`).join(' | ')}
          </div>
        </div>

        {/* Progress Steps */}
        {step > 0 && (
          <div className="flex justify-between mb-8">
            {['ENS', 'Portfolio', 'AI Strategy', 'LI.FI Quotes', 'Done'].map((label, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  step > i + 1 ? 'bg-green-500' : step === i + 1 ? 'bg-purple-500 animate-pulse' : 'bg-gray-700'
                }`}>
                  {step > i + 1 ? '✓' : i + 1}
                </div>
                <span className="text-xs mt-2 text-gray-400">{label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 rounded-xl p-4 mb-8 text-red-300">
            ❌ {error}
          </div>
        )}

        {/* Resolved Address */}
        {resolved && (
          <div className="bg-gray-800/50 backdrop-blur rounded-2xl p-6 mb-6 border border-gray-700">
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
              <span className="text-2xl">🔍</span> Wallet Resolved
            </h2>
            <div className="font-mono text-sm">
              {resolved.ensName && (
                <div className="text-purple-400 text-lg mb-1">{resolved.ensName}</div>
              )}
              <div className="text-gray-400">{resolved.address}</div>
            </div>
          </div>
        )}

        {/* Portfolio */}
        {balances.length > 0 && (
          <div className="bg-gray-800/50 backdrop-blur rounded-2xl p-6 mb-6 border border-gray-700">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className="text-2xl">💰</span> Portfolio ({balances.length} assets)
            </h2>
            <div className="grid gap-2">
              {balances.map((b, i) => (
                <div key={i} className="flex justify-between items-center bg-gray-900/50 rounded-lg px-4 py-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs bg-purple-500/30 text-purple-300 px-2 py-1 rounded">{b.chain.name}</span>
                    <span className="font-medium">{b.symbol}</span>
                  </div>
                  <span className="font-mono">{parseFloat(b.balanceFormatted).toFixed(4)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Strategy */}
        {strategy && (
          <div className="bg-gray-800/50 backdrop-blur rounded-2xl p-6 mb-6 border border-gray-700">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className="text-2xl">🤖</span> AI Strategy
            </h2>
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 mb-4">
              <p className="text-purple-200">{strategy.reasoning}</p>
            </div>
            {strategy.actions.length === 0 ? (
              <p className="text-green-400">✅ Portfolio is already balanced!</p>
            ) : (
              <div className="space-y-3">
                {strategy.actions.map((action, i) => (
                  <div key={i} className="bg-gray-900/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        action.type === 'bridge' ? 'bg-blue-500' : 'bg-green-500'
                      }`}>
                        {action.type.toUpperCase()}
                      </span>
                      <span className="font-medium">{action.amountFormatted}</span>
                    </div>
                    <div className="text-sm text-gray-400">
                      {chainName(action.fromChain)} → {chainName(action.toChain)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Quotes */}
        {quotes.length > 0 && (
          <div className="bg-gray-800/50 backdrop-blur rounded-2xl p-6 mb-6 border border-gray-700">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className="text-2xl">💱</span> LI.FI Quotes
            </h2>
            <div className="space-y-3">
              {quotes.map(({ action, quote }, i) => (
                <div key={i} className={`rounded-lg p-4 ${quote ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{action.amountFormatted}</div>
                      <div className="text-sm text-gray-400">
                        {chainName(action.fromChain)} → {chainName(action.toChain)}
                      </div>
                    </div>
                    {quote ? (
                      <div className="text-right">
                        <div className="text-green-400 font-medium">✅ Ready</div>
                        <div className="text-xs text-gray-400">via {quote.tool} • ~{quote.estimate.executionDuration}s</div>
                      </div>
                    ) : (
                      <div className="text-red-400">❌ Failed</div>
                    )}
                  </div>
                  {quote?.transactionRequest && (
                    <div className="mt-3 text-xs font-mono bg-gray-900 rounded p-2 overflow-x-auto">
                      <div>To: {quote.transactionRequest.to}</div>
                      <div>Data: {quote.transactionRequest.data.slice(0, 50)}...</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        {step === 5 && (
          <div className="text-center bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl p-6 border border-purple-500/30">
            <h2 className="text-2xl font-bold mb-2">🎉 Analysis Complete!</h2>
            <p className="text-gray-300">Transaction data is ready. Connect your wallet to execute.</p>
          </div>
        )}

        {/* Powered By */}
        <div className="mt-12 text-center text-gray-500 text-sm">
          Powered by <span className="text-purple-400">LI.FI</span> • <span className="text-purple-400">ENS</span> • <span className="text-purple-400">OpenAI</span>
          <br />
          Built for HackMoney 2026
        </div>
      </div>
    </main>
  );
}
