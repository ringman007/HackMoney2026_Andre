# Project Context

## Purpose
ChainHopper Agent - An AI-powered portfolio rebalancing agent for the HackMoney 2026 hackathon.

**Goals:**
- Build a CLI tool that monitors multi-chain crypto portfolios
- Use AI (OpenAI) to generate rebalancing strategies
- Execute cross-chain swaps via LI.FI API
- Integrate ENS for human-readable wallet addresses
- Target 4 prize tracks: LI.FI AI, Uniswap Agentic, Circle Agentic, ENS Integration

## Tech Stack
- **Runtime:** Node.js 20+
- **Language:** TypeScript (strict mode)
- **AI:** OpenAI API (gpt-4o with structured outputs)
- **Blockchain:** viem (ENS resolution, balance fetching)
- **Cross-chain:** LI.FI REST API (https://li.quest/v1/)
- **Config:** dotenv for environment variables
- **Build:** tsx for direct TS execution (no compile step)

## Project Conventions

### Code Style
- Use ES modules (`import`/`export`)
- Prefer `const` over `let`, never use `var`
- Use async/await, no callbacks
- Descriptive variable names (no abbreviations except common ones: `tx`, `addr`, `msg`)
- Single quotes for strings
- 2-space indentation
- Explicit return types on functions
- Error messages should be user-friendly

### Architecture Patterns
- **Modular design:** Each capability in its own file
  - `src/ens.ts` - ENS resolution
  - `src/portfolio.ts` - Balance fetching
  - `src/agent.ts` - OpenAI agent logic
  - `src/lifi.ts` - LI.FI API integration
  - `src/types.ts` - Shared TypeScript types
  - `src/index.ts` - Main entry point / CLI
- **Pure functions** where possible
- **Dependency injection** via function parameters (no globals except config)
- **Verbose logging** for hackathon demo visibility

### Testing Strategy
- Manual testing only (hackathon time constraint)
- Test with real ENS names (vitalik.eth, etc.)
- Use testnets where possible
- Log all API responses for debugging

### Git Workflow
- Single `main` branch
- Atomic commits per feature:
  1. Project setup
  2. ENS module
  3. Portfolio fetcher
  4. AI agent
  5. LI.FI integration
  6. README + final cleanup
- Commit message format: `feat: description` or `fix: description`
- PRD.md excluded from git (internal only)

## Domain Context
- **State Channels:** Off-chain transactions that settle on-chain (Yellow Network concept)
- **Cross-chain bridging:** Moving tokens between different blockchains
- **Rebalancing:** Adjusting portfolio allocations to match target percentages
- **LI.FI:** Aggregator that finds best routes across bridges and DEXs
- **ENS:** Ethereum Name Service - maps names like `vitalik.eth` to addresses
- **Gas:** Transaction fees on blockchain networks

**Supported Chains (for demo):**
| Chain | ID | Key |
|-------|-----|-----|
| Ethereum | 1 | eth |
| Arbitrum | 42161 | arb |
| Base | 8453 | bas |
| Optimism | 10 | opt |

## Important Constraints
- **Time:** 2 hours total development time
- **No frontend:** CLI-only for speed
- **No mainnet execution:** Demo uses quotes only, optional testnet tx
- **No database:** Stateless, single-run execution
- **API rate limits:** Be mindful of OpenAI and LI.FI rate limits
- **Demo-focused:** Prioritize visible output over edge case handling

## External Dependencies

### APIs
| Service | Endpoint | Auth |
|---------|----------|------|
| OpenAI | api.openai.com | Bearer token (OPENAI_API_KEY) |
| LI.FI | li.quest/v1 | No auth required |
| Ethereum RPC | Via viem public client | No auth for public RPCs |

### Key LI.FI Endpoints
- `GET /quote` - Get swap/bridge quote with tx data
- `GET /chains` - List supported chains
- `GET /tokens?chains=1,42161` - List tokens per chain
- `GET /status?txHash=0x...` - Check transfer status

### Environment Variables
```
OPENAI_API_KEY=sk-...
```
