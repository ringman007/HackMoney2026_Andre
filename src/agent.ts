import OpenAI from 'openai';
import type { Portfolio, TargetAllocation, RebalanceStrategy } from './types.js';

// Lazy initialization to avoid error when OPENAI_API_KEY is not set
let openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openai) {
    openai = new OpenAI();
  }
  return openai;
}

const SYSTEM_PROMPT = `You are a DeFi portfolio rebalancing agent. Your job is to analyze a user's multi-chain crypto portfolio and generate a rebalancing strategy.

You will receive:
1. Current portfolio balances across multiple chains
2. Target allocation percentages

You must output a JSON object with:
- actions: Array of rebalancing actions (swaps/bridges)
- reasoning: Brief explanation of the strategy

Rules:
- Minimize the number of transactions (gas efficiency)
- Prefer bridging over swap+bridge when moving same token
- Consider that bridging has fees
- If portfolio is already balanced (within 2%), return empty actions
- Always output valid JSON

Chain IDs:
- Ethereum: 1
- Arbitrum: 42161
- Base: 8453
- Optimism: 10

Example output:
{
  "actions": [
    {
      "type": "bridge",
      "fromChain": 1,
      "toChain": 42161,
      "fromToken": "USDC",
      "toToken": "USDC",
      "amount": "500000000",
      "amountFormatted": "500 USDC"
    },
    {
      "type": "swap",
      "fromChain": 1,
      "toChain": 1,
      "fromToken": "USDT",
      "toToken": "USDC",
      "amount": "100000000",
      "amountFormatted": "100 USDT"
    }
  ],
  "reasoning": "Portfolio is 70% on Ethereum vs target 50%. Moving 500 USDC to Arbitrum to better distribute across chains."
}

IMPORTANT: For swaps on the same chain, fromChain and toChain must be the same chain ID (e.g., both 1 for Ethereum).`;

/**
 * Format portfolio for AI prompt
 */
function formatPortfolioForPrompt(portfolio: Portfolio): string {
  let output = `Wallet: ${portfolio.address}`;
  if (portfolio.ensName) {
    output += ` (${portfolio.ensName})`;
  }
  output += '\n\nCurrent Balances:\n';

  if (portfolio.balances.length === 0) {
    output += '  No balances found\n';
  } else {
    for (const b of portfolio.balances) {
      output += `  - ${b.chain.name} (${b.chain.id}): ${b.balanceFormatted} ${b.symbol}\n`;
    }
  }

  return output;
}

/**
 * Format target allocation for AI prompt
 */
function formatTargetAllocation(target: TargetAllocation): string {
  let output = 'Target Allocation:\n';
  for (const [token, percentage] of Object.entries(target)) {
    output += `  - ${token}: ${percentage}%\n`;
  }
  return output;
}

/**
 * Generate rebalancing strategy using OpenAI
 */
export async function generateRebalanceStrategy(
  portfolio: Portfolio,
  targetAllocation: TargetAllocation
): Promise<RebalanceStrategy> {
  console.log('\n🤖 Generating rebalancing strategy with AI...');

  const userPrompt = `
${formatPortfolioForPrompt(portfolio)}

${formatTargetAllocation(targetAllocation)}

Analyze this portfolio and generate a rebalancing strategy to achieve the target allocation.
Output only valid JSON matching the schema described.
`;

  console.log('\n📝 Prompt sent to AI:');
  console.log('─'.repeat(50));
  console.log(userPrompt);
  console.log('─'.repeat(50));

  try {
    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    const strategy = JSON.parse(content) as RebalanceStrategy;

    console.log('\n🎯 AI Strategy:');
    console.log('─'.repeat(50));
    console.log(`Reasoning: ${strategy.reasoning}`);
    console.log(`\nActions (${strategy.actions.length}):`);
    
    for (const action of strategy.actions) {
      console.log(`  → ${action.type.toUpperCase()}: ${action.amountFormatted} ${action.fromToken}`);
      console.log(`    From: Chain ${action.fromChain} → To: Chain ${action.toChain}`);
    }
    console.log('─'.repeat(50));

    return strategy;
  } catch (error) {
    console.error('❌ Error generating strategy:', error);
    throw error;
  }
}

/**
 * Simple demo strategy without API call (for testing)
 */
export function generateDemoStrategy(portfolio: Portfolio): RebalanceStrategy {
  console.log('\n🤖 Generating demo strategy (no API call)...');
  
  // Find if there's USDC on Ethereum to bridge
  const ethUsdc = portfolio.balances.find(
    (b) => b.chain.id === 1 && b.symbol === 'USDC'
  );

  if (ethUsdc && ethUsdc.balance > 0n) {
    const halfBalance = (ethUsdc.balance / 2n).toString();
    return {
      actions: [
        {
          type: 'bridge',
          fromChain: 1,
          toChain: 42161,
          fromToken: 'USDC',
          toToken: 'USDC',
          amount: halfBalance,
          amountFormatted: `${Number(halfBalance) / 1e6} USDC`,
        },
      ],
      reasoning: 'Demo: Bridging 50% of USDC from Ethereum to Arbitrum for lower fees.',
    };
  }

  return {
    actions: [],
    reasoning: 'Portfolio is already balanced or no actionable positions found.',
  };
}
