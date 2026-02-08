import 'dotenv/config';
import { resolveAddressOrEns } from './ens.js';
import { fetchPortfolio } from './portfolio.js';
import { generateRebalanceStrategy, generateDemoStrategy } from './agent.js';
import { getQuotesForStrategy, displayExecutionSummary } from './lifi.js';
import type { TargetAllocation } from './types.js';

// Configuration
const CONFIG = {
  // Default wallet to analyze (can use ENS name)
  wallet: process.env.WALLET_ADDRESS || 'vitalik.eth',
  
  // Target allocation percentages
  targetAllocation: {
    ETH: 40,
    USDC: 40,
    WETH: 20,
  } as TargetAllocation,
  
  // Use demo mode (no OpenAI API call)
  demoMode: process.env.DEMO_MODE === 'true' || !process.env.OPENAI_API_KEY,
};

async function main(): Promise<void> {
  console.log('═'.repeat(50));
  console.log('🚀 CHAINHOPPER AGENT');
  console.log('   AI-Powered Cross-Chain Portfolio Rebalancer');
  console.log('═'.repeat(50));

  try {
    // Step 1: Resolve wallet address (ENS integration)
    console.log('\n📍 Step 1: Resolve Wallet');
    const resolved = await resolveAddressOrEns(CONFIG.wallet);
    
    if (!resolved) {
      throw new Error(`Could not resolve wallet: ${CONFIG.wallet}`);
    }

    // Step 2: Fetch portfolio across chains
    console.log('\n📍 Step 2: Fetch Portfolio');
    const portfolio = await fetchPortfolio(resolved.address, resolved.ensName);

    if (portfolio.balances.length === 0) {
      console.log('\n⚠️  No balances found. Try a different wallet.');
      console.log('   Tip: Use a wallet with tokens on Ethereum, Arbitrum, Base, or Optimism');
      return;
    }

    // Step 3: Generate rebalancing strategy with AI
    console.log('\n📍 Step 3: Generate Strategy');
    console.log(`   Target: ${JSON.stringify(CONFIG.targetAllocation)}`);
    
    let strategy;
    if (CONFIG.demoMode) {
      console.log('   Mode: DEMO (no OpenAI call)');
      strategy = generateDemoStrategy(portfolio);
    } else {
      console.log('   Mode: AI (using GPT-4o)');
      strategy = await generateRebalanceStrategy(portfolio, CONFIG.targetAllocation);
    }

    if (strategy.actions.length === 0) {
      console.log('\n✅ Portfolio is balanced! No actions needed.');
      console.log(`   Reasoning: ${strategy.reasoning}`);
      return;
    }

    // Step 4: Get LI.FI quotes for each action
    console.log('\n📍 Step 4: Get LI.FI Quotes');
    const results = await getQuotesForStrategy(strategy.actions, resolved.address);

    // Step 5: Display execution summary
    console.log('\n📍 Step 5: Execution Summary');
    displayExecutionSummary(results);

    // Final summary
    console.log('\n🎉 ChainHopper Agent Complete!');
    console.log('─'.repeat(50));
    console.log(`   Wallet: ${resolved.ensName || resolved.address}`);
    console.log(`   Balances Found: ${portfolio.balances.length}`);
    console.log(`   Actions Generated: ${strategy.actions.length}`);
    console.log(`   Quotes Retrieved: ${results.filter(r => r.status === 'quoted').length}`);
    console.log('─'.repeat(50));
    console.log('\n💡 To execute, sign the transaction(s) with your wallet.');
    console.log('   Transaction data is ready in the quotes above.');

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

// Run the agent
main();
