import type { RebalanceAction, LiFiQuote, ExecutionResult } from './types.js';

const LIFI_API_BASE = 'https://li.quest/v1';

/**
 * Get a quote from LI.FI for a swap/bridge action
 */
export async function getQuote(
  action: RebalanceAction,
  fromAddress: string
): Promise<LiFiQuote> {
  console.log(`\n🔄 Getting LI.FI quote for ${action.amountFormatted}...`);
  console.log(`   Route: ${action.fromToken} (Chain ${action.fromChain}) → ${action.toToken} (Chain ${action.toChain})`);

  const params = new URLSearchParams({
    fromChain: action.fromChain.toString(),
    toChain: action.toChain.toString(),
    fromToken: action.fromToken,
    toToken: action.toToken,
    fromAmount: action.amount,
    fromAddress: fromAddress,
  });

  const url = `${LIFI_API_BASE}/quote?${params}`;
  console.log(`   API: ${url}`);

  const response = await fetch(url);
  
  if (!response.ok) {
    const error = await response.text();
    console.error(`❌ LI.FI API error: ${error}`);
    throw new Error(`LI.FI API error: ${response.status} ${error}`);
  }

  const quote = (await response.json()) as LiFiQuote;

  // Log quote details
  console.log('\n📋 Quote Details:');
  console.log('─'.repeat(50));
  console.log(`   Tool: ${quote.tool}`);
  console.log(`   Type: ${quote.type}`);
  console.log(`   From: ${quote.action.fromAmount} ${quote.action.fromToken.symbol}`);
  console.log(`   To: ${quote.estimate.toAmount} ${quote.action.toToken.symbol}`);
  console.log(`   Min Received: ${quote.estimate.toAmountMin}`);
  console.log(`   Est. Duration: ${quote.estimate.executionDuration}s`);
  
  if (quote.estimate.feeCosts?.length > 0) {
    console.log(`   Fees: ${quote.estimate.feeCosts.map(f => `${f.amount} ${f.token.symbol}`).join(', ')}`);
  }
  if (quote.estimate.gasCosts?.length > 0) {
    console.log(`   Gas: ${quote.estimate.gasCosts.map(g => `${g.amount} ${g.token.symbol}`).join(', ')}`);
  }
  
  if (quote.transactionRequest) {
    console.log('\n   📦 Transaction Ready:');
    console.log(`   To: ${quote.transactionRequest.to}`);
    console.log(`   Value: ${quote.transactionRequest.value}`);
    console.log(`   Chain ID: ${quote.transactionRequest.chainId}`);
    console.log(`   Data: ${quote.transactionRequest.data.slice(0, 66)}...`);
  }
  console.log('─'.repeat(50));

  return quote;
}

/**
 * Get quotes for all rebalancing actions
 */
export async function getQuotesForStrategy(
  actions: RebalanceAction[],
  fromAddress: string
): Promise<ExecutionResult[]> {
  console.log(`\n💱 Getting quotes for ${actions.length} action(s)...`);

  const results: ExecutionResult[] = [];

  for (const action of actions) {
    try {
      const quote = await getQuote(action, fromAddress);
      results.push({
        action,
        quote,
        status: 'quoted',
      });
    } catch (error) {
      console.error(`❌ Failed to get quote for action:`, error);
      results.push({
        action,
        quote: {} as LiFiQuote,
        status: 'failed',
      });
    }
  }

  return results;
}

/**
 * Check the status of a cross-chain transfer
 */
export async function checkTransferStatus(
  txHash: string,
  fromChain?: number,
  toChain?: number
): Promise<{ status: string; substatus?: string }> {
  const params = new URLSearchParams({ txHash });
  if (fromChain) params.append('fromChain', fromChain.toString());
  if (toChain) params.append('toChain', toChain.toString());

  const url = `${LIFI_API_BASE}/status?${params}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Status check failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Get list of supported chains from LI.FI
 */
export async function getSupportedChains(): Promise<Array<{ id: number; name: string; key: string }>> {
  const response = await fetch(`${LIFI_API_BASE}/chains`);
  if (!response.ok) {
    throw new Error(`Failed to fetch chains: ${response.status}`);
  }
  const data = await response.json();
  return data.chains;
}

/**
 * Display execution summary
 */
export function displayExecutionSummary(results: ExecutionResult[]): void {
  console.log('\n' + '═'.repeat(50));
  console.log('📊 EXECUTION SUMMARY');
  console.log('═'.repeat(50));

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const status = r.status === 'quoted' ? '✅' : r.status === 'failed' ? '❌' : '⏳';
    console.log(`\n${status} Action ${i + 1}: ${r.action.type.toUpperCase()}`);
    console.log(`   ${r.action.amountFormatted} ${r.action.fromToken} → ${r.action.toToken}`);
    console.log(`   Chain ${r.action.fromChain} → Chain ${r.action.toChain}`);
    
    if (r.status === 'quoted' && r.quote.transactionRequest) {
      console.log(`   🔗 Ready to execute on chain ${r.quote.transactionRequest.chainId}`);
    }
  }

  console.log('\n' + '═'.repeat(50));
}
