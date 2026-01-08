# BubbleNansen - Token Holder Visualization App

## Overview

BubbleNansen is a web application that visualizes the top holders of any token and their counterparty connections using an interactive bubble/network diagram powered by the Nansen API. It helps users understand token distribution, identify whale clusters, and explore transaction relationships between major holders.

## Current Status: MVP Complete

The core functionality is implemented and working:
- Top 20 holders visualization
- Counterparty connections on click
- Multi-chain support
- Configurable settings
- Nansen branding

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | React 18 + TypeScript |
| Build Tool | Vite |
| Visualization | D3.js (force-directed graph) |
| Styling | Tailwind CSS |
| Theme | Dark mode (crypto aesthetic) |
| API | Nansen API (Token God Mode) |
| HTTP Client | Axios + React Query |

## Supported Chains

Multi-chain support:
- Ethereum Mainnet
- BNB Smart Chain (BSC)
- Polygon
- Arbitrum
- Optimism
- Base
- Avalanche C-Chain
- Solana

## Implemented Features

### 1. Token Input & Selection
- Contract address input field
- Chain selector dropdown (8 chains)
- Address validation (EVM and Solana formats)
- URL parameter support (`?token=0x...&chain=ethereum`)

### 2. Top Holders Visualization (Bubble Map)
- Fetches top 20 token holders from Nansen API
- Displays holders as bubbles in a force-directed graph
- Bubble size proportional to token holdings (sqrt scale for area)
- Color coding by wallet type:
  - Exchange wallets: Amber/orange
  - DeFi protocols: Blue
  - Funds/VCs: Violet
  - Whales: Indigo
  - Contracts: Cyan
  - Unknown: Gray
- Wallet name labels displayed on nodes
- Hover tooltips with balance and value details

### 3. Counterparty Connections
- Click any holder to fetch their counterparties
- Draws edges between holders and their counterparties
- Edge styling: dashed cyan lines
- Counterparty nodes have dashed borders to distinguish them
- "Expand All" button to fetch counterparties for all holders
- Progress bar during bulk expansion

### 4. Settings Panel
- Max counterparties per holder (5, 10, 15, 20, 30)
- Time window for counterparty data (7d to 1 year)
- Settings apply to new counterparty lookups

### 5. Sidebar
- Holder list sorted by balance
- Click to select and fetch counterparties
- Visual indicator for expanded holders
- Selected holder details panel

## UI Layout

```
+------------------------------------------------------------------+
|  [Nansen Logo]  [Chain ▼]  [Contract Address Input]  [Explore]   |
+------------------------------------------------------------------+
|                                        |                         |
|                                        |  Settings (collapsible) |
|                                        |  - Max Counterparties   |
|          BUBBLE MAP CANVAS             |  - Time Window          |
|       (D3 Force-Directed Graph)        |  - [Expand All]         |
|                                        |                         |
|                                        |  Top Holders List       |
|                                        |  1. Address | Balance   |
|                                        |  2. Address | Balance   |
|                                        |  ...                    |
|                                        |                         |
|                                        |  Selected Holder        |
|                                        |  Details Panel          |
+------------------------------------------------------------------+
```

## Color Palette (Dark Theme)

- Background: `#0a0a0f` (near black)
- Surface: `#13131a` (dark gray)
- Border: `#1e1e2e` (subtle border)
- Primary: `#6366f1` (indigo/purple)
- Accent: `#22d3ee` (cyan)
- Nansen Green: `#00FFA7` (buttons)

## API Integration

### Nansen API Endpoints Used

1. **Token Holders** (`/api/v1/tgm/holders`)
   - POST request with chain, token_address, pagination
   - Returns top holders with balances, labels, value_usd
   - Ordered by `token_amount` descending

2. **Address Counterparties** (`/api/v1/profiler/address/counterparties`)
   - POST request with chain, address, date range
   - Returns counterparty addresses with interaction counts, volumes
   - Used to build connection graph

### API Configuration

- Base URL proxied through Vite: `/api/nansen` → `https://api.nansen.ai`
- API key sent via `apiKey` header
- Environment variable: `VITE_NANSEN_API_KEY`

## File Structure

```
src/
├── components/
│   └── BubbleMap.tsx       # D3 force-directed graph visualization
├── services/
│   └── nansen.ts           # Nansen API client
├── types/
│   └── index.ts            # TypeScript type definitions
├── App.tsx                 # Main application component
├── main.tsx                # Entry point
└── index.css               # Tailwind CSS styles
```

## Key Implementation Details

### D3 Force Simulation
- `forceCenter` - Centers the graph
- `forceManyBody` - Node repulsion (stronger for holders, weaker for counterparties)
- `forceCollide` - Prevents bubble overlap
- `forceLink` - Connection springs between linked nodes

### Performance Optimizations
- useRef for callbacks to prevent D3 re-renders on state changes
- useMemo for stable node array references
- Separate useEffect for selection styling vs graph rebuilding

### CORS Handling
Vite proxy configuration in `vite.config.ts`:
```typescript
proxy: {
  '/api/nansen': {
    target: 'https://api.nansen.ai',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api\/nansen/, ''),
  },
}
```

## Future Enhancements (Not Yet Implemented)

### Phase 6: Clustering
- [ ] Automatic clustering of related wallets
- [ ] Visual grouping (convex hull backgrounds)
- [ ] Cluster statistics and labels
- [ ] Expand/collapse clusters

### Phase 7: Transaction Flow
- [ ] Transaction history panel for selected wallet
- [ ] Animated flow visualization
- [ ] Time-based filtering

### Phase 8: Polish
- [ ] Loading skeletons
- [ ] Keyboard shortcuts
- [ ] Mobile responsive design
- [ ] Export as image

## Development

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Add your VITE_NANSEN_API_KEY

# Run development server
npm run dev

# Build for production
npm run build
```

## Testing

Use well-known tokens for testing:
- USDC on Ethereum: `0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48`
- USDT on Ethereum: `0xdac17f958d2ee523a2206206994597c13d831ec7`
