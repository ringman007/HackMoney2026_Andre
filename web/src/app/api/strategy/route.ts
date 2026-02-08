import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

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
- For swaps on the same chain, fromChain and toChain must be the same chain ID

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
    }
  ],
  "reasoning": "Portfolio is 70% on Ethereum vs target 50%. Moving 500 USDC to Arbitrum."
}`;

export async function POST(request: NextRequest) {
  try {
    const { balances, targetAllocation } = await request.json();

    if (!process.env.OPENAI_API_KEY) {
      // Demo mode - return a sample strategy
      return NextResponse.json({
        actions: [
          {
            type: 'bridge',
            fromChain: 1,
            toChain: 42161,
            fromToken: 'USDC',
            toToken: 'USDC',
            amount: '1000000000',
            amountFormatted: '1000 USDC',
          },
        ],
        reasoning: 'Demo mode: Bridging USDC from Ethereum to Arbitrum for lower gas fees.',
      });
    }

    const openai = new OpenAI();

    let portfolioText = 'Current Balances:\n';
    for (const b of balances) {
      portfolioText += `  - ${b.chain.name} (${b.chain.id}): ${b.balanceFormatted} ${b.symbol}\n`;
    }

    let targetText = 'Target Allocation:\n';
    for (const [token, percentage] of Object.entries(targetAllocation)) {
      targetText += `  - ${token}: ${percentage}%\n`;
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `${portfolioText}\n${targetText}\n\nGenerate a rebalancing strategy.` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    const strategy = JSON.parse(content);
    return NextResponse.json(strategy);
  } catch (error) {
    console.error('Strategy error:', error);
    return NextResponse.json({ error: 'Failed to generate strategy' }, { status: 500 });
  }
}
