import { NextRequest, NextResponse } from 'next/server';

const LIFI_API_BASE = 'https://li.quest/v1';

export async function POST(request: NextRequest) {
  try {
    const { action, fromAddress } = await request.json();

    if (!action.fromChain || !action.toChain) {
      return NextResponse.json({ error: 'Missing chain IDs' }, { status: 400 });
    }

    const params = new URLSearchParams({
      fromChain: action.fromChain.toString(),
      toChain: action.toChain.toString(),
      fromToken: action.fromToken,
      toToken: action.toToken,
      fromAmount: action.amount,
      fromAddress: fromAddress,
    });

    const url = `${LIFI_API_BASE}/quote?${params}`;
    const response = await fetch(url);

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error: `LI.FI error: ${error}` }, { status: response.status });
    }

    const quote = await response.json();
    return NextResponse.json(quote);
  } catch (error) {
    console.error('Quote error:', error);
    return NextResponse.json({ error: 'Failed to get quote' }, { status: 500 });
  }
}
