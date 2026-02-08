import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import { normalize } from 'viem/ens';

// Create a public client for ENS resolution (always on mainnet)
const client = createPublicClient({
  chain: mainnet,
  transport: http(),
});

/**
 * Resolve an ENS name to an Ethereum address
 * @param ensName - The ENS name to resolve (e.g., 'vitalik.eth')
 * @returns The resolved address or null if not found
 */
export async function resolveEns(ensName: string): Promise<string | null> {
  console.log(`\n🔍 Resolving ENS name: ${ensName}`);
  
  try {
    const normalizedName = normalize(ensName);
    const address = await client.getEnsAddress({ name: normalizedName });
    
    if (address) {
      console.log(`✅ Resolved ${ensName} → ${address}`);
      return address;
    } else {
      console.log(`❌ No address found for ${ensName}`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Error resolving ENS: ${error}`);
    return null;
  }
}

/**
 * Reverse resolve an address to an ENS name
 * @param address - The Ethereum address
 * @returns The ENS name or null if not found
 */
export async function reverseResolveEns(address: string): Promise<string | null> {
  console.log(`\n🔍 Reverse resolving address: ${address}`);
  
  try {
    const ensName = await client.getEnsName({ address: address as `0x${string}` });
    
    if (ensName) {
      console.log(`✅ Resolved ${address} → ${ensName}`);
      return ensName;
    } else {
      console.log(`ℹ️  No ENS name for ${address}`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Error reverse resolving: ${error}`);
    return null;
  }
}

/**
 * Get ENS avatar for a name
 * @param ensName - The ENS name
 * @returns The avatar URL or null
 */
export async function getEnsAvatar(ensName: string): Promise<string | null> {
  try {
    const normalizedName = normalize(ensName);
    const avatar = await client.getEnsAvatar({ name: normalizedName });
    return avatar;
  } catch {
    return null;
  }
}

/**
 * Check if input is an ENS name or address, resolve if needed
 * @param input - Either an ENS name or address
 * @returns Object with address and optional ensName
 */
export async function resolveAddressOrEns(input: string): Promise<{
  address: string;
  ensName?: string;
} | null> {
  // Check if it's already an address
  if (input.startsWith('0x') && input.length === 42) {
    const ensName = await reverseResolveEns(input);
    return {
      address: input,
      ensName: ensName || undefined,
    };
  }
  
  // Assume it's an ENS name
  const address = await resolveEns(input);
  if (address) {
    return {
      address,
      ensName: input,
    };
  }
  
  return null;
}
