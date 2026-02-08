# ChainHopper Agent 🚀

**AI-Powered Cross-Chain Portfolio Rebalancing Agent**

Built for HackMoney 2026 | [Demo Video](#) | [Slides](#)

---

## What is ChainHopper?

ChainHopper is an autonomous AI agent that monitors your crypto portfolio across multiple chains and generates optimal rebalancing strategies. It uses:

- **OpenAI GPT-4o** for intelligent decision-making
- **LI.FI API** for cross-chain swap/bridge execution
- **ENS** for human-readable wallet addresses

## Features

- 🔍 **ENS Resolution** - Use `vitalik.eth` instead of `0x...` addresses
- 💰 **Multi-Chain Portfolio** - Track ETH, USDC, WETH across Ethereum, Arbitrum, Base, Optimism
- 🤖 **AI Strategy** - GPT-4o analyzes your portfolio and generates rebalancing actions
- 🌉 **Cross-Chain Quotes** - Get LI.FI quotes with full transaction data ready to execute
- 📊 **Transparent Logging** - See every decision and action for full auditability

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Add your OPENAI_API_KEY to .env

# Run the agent
npm start
```

## Demo Mode

If you don't have an OpenAI API key, the agent runs in demo mode with a simulated strategy:

```bash
DEMO_MODE=true npm start
```

## Configuration

Edit `src/index.ts` to customize:

```typescript
const CONFIG = {
  wallet: 'vitalik.eth',  // or any 0x address
  targetAllocation: {
    ETH: 40,
    USDC: 40,
    WETH: 20,
  },
};
```

## Architecture

```
┌─────────────────┐
│   User Input    │  wallet address / ENS name
└────────┬────────┘
         ▼
┌─────────────────┐
│  ENS Resolution │  viem → resolve name to address
└────────┬────────┘
         ▼
┌─────────────────┐
│ Portfolio Fetch │  Query balances on 4 chains
└────────┬────────┘
         ▼
┌─────────────────┐
│   AI Agent      │  OpenAI GPT-4o → rebalancing strategy
└────────┬────────┘
         ▼
┌─────────────────┐
│   LI.FI API     │  Get quotes + transaction data
└────────┬────────┘
         ▼
┌─────────────────┐
│    Execute      │  Ready-to-sign transactions
└─────────────────┘
```

## Prize Tracks

This project targets:

| Track | Sponsor | Integration |
|-------|---------|-------------|
| AI x LI.FI Smart App | LI.FI | ✅ LI.FI REST API for cross-chain execution |
| Agentic Finance | Uniswap v4 | ✅ AI agent for DeFi operations |
| Agentic Commerce | Circle/Arc | ✅ USDC-denominated portfolio management |
| Integrate ENS | ENS | ✅ ENS name resolution with viem |

## Tech Stack

- **Runtime:** Node.js + TypeScript
- **AI:** OpenAI API (gpt-4o)
- **Blockchain:** viem
- **Cross-chain:** LI.FI REST API
- **Build:** tsx

## API Endpoints Used

### LI.FI
- `GET /quote` - Get swap/bridge quote with transaction data
- `GET /status` - Check transfer status
- `GET /chains` - List supported chains

### OpenAI
- `POST /chat/completions` - Generate rebalancing strategy

## Example Output

```
══════════════════════════════════════════════════
🚀 CHAINHOPPER AGENT
   AI-Powered Cross-Chain Portfolio Rebalancer
══════════════════════════════════════════════════

📍 Step 1: Resolve Wallet
🔍 Resolving ENS name: vitalik.eth
✅ Resolved vitalik.eth → 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045

📍 Step 2: Fetch Portfolio
💰 Portfolio Summary:
──────────────────────────────────────────────────
   Ethereum     │ ETH    │ 1.234
   Ethereum     │ USDC   │ 5000.00
   Arbitrum     │ USDC   │ 2500.00
──────────────────────────────────────────────────

📍 Step 3: Generate Strategy
🤖 AI Strategy:
   Reasoning: Portfolio concentrated on Ethereum. 
   Bridging USDC to Arbitrum for better gas efficiency.

📍 Step 4: Get LI.FI Quotes
📋 Quote Details:
   Tool: stargate
   From: 1000 USDC → To: 999.5 USDC
   Est. Duration: 120s
   🔗 Transaction Ready

🎉 ChainHopper Agent Complete!
```

## License

MIT

---

Built with ❤️ for HackMoney 2026
