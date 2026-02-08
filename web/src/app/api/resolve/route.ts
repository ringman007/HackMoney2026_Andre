import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import { normalize } from 'viem/ens';

const client = createPublicClient({
  chain: mainnet,
  transport: http(),
});

export async function POST(request: NextRequest) {
  try {
    const { input } = await request.json();

    if (!input) {
      return NextResponse.json({ error: 'No input provided' }, { status: 400 });
    }

    // Check if it's already an address
    if (input.startsWith('0x') && input.length === 42) {
      const ensName = await client.getEnsName({ address: input as `0x${string}` });
      return NextResponse.json({
        address: input,
        ensName: ensName || undefined,
      });
    }

    // Assume it's an ENS name
    const normalizedName = normalize(input);
    const address = await client.getEnsAddress({ name: normalizedName });

    if (address) {
      return NextResponse.json({
        address,
        ensName: input,
      });
    }

    return NextResponse.json({ error: 'Could not resolve address' }, { status: 404 });
  } catch (error) {
    console.error('Resolve error:', error);
    return NextResponse.json({ error: 'Failed to resolve' }, { status: 500 });
  }
}
